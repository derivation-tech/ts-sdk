import type { Address } from 'viem';
import { ZERO } from '../constants';
import { Errors, ErrorCode } from '../types/error';
import { Order } from '../types/order';
import { QuotationWithSize } from '../types/quotation';
import { UserSetting } from '../types';
import { type PlaceParam, type TradeParam, Side } from '../types/contract';
import { PairSnapshot } from '../types/snapshot';
import { TradeInput, type TradeSimulation } from './trade';
import { PlaceInput, type PlaceInputSimulation } from './order';

// ============================================================================
// Cross Limit Order
// ============================================================================

/**
 * CrossLimitOrderInput simulates a cross limit order that combines:
 * 1. A market trade leg (executed immediately at current price)
 * 2. A limit order leg (placed at target tick after market execution)
 *
 * The order splits the total baseQuantity into two parts:
 * - Market leg: Uses quotationWithSize.baseQuantity (determined by targetTick)
 * - Limit leg: Remaining baseQuantity after market execution
 *
 * This is useful for strategies that want to:
 * - Push the price to a target level (via market trade)
 * - Place a limit order at a better price after the push
 */
export class CrossLimitOrderInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;

    public readonly userSetting: UserSetting;

    public readonly side: Side;
    public readonly baseQuantity: bigint;
    public readonly targetTick: number;

    /**
     * Create a new CrossLimitOrderInput instance.
     *
     * @param instrumentAddress - Address of the instrument contract
     * @param expiry - Expiry identifier for the futures/perpetual contract (PERP_EXPIRY for perpetuals, Unix timestamp for futures)
     * @param traderAddress - Address of the trader placing the order
     * @param side - Order side (LONG or SHORT)
     * @param baseQuantity - Total base quantity to split between market and limit legs
     * @param targetTick - Target tick for the market leg (determines how much to trade)
     * @param userSetting - User settings (deadline, slippage, leverage, etc.)
     */
    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        side: Side,
        baseQuantity: bigint,
        targetTick: number,
        userSetting: UserSetting
    ) {
        if (baseQuantity <= 0n) {
            throw Errors.validation('baseQuantity must be positive', ErrorCode.INVALID_SIZE, {
                baseQuantity: baseQuantity.toString(),
            });
        }

        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.side = side;
        this.baseQuantity = baseQuantity;
        this.targetTick = targetTick;
        this.userSetting = userSetting;
    }

    /**
     * Simulate the cross limit order by splitting it into market and limit legs.
     *
     * Process:
     * 1. Validate target tick is on correct side of current AMM tick
     * 2. Validate quotationWithSize matches the expected side
     * 3. Simulate market leg trade using TradeInput
     * 4. Validate market leg meets minimum trade value (for new positions)
     * 5. Calculate remaining base quantity for limit leg
     * 6. Update snapshot with post-market AMM tick
     * 7. Calculate and validate limit order tick (must be on correct side of post-market tick)
     * 8. Simulate limit leg order using PlaceInput
     * 9. Aggregate results and return simulation
     *
     * @param snapshot - Pair snapshot with current on-chain state
     * @param quotationWithSize - Quotation for the market leg trade (determines market leg size)
     * @returns CrossLimitOrderSimulation with both legs' parameters and aggregated totals
     * @throws {ValidationError} If validation fails (tick, size, leverage, etc.)
     * @throws {SimulationError} If simulation fails (instrument not tradable, etc.)
     */
    simulate(snapshot: PairSnapshot, quotationWithSize: QuotationWithSize): CrossLimitOrderSimulation {
        const { instrumentSetting, portfolio } = snapshot;

        // Validate leverage
        this.userSetting.validateLeverage(instrumentSetting.maxLeverage);

        const amm = snapshot.amm;
        const isLong = this.side === Side.LONG;

        // Validate target tick is on the correct side of current AMM tick
        // For LONG: targetTick must be > amm.tick (above current price)
        // For SHORT: targetTick must be < amm.tick (below current price)
        if ((isLong && this.targetTick <= amm.tick) || (!isLong && this.targetTick >= amm.tick)) {
            throw Errors.validation('Target tick is on the wrong side of current price', ErrorCode.INVALID_TICK, {
                targetTick: this.targetTick,
                ammTick: amm.tick,
            });
        }

        // Validate quotation matches expected side
        // For LONG: quotation size should be positive
        // For SHORT: quotation size should be negative
        if (isLong ? quotationWithSize.size < ZERO : quotationWithSize.size > ZERO) {
            throw Errors.validation('Swap quote returned opposite side', ErrorCode.INVALID_SIZE, {
                swapSize: quotationWithSize.size.toString(),
            });
        }

        // Simulate market leg: execute trade immediately at current price
        // The market leg size is determined by quotationWithSize.baseQuantity
        const marketTradeInput = new TradeInput(
            this.instrumentAddress,
            this.expiry,
            this.traderAddress,
            quotationWithSize.baseQuantity,
            this.side,
            this.userSetting
        );

        const [marketTradeParam, marketSimulation] = marketTradeInput.simulate(snapshot, quotationWithSize);

        // Validate market leg meets minimum trade value requirement (only for opening new positions)
        // This prevents dust trades when opening positions
        if (
            portfolio.position.size === ZERO &&
            quotationWithSize.quotation.entryNotional < instrumentSetting.minTradeValue
        ) {
            throw Errors.validation('Market trade size too small for opening new position', ErrorCode.INVALID_SIZE, {
                entryNotional: quotationWithSize.quotation.entryNotional.toString(),
                minTradeValue: instrumentSetting.minTradeValue.toString(),
            });
        }

        // Calculate remaining base quantity for limit leg
        // Limit leg gets whatever is left after market execution
        const remainingBase = this.baseQuantity - quotationWithSize.baseQuantity;
        if (remainingBase <= ZERO) {
            throw Errors.validation('No remaining size for limit order after market trade', ErrorCode.INVALID_SIZE, {
                totalBase: this.baseQuantity.toString(),
                marketBase: quotationWithSize.baseQuantity.toString(),
                remainingBase: remainingBase.toString(),
            });
        }

        // After market execution, the AMM tick moves to postTick
        // For limit order validation, we need to use the post-market tick, not the original tick
        const postAmmTick = quotationWithSize.quotation.postTick;
        // Place validation relies on both `amm.tick` (side check) and `amm.sqrtPX96` (fair-price deviation check).
        // Use post-trade values from quotation to avoid inconsistent snapshot state.
        const updatedAmm = { ...amm, tick: postAmmTick, sqrtPX96: quotationWithSize.quotation.sqrtPostFairPX96 };
        const updatedSnapshot = snapshot.with({ amm: updatedAmm });

        // Calculate limit order tick: must be on the correct side of post-market tick
        // For LONG orders: limit tick must be < postAmmTick (below post-market price)
        // For SHORT orders: limit tick must be > postAmmTick (above post-market price)
        //
        // The market leg execution moves the AMM price from the current tick to `postAmmTick`.
        // The limit order must be placed at a price better than the new market price:
        // - LONG orders: placed below market (tick < postAmmTick) to buy at a lower price
        // - SHORT orders: placed above market (tick > postAmmTick) to sell at a higher price
        //
        // If the original `targetTick` is no longer valid (on wrong side of `postAmmTick`),
        // we adjust it to be one `orderSpacing` away from `postAmmTick` on the correct side.
        // This ensures the limit order is always placeable after the market leg execution.
        let limitOrderTick = instrumentSetting.alignOrderTick(this.targetTick);
        if (isLong) {
            // Must be strictly below post-trade AMM tick, and aligned to orderSpacing.
            if (limitOrderTick >= postAmmTick) {
                limitOrderTick = instrumentSetting.alignTickStrictlyBelow(postAmmTick);
            }
        } else {
            // Must be strictly above post-trade AMM tick, and aligned to orderSpacing.
            if (limitOrderTick <= postAmmTick) {
                limitOrderTick = instrumentSetting.alignTickStrictlyAbove(postAmmTick);
            }
        }

        // Simulate limit leg: place order at calculated tick with remaining base quantity
        const limitOrderPlaceInput = new PlaceInput(
            this.instrumentAddress,
            this.expiry,
            this.traderAddress,
            limitOrderTick,
            remainingBase,
            this.side,
            this.userSetting
        );

        const [limitPlaceParam, limitSimulation] = limitOrderPlaceInput.simulate(updatedSnapshot);

        // Calculate limit leg trade value using Order getter
        const limitOrder = new Order(limitPlaceParam.amount, limitPlaceParam.size, limitPlaceParam.tick, 0);
        const limitTradeValue = limitOrder.value;

        // Aggregate results from both legs
        const result: CrossLimitOrderSimulation = {
            tradeParam: marketTradeParam,
            tradeSimulation: marketSimulation,
            placeParam: limitPlaceParam,
            placeSimulation: limitSimulation,
            totalMarginRequired: marketSimulation.marginDelta + limitPlaceParam.amount,
            // totalTradeValueInQuote represents the estimated total notional (market leg executed quote + limit leg target quote)
            totalTradeValueInQuote: quotationWithSize.tradeValue + limitTradeValue,
        };

        return result;
    }
}

/**
 * Simulation result for CrossLimitOrderInput.
 *
 * Contains parameters and simulation results for both legs:
 * - Market leg: tradeParam and tradeSimulation
 * - Limit leg: placeParam and placeSimulation
 *
 * Also includes aggregated totals:
 * - totalMarginRequired: Sum of margin required for both legs
 * - totalTradeValueInQuote: Estimated total notional value in quote token
 *
 * Note: Some fields can be derived from others:
 * - Market base size: abs(tradeParam.size)
 * - Limit base size: abs(placeParam.size)
 */
export interface CrossLimitOrderSimulation {
    /** Parameters for the market leg trade */
    tradeParam: TradeParam;
    /** Simulation result for the market leg trade */
    tradeSimulation: TradeSimulation;
    /** Parameters for the limit leg order */
    placeParam: PlaceParam;
    /** Simulation result for the limit leg order */
    placeSimulation: PlaceInputSimulation;
    /** Total margin required for both legs combined */
    totalMarginRequired: bigint;
    /** Total trade value in quote token (market leg executed value + limit leg target value) */
    totalTradeValueInQuote: bigint;
}
