import type { Address } from 'viem';
import { wmulDown, wmul, abs, wdiv, sqrt, ratioToWad, sqrtX96ToWad, sqrtX96ToTick, tickToWad } from '../math';
import { ZERO, MAX_INT_24, MIN_INT_24 } from '../constants';
import { Errors, ErrorCode } from '../types/error';
import { MAX_TICK, MIN_TICK } from '../constants';
import { Position } from '../types/position';
import { Range } from '../types/range';
import { UserSetting } from '../types';
import { type RemoveParam, type AddParam, Side } from '../types/contract';
import { type PairSnapshot } from '../types/snapshot';

// ============================================================================
// Range Input Classes
// ============================================================================

export class AddInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;
    public readonly marginAmount: bigint;
    public readonly tickLower: number;
    public readonly tickUpper: number;
    public readonly userSetting: UserSetting;

    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        marginAmount: bigint,
        tickLower: number,
        tickUpper: number,
        userSetting: UserSetting
    ) {
        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.marginAmount = marginAmount;
        this.tickLower = tickLower;
        this.tickUpper = tickUpper;
        this.userSetting = userSetting;
    }

    /**
     * Simulate adding liquidity with full validation and parameter conversion.
     * Handles all validation, parameter conversion, and simulation in one call.
     *
     * @param snapshot - Pair snapshot (must include amm)
     * @returns Tuple of [validated AddParam, simulation result]
     */
    simulate(snapshot: PairSnapshot): [AddParam, AddSimulation] {
        const { instrumentSetting } = snapshot;
        const { amm } = snapshot;

        // Validate ticks BEFORE converting to deltas (since deltas lose direction information)
        // Validate tick bounds
        if (this.tickLower > this.tickUpper) {
            throw Errors.validation('tickLower must be less than or equal to tickUpper', ErrorCode.INVALID_TICK, {
                tickLower: this.tickLower,
                tickUpper: this.tickUpper,
            });
        }
        if (this.tickUpper > MAX_TICK) {
            throw Errors.validation(
                `tickUpper must be less than or equal to MAX_TICK (${MAX_TICK})`,
                ErrorCode.INVALID_TICK,
                {
                    tickUpper: this.tickUpper,
                    maxTick: MAX_TICK,
                }
            );
        }
        if (this.tickLower < MIN_TICK) {
            throw Errors.validation(
                `tickLower must be greater than or equal to MIN_TICK (${MIN_TICK})`,
                ErrorCode.INVALID_TICK,
                {
                    tickLower: this.tickLower,
                    minTick: MIN_TICK,
                }
            );
        }

        // Validate margin amount
        if (this.marginAmount <= 0n) {
            throw Errors.validation('Margin amount must be positive', ErrorCode.INVALID_SIZE, {
                amount: this.marginAmount.toString(),
            });
        }

        // Validate range spacing alignment
        if (
            this.tickLower % instrumentSetting.rangeSpacing !== 0 ||
            this.tickUpper % instrumentSetting.rangeSpacing !== 0
        ) {
            throw Errors.validation(
                `Ticks must be multiples of range spacing ${instrumentSetting.rangeSpacing}`,
                ErrorCode.INVALID_TICK,
                {
                    tickLower: this.tickLower,
                    tickUpper: this.tickUpper,
                    rangeSpacing: instrumentSetting.rangeSpacing,
                }
            );
        }

        const imr = instrumentSetting.imr;
        const mmr = instrumentSetting.mmr;

        // Align ticks to range spacing
        const upperTick = instrumentSetting.alignRangeTickUpper(this.tickUpper);
        const lowerTick = instrumentSetting.alignRangeTickLower(this.tickLower);

        // Create a temporary Range instance to use its methods
        const tempRange = new Range(0n, 0n, 0n, amm.sqrtPX96, lowerTick, upperTick);
        const { liquidity } = tempRange.calcEntryDelta(amm.sqrtPX96, this.marginAmount, imr);

        const rangeWithTicks = new Range(
            liquidity,
            amm.feeIndex,
            this.marginAmount,
            amm.sqrtPX96,
            lowerTick,
            upperTick
        );
        const lowerPosition = rangeWithTicks.lowerPositionIfRemove(amm);
        const upperPosition = rangeWithTicks.upperPositionIfRemove(amm);

        const minLiquidity = instrumentSetting.minLiquidity(amm.sqrtPX96);
        const tempRangeForMinMargin = new Range(0n, 0n, 0n, amm.sqrtPX96, lowerTick, upperTick);
        const minMargin = tempRangeForMinMargin.calcMarginFromLiquidity(amm.sqrtPX96, minLiquidity, imr);

        const lowerPrice = tickToWad(lowerTick);
        const upperPrice = tickToWad(upperTick);

        const lowerLeverage =
            lowerPosition.balance === 0n
                ? 0n
                : wdiv(wmul(lowerPrice, abs(lowerPosition.size)), abs(lowerPosition.balance));
        const upperLeverage =
            upperPosition.balance === 0n
                ? 0n
                : wdiv(wmul(upperPrice, abs(upperPosition.size)), abs(upperPosition.balance));

        const tickDeltaLower = Math.abs(lowerTick - amm.tick);
        const tickDeltaUpper = Math.abs(upperTick - amm.tick);

        const alphaLowerNumber = tickDeltaToAlphaNumber(tickDeltaLower);
        const alphaUpperNumber = tickDeltaToAlphaNumber(tickDeltaUpper);

        const lowerLiquidationPrice = lowerPosition.liquidationPrice(amm, mmr);
        const upperLiquidationPrice = upperPosition.liquidationPrice(amm, mmr);

        const capitalEfficiencyBoost =
            alphaLowerNumber === alphaUpperNumber
                ? calcBoost(alphaLowerNumber, imr)
                : calcAsymmetricBoost(alphaLowerNumber, alphaUpperNumber, imr);

        const simulation: AddSimulation = {
            lowerRemovalPrice: lowerPrice,
            lowerRemovalSize: lowerPosition.size,
            lowerRemovalMargin: lowerPosition.balance,
            lowerRemovalSide: Side.LONG,
            lowerLeverage,
            upperRemovalPrice: upperPrice,
            upperRemovalSize: upperPosition.size,
            upperRemovalSide: Side.SHORT,
            upperRemovalMargin: upperPosition.balance,
            upperLeverage,
            minMargin,
            equivalentTickDelta: (upperTick - lowerTick) / 2,
            lowerLiquidationPrice,
            upperLiquidationPrice,
            capitalEfficiencyBoost,
            lowerPosition,
            upperPosition,
        };

        const addParam: AddParam = {
            expiry: this.expiry,
            tickDeltaLower,
            tickDeltaUpper,
            amount: this.marginAmount,
            limitTicks: Number(this.userSetting.getEncodedLiquidityLimitTicks(amm.sqrtPX96)),
            deadline: this.userSetting.getDeadline(),
        };

        // Note: Validation is done above using original ticks before converting to deltas
        // This is necessary because deltas lose direction information (they're absolute values)

        return [addParam, simulation];
    }
}

