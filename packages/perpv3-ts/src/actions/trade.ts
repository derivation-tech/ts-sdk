import type { Address } from 'viem';
import { abs } from '../math';
import { ZERO } from '../constants';
import { Errors, ErrorCode } from '../types/error';
import { Position } from '../types/position';
import { QuotationWithSize } from '../types/quotation';
import { UserSetting } from '../types';
import { type TradeParam, Side, sideSign } from '../types/contract';
import { type PairSnapshot } from '../types/snapshot';

// ============================================================================
// Trade Input Classes
// ============================================================================

export interface TradeInputOptions {
    /**
     * If provided, uses this margin directly (WAD). If omitted, margin is computed from `userSetting.leverage`.
     */
    margin?: bigint;
}

export class TradeInput {
    public readonly instrumentAddress: Address;
    public readonly expiry: number;
    public readonly traderAddress: Address;

    public readonly side: Side;
    public readonly baseQuantity: bigint;

    public readonly userSetting: UserSetting;
    public readonly margin?: bigint;

    constructor(
        instrumentAddress: Address,
        expiry: number,
        traderAddress: Address,
        baseQuantity: bigint,
        side: Side,
        userSetting: UserSetting,
        options?: TradeInputOptions
    ) {
        if (baseQuantity <= 0n) {
            throw Errors.validation('Trade quantity must be positive', ErrorCode.INVALID_SIZE, {
                baseQuantity: baseQuantity.toString(),
            });
        }
        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.traderAddress = traderAddress;
        this.baseQuantity = baseQuantity;
        this.side = side;
        this.userSetting = userSetting;
        this.margin = options?.margin;
    }

    getSignedSize(): bigint {
        // baseQuantity is already validated in constructor
        const sign = sideSign(this.side);
        return abs(this.baseQuantity) * BigInt(sign);
    }

