import type { Address } from 'viem';
import { wmul, wmulDown, wdiv, abs, ratioToWad, wadToTick, tickToWad, sqrtX96ToTick } from '../math';
import { RATIO_BASE, WAD, Q96, ONE_RATIO, DEFAULT_DEADLINE_SECONDS, DEFAULT_FUNDING_HOUR } from '../constants';
import { type Setting, type QuoteParam, Side, sideSign, Condition } from './contract';
import { type PairSnapshot } from './snapshot';
import { Errors, ErrorCode } from './error';

export class UserSetting {
    /**
     * Deadline duration offset, in seconds
     */
    private readonly deadlineSeconds: number;
    /**
     * slippage tolerance, in basis points
     */
    public readonly slippage: number;
    /**
     * Target leverage for trades and orders (in WAD, e.g., 3e18 for 3x leverage)
     */
    public readonly leverage: bigint;
    /**
     * Buffer for mark price adjustment in basis points to account for price changes, default: 0
     */
    public readonly markPriceBufferInBps: number;
    public readonly strictMode?: boolean;

    constructor(
        deadline: number,
        slippage: number,
        leverage: bigint,
        markPriceBufferInBps: number = 0,
        strictMode?: boolean
    ) {
        // Validate leverage is positive
        if (leverage <= 0n) {
            throw Errors.invalidLeverage(leverage);
        }

        this.deadlineSeconds = deadline;
        this.slippage = slippage;
        this.leverage = leverage;
        this.markPriceBufferInBps = markPriceBufferInBps;
        this.strictMode = strictMode;
    }

    /**
     * Returns the configured deadline offset in seconds.
     * Useful for diagnostics; not intended for direct calldata use.
     */
    get deadlineOffset(): number {
        return this.deadlineSeconds;
    }

    /**
     * Gets a valid deadline timestamp.
     * If deadline is provided and positive, returns currentTimestamp + deadline.
     * Otherwise, returns currentTimestamp + DEFAULT_DEADLINE_SECONDS (10 minutes).
     *
     * @param currentTimestamp - Current timestamp in seconds (defaults to Date.now() / 1000)
     */
    getDeadline(currentTimestamp?: number): number {
        const now = currentTimestamp ?? Math.floor(Date.now() / 1000);
        if (this.deadlineSeconds && this.deadlineSeconds > 0) {
            return now + this.deadlineSeconds;
        }
        return now + DEFAULT_DEADLINE_SECONDS;
    }

    /**
     * Gets the limit tick for a trade based on trade price and side.
     * Uses the slippage tolerance from this UserSetting.
     */
    getTradeLimitTick(tradePrice: bigint, side: Side): number {
        const sign = sideSign(side);
        const limitPrice = (tradePrice * (ONE_RATIO + BigInt(sign * this.slippage))) / ONE_RATIO;
        const limitTick = wadToTick(limitPrice);
        return sign > 0 ? limitTick : limitTick + 1;
    }

    /**
     * Gets encoded liquidity limit ticks from sqrt price.
     * Uses the slippage tolerance from this UserSetting.
     */
    getEncodedLiquidityLimitTicks(sqrtPX96: bigint): bigint {
        const sqrtStrikePX96Lower = sqrtPX96 - wmulDown(sqrtPX96, ratioToWad(this.slippage));
        const sqrtStrikePX96Upper = sqrtPX96 + wmulDown(sqrtPX96, ratioToWad(this.slippage));

        // Encode limit ticks from sqrt strike prices
        const INT24_MIN = -(1 << 23);
        const INT24_MAX = (1 << 23) - 1;
        const ZERO_TICK = 0n;
        const normalize = (tick: number): bigint => {
            const value = BigInt(tick);
            return value >= 0 ? value : (1n << 24n) + value;
        };

        // Add +1 to lowerTick to ensure the range includes the current price when converting from sqrt price to tick.
        // This accounts for rounding behavior in sqrtX96ToTick conversion.
        const lowerTick = sqrtStrikePX96Lower === ZERO_TICK ? INT24_MIN : sqrtX96ToTick(sqrtStrikePX96Lower) + 1;
        const upperTick = sqrtStrikePX96Upper === ZERO_TICK ? INT24_MAX : sqrtX96ToTick(sqrtStrikePX96Upper);

        return (normalize(lowerTick) << 24n) + normalize(upperTick);
    }