export class RemoveInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;
    public readonly tickLower: number;
    public readonly tickUpper: number;
    public readonly userSetting: UserSetting;

    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        tickLower: number,
        tickUpper: number,
        userSetting: UserSetting
    ) {
        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.tickLower = tickLower;
        this.tickUpper = tickUpper;
        this.userSetting = userSetting;
    }

    /**
     * Simulate removing liquidity with full validation and parameter conversion.
     * Handles all validation, parameter conversion, and simulation in one call.
     *
     * @param snapshot - Pair snapshot (must include portfolio and amm)
     * @returns Tuple of [validated RemoveParam, simulation result]
     */
    simulate(snapshot: PairSnapshot): [RemoveParam, RemoveSimulation] {
        const { instrumentSetting, amm, portfolio } = snapshot;

        // Validate basic constraints
        if (this.tickLower >= this.tickUpper) {
            throw Errors.validation('tickLower must be less than tickUpper', ErrorCode.INVALID_TICK, {
                tickLower: this.tickLower,
                tickUpper: this.tickUpper,
            });
        }
        if (
            this.tickLower % instrumentSetting.rangeSpacing !== 0 ||
            this.tickUpper % instrumentSetting.rangeSpacing !== 0
        ) {
            throw Errors.validation(
                `Ticks must be multiples of range spacing ${instrumentSetting.rangeSpacing}`,
                ErrorCode.INVALID_TICK,
                {
                    tickLower: this.tickLower,
                    tickUpper: this.tickUpper,
                    rangeSpacing: instrumentSetting.rangeSpacing,
                }
            );
        }

        // Find range by matching tickLower and tickUpper
        let foundRange: Range | undefined;
        for (let i = 0; i < portfolio.ranges.length; i++) {
            const rid = portfolio.rids[i];
            if (rid === undefined) continue;
            const { tickLower, tickUpper } = Range.unpackKey(rid);
            if (tickLower === this.tickLower && tickUpper === this.tickUpper) {
                foundRange = portfolio.ranges[i];
                break;
            }
        }

        if (!foundRange) {
            throw Errors.simulation(
                `Range not found for tickLower: ${this.tickLower}, tickUpper: ${this.tickUpper}`,
                ErrorCode.SIMULATION_FAILED,
                { tickLower: this.tickLower, tickUpper: this.tickUpper }
            );
        }

        // foundRange is already a Range instance with ticks, so we can use it directly
        const rangeWithTicks = foundRange;
        const removedPosition = rangeWithTicks.toPosition(amm);
        const postPosition = Position.combine(amm, removedPosition, portfolio.position).position;

        const sqrtStrikePX96Lower = amm.sqrtPX96 - wmulDown(amm.sqrtPX96, ratioToWad(this.userSetting.slippage));
        const sqrtStrikePX96Upper = amm.sqrtPX96 + wmulDown(amm.sqrtPX96, ratioToWad(this.userSetting.slippage));

        const lowerTick = sqrtStrikePX96Lower === ZERO ? Number(MIN_INT_24) : sqrtX96ToTick(sqrtStrikePX96Lower) + 1;
        const upperTick = sqrtStrikePX96Upper === ZERO ? Number(MAX_INT_24) : sqrtX96ToTick(sqrtStrikePX96Upper);

        const simulation: RemoveSimulation = {
            removedPosition: removedPosition,
            postPosition: postPosition,
            lowerTick,
            upperTick,
            removedPositionEntryPrice: sqrt(
                wmul(sqrtX96ToWad(amm.sqrtPX96), sqrtX96ToWad(rangeWithTicks.sqrtEntryPX96))
            ),
        };

        const removeParam: RemoveParam = {
            expiry: this.expiry,
            target: this.traderAddress,
            tickLower: this.tickLower,
            tickUpper: this.tickUpper,
            limitTicks: Number(this.userSetting.getEncodedLiquidityLimitTicks(amm.sqrtPX96)),
            deadline: this.userSetting.getDeadline(),
        };

        return [removeParam, simulation];
    }
}

