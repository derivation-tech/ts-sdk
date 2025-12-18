import { parseUnits } from 'viem';
import { wmul, abs, sqrtX96ToWad } from '../math';
import { WAD_DECIMALS, ZERO } from '../constants';
import { PERP_EXPIRY, Side } from '../types/contract';
import { TradeInput } from '../actions/trade';
import { AdjustInput } from '../actions/adjust';
import { QuotationWithSize } from '../types/quotation';
import { CURRENT_INSTRUMENT_ABI } from '../abis';
import { fetchOnchainContext } from '../queries';
import { encodeTradeParam, encodeAdjustParam } from '../utils/encode';
import { DefaultUserSetting, ensureMarginAndAllowance } from './utils';
import { formatTick, formatWad, formatTokenAmount } from '../utils/format';
import type { DemoContext } from './framework/types';
import { registerDemo } from './framework/registry';
import { UserSetting } from '../types';

/**
 * Demo: Trade by margin using TradeInput
 */
export async function demoTradeByMargin(context: DemoContext): Promise<void> {
    const {
        instrumentAddress,
        walletAddress,
        instrumentSetting,
        snapshot,
        publicClient,
        walletClient,
        kit,
        rpcConfig,
    } = context;

    const fairPrice = sqrtX96ToWad(snapshot.amm.sqrtPX96);
    const markPrice = snapshot.priceData.markPrice;

    console.log(`ℹ️ Fair price: ${formatWad(fairPrice)}`);
    console.log(`ℹ️ Mark price: ${formatWad(markPrice)}`);

    // Determine trade direction
    const side = fairPrice > markPrice ? Side.SHORT : Side.LONG;
    const baseQuantity = parseUnits('0.01', WAD_DECIMALS);
    const marginAmountInWad = parseUnits('100', WAD_DECIMALS);

    console.log(`ℹ️ Trade direction: ${side === Side.LONG ? 'LONG' : 'SHORT'}`);
    console.log(`ℹ️ Base quantity: ${formatWad(baseQuantity)}`);

    const marginNeeded = wmul(marginAmountInWad, 10n ** BigInt(instrumentSetting.quoteDecimals));
    const marginFormatted = await formatTokenAmount(marginAmountInWad, instrumentSetting.quoteAddress, undefined, 6);
    console.log(`ℹ️ Margin amount: ${marginFormatted}`);

    await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeeded);

    // Fetch quotation
    const signedSize = side === Side.LONG ? baseQuantity : -baseQuantity;
    const onchainContextWithQuotation = await fetchOnchainContext(
        instrumentAddress,
        PERP_EXPIRY,
        rpcConfig,
        walletAddress,
        signedSize
    );
    const quotation = onchainContextWithQuotation.quotation;

    if (!quotation) {
        throw new Error('Failed to fetch quotation');
    }

    const quotationWithSize = new QuotationWithSize(signedSize, quotation);

    // Create TradeInput (by margin) and simulate
    const tradeInput = new TradeInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        baseQuantity,
        side,
        DefaultUserSetting,
        { margin: marginAmountInWad }
    );

    const [tradeParam, simulation] = tradeInput.simulate(snapshot, quotationWithSize);

    console.log(`📈 Executing trade by margin (limit tick: ${formatTick(tradeParam.limitTick)})...`);
    console.log(`ℹ️ Post-trade margin delta: ${formatWad(simulation.marginDelta)}`);
    console.log(`ℹ️ Post-trade leverage: ${formatWad(simulation.postPosition.leverage(snapshot.amm, markPrice))}`);

    const { sendTxWithLog } = await import('@synfutures/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'trade',
        args: [encodeTradeParam(tradeParam)],
        gas: BigInt(500000),
    });

    console.log(`✅ Trade by margin executed successfully!`);
}

/**
 * Demo: Trade by leverage using TradeInput
 */
