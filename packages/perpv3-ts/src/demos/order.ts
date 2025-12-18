import { parseUnits } from 'viem';
import { abs, wmul } from '../math';
import { WAD_DECIMALS } from '../constants';
import { PERP_EXPIRY, Side } from '../types/contract';
import { PlaceInput } from '../actions/order';
import { CrossLimitOrderInput } from '../actions/crossLimitOrder';
import { ScaledLimitOrderInput, BatchOrderSizeDistribution } from '../actions/scaledLimitOrder';
import { Order } from '../types/order';
import { buildInquireByTickResult } from '../types/quotation';
import { CURRENT_INSTRUMENT_ABI } from '../abis';
import { fetchOnchainContext } from '../queries';
import { encodePlaceParam, encodeBatchPlaceParam, encodeTradeParam, encodeCancelParam } from '../utils/encode';
import { formatTick, formatWad, formatTokenAmount } from '../utils/format';
import {
    DefaultUserSetting,
    ensureMarginAndAllowance,
    cancelOrdersAtTicks,
    closePositionIfExists,
    ensureValidPlaceParam,
    ensureValidBatchPlaceTicks,
} from './utils';
import type { DemoContext } from './framework/types';
import { registerDemo } from './framework/registry';

/**
 * Demo: Place and cancel a limit order
 */
export async function demoPlaceAndCancel(context: DemoContext): Promise<void> {
    const {
        instrumentAddress,
        walletAddress,
        snapshot,
        instrumentSetting,
        publicClient,
        walletClient,
        kit,
        rpcConfig,
    } = context;

    // Prepare place input: SHORT limit order at closest tick above current fair price with 3x leverage
    // SHORT orders must be placed above current tick (to sell at higher price)
    const currentTick = snapshot.amm.tick;
    const targetTick = instrumentSetting.alignOrderTick(currentTick + instrumentSetting.orderSpacing);

    console.log(`ℹ️ Current AMM tick: ${formatTick(currentTick)}`);
    console.log(`ℹ️ Target tick for SHORT order: ${formatTick(targetTick)}`);

    const placeInput = new PlaceInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        targetTick,
        parseUnits('-0.01', WAD_DECIMALS), // Negative size = SHORT
        DefaultUserSetting
    );

    // Simulate the order (handles validation and parameter conversion)
    const [placeParam] = placeInput.simulate(snapshot);

    // Create Order instance to use its methods for display
    const order = new Order(placeParam.amount, placeParam.size, placeParam.tick, 0);
    console.log(`ℹ️ Order target price: ${formatWad(order.targetPrice)}`);
    console.log(`ℹ️ Order value: ${formatWad(order.value)}`);

    // Ensure sufficient margin and allowance
    // Convert WAD to token decimals: multiply by 10^decimals
    const marginNeededInDecimals = wmul(placeParam.amount, 10n ** BigInt(instrumentSetting.quoteDecimals));
    const marginFormatted = await formatTokenAmount(placeParam.amount, instrumentSetting.quoteAddress, undefined, 6);
    console.log(`ℹ️ Required margin: ${marginFormatted}`);

    await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeededInDecimals);

    // Re-validate and re-simulate if AMM tick has moved
    const validPlaceParam = await ensureValidPlaceParam(placeInput, placeParam, rpcConfig, walletAddress);

    // Execute place order transaction
    console.log(`📝 Placing SHORT limit order at ${formatTick(targetTick)}...`);
    const { sendTxWithLog } = await import('@derivation-tech/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'place',
        args: [encodePlaceParam(validPlaceParam)],
        gas: BigInt(500000),
    });

    // Wait before canceling
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cancel the order
    console.log(`🗑️ Canceling order at ${formatTick(targetTick)}...`);
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'cancel',
        args: [
            encodeCancelParam({
                expiry: PERP_EXPIRY,
                ticks: [targetTick],
                deadline: DefaultUserSetting.getDeadline(),
            }),
        ],
        gas: BigInt(500000),
    });
}

