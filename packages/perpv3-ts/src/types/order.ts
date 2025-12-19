import { abs, asInt24, asUint24, max, shiftLeft, shiftRight, tickToWad, wdiv, wdivUp, wmul, wmulUp } from '../math';
import { MAX_UINT_24, MAX_UINT_48, RATIO_BASE, ZERO } from '../constants';
import { Errors } from './error';

export class Order {
    public readonly balance: bigint; // uint128
    public readonly size: bigint; // int128
    public readonly tick: number;
    public readonly nonce: number;

    private readonly _targetPrice: bigint; // cached price at tick

    constructor(balance: bigint, size: bigint, tick: number, nonce: number) {
        this.balance = balance;
        this.size = size;
        this.tick = tick;
        this.nonce = nonce;

        this._targetPrice = tickToWad(tick);
    }

    /**
     * Get the target price (price at tick) for this order.
     * @returns Target price in WAD format
     */
    get targetPrice(): bigint {
        return this._targetPrice;
    }

    /**
     * Get the notional value of this order at the target price.
     * Formula: value = targetPrice * abs(size)
     * @returns Order value in WAD format
     */
    get value(): bigint {
        return wmul(this._targetPrice, abs(this.size));
    }

    /**
     * Calculate order leverage based on mark price and taken amount
     */
    leverage(markPrice: bigint, taken: bigint = ZERO): bigint {
        const price = taken === ZERO ? this.targetPrice : markPrice;

        const value = wmul(price, abs(this.size));
        return wdiv(value, this.balance);
    }

    /**
     * Calculate order margin required for a specified leverage.
     * Uses max(targetPrice, markPrice) to deduce the base margin, then applies a buffer to the final margin.
     *
     * Formula: margin = max(targetPrice, markPrice) * abs(size) / leverage * (1 + marginBufferInBps/RATIO_BASE)
     *
     * Note: If leverage <= instrumentSetting.maxLeverage, then this margin will always satisfy IMR requirements
     * (since maxLeverage = 10000 / IMR, ensuring 1/leverage >= IMR/10000).
     *
     * @param markPrice - Current mark price (in WAD format)
     * @param leverage - Target leverage (in WAD format, e.g., 3 * WAD for 3x leverage)
     *                   Note: The passed leverage should not exceed instrumentSetting.maxLeverage.
     *                   Callers should validate leverage before calling this method.
     * @param marginBufferInBps - Buffer for margin adjustment in basis points to account for price changes
     *                           (e.g., 100 = 1%). Default: 0 (no buffer).
     *                           Typically use userSetting.markPriceBufferInBps for limit orders.
     * @returns Margin required for the specified leverage (in WAD format)
     */
    marginForLeverage(markPrice: bigint, leverage: bigint, marginBufferInBps: number = 0): bigint {
        const baseQuantity = abs(this.size);

        // Use max(targetPrice, markPrice) to deduce the base margin, by design of oyster amm
        const effectivePrice = max(this.targetPrice, markPrice);

        // Calculate base margin: effectivePrice * baseQuantity / leverage
        // Using wdivUp and wmulUp for conservative (rounding up) calculation
        const baseMargin = wdivUp(wmulUp(effectivePrice, baseQuantity), leverage);

        // Apply buffer to the final margin if specified
        // e.g., marginBufferInBps=100 means 100/10000 = 1% = 0.01
        if (marginBufferInBps > 0) {
            // Use ceiling division to round up: (a * b + d - 1n) / d
            return (
                (baseMargin * (BigInt(RATIO_BASE) + BigInt(marginBufferInBps)) + BigInt(RATIO_BASE) - 1n) /
                BigInt(RATIO_BASE)
            );
        }

        return baseMargin;
    }

    /**
     * Pack order key from tick and nonce
     */
    static packKey(tick: number, nonce: number): number {
        return shiftLeft(asUint24(tick), 24) + nonce;
    }

    /**
     * Unpack order key to tick and nonce
     */
    static unpackKey(key: number | bigint): { tick: number; nonce: number } {
        const numericKey = Number(key);
        if (numericKey > Number(MAX_UINT_48)) {
            throw Errors.invalidKey(numericKey);
        }
        const tick = asInt24(shiftRight(numericKey, 24));
        const nonce = numericKey & Number(MAX_UINT_24);
        return { tick, nonce };
    }
}