export async function demoTradeByLeverage(context: DemoContext): Promise<void> {
    const {
        instrumentAddress,
        walletAddress,
        instrumentSetting,
        snapshot,
        publicClient,
        walletClient,
        kit,
        rpcConfig,
    } = context;

    const fairPrice = sqrtX96ToWad(snapshot.amm.sqrtPX96);
    const markPrice = snapshot.priceData.markPrice;

    console.log(`ℹ️ Fair price: ${formatWad(fairPrice)}`);
    console.log(`ℹ️ Mark price: ${formatWad(markPrice)}`);

    const side = fairPrice > markPrice ? Side.SHORT : Side.LONG;
    const baseQuantity = parseUnits('0.01', WAD_DECIMALS);
    const targetLeverage = parseUnits('3', WAD_DECIMALS); // 3x leverage

    console.log(`ℹ️ Trade direction: ${side === Side.LONG ? 'LONG' : 'SHORT'}`);
    console.log(`ℹ️ Base quantity: ${formatWad(baseQuantity)}`);
    console.log(`ℹ️ Target leverage: ${formatWad(targetLeverage)}x`);

    // Fetch quotation
    const signedSize = side === Side.LONG ? baseQuantity : -baseQuantity;
    const onchainContextWithQuotation = await fetchOnchainContext(
        instrumentAddress,
        PERP_EXPIRY,
        rpcConfig,
        walletAddress,
        signedSize
    );
    const quotation = onchainContextWithQuotation.quotation;

    if (!quotation) {
        throw new Error('Failed to fetch quotation');
    }

    const quotationWithSize = new QuotationWithSize(signedSize, quotation);

    // Create TradeInput (by leverage) and simulate
    const tradeInput = new TradeInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        baseQuantity,
        side,
        DefaultUserSetting
    );

    const [tradeParam, simulation] = tradeInput.simulate(snapshot, quotationWithSize);

    if (simulation.marginDelta > ZERO) {
        const marginNeeded = wmul(simulation.marginDelta, 10n ** BigInt(instrumentSetting.quoteDecimals));
        const marginFormatted = await formatTokenAmount(marginNeeded, instrumentSetting.quoteAddress, undefined, 6);
        console.log(`ℹ️ Required margin: ${marginFormatted}`);
        await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeeded);
    }

    console.log(`📈 Executing trade by leverage (limit tick: ${formatTick(tradeParam.limitTick)})...`);
    console.log(`ℹ️ Post-trade margin delta: ${formatWad(simulation.marginDelta)}`);
    console.log(`ℹ️ Post-trade leverage: ${formatWad(simulation.postPosition.leverage(snapshot.amm, markPrice))}`);

    const { sendTxWithLog } = await import('@synfutures/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'trade',
        args: [encodeTradeParam(tradeParam)],
        gas: BigInt(500000),
    });

    console.log(`✅ Trade by leverage executed successfully!`);
}

/**
 * Demo: Close position using TradeInput
 */
