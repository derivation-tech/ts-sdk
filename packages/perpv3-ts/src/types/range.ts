import { MAX_UINT_24, MAX_UINT_48, ONE, Q96, RATIO_DECIMALS, ZERO } from '../constants';
import {
    abs,
    asInt24,
    asUint24,
    mulDivRoundingUp,
    ratioToWad,
    shiftLeft,
    shiftRight,
    sqrtX96ToWad,
    tickToSqrtX96,
    wmul,
    wmulDown,
    wmulUp,
} from '../math';
import { Errors, ErrorCode } from './error';
import { Position } from './position';
import type { Amm } from './contract';

export class Range {
    public readonly liquidity: bigint; // uint128
    public readonly entryFeeIndex: bigint; // uint128
    public readonly balance: bigint; // uint96
    public readonly sqrtEntryPX96: bigint; // uint160
    public readonly tickLower: number;
    public readonly tickUpper: number;

    constructor(
        liquidity: bigint,
        entryFeeIndex: bigint,
        balance: bigint,
        sqrtEntryPX96: bigint,
        tickLower: number,
        tickUpper: number
    ) {
        this.liquidity = liquidity;
        this.entryFeeIndex = entryFeeIndex;
        this.balance = balance;
        this.sqrtEntryPX96 = sqrtEntryPX96;
        this.tickLower = tickLower;
        this.tickUpper = tickUpper;
    }

    /**
     * Calculate the entry delta base for this range
     */
    entryDeltaBase(): bigint {
        const sqrtUpperPX96 = tickToSqrtX96(this.tickUpper);
        return this.deltaBase(this.sqrtEntryPX96, sqrtUpperPX96);
    }

    /**
     * Calculate the entry delta quote for this range
     */
    entryDeltaQuote(): bigint {
        const sqrtLowerPX96 = tickToSqrtX96(this.tickLower);
        return this.deltaQuote(sqrtLowerPX96, this.sqrtEntryPX96);
    }

    /**
     * Convert this range to a position based on current AMM state
     */
    toPosition(amm: Amm): Position {
        const sqrtUpperPX96 = tickToSqrtX96(this.tickUpper);
        const sqrtLowerPX96 = tickToSqrtX96(this.tickLower);
        const fair = sqrtX96ToWad(amm.sqrtPX96);
        const entryDeltaBase = this.entryDeltaBase();
        const entryDeltaQuote = this.entryDeltaQuote();

        let removeDeltaBase = ZERO;
        let removeDeltaQuote = ZERO;

        if (amm.tick < this.tickLower) {
            removeDeltaBase = this.deltaBase(sqrtLowerPX96, sqrtUpperPX96);
        } else if (amm.tick < this.tickUpper) {
            removeDeltaBase = this.deltaBase(amm.sqrtPX96, sqrtUpperPX96);
            removeDeltaQuote = this.deltaQuote(sqrtLowerPX96, amm.sqrtPX96);
        } else {
            removeDeltaQuote = this.deltaQuote(sqrtLowerPX96, sqrtUpperPX96);
        }

        const earnedByBase = wmul(removeDeltaBase - entryDeltaBase, fair);
        const earnedByQuote = removeDeltaQuote - entryDeltaQuote;
        const pnl = earnedByBase + earnedByQuote;
        const fee = wmulDown(amm.feeIndex - this.entryFeeIndex, this.liquidity);
        const size = removeDeltaBase - entryDeltaBase;

        const balance = this.balance + fee + pnl - 1n;
        const entryNotional = wmul(fair, abs(size));
        const entrySocialLossIndex = size > ZERO ? amm.longSocialLossIndex : amm.shortSocialLossIndex;
        const entryFundingIndex = size > ZERO ? amm.longFundingIndex : amm.shortFundingIndex;

        return new Position(balance, size, entryNotional, entrySocialLossIndex, entryFundingIndex);
    }

    /**
     * Calculate position if liquidity is removed at the lower tick
     */
    lowerPositionIfRemove(amm: Amm): Position {
        return this.toPosition({
            ...amm,
            tick: this.tickLower,
            sqrtPX96: tickToSqrtX96(this.tickLower),
        });
    }

    /**
     * Calculate position if liquidity is removed at the upper tick
     */
    upperPositionIfRemove(amm: Amm): Position {
        return this.toPosition({
            ...amm,
            tick: this.tickUpper,
            sqrtPX96: tickToSqrtX96(this.tickUpper),
        });
    }

    /**
     * Calculate the value locked in this range
     */
    valueLocked(amm: Amm, markPrice: bigint): bigint {
        const position = this.toPosition(amm);
        return position.equity(amm, markPrice);
    }

    /**
     * Calculate the fee earned by this range
     */
    feeEarned(amm: Amm): bigint {
        return wmulDown(amm.feeIndex - this.entryFeeIndex, this.liquidity);
    }