    /**
     * Validate this UserSetting's leverage against maximum allowed leverage.
     * Basic validation (leverage > 0) is done in constructor.
     * This method only validates against instrument-specific maximum leverage.
     *
     * @param maxLeverage - Maximum allowed leverage from instrument setting
     * @throws {ValidationError} If leverage exceeds maximum
     */
    validateLeverage(maxLeverage: bigint): void {
        if (maxLeverage > 0n && this.leverage > maxLeverage) {
            throw Errors.validation('Leverage exceeds maximum allowed', ErrorCode.INVALID_LEVERAGE, {
                leverage: this.leverage.toString(),
                maxLeverage: maxLeverage.toString(),
            });
        }
    }
}

const MIN_ORDER_MULTIPLIER = 2;
const MIN_RANGE_MULTIPLIER = 10;
export const MAX_SLIPPAGE = 10000;
export const MAX_CANCEL_ORDER_COUNT = 8;

export class InstrumentSetting {
    // Basic instrument info
    public readonly symbol: string;
    public readonly configAddress: Address;
    public readonly gateAddress: Address;
    public readonly marketAddress: Address;

    // Quote-related fields (grouped together)
    public readonly quoteAddress: Address;
    public readonly quoteDecimals: number;
    public readonly quoteParam: QuoteParam;

    // Margin ratios
    public readonly initialMarginRatio: number;
    public readonly maintenanceMarginRatio: number;

    // Flags and status
    public readonly condition: Condition;
    public readonly placePaused: boolean;
    public readonly fundingHour: number;
    public readonly disableOrderRebate: boolean;

    // Spacing
    public readonly pearlSpacing: number;
    public readonly orderSpacing: number;
    public readonly rangeSpacing: number;

    constructor(
        setting: Setting,
        condition: Condition,
        pearlSpacing: number,
        orderSpacing: number,
        rangeSpacing: number
    ) {
        // Basic instrument info
        this.symbol = setting.symbol;
        this.configAddress = setting.config;
        this.gateAddress = setting.gate;
        this.marketAddress = setting.market;

        // Quote-related fields (grouped together)
        this.quoteAddress = setting.quote;
        this.quoteDecimals = setting.decimals;
        this.quoteParam = setting.param;

        // Margin ratios
        this.initialMarginRatio = setting.initialMarginRatio;
        this.maintenanceMarginRatio = setting.maintenanceMarginRatio;

        // Flags and status
        this.condition = condition;
        this.placePaused = setting.placePaused;
        this.fundingHour = setting.fundingHour;
        this.disableOrderRebate = setting.disableOrderRebate;

        // Spacing
        this.pearlSpacing = pearlSpacing;
        this.orderSpacing = orderSpacing;
        this.rangeSpacing = rangeSpacing;
    }

    get imr(): number {
        return this.initialMarginRatio;
    }

    get mmr(): number {
        return this.maintenanceMarginRatio;
    }

    /**
     * Funding interval in seconds.
     * Uses fundingHour from setting, or DEFAULT_FUNDING_HOUR if not set.
     */
    get fundingSeconds(): number {
        const effectiveFundingHour = this.fundingHour > 0 ? this.fundingHour : DEFAULT_FUNDING_HOUR;
        return effectiveFundingHour * 3600;
    }

    /**
     * Minimum trade value based on initial margin ratio
     */
    get minTradeValue(): bigint {
        return (this.quoteParam.minMarginAmount * BigInt(RATIO_BASE)) / BigInt(this.initialMarginRatio);
    }

    /**
     * Minimum order value (2x minimum trade value)
     */
    get minOrderValue(): bigint {
        return this.minTradeValue * BigInt(MIN_ORDER_MULTIPLIER);
    }

    /**
     * Minimum range value (10x minimum trade value)
     */
    get minRangeValue(): bigint {
        return this.minTradeValue * BigInt(MIN_RANGE_MULTIPLIER);
    }

    /// liquidity = (margin * boost)/(2 * sqrt(fairPrice))
    /// boost = 2 * liquidity * sqrt(fairPrice) / margin
    /// margin * boost >= (param.minMarginAmount / IMR * 10)->
    ///         2 * liquidity * sqrt(fairPrice) >= (param.minMarginAmount / IMR * 10)
    /// that is liquidity >= (param.minMarginAmount / IMR * 10) / (2 * sqrt(fairPrice))
    minLiquidity(sqrtPX96: bigint): bigint {
        // Returns minRangeValue * Q96 / (2n * sqrtPX96)
        return (this.minRangeValue * Q96) / (2n * sqrtPX96);
    }