export async function demoCloseTrade(context: DemoContext): Promise<void> {
    const { instrumentAddress, walletAddress, snapshot, rpcConfig, publicClient, walletClient, kit } = context;

    if (snapshot.portfolio.position.size === ZERO) {
        console.log(`ℹ️ No position to close. Skipping close trade demo.`);
        return;
    }

    const position = snapshot.portfolio.position;
    const baseSize = position.size; // Already signed

    console.log(`ℹ️ Current position size: ${formatWad(abs(baseSize))}`);
    console.log(`ℹ️ Position side: ${baseSize >= ZERO ? 'LONG' : 'SHORT'}`);

    // Fetch quotation for closing
    const onchainContextWithQuotation = await fetchOnchainContext(
        instrumentAddress,
        PERP_EXPIRY,
        rpcConfig,
        walletAddress,
        -baseSize // Opposite sign to close
    );
    const quotation = onchainContextWithQuotation.quotation;

    if (!quotation) {
        throw new Error('Failed to fetch quotation');
    }

    const quotationWithSize = new QuotationWithSize(-baseSize, quotation);

    // Use TradeInput without `options.margin` to close the position.
    // This uses leverage-based margin simulation, so partial closes can release margin proportionally.
    const closeSignedSize = -baseSize;
    const closeSide = closeSignedSize >= ZERO ? Side.LONG : Side.SHORT;
    const closeInput = new TradeInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        abs(closeSignedSize), // positive quantity
        closeSide, // side determined from signed size
        DefaultUserSetting
    );

    const [tradeParam, simulation] = closeInput.simulate(snapshot, quotationWithSize);

    console.log(`📈 Closing position (limit tick: ${formatTick(tradeParam.limitTick)})...`);
    console.log(`ℹ️ Realized PnL: ${formatWad(simulation.realized)}`);

    const { sendTxWithLog } = await import('@synfutures/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'trade',
        args: [encodeTradeParam(tradeParam)],
        gas: BigInt(500000),
    });

    console.log(`✅ Position closed successfully!`);
}

/**
 * Demo: Adjust margin using AdjustInput
 */
export async function demoAdjustMargin(context: DemoContext): Promise<void> {
    const { instrumentAddress, walletAddress, instrumentSetting, snapshot, publicClient, walletClient, kit } = context;

    if (snapshot.portfolio.position.size === ZERO) {
        console.log(`ℹ️ No position to adjust margin for. Skipping adjust margin demo.`);
        return;
    }

    const position = snapshot.portfolio.position;
    const markPrice = snapshot.priceData.markPrice;

    console.log(`ℹ️ Current position margin: ${formatWad(position.balance)}`);
    console.log(`ℹ️ Current leverage: ${formatWad(position.leverage(snapshot.amm, markPrice))}`);

    // Add margin (transfer in)
    const marginAmountInWad = parseUnits('50', WAD_DECIMALS);
    const marginNeeded = wmul(marginAmountInWad, 10n ** BigInt(instrumentSetting.quoteDecimals));
    const marginFormatted = await formatTokenAmount(marginAmountInWad, instrumentSetting.quoteAddress, undefined, 6);
    console.log(`ℹ️ Adding margin: ${marginFormatted}`);

    await ensureMarginAndAllowance(snapshot, publicClient, walletClient, kit, marginNeeded);

    // Create AdjustInput and simulate
    const adjustInput = new AdjustInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        DefaultUserSetting,
        marginAmountInWad,
        true // transferIn
    );

    const [adjustParam, simulation] = adjustInput.simulate(snapshot);

    const postPosition = simulation.postPosition;
    const newLeverage = postPosition.leverage(snapshot.amm, markPrice);
    const newLiquidationPrice = postPosition.liquidationPrice(snapshot.amm, instrumentSetting.maintenanceMarginRatio);

    console.log(`📈 Adjusting margin (adding ${marginFormatted})...`);
    console.log(`ℹ️ New position margin: ${formatWad(postPosition.balance)}`);
    console.log(`ℹ️ New leverage: ${formatWad(newLeverage)}`);
    console.log(`ℹ️ Liquidation price: ${formatWad(newLiquidationPrice)}`);

    // Adjust margin uses trade function with size=0
    const { sendTxWithLog } = await import('@synfutures/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'trade',
        args: [encodeAdjustParam(adjustParam)],
        gas: BigInt(500000),
    });

    console.log(`✅ Margin adjusted successfully!`);
}

/**
 * Demo: Adjust leverage using AdjustInput
 */