// ============================================================================
// Range Result Types
// ============================================================================

export interface AddSimulation {
    lowerRemovalPrice: bigint;
    lowerRemovalSize: bigint;
    lowerRemovalSide: Side;
    lowerRemovalMargin: bigint;
    lowerLeverage: bigint;
    upperRemovalPrice: bigint;
    upperRemovalSize: bigint;
    upperRemovalSide: Side;
    upperRemovalMargin: bigint;
    upperLeverage: bigint;
    minMargin: bigint;
    equivalentTickDelta: number;
    lowerLiquidationPrice: bigint;
    upperLiquidationPrice: bigint;
    capitalEfficiencyBoost: number;
    lowerPosition: Position;
    upperPosition: Position;
}

export interface RemoveSimulation {
    lowerTick: number;
    upperTick: number;
    removedPosition: Position;
    postPosition: Position;
    removedPositionEntryPrice: bigint;
}

// ============================================================================
// Alpha and Boost Calculations
// ============================================================================

import { Q96, RATIO_DECIMALS } from '../constants';
import { tickToSqrtX96 } from '../math';

export function tickDeltaToAlphaNumber(tickDelta: number): number {
    if (tickDelta === 0) return 0;

    // Get sqrt ratio directly and convert to price number
    const sqrtRatio = tickToSqrtX96(tickDelta);
    // Convert sqrtRatio to price: (sqrtRatio / 2^96)^2
    // Using Number conversion for efficiency since we want the final result as number
    const sqrtRatioNumber = Number(sqrtRatio) / Number(Q96);
    return sqrtRatioNumber * sqrtRatioNumber;
}

export function calcBoost(alpha: number, imr: number): number {
    if (alpha === 1) {
        throw Errors.calculation('Invalid alpha', ErrorCode.CALCULATION_FAILED, { alpha });
    }
    const ratio = imr / 10 ** RATIO_DECIMALS;
    return -2 / (alpha * (ratio + 1) - Math.sqrt(alpha)) / (1 / Math.sqrt(alpha) - 1);
}

export function calcAsymmetricBoost(alphaLower: number, alphaUpper: number, imr: number): number {
    if (alphaLower === 1 && alphaUpper === 1) {
        throw Errors.calculation('Invalid alpha and beta', ErrorCode.CALCULATION_FAILED, {
            alphaLower,
            alphaUpper,
            imr,
        });
    }
    const ratio = imr / 10 ** RATIO_DECIMALS;
    const boostLower = 2 / (1 / Math.sqrt(alphaLower) - 1) / ((1 / Math.sqrt(alphaLower)) * (1 - ratio) - 1);
    const boostUpper = calcBoost(alphaUpper, ratio);
    return Math.min(boostLower, boostUpper);
}