    /**
     * Calculate liquidity from margin using the upper tick constraint
     */
    calcLiquidityFromMarginByUpper(sqrtEntryPX96: bigint, entryMargin: bigint, initialMarginRatio: number): bigint {
        const sqrtUpperPX96 = tickToSqrtX96(this.tickUpper);
        const numerator = (entryMargin * sqrtEntryPX96) / (sqrtUpperPX96 - sqrtEntryPX96);
        const denominator = sqrtUpperPX96 - sqrtEntryPX96 + wmulUp(sqrtUpperPX96, ratioToWad(initialMarginRatio));
        return (numerator * Q96) / denominator;
    }

    /**
     * Calculate liquidity from margin using the lower tick constraint
     */
    calcLiquidityFromMarginByLower(sqrtEntryPX96: bigint, entryMargin: bigint, initialMarginRatio: number): bigint {
        const sqrtLowerPX96 = tickToSqrtX96(this.tickLower);
        const numerator = (entryMargin * sqrtEntryPX96) / (sqrtEntryPX96 - sqrtLowerPX96);
        const denominator = sqrtEntryPX96 - sqrtLowerPX96 + wmulUp(sqrtLowerPX96, ratioToWad(initialMarginRatio));
        return (numerator * Q96) / denominator;
    }

    /**
     * Calculate entry delta (deltaBase, deltaQuote, liquidity) for this range
     */
    calcEntryDelta(
        sqrtEntryPX96: bigint,
        entryMargin: bigint,
        initialMarginRatio: number
    ): { deltaBase: bigint; deltaQuote: bigint; liquidity: bigint } {
        const upperPX96 = tickToSqrtX96(this.tickUpper);
        const lowerPX96 = tickToSqrtX96(this.tickLower);
        const liquidityByUpper = this.calcLiquidityFromMarginByUpper(sqrtEntryPX96, entryMargin, initialMarginRatio);
        const liquidityByLower = this.calcLiquidityFromMarginByLower(sqrtEntryPX96, entryMargin, initialMarginRatio);
        const liquidity = liquidityByUpper < liquidityByLower ? liquidityByUpper : liquidityByLower;
        const deltaBase = this.getDeltaBaseAutoRoundUp(sqrtEntryPX96, upperPX96, liquidity);
        const deltaQuote = this.getDeltaQuoteAutoRoundUp(lowerPX96, sqrtEntryPX96, liquidity);

        return { deltaBase, deltaQuote, liquidity };
    }

    /**
     * Calculate margin required from liquidity
     */
    calcMarginFromLiquidity(sqrtEntryPX96: bigint, liquidity: bigint, initialMarginRatio: number): bigint {
        const sqrtUpperPX96 = tickToSqrtX96(this.tickUpper);
        const denominator = wmulUp(sqrtUpperPX96, ratioToWad(10_000 + initialMarginRatio)) - sqrtEntryPX96;
        const temp = (liquidity * denominator) / Q96;
        return (temp * (sqrtUpperPX96 - sqrtEntryPX96)) / sqrtEntryPX96;
    }

    /**
     * Calculate delta base with automatic rounding (round up for positive liquidity, round down for negative)
     * Uses this range's liquidity by default, but can be overridden
     */
    getDeltaBaseAutoRoundUp(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity?: bigint): bigint {
        const actualLiquidity = liquidity ?? this.liquidity;
        return actualLiquidity < ZERO
            ? -this.getDeltaBase(sqrtRatioAX96, sqrtRatioBX96, -actualLiquidity, false)
            : this.getDeltaBase(sqrtRatioAX96, sqrtRatioBX96, actualLiquidity, true);
    }

    /**
     * Calculate delta quote with automatic rounding (round up for positive liquidity, round down for negative)
     * Uses this range's liquidity by default, but can be overridden
     */
    getDeltaQuoteAutoRoundUp(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity?: bigint): bigint {
        const actualLiquidity = liquidity ?? this.liquidity;
        return actualLiquidity < ZERO
            ? -this.getDeltaQuote(sqrtRatioAX96, sqrtRatioBX96, -actualLiquidity, false)
            : this.getDeltaQuote(sqrtRatioAX96, sqrtRatioBX96, actualLiquidity, true);
    }