export async function demoAdjustLeverage(context: DemoContext): Promise<void> {
    const { instrumentAddress, walletAddress, instrumentSetting, snapshot, publicClient, walletClient, kit } = context;

    if (snapshot.portfolio.position.size === ZERO) {
        console.log(`ℹ️ No position to adjust leverage for. Skipping adjust leverage demo.`);
        return;
    }

    const position = snapshot.portfolio.position;
    const markPrice = snapshot.priceData.markPrice;

    const currentLeverage = position.leverage(snapshot.amm, markPrice);
    const targetLeverage = parseUnits('2', WAD_DECIMALS); // 2x leverage

    console.log(`ℹ️ Current leverage: ${formatWad(currentLeverage)}x`);
    console.log(`ℹ️ Target leverage: ${formatWad(targetLeverage)}x`);

    // Create AdjustInput and simulate
    const targetLeverageUserSetting = new UserSetting(
        DefaultUserSetting.deadlineOffset,
        DefaultUserSetting.slippage,
        targetLeverage,
        DefaultUserSetting.markPriceBufferInBps,
        DefaultUserSetting.strictMode
    );
    const adjustInput = new AdjustInput(
        instrumentAddress,
        PERP_EXPIRY,
        walletAddress,
        targetLeverageUserSetting
    );

    const [adjustParam, simulation] = adjustInput.simulate(snapshot);

    const marginDelta = adjustParam.net;
    const marginNeeded = abs(marginDelta);
    const marginFormatted = await formatTokenAmount(marginNeeded, instrumentSetting.quoteAddress, undefined, 6);

    if (marginDelta > ZERO) {
        console.log(`ℹ️ Adding margin: ${marginFormatted}`);
        await ensureMarginAndAllowance(
            snapshot,
            publicClient,
            walletClient,
            kit,
            wmul(marginNeeded, 10n ** BigInt(instrumentSetting.quoteDecimals))
        );
    } else {
        console.log(`ℹ️ Withdrawing margin: ${marginFormatted}`);
    }

    const postPosition = simulation.postPosition;
    const newLeverage = postPosition.leverage(snapshot.amm, markPrice);
    const newLiquidationPrice = postPosition.liquidationPrice(snapshot.amm, instrumentSetting.maintenanceMarginRatio);

    console.log(`📈 Adjusting leverage to ${formatWad(targetLeverage)}x...`);
    console.log(`ℹ️ New position margin: ${formatWad(postPosition.balance)}`);
    console.log(`ℹ️ Margin delta: ${formatWad(marginDelta)}`);
    console.log(`ℹ️ Transfer in: ${marginDelta >= ZERO}`);
    console.log(`ℹ️ Liquidation price: ${formatWad(newLiquidationPrice)}`);

    // Adjust leverage uses trade function with size=0
    const { sendTxWithLog } = await import('@synfutures/viem-kit');
    await sendTxWithLog(publicClient, walletClient, kit, {
        address: instrumentAddress,
        abi: CURRENT_INSTRUMENT_ABI,
        functionName: 'trade',
        args: [encodeAdjustParam(adjustParam)],
        gas: BigInt(500000),
    });

    console.log(`✅ Leverage adjusted successfully!`);
}

// Register all trade demos
registerDemo({
    name: 'trade-by-margin',
    description: 'Execute a trade by specifying margin amount',
    category: 'trade',
    run: demoTradeByMargin,
});

registerDemo({
    name: 'trade-by-leverage',
    description: 'Execute a trade by specifying target leverage',
    category: 'trade',
    run: demoTradeByLeverage,
});

registerDemo({
    name: 'close-trade',
    description: 'Close an existing position',
    category: 'trade',
    prerequisites: ['trade-by-margin', 'trade-by-leverage'],
    run: demoCloseTrade,
});

registerDemo({
    name: 'adjust-margin',
    description: 'Add or remove margin from a position',
    category: 'trade',
    prerequisites: ['trade-by-margin'],
    run: demoAdjustMargin,
});

registerDemo({
    name: 'adjust-leverage',
    description: 'Adjust position leverage to a target value',
    category: 'trade',
    prerequisites: ['trade-by-margin'],
    run: demoAdjustLeverage,
});