    /**
     * Simulate a market trade with full validation.
     * Returns [TradeParam, TradeSimulation] tuple.
     * Access quotation-related fields via the QuotationWithSize parameter.
     *
     * Note: Use the returned TradeParam for calldata encoding. Its `amount` is finalized by simulation
     * (it may be adjusted to satisfy margin/leverage constraints).
     */
    simulate(snapshot: PairSnapshot, quotationWithSize: QuotationWithSize): [TradeParam, TradeSimulation] {
        // Step 1: Extract context and validate inputs as early as possible
        const { instrumentSetting } = snapshot;
        const currentPosition = snapshot.portfolio.position;
        const markPrice = snapshot.priceData.markPrice;

        // Validate leverage first (before any calculations)
        if (!instrumentSetting.isLeverageValid(this.userSetting.leverage)) {
            this.userSetting.validateLeverage(instrumentSetting.maxLeverage); // throws with proper error
        }

        // Validate trade context (condition, status, price deviation, min trade value)
        snapshot.validateTradeContext(quotationWithSize, currentPosition);

        // Step 2: Update AMM funding indices (after validations pass)
        const updatedAmm = snapshot.updateAmmFundingIndex();

        // Step 3: Build trade parameters
        const tradeParam = this.toTradeParam(quotationWithSize);
        const isLong = tradeParam.size >= ZERO;
        const tradeSign = isLong ? 1n : -1n;

        // Step 4: Calculate required margin delta (positive = deposit, negative = withdraw)
        let marginDelta: bigint;
        if (this.margin !== undefined) {
            marginDelta = this.margin;
        } else {
            marginDelta = currentPosition.marginForTargetLeverage(
                updatedAmm,
                tradeParam,
                quotationWithSize,
                this.userSetting.leverage
            );
        }

        // Step 5: Create trade position and combine with current position
        const quotation = quotationWithSize.quotation;
        const tradeSize = tradeSign * quotationWithSize.baseQuantity;
        const tradeBalance = marginDelta < ZERO ? -quotation.fee : marginDelta - quotation.fee;
        const socialLossIndex = isLong ? updatedAmm.longSocialLossIndex : updatedAmm.shortSocialLossIndex;
        const fundingIndex = isLong ? updatedAmm.longFundingIndex : updatedAmm.shortFundingIndex;

        const tradePosition = new Position(
            tradeBalance,
            tradeSize,
            quotation.entryNotional,
            socialLossIndex,
            fundingIndex
        );
        const { position: combinedPosition, realized } = Position.combine(updatedAmm, currentPosition, tradePosition);

        // Step 6: Adjust margin delta if needed (handle negative margin withdrawal case)
        let postPosition = combinedPosition;
        let exceedMaxLeverage = false;

        if (postPosition.size !== ZERO && marginDelta < ZERO) {
            // Create updated snapshot with updated AMM and postPosition for max withdrawable calculation
            const updatedSnapshot = snapshot.with({
                amm: updatedAmm,
                portfolio: { ...snapshot.portfolio, position: postPosition },
            });
            const maxWithdrawable = updatedSnapshot.getMaxWithdrawableMargin();

            if (abs(marginDelta) > maxWithdrawable) {
                if (this.userSetting.strictMode) {
                    throw Errors.simulation(
                        'Withdrawal amount exceeds maximum withdrawable margin',
                        ErrorCode.SIMULATION_FAILED
                    );
                }
                marginDelta = -maxWithdrawable;
                exceedMaxLeverage = true;
            }

            postPosition = postPosition.withBalanceDelta(marginDelta);
        }

        // Step 7: Validate margin requirements (MMR for closing, IMR for opening/increasing)
        // Determine if this trade is closing or reducing the position
        const isPositionClosed = postPosition.size === ZERO;
        const isOppositeSide = currentPosition.size * tradeSign < ZERO;
        const isReducing = quotationWithSize.baseQuantity < abs(currentPosition.size);
        const isClosingPosition = isPositionClosed || (isOppositeSide && isReducing);

        if (isClosingPosition) {
            // Closing or reducing position: check MMR
            if (!postPosition.isMmrSafe(updatedAmm, instrumentSetting.mmr, markPrice)) {
                throw Errors.insufficientMargin(0n, 0n);
            }
        } else {
            // Opening or increasing position: check IMR
            if (!postPosition.isImrSafe(updatedAmm, instrumentSetting.imr, true, markPrice)) {
                if (this.userSetting.strictMode) {
                    throw Errors.simulation('Exceed max leverage', ErrorCode.SIMULATION_FAILED);
                }
                // Auto-adjust margin to meet IMR requirements
                const additionalMargin = postPosition.additionMarginToIMRSafe(
                    updatedAmm,
                    instrumentSetting.imr,
                    true,
                    this.userSetting.slippage,
                    markPrice
                );
                postPosition = postPosition.withBalanceDelta(additionalMargin);
                marginDelta += additionalMargin;
                exceedMaxLeverage = true;
            }
        }

        // Step 8: Finalize trade parameters and build simulation result
        // If position closed with positive balance, withdraw all remaining balance
        if (postPosition.size === ZERO && postPosition.balance > ZERO) {
            marginDelta = -postPosition.balance;
        }
        tradeParam.amount = marginDelta;

        const simulation: TradeSimulation = {
            marginDelta,
            realized,
            postPosition,
            exceedMaxLeverage,
        };

        return [tradeParam, simulation];
    }

    private toTradeParam(quotationWithSize: QuotationWithSize): TradeParam {
        const tradePrice = quotationWithSize.tradePrice;
        const limitTick = this.userSetting.getTradeLimitTick(tradePrice, this.side);
        const deadline = this.userSetting.getDeadline();

        return {
            expiry: this.expiry,
            size: this.getSignedSize(),
            amount: this.margin ?? ZERO,
            limitTick,
            deadline,
        };
    }
}

// ============================================================================
// Trade Type Definitions
// ============================================================================
export interface TradeSimulation {
    /**
     * Margin delta for the trade (positive = deposit, negative = withdraw).
     * This is the margin change amount calculated for the trade, which may be adjusted
     * during simulation to meet leverage requirements.
     * Special case: if position is fully closed and has positive balance,
     * this will be `-postPosition.balance` to withdraw all remaining balance.
     */
    marginDelta: bigint;
    /**
     * Realized PnL from closing part of a position.
     * Non-zero only when trading opposite side or partially closing a position.
     */
    realized: bigint;
    /**
     * Position state after the trade.
     */
    postPosition: Position;
    /**
     * Whether the trade exceeded max leverage and required margin adjustment.
     */
    exceedMaxLeverage: boolean;
}
