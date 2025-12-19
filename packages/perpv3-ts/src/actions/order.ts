import type { Address } from 'viem';
import { abs, wmulDown, ratioToWad, tickToWad } from '../math';
import { Order } from '../types/order';
import { UserSetting } from '../types';
import { type PlaceParam, Side, sideSign } from '../types/contract';
import { PairSnapshot } from '../types/snapshot';
import { Errors, ErrorCode } from '../types/error';

export class PlaceInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;

    public readonly tick: number;
    public readonly baseQuantity: bigint; // unsigned base quantity
    public readonly side: Side; // LONG or SHORT

    public readonly userSetting: UserSetting;

    public readonly targetPrice: bigint; // cached price at tick

    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        tick: number,
        baseQuantity: bigint,
        side: Side,
        userSetting: UserSetting
    ) {
        // Validate baseQuantity is positive at construction time
        if (baseQuantity <= 0n) {
            throw Errors.validation('Order baseQuantity must be positive', ErrorCode.INVALID_SIZE, {
                baseQuantity: baseQuantity.toString(),
            });
        }

        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.tick = tick;
        this.baseQuantity = baseQuantity;
        this.side = side;
        this.userSetting = userSetting;
        this.targetPrice = tickToWad(tick);
    }

    /**
     * Get the signed size for contract parameters (positive for LONG, negative for SHORT).
     */
    getSignedSize(): bigint {
        const sign = sideSign(this.side);
        return abs(this.baseQuantity) * BigInt(sign);
    }

    /**
     * Simulate this limit order with full validation and parameter conversion.
     * Handles all validation, parameter conversion, and simulation in one call.
     *
     * @param snapshot - Pair snapshot (must include portfolio and priceData.markPrice)
     * @returns Tuple of [validated PlaceParam, simulation result]
     */
    simulate(snapshot: PairSnapshot): [PlaceParam, PlaceInputSimulation] {
        const { instrumentSetting } = snapshot;
        const markPrice = snapshot.priceData.markPrice;

        // Validate leverage (baseQuantity validation is done in constructor)
        if (!instrumentSetting.isLeverageValid(this.userSetting.leverage)) {
            this.userSetting.validateLeverage(instrumentSetting.maxLeverage); // throws with proper error
        }

        // Calculate required margin based on leverage
        // Since leverage is validated to be <= maxLeverage, and maxLeverage = 10000 / IMR,
        // the leverage-based margin will always satisfy IMR requirements
        // Use markPriceBufferInBps to account for mark price changes (mark price changes every second by design)
        const signedSize = this.getSignedSize();
        const tempOrder = new Order(0n, signedSize, this.tick, 0);
        const requiredMargin = tempOrder.marginForLeverage(
            markPrice,
            this.userSetting.leverage,
            this.userSetting.markPriceBufferInBps
        );

        // Convert to PlaceParam
        const placeParam: PlaceParam = {
            expiry: this.expiry,
            tick: this.tick,
            size: signedSize,
            amount: requiredMargin,
            deadline: this.userSetting.getDeadline(),
        };

        // Validate PlaceParam with full context (includes minimum order value check)
        snapshot.validatePlaceParam(placeParam);

        // Create Order instance to use its getters
        const order = new Order(placeParam.amount, placeParam.size, placeParam.tick, 0);

        // Calculate expected fee income (fee rebate) for the order
        const minFeeRebate = wmulDown(order.value, ratioToWad(instrumentSetting.orderFeeRebateRatio));
        const minOrderSize = instrumentSetting.minOrderSizeAtTick(this.tick);
        // Check if order size meets minimum requirement (validatePlaceParam already checks order.value >= minOrderValue,
        // but we still calculate canPlaceOrder explicitly for clarity and to match the interface contract)
        const canPlaceOrder = abs(placeParam.size) >= minOrderSize;

        const simulation: PlaceInputSimulation = {
            // Only keep computed values that aren't trivial to derive from PlaceParam
            minFeeRebate,
            minOrderSize,
            canPlaceOrder,
        };

        // todo do we need minFeeRebate, minOrderSize, also do we need PlaceInputSimulation?
        return [placeParam, simulation];
    }
}

/**
 * Simulation result for PlaceInput.
 * Only contains computed values that aren't trivial to derive from PlaceParam.
 *
 * To get other values:
 * - `tick`: `placeParam.tick`
 * - `limitPrice`: Create `Order` instance and use `order.targetPrice` getter
 * - `baseQuantity`: `placeInput.baseQuantity`
 * - `margin`: `placeParam.amount`
 * - `tradeValue`: Create `Order` instance and use `order.value` getter
 * - `leverage`: Available from `PlaceInput.userSetting.leverage` property
 */
export interface PlaceInputSimulation {
    /** Expected fee rebate for the order (in quote token) */
    minFeeRebate: bigint;
    /** Minimum order size required (in base token) */
    minOrderSize: bigint;
    /** Whether the order can be placed (size >= minOrderSize) */
    canPlaceOrder: boolean;
}