/**
 * Demo: Cross market limit order (market leg + limit leg)
 */
export async function demoCrossLimitOrder(context: DemoContext, side: Side = Side.LONG): Promise<void> {
    const {
        instrumentAddress,
        walletAddress,
        snapshot,
        instrumentSetting,
        publicClient,
        walletClient,
        kit,
        rpcConfig,
    } = context;

    // Prepare cross market order input
    // First, get the swap quote to determine the actual market size needed
    const currentTick = snapshot.amm.tick;
    const isLong = side === Side.LONG;
    // For LONG: push price up (targetTick > currentTick)
    // For SHORT: push price down (targetTick < currentTick)
    const targetTickForPush = instrumentSetting.alignOrderTick(
        isLong ? currentTick + instrumentSetting.orderSpacing : currentTick - instrumentSetting.orderSpacing
    );

    console.log(`ℹ️ Current AMM tick: ${formatTick(currentTick)}`);
    console.log(`ℹ️ Order side: ${isLong ? 'LONG' : 'SHORT'}`);
    console.log(`🔍 Calculating size needed to push price to ${formatTick(targetTickForPush)}...`);

    // Get swap quote first to know the actual market size
    const crossMarketSwapQuote = await buildInquireByTickResult(
        instrumentAddress,
        PERP_EXPIRY,
        side,
        targetTickForPush,
        rpcConfig
    );

    const actualMarketSize = abs(crossMarketSwapQuote.size);
    const postMarketTick = crossMarketSwapQuote.quotation.postTick;

    console.log(`ℹ️ Post-market tick will be: ${formatTick(postMarketTick)}`);
    console.log(`ℹ️ Actual market size needed: ${formatWad(actualMarketSize)}`);

    // For LONG: limit order at tick < postMarketTick
    // For SHORT: limit order at tick > postMarketTick
    const limitOrderTick = instrumentSetting.alignOrderTick(
        isLong ? postMarketTick - instrumentSetting.orderSpacing : postMarketTick + instrumentSetting.orderSpacing
    );
    console.log(`ℹ️ Limit order will be placed at: ${formatTick(limitOrderTick)}`);

    // Use a larger multiplier to ensure we have enough for the limit leg
    // The market leg might consume more than expected, so we use 3x instead of 2x
    const limitSize = actualMarketSize * 3n;
    const baseQuantity = actualMarketSize + limitSize;

    console.log(
        `✅ Calculated sizes: market=${formatWad(actualMarketSize)}, limit=${formatWad(limitSize)}, total=${formatWad(baseQuantity)}`
    );

    const crossLimitInput = new CrossLimitOrderInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        side,
        baseQuantity,
        targetTickForPush,
        DefaultUserSetting
    );

    console.log(`🔄 Simulating cross limit order...`);
    const crossResult = crossLimitInput.simulate(snapshot, crossMarketSwapQuote);

    if (!crossResult.placeSimulation.canPlaceOrder) {
        throw new Error(
            `Cannot place cross limit order: minOrderSize=${formatWad(crossResult.placeSimulation.minOrderSize)}`
        );
    }

    // Create Order instance for limit leg to display order information
    const limitOrder = new Order(
        crossResult.placeParam.amount,
        crossResult.placeParam.size,
        crossResult.placeParam.tick,
        0
    );
    console.log(
        `✅ Cross limit order simulation: market leg size=${formatWad(abs(crossResult.tradeParam.size))}, limit leg size=${formatWad(abs(crossResult.placeParam.size))}`
    );
    console.log(
        `ℹ️ Limit leg target price: ${formatWad(limitOrder.targetPrice)}, value: ${formatWad(limitOrder.value)}`
    );

    // Convert WAD to token decimals: multiply by 10^decimals
    const marginNeededInDecimals = wmul(
        crossResult.totalMarginRequired,
        10n ** BigInt(instrumentSetting.quoteDecimals)
    );
    const totalMarginFormatted = await formatTokenAmount(
        crossResult.totalMarginRequired,
        instrumentSetting.quoteAddress,
        undefined,
        6
    );
    console.log(`ℹ️ Total margin required: ${totalMarginFormatted}`);

    await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeededInDecimals);

    const { sendTxWithLog } = await import('@derivation-tech/viem-kit');
    if (crossResult.tradeParam.size !== 0n) {
        const tradeSize = crossResult.tradeParam.size; // Already correctly signed (positive for LONG, negative for SHORT)
        console.log(
            `📈 Executing market leg trade (size: ${formatWad(abs(tradeSize))}, side: ${isLong ? 'LONG' : 'SHORT'})...`
        );
        const tradePrice = crossMarketSwapQuote.tradePrice;
        const limitTick = DefaultUserSetting.getTradeLimitTick(tradePrice, side);

        const tradeParam = {
            expiry: PERP_EXPIRY,
            size: tradeSize, // Use signed size directly
            amount: crossResult.tradeSimulation.marginDelta,
            limitTick,
            deadline: DefaultUserSetting.getDeadline(),
        };

        await sendTxWithLog(publicClient, walletClient, kit, {
            address: instrumentAddress,
            abi: CURRENT_INSTRUMENT_ABI,
            functionName: 'trade',
            args: [encodeTradeParam(tradeParam)],
            gas: BigInt(500000),
        });
    }

    if (crossResult.placeParam.size !== 0n) {
        // Re-fetch context after market leg execution to get actual post-market AMM tick
        const updatedContext = await fetchOnchainContext(instrumentAddress, PERP_EXPIRY, rpcConfig, walletAddress);
        const { instrumentSetting: updatedInstrumentSetting } = updatedContext;
        const actualPostMarketTick = updatedContext.amm.tick;

        // Check if the simulated limit order tick is still valid
        // For LONG orders: tick must be < amm.tick (strictly less)
        // For SHORT orders: tick must be > amm.tick (strictly greater)
        let validLimitTick = crossResult.placeParam.tick;
        const isTickValid = isLong ? validLimitTick < actualPostMarketTick : validLimitTick > actualPostMarketTick;

        if (!isTickValid || validLimitTick === actualPostMarketTick) {
            // AMM tick moved or is equal to limit tick, need to adjust the limit order tick
            console.log(
                `⚠️ Limit order tick ${formatTick(validLimitTick)} is no longer valid (AMM tick: ${actualPostMarketTick}). Adjusting...`
            );
            // For LONG orders, place at tick < amm.tick (ensure at least orderSpacing away)
            // For SHORT orders, place at tick > amm.tick (ensure at least orderSpacing away)
            const targetTick = isLong
                ? actualPostMarketTick - updatedInstrumentSetting.orderSpacing
                : actualPostMarketTick + updatedInstrumentSetting.orderSpacing;
            validLimitTick = updatedInstrumentSetting.alignOrderTick(targetTick);

            // Double-check: ensure the aligned tick is still valid (strictly less/greater)
            const isAlignedTickValid = isLong
                ? validLimitTick < actualPostMarketTick
                : validLimitTick > actualPostMarketTick;
            if (!isAlignedTickValid || validLimitTick === actualPostMarketTick) {
                // If aligned tick is still invalid or equal, move further away
                validLimitTick = updatedInstrumentSetting.alignOrderTick(
                    isLong
                        ? actualPostMarketTick - updatedInstrumentSetting.orderSpacing * 2
                        : actualPostMarketTick + updatedInstrumentSetting.orderSpacing * 2
                );
            }
            console.log(`ℹ️ Adjusted limit order tick to: ${formatTick(validLimitTick)}`);
        }

        // Re-create place input with potentially adjusted tick
        // Use signed size directly (positive for LONG, negative for SHORT)
        const limitPlaceInput = new PlaceInput(
            instrumentAddress,
            PERP_EXPIRY,
            walletAddress,
            validLimitTick,
            crossResult.placeParam.size, // Use signed size directly
            DefaultUserSetting
        );

        // Re-simulate with fresh context to get valid parameters
        const [validLimitPlaceParam] = limitPlaceInput.simulate(updatedContext);

        // Final validation: ensure the place param tick is valid (simulation might adjust it)
        const finalTick = validLimitPlaceParam.tick;
        const isFinalTickValid = isLong ? finalTick < actualPostMarketTick : finalTick > actualPostMarketTick;
        if (!isFinalTickValid || finalTick === actualPostMarketTick) {
            throw new Error(
                `Cannot place limit order: tick ${formatTick(finalTick)} is invalid for AMM tick ${actualPostMarketTick} (side: ${isLong ? 'LONG' : 'SHORT'})`
            );
        }

        console.log(`📝 Executing limit leg order at ${formatTick(finalTick)}...`);
        await sendTxWithLog(publicClient, walletClient, kit, {
            address: instrumentAddress,
            abi: CURRENT_INSTRUMENT_ABI,
            functionName: 'place',
            args: [encodePlaceParam(validLimitPlaceParam)], // Use place param which has validated tick
            gas: BigInt(500000),
        });

        console.log(`✅ Cross market order executed successfully!`);

        // Cancel the limit order if it still exists
        await cancelOrdersAtTicks(publicClient, walletClient, kit, instrumentAddress, rpcConfig, walletAddress, [
            finalTick,
        ]);

        // Close position if one exists
        await closePositionIfExists(
            publicClient,
            walletClient,
            kit,
            instrumentAddress,
            rpcConfig,
            walletAddress,
            DefaultUserSetting
        );
    } else {
        console.log(`✅ Cross market order executed successfully!`);
    }
}

