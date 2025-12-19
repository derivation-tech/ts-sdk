import type { Address } from 'viem';
import { abs } from '../math';
import { ZERO } from '../constants';
import { Errors, ErrorCode } from '../types/error';
import { Position } from '../types/position';
import { type AdjustParam } from '../types/contract';
import { type PairSnapshot } from '../types/snapshot';
import { UserSetting } from '../types';

// ============================================================================
// Adjust Input Classes
// ============================================================================

/**
 * Unified input class for margin and leverage adjustments.
 * Supports two modes:
 * - Margin adjustment: Provide `amount` and `transferIn` to adjust by a specific margin amount
 * - Leverage adjustment: Omit `amount` and `transferIn` to adjust to target leverage from `userSetting.leverage`
 */
export class AdjustInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;

    public readonly amount?: bigint;
    public readonly transferIn?: boolean;

    public readonly userSetting: UserSetting;

    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        userSetting: UserSetting,
        amount?: bigint,
        transferIn?: boolean
    ) {
        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.userSetting = userSetting;
        this.amount = amount;
        this.transferIn = transferIn;

        // Validate that if amount is provided, transferIn must also be provided
        if (amount !== undefined && transferIn === undefined) {
            throw Errors.validation('transferIn must be provided when amount is specified', ErrorCode.INVALID_PARAM);
        }
    }

    /**
     * Simulate adjusting margin or leverage with full validation and parameter conversion.
     * Handles all validation, parameter conversion, and simulation in one call.
     *
     * Mode 1 (Margin adjustment): When `amount` and `transferIn` are provided, adjusts margin by the specified amount.
     * Mode 2 (Leverage adjustment): When `amount` is omitted, adjusts margin to achieve `userSetting.leverage`.
     *
     * @param snapshot - Pair snapshot (must include portfolio, amm, and priceData.markPrice)
     * @returns Tuple of [validated AdjustParam, simulation result]
     */
    simulate(snapshot: PairSnapshot): [AdjustParam, AdjustSimulation] {
        const { instrumentSetting, amm, portfolio } = snapshot;
        const markPrice = snapshot.priceData.markPrice;
        const position = Position.ensureInstance(portfolio.position);

        const imr = instrumentSetting.initialMarginRatio;

        let marginDelta: bigint;

        if (this.amount !== undefined) {
            // Mode 1: Margin adjustment by amount
            if (this.amount <= 0n) {
                throw Errors.validation('Margin amount must be positive', ErrorCode.INVALID_SIZE, {
                    amount: this.amount.toString(),
                });
            }
            // transferIn is guaranteed to be defined when amount is provided (validated in constructor)
            marginDelta = this.transferIn ? this.amount : -this.amount;

            if (!this.transferIn) {
                this.validateWithdrawal(snapshot, position, amm, imr, markPrice, marginDelta);
            }
        } else {
            // Mode 2: Leverage adjustment
            this.userSetting.validateLeverage(instrumentSetting.maxLeverage);
            marginDelta = position.transferAmountFromTargetLeverage(amm, this.userSetting.leverage, markPrice);

            if (marginDelta < ZERO && position.size !== ZERO) {
                this.validateWithdrawal(snapshot, position, amm, imr, markPrice, marginDelta, 'leverage adjustment');
            }
        }

        const postPosition = position.withBalanceDelta(marginDelta);

        const adjustParam: AdjustParam = {
            expiry: this.expiry,
            net: marginDelta,
            deadline: this.userSetting.getDeadline(),
        };

        const simulation: AdjustSimulation = {
            postPosition,
        };

        return [adjustParam, simulation];
    }

    /**
     * Validate withdrawal amount against maximum withdrawable margin.
     * Throws if withdrawal exceeds limits.
     */
    private validateWithdrawal(
        snapshot: PairSnapshot,
        position: Position,
        amm: typeof snapshot.amm,
        imr: number,
        markPrice: bigint,
        marginDelta: bigint,
        context: string = 'margin adjustment'
    ): void {
        snapshot.validateNegativeAdjustFairDeviation();
        if (position.size !== ZERO) {
            const maxWithdrawable = position.maxWithdrawable(amm, imr, markPrice);
            const absMargin = abs(marginDelta);
            if (absMargin > maxWithdrawable) {
                throw Errors.simulation(
                    `Withdrawal for ${context} exceeds maximum withdrawable margin`,
                    ErrorCode.SIMULATION_FAILED
                );
            }
        }
    }
}

/**
 * Simulation result for margin and leverage adjustments.
 * Contains the position state after the adjustment.
 *
 * All derived values can be computed from postPosition:
 * - positionMargin: postPosition.balance
 * - leverage: postPosition.leverage(amm, markPrice)
 * - liquidationPrice: postPosition.liquidationPrice(amm, maintenanceMarginRatio)
 * - marginDelta: available in AdjustParam.net
 * - transferIn: AdjustParam.net >= ZERO
 */
export interface AdjustSimulation {
    /** Position state after the margin/leverage adjustment */
    postPosition: Position;
}
