import type { Address } from 'viem';
import { abs, sqrtX96ToWad, wdiv } from '../math';
import { ZERO } from '../constants';
import { inquireByTick } from '../queries';
import type { ApiConfig, RpcConfig } from '../queries/config';
import { Errors, ErrorCode } from './error';
import { Side, type Quotation } from './contract';

/**
 * QuotationWithSize combines a Quotation with size (signed: positive for LONG, negative for SHORT).
 * Provides getters for common quotation-related calculations.
 */
export class QuotationWithSize {
    public readonly size: bigint; // signed base size
    public readonly quotation: Quotation;

    constructor(size: bigint, quotation: Quotation) {
        this.size = size;
        this.quotation = quotation;
    }

    /**
     * Absolute base quantity (always positive).
     */
    get baseQuantity(): bigint {
        return abs(this.size);
    }

    /**
     * Quote size (absolute entry notional).
     */
    get quoteSize(): bigint {
        return abs(this.quotation.entryNotional);
    }

    /**
     * Trade price = entryNotional / baseQuantity
     */
    get tradePrice(): bigint {
        return wdiv(this.quotation.entryNotional, this.baseQuantity);
    }

    /**
     * Trade value (total entry notional).
     */
    get tradeValue(): bigint {
        return this.quotation.entryNotional;
    }

    /**
     * Trading fee (includes trading fees and protocol fees).
     */
    get tradingFee(): bigint {
        return this.quotation.fee;
    }

    /**
     * Price impact between fair prices pre/post trade.
     * Price impact = (postFair - preFair) / preFair
     */
    get priceImpact(): bigint {
        const preFair = sqrtX96ToWad(this.quotation.sqrtFairPX96);
        if (preFair === ZERO) {
            return ZERO;
        }
        const postFair = sqrtX96ToWad(this.quotation.sqrtPostFairPX96);
        return wdiv(postFair - preFair, preFair);
    }
}

/**
 * Builds a QuotationWithSize by inquiring at ticks around the target tick.
 * For LONG orders, it checks ticks above the target; for SHORT orders, it checks ticks below.
 *
 * @param instrumentAddress - Instrument contract address
 * @param expiry - Expiry timestamp
 * @param side - Order side (LONG or SHORT)
 * @param targetTick - Target tick to reach
 * @param config - API or RPC configuration
 * @param inquireResult - Optional pre-fetched inquire results
 * @returns QuotationWithSize with size and quotation that reaches the target tick
 */
export async function buildInquireByTickResult(
    instrumentAddress: Address,
    expiry: number,
    side: Side,
    targetTick: number,
    config: ApiConfig | RpcConfig,
    inquireResult?: {
        firstQuote: QuotationWithSize;
        secondQuote?: QuotationWithSize;
    }
): Promise<QuotationWithSize> {
    const isLong = side === Side.LONG;
    const primaryTick = isLong ? targetTick + 1 : targetTick - 1;
    const primaryQuote =
        inquireResult?.firstQuote ?? (await inquireByTick(instrumentAddress, expiry, primaryTick, config));

    if (isLong ? primaryQuote.quotation.postTick > targetTick : primaryQuote.quotation.postTick < targetTick) {
        return new QuotationWithSize(primaryQuote.size, primaryQuote.quotation);
    }

    const secondaryTick = isLong ? primaryTick + 1 : primaryTick - 1;
    const secondaryQuote =
        inquireResult?.secondQuote ?? (await inquireByTick(instrumentAddress, expiry, secondaryTick, config));

    if (!(isLong ? secondaryQuote.quotation.postTick > targetTick : secondaryQuote.quotation.postTick < targetTick)) {
        throw Errors.simulation('Failed to reach target tick with inquireByTick', ErrorCode.SIMULATION_FAILED, {
            targetTick,
            primaryTick,
            secondaryTick,
        });
    }

    return new QuotationWithSize(secondaryQuote.size, secondaryQuote.quotation);
}