/**
 * Demo: Scaled limit order (multiple orders at different price levels)
 */
export async function demoScaledLimitOrder(context: DemoContext): Promise<void> {
    const {
        instrumentAddress,
        walletAddress,
        snapshot,
        instrumentSetting,
        publicClient,
        walletClient,
        kit,
        rpcConfig,
    } = context;

    // Prepare scaled limit order input: LONG orders at multiple price levels
    const baseQuantity = parseUnits('0.05', WAD_DECIMALS);
    const targetLeverage = parseUnits('3', WAD_DECIMALS);

    const currentTick = snapshot.amm.tick;
    console.log(`ℹ️ Current AMM tick: ${formatTick(currentTick)}`);

    const priceLevels = [
        instrumentSetting.alignOrderTick(currentTick - instrumentSetting.orderSpacing),
        instrumentSetting.alignOrderTick(currentTick - 2 * instrumentSetting.orderSpacing),
        instrumentSetting.alignOrderTick(currentTick - 3 * instrumentSetting.orderSpacing),
    ];

    console.log(`ℹ️ Price levels: ${priceLevels.map((tick) => formatTick(tick)).join(', ')}`);

    const scaledOrderInput = new ScaledLimitOrderInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        Side.LONG,
        baseQuantity,
        priceLevels,
        BatchOrderSizeDistribution.FLAT,
        DefaultUserSetting
    );

    console.log(`🔄 Simulating scaled limit order with ${priceLevels.length} price levels...`);
    const scaledResult = scaledOrderInput.simulate(snapshot);

    const validOrders = scaledResult.orders.filter((order) => order !== null);
    if (validOrders.length === 0) {
        throw new Error('No valid orders generated from scaled limit order');
    }

    console.log(`✅ Scaled limit order simulation: ${validOrders.length} valid orders generated`);
    // Display order information using Order methods
    for (const orderDetail of validOrders) {
        if (orderDetail) {
            const order = new Order(orderDetail.param.amount, orderDetail.param.size, orderDetail.param.tick, 0);
            console.log(
                `  - Tick ${formatTick(orderDetail.param.tick)}: size=${formatWad(abs(orderDetail.param.size))}, price=${formatWad(order.targetPrice)}, value=${formatWad(order.value)}`
            );
        }
    }

    const totalMargin = scaledResult.totalMargin;
    // Convert WAD to token decimals: multiply by 10^decimals
    const marginNeededInDecimals = wmul(totalMargin, 10n ** BigInt(instrumentSetting.quoteDecimals));
    const totalMarginFormatted = await formatTokenAmount(totalMargin, instrumentSetting.quoteAddress, undefined, 6);
    console.log(`ℹ️ Total margin required: ${totalMarginFormatted}`);

    await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeededInDecimals);

    // Extract aligned ticks from orders (preserve index positions, including null orders)
    const orderTicks = scaledResult.orders.map((order) => (order ? order.param.tick : null));
    const alignedTicks = orderTicks.filter((tick): tick is number => tick !== null);
    const ratios = scaledResult.orders.map((order) => (order ? order.ratio : 0));
    const totalSize = scaledResult.totalBase;
    const leverage = targetLeverage;
    const side = scaledOrderInput.side; // Get the side from the input

    // Re-validate ticks before batch placing
    const validTicks = await ensureValidBatchPlaceTicks(
        instrumentAddress,
        PERP_EXPIRY,
        alignedTicks,
        side,
        rpcConfig,
        walletAddress
    );

    if (validTicks.length === 0) {
        console.log(`⚠️ No valid ticks remaining after re-validation. Skipping batch place.`);
        return;
    }

    // Filter ratios to match valid ticks (preserve index mapping)
    const validRatios: number[] = [];
    const validTicksSet = new Set(validTicks);
    orderTicks.forEach((tick, index) => {
        if (tick !== null && validTicksSet.has(tick)) {
            validRatios.push(ratios[index]);
        }
    });

    // Recalculate total size based on valid orders
    const validTotalRatio = validRatios.reduce((sum, ratio) => sum + ratio, 0);
    const adjustedTotalSize = validTotalRatio > 0 ? (totalSize * BigInt(validTotalRatio)) / BigInt(10000) : totalSize;

    // Apply sign based on side: LONG = positive, SHORT = negative
    const signedSize = side === Side.LONG ? adjustedTotalSize : -adjustedTotalSize;

    console.log(
        `📝 Executing batch place for ${validTicks.length} orders (total size: ${formatWad(adjustedTotalSize)}, side: ${side})...`
    );
    const { sendTxWithLog } = await import('@derivation-tech/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'batchPlace',
        args: [
            encodeBatchPlaceParam({
                expiry: PERP_EXPIRY,
                ticks: validTicks,
                ratios: validRatios,
                size: signedSize,
                leverage,
                deadline: DefaultUserSetting.getDeadline(),
            }),
        ],
        gas: BigInt(1000000),
    });

    console.log(`✅ Scaled limit order executed successfully!`);

    // Cancel all remaining orders
    await cancelOrdersAtTicks(
        publicClient,
        walletClient,
        kit,
        instrumentAddress,
        rpcConfig,
        walletAddress,
        validTicks.length > 0 ? validTicks : alignedTicks
    );

    // Close position if one exists
    await closePositionIfExists(
        publicClient,
        walletClient,
        kit,
        instrumentAddress,
        rpcConfig,
        walletAddress,
        DefaultUserSetting
    );
}

// Register all order demos
registerDemo({
    name: 'place-and-cancel',
    description: 'Place and cancel a limit order',
    category: 'order',
    run: demoPlaceAndCancel,
});

registerDemo({
    name: 'cross-market-order',
    description: 'Execute a cross market limit order (market leg + limit leg)',
    category: 'order',
    run: demoCrossLimitOrder,
});

registerDemo({
    name: 'scaled-limit-order',
    description: 'Place multiple limit orders at different price levels',
    category: 'order',
    run: demoScaledLimitOrder,
});