    /**
     * Calculate delta base between two sqrt prices
     * Uses this range's liquidity by default, but can be overridden
     */
    getDeltaBase(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity?: bigint, roundUp: boolean = true): bigint {
        const actualLiquidity = liquidity ?? this.liquidity;
        if (sqrtRatioAX96 > sqrtRatioBX96) {
            [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
        }
        const numerator1 = actualLiquidity << 96n;
        const numerator2 = sqrtRatioBX96 - sqrtRatioAX96;
        return roundUp
            ? mulDivRoundingUp(mulDivRoundingUp(numerator1, numerator2, sqrtRatioBX96), ONE, sqrtRatioAX96)
            : (numerator1 * numerator2) / sqrtRatioBX96 / sqrtRatioAX96;
    }

    /**
     * Calculate delta quote between two sqrt prices
     * Uses this range's liquidity by default, but can be overridden
     */
    getDeltaQuote(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, liquidity?: bigint, roundUp: boolean = true): bigint {
        const actualLiquidity = liquidity ?? this.liquidity;
        if (sqrtRatioAX96 > sqrtRatioBX96) {
            [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
        }
        const difference = sqrtRatioBX96 - sqrtRatioAX96;
        return roundUp ? mulDivRoundingUp(actualLiquidity, difference, Q96) : (difference * actualLiquidity) / Q96;
    }

    /**
     * Calculate delta base using this range's liquidity
     */
    deltaBase(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint): bigint {
        return this.getDeltaBaseAutoRoundUp(sqrtRatioAX96, sqrtRatioBX96);
    }

    /**
     * Calculate delta quote using this range's liquidity
     */
    deltaQuote(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint): bigint {
        return this.getDeltaQuoteAutoRoundUp(sqrtRatioAX96, sqrtRatioBX96);
    }

    /**
     * Pack range key from tickLower and tickUpper
     */
    static packKey(tickLower: number, tickUpper: number): number {
        return shiftLeft(asUint24(tickLower), 24) + asUint24(tickUpper);
    }

    /**
     * Unpack range key to tickLower and tickUpper
     */
    static unpackKey(key: number | bigint): { tickLower: number; tickUpper: number } {
        const numericKey = Number(key);
        if (numericKey > Number(MAX_UINT_48)) {
            throw Errors.invalidKey(numericKey);
        }
        const tickLower = asInt24(shiftRight(numericKey, 24));
        const tickUpper = asInt24(numericKey & Number(MAX_UINT_24));
        return { tickLower, tickUpper };
    }

    /**
     * Calculate minimum margin required to create a liquidity range with the given liquidity amount.
     *
     * @param liquidity - The liquidity amount to calculate margin requirement for
     */
    static minMargin(tickLower: number, tickUpper: number, sqrtPX96: bigint, liquidity: bigint, imr: number): bigint {
        const tempRange = new Range(0n, 0n, 0n, sqrtPX96, tickLower, tickUpper);
        return tempRange.calcMarginFromLiquidity(sqrtPX96, liquidity, imr);
    }

    /**
     * Convert tick delta to alpha number (price ratio).
     *
     * @param tickDelta - The tick delta value
     * @returns The alpha number (price ratio)
     */
    static tickDeltaToAlphaNumber(tickDelta: number): number {
        if (tickDelta === 0) return 0;

        // Get sqrt ratio directly and convert to price number
        const sqrtRatio = tickToSqrtX96(tickDelta);
        // Convert sqrtRatio to price: (sqrtRatio / 2^96)^2
        // Using Number conversion for efficiency since we want the final result as number
        const sqrtRatioNumber = Number(sqrtRatio) / Number(Q96);
        return sqrtRatioNumber * sqrtRatioNumber;
    }

    /**
     * Calculate capital efficiency boost for symmetric range.
     *
     * @param alpha - The alpha value (price ratio)
     * @param imr - Initial margin ratio (in basis points, e.g., 1000 = 10%)
     * @returns The boost value
     */
    static calcBoost(alpha: number, imr: number): number {
        if (alpha === 1) {
            throw Errors.calculation('Invalid alpha', ErrorCode.CALCULATION_FAILED, { alpha });
        }
        const ratio = imr / 10 ** RATIO_DECIMALS;
        return -2 / (alpha * (ratio + 1) - Math.sqrt(alpha)) / (1 / Math.sqrt(alpha) - 1);
    }

    /**
     * Calculate capital efficiency boost for asymmetric range.
     *
     * @param alphaLower - The alpha value for lower tick
     * @param alphaUpper - The alpha value for upper tick
     * @param imr - Initial margin ratio (in basis points, e.g., 1000 = 10%)
     * @returns The boost value
     */
    static calcAsymmetricBoost(alphaLower: number, alphaUpper: number, imr: number): number {
        if (alphaLower === 1 && alphaUpper === 1) {
            throw Errors.calculation('Invalid alpha and beta', ErrorCode.CALCULATION_FAILED, {
                alphaLower,
                alphaUpper,
                imr,
            });
        }
        const ratio = imr / 10 ** RATIO_DECIMALS;
        const boostLower = 2 / (1 / Math.sqrt(alphaLower) - 1) / ((1 / Math.sqrt(alphaLower)) * (1 - ratio) - 1);
        const boostUpper = Range.calcBoost(alphaUpper, imr);
        return Math.min(boostLower, boostUpper);
    }
}