    /**
     * Minimum tick delta based on initial margin ratio
     */
    get minTickDelta(): number {
        // Formula: wadToTick(ratioToWad(initialMarginRatio) + WAD)
        return wadToTick(ratioToWad(this.initialMarginRatio) + WAD);
    }

    /**
     *  Order fee rebate ratio
     */
    get orderFeeRebateRatio(): number {
        return this.disableOrderRebate ? 0 : this.quoteParam.tradingFeeRatio;
    }

    /**
     * Align order tick to the nearest order spacing
     */
    alignOrderTick(tick: number): number {
        return this.orderSpacing * Math.round(tick / this.orderSpacing);
    }

    /**
     * Align tick to order spacing, ensuring it is strictly below the given reference tick.
     * Used for LONG limit orders that must be placed below the current AMM tick.
     *
     * @param referenceTick - The reference tick (e.g., post-trade AMM tick)
     * @returns Aligned tick that is strictly below the reference tick
     */
    alignTickStrictlyBelow(referenceTick: number): number {
        return this.orderSpacing * Math.floor((referenceTick - 1) / this.orderSpacing);
    }

    /**
     * Align tick to order spacing, ensuring it is strictly above the given reference tick.
     * Used for SHORT limit orders that must be placed above the current AMM tick.
     *
     * @param referenceTick - The reference tick (e.g., post-trade AMM tick)
     * @returns Aligned tick that is strictly above the reference tick
     */
    alignTickStrictlyAbove(referenceTick: number): number {
        return this.orderSpacing * Math.ceil((referenceTick + 1) / this.orderSpacing);
    }

    /**
     * Align limit order target price to the nearest order spacing tick
     */
    alignLimitOrderTargetPrice(price: bigint): { alignedTick: number; alignedPrice: bigint } {
        const alignedTick = this.alignOrderTick(wadToTick(price));
        const alignedPrice = tickToWad(alignedTick);
        return { alignedTick, alignedPrice };
    }

    /**
     * Align limit order target tick to the nearest order spacing tick
     */
    alignLimitOrderTargetTick(tick: number): { alignedTick: number; alignedPrice: bigint } {
        const alignedTick = this.alignOrderTick(tick);
        const alignedPrice = tickToWad(alignedTick);
        return { alignedTick, alignedPrice };
    }

    /**
     * Get limit order boundaries based on mark price and IMR
     */
    getLimitOrderBoundaries(markPrice: bigint): { maxTickUpper: number; minTickLower: number } {
        const maxDiff = wmul(markPrice, ratioToWad(this.imr)) * 2n;
        const rawUpperTick = wadToTick(markPrice + maxDiff);
        const rawLowerTick = wadToTick(markPrice - maxDiff);
        let maxTickUpper = this.orderSpacing * Math.floor(rawUpperTick / this.orderSpacing);
        let minTickLower = this.orderSpacing * Math.ceil(rawLowerTick / this.orderSpacing);

        // Check if raw ticks are within order limit (2 * IMR)
        if (wdiv(abs(tickToWad(rawUpperTick) - markPrice), markPrice) > ratioToWad(this.imr) * 2n) {
            maxTickUpper -= this.orderSpacing;
        }

        if (wdiv(abs(tickToWad(rawLowerTick) - markPrice), markPrice) > ratioToWad(this.imr) * 2n) {
            minTickLower += this.orderSpacing;
        }

        return {
            maxTickUpper,
            minTickLower,
        };
    }

    /**
     * Align range tick lower bound
     */
    alignRangeTickLower(tickLower: number): number {
        if (tickLower > 0) {
            return this.rangeSpacing * Math.trunc(tickLower / this.rangeSpacing);
        }
        return this.rangeSpacing * Math.trunc((tickLower - (this.rangeSpacing - 1)) / this.rangeSpacing);
    }

    /**
     * Align range tick upper bound
     */
    alignRangeTickUpper(tickUpper: number): number {
        if (tickUpper < 0) {
            return this.rangeSpacing * Math.trunc(tickUpper / this.rangeSpacing);
        }
        return this.rangeSpacing * Math.trunc((tickUpper + (this.rangeSpacing - 1)) / this.rangeSpacing);
    }

    get maxLeverage(): bigint {
        return (WAD * BigInt(RATIO_BASE)) / BigInt(this.initialMarginRatio);
    }

}
