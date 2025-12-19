import { abs, wdiv, wmul, sqrtX96ToWad, ratioToWad, mulDivNearest } from '../math';
import { ZERO } from '../constants';
import { Errors, ErrorCode } from './error';
import { Order } from './order';
import { InstrumentSetting } from './setting';
import { QuotationWithSize } from './quotation';
import { Position } from './position';
import type {
    Amm,
    PriceData,
    Portfolio,
    Quotation,
    QuoteState,
    BlockInfo,
    PlaceParam,
    OnchainContext,
} from './contract';
import { Condition, Status, PERP_EXPIRY } from './contract';
import type { Address } from 'viem';

/**
 * PairSnapshot represents a snapshot of the complete on-chain state of a trading pair and trader's portfolio.
 *
 * This class encapsulates:
 * - Raw contract data (amm, priceData, blockInfo)
 * - Trader-specific data (portfolio, quoteState) - always present
 * - Optional quotation (only present when signedSize is provided)
 * - Computed instrument settings (instrumentSetting) - contains setting, condition, and spacing
 * - Validation methods for place, trade, and add operations
 *
 * Note: `setting`, `condition`, and `spacing` are not exposed directly as they are redundant
 * with `instrumentSetting`. Access them via `instrumentSetting` instead.
 *
 * This class wraps the raw `OnchainContext` contract struct with computed properties and methods.
 */
export class PairSnapshot {
    public readonly blockInfo: BlockInfo;
    public readonly instrumentSetting: InstrumentSetting;
    public readonly amm: Amm;
    public readonly priceData: PriceData;
    public readonly portfolio: Portfolio;
    public readonly quoteState: QuoteState;
    public readonly quotation?: Quotation;

    constructor(options: OnchainContext) {
        this.blockInfo = options.blockInfo;
        this.amm = options.amm;
        this.priceData = options.priceData;
        this.portfolio = options.portfolio;
        this.quoteState = options.quoteState;
        // Create InstrumentSetting from setting, condition, and spacing
        this.instrumentSetting = new InstrumentSetting(
            options.setting,
            options.condition,
            options.spacing.pearl,
            options.spacing.order,
            options.spacing.range
        );
        this.quotation = options.quotation;
    }

    /**
     * Create a new PairSnapshot with overridden properties.
     *
     * This method is useful for creating modified snapshots, e.g., with updated AMM state
     * after a simulated trade. The `instrumentSetting` property will be automatically
     * recomputed from the new `setting`, `condition`, and `spacing` values.
     *
     * @param overrides - Partial properties to override
     * @returns New PairSnapshot instance with overridden properties
     *
     * @example
     * ```typescript
     * const updatedAmm = { ...snapshot.amm, tick: newTick };
     * const updatedSnapshot = snapshot.with({ amm: updatedAmm });
     * ```
     */
    with(overrides: Partial<OnchainContext>): PairSnapshot {
        // Reconstruct setting, condition, and spacing from instrumentSetting if not overridden
        const setting = overrides.setting ?? {
            symbol: this.instrumentSetting.symbol,
            config: this.instrumentSetting.configAddress,
            gate: this.instrumentSetting.gateAddress,
            market: this.instrumentSetting.marketAddress,
            quote: this.instrumentSetting.quoteAddress,
            decimals: this.instrumentSetting.quoteDecimals,
            param: this.instrumentSetting.quoteParam,
            initialMarginRatio: this.instrumentSetting.initialMarginRatio,
            maintenanceMarginRatio: this.instrumentSetting.maintenanceMarginRatio,
            placePaused: this.instrumentSetting.placePaused,
            fundingHour: this.instrumentSetting.fundingHour,
            disableOrderRebate: this.instrumentSetting.disableOrderRebate,
        };
        const condition = overrides.condition ?? this.instrumentSetting.condition;
        const spacing = overrides.spacing ?? {
            pearl: this.instrumentSetting.pearlSpacing,
            order: this.instrumentSetting.orderSpacing,
            range: this.instrumentSetting.rangeSpacing,
        };
        const quotation = 'quotation' in overrides ? overrides.quotation : this.quotation;

        return new PairSnapshot({
            setting,
            condition,
            amm: overrides.amm ?? this.amm,
            priceData: overrides.priceData ?? this.priceData,
            spacing,
            blockInfo: overrides.blockInfo ?? this.blockInfo,
            portfolio: overrides.portfolio ?? this.portfolio,
            quoteState: overrides.quoteState ?? this.quoteState,
            quotation,
        });
    }

    /**
     * Create an empty portfolio (no orders, ranges, or position)
     */
    static emptyPortfolio(): Portfolio {
        return {
            oids: [],
            rids: [],
            orders: [],
            ranges: [],
            ordersTaken: [],
            position: Position.empty(),
        };
    }

    /**
     * Create an empty quote state (all zeros, useful for initialization)
     * Note: This should typically be fetched from contract, but can be used as a placeholder
     */
    static emptyQuoteState(quoteAddress: Address, decimals: number, symbol: string): QuoteState {
        return {
            quote: quoteAddress,
            decimals,
            symbol,
            threshold: 0n,
            reserve: 0n,
            balance: 0n,
            allowance: 0n,
            fundFlow: {
                totalIn: 0n,
                totalOut: 0n,
            },
            pending: {
                timestamp: 0,
                native: false,
                amount: 0n,
                exemption: 0n,
            },
        };
    }

    /**
     * Validate PlaceParam with full context validation.
     * Checks condition, status, tick alignment, price deviation, margin requirements, and order slot availability.
     *
     * @param placeParam - PlaceParam to validate
     * @throws {SimulationError} If instrument is not tradable (condition, status, paused)
     * @throws {ValidationError} If validation fails (tick, price deviation, margin, order slot)
     */
    validatePlaceParam(placeParam: PlaceParam): void {
        const { instrumentSetting, amm, portfolio } = this;
        const markPrice = this.priceData.markPrice;

        if (instrumentSetting.condition !== Condition.NORMAL) {
            throw Errors.simulation('Instrument not tradable (condition)', ErrorCode.SIMULATION_FAILED);
        }

        if (instrumentSetting.placePaused) {
            throw Errors.simulation('Placing orders is paused', ErrorCode.SIMULATION_FAILED);
        }

        const status = amm.status;
        if (status !== Status.TRADING && status !== Status.SETTLING) {
            throw Errors.simulation('Instrument not tradable in current status', ErrorCode.SIMULATION_FAILED);
        }

        if (placeParam.size === 0n) {
            throw Errors.validation('Order size cannot be zero', ErrorCode.INVALID_SIZE, {
                size: placeParam.size.toString(),
            });
        }

        if (Math.abs(placeParam.tick) % instrumentSetting.orderSpacing !== 0) {
            throw Errors.validation(
                `Order tick must be multiple of order spacing ${instrumentSetting.orderSpacing}`,
                ErrorCode.INVALID_TICK,
                { tick: placeParam.tick, orderSpacing: instrumentSetting.orderSpacing }
            );
        }

        if (
            (placeParam.size > 0 && placeParam.tick >= amm.tick) ||
            (placeParam.size < 0 && placeParam.tick <= amm.tick)
        ) {
            throw Errors.validation('Order on wrong side of current AMM tick', ErrorCode.INVALID_PARAM, {
                tick: placeParam.tick,
                ammTick: amm.tick,
                size: placeParam.size.toString(),
            });
        }

        const imr = ratioToWad(instrumentSetting.imr);

        // Create Order instance to use its getters for validation
        const order = new Order(placeParam.amount, placeParam.size, placeParam.tick, 0);
        const targetPrice = order.targetPrice;

        if (wdiv(abs(targetPrice - markPrice), markPrice) > imr * 2n) {
            throw Errors.validation('Order too far from mark price', ErrorCode.INVALID_PARAM, {
                targetPrice: targetPrice.toString(),
                markPrice: markPrice.toString(),
                maxDeviation: (imr * 2n).toString(),
            });
        }

        const fairPrice = sqrtX96ToWad(amm.sqrtPX96);
        if (wdiv(abs(fairPrice - markPrice), markPrice) > imr) {
            throw Errors.validation('Fair price deviation too large', ErrorCode.INVALID_PARAM, {
                fairPrice: fairPrice.toString(),
                markPrice: markPrice.toString(),
                maxDeviation: imr.toString(),
            });
        }

        // Calculate minimum margin required using Order.marginForLeverage()
        // maxLeverage = (WAD * RATIO_BASE) / IMR, so using maxLeverage gives us margin at IMR
        // marginForLeverage uses max(targetPrice, markPrice) * abs(size) / leverage
        // With maxLeverage, this equals max(targetPrice, markPrice) * abs(size) * IMR / (WAD * RATIO_BASE)
        // which is equivalent to max(targetPrice, markPrice) * abs(size) * ratioToWad(IMR)
        const minMarginRequired = order.marginForLeverage(markPrice, instrumentSetting.maxLeverage, 0);
        if (placeParam.amount < minMarginRequired) {
            throw Errors.validation('Order margin below minimum required for IMR', ErrorCode.INVALID_AMOUNT, {
                amount: placeParam.amount.toString(),
                minMarginRequired: minMarginRequired.toString(),
            });
        }

        // Check minimum order value using Order.value getter
        if (order.value < instrumentSetting.minOrderValue) {
            throw Errors.validation('Order value below minimum order value', ErrorCode.INVALID_PARAM, {
                orderValue: order.value.toString(),
                minOrderValue: instrumentSetting.minOrderValue.toString(),
            });
        }

        // Check if order slot is already occupied
        for (const oid of portfolio.oids) {
            const { tick: orderTick } = Order.unpackKey(oid);
            if (orderTick === placeParam.tick) {
                throw Errors.validation('Order slot already occupied', ErrorCode.INVALID_PARAM, {
                    tick: placeParam.tick.toString(),
                    orderId: oid.toString(),
                });
            }
        }
    }

    /**
     * Validate that fair price deviation from mark price is within acceptable limits for negative margin adjustments.
     * This check prevents reducing margin from positions when the market shows significant price deviation,
     * which could indicate manipulation or oracle issues.
     *
     * Matches the Solidity contract check: `fair.absDiff(mark).wdiv(mark) > IMR` reverts with `ForbidNegativeAdjust()`
     *
     * @throws {ValidationError} If fair price deviation exceeds initial margin ratio
     */
    validateNegativeAdjustFairDeviation(): void {
        const { instrumentSetting } = this;
        const markPrice = this.priceData.markPrice;
        const fair = sqrtX96ToWad(this.amm.sqrtPX96);
        const imrWad = ratioToWad(instrumentSetting.imr);
        const deviation = wdiv(abs(fair - markPrice), markPrice);
        if (deviation > imrWad) {
            throw Errors.validation('Fair price deviation too large', ErrorCode.INVALID_PARAM, {
                fair: fair.toString(),
                markPrice: markPrice.toString(),
                deviation: deviation.toString(),
                maxDeviation: imrWad.toString(),
            });
        }
    }

    /**
     * Validate trade context with full validation.
     * Checks condition, status, price deviation, and minimum trade value.
     *
     * @param quotationWithSize - Quotation with size for the trade
     * @param prePosition - Position before the trade (defaults to portfolio.position if not provided)
     * @throws {SimulationError} If instrument is not tradable (condition, status)
     * @throws {ValidationError} If validation fails (price deviation, minimum trade value)
     */
    validateTradeContext(quotationWithSize: QuotationWithSize, prePosition?: Position): void {
        const { instrumentSetting, portfolio } = this;
        const position = prePosition ?? Position.ensureInstance(portfolio.position);

        // Check 1: Condition must be NORMAL
        if (instrumentSetting.condition !== Condition.NORMAL) {
            throw Errors.simulation('Instrument not tradable (condition)', ErrorCode.SIMULATION_FAILED);
        }

        // Check 2: Status must be TRADING or SETTLING (30-minute grace period) only for dated futures
        // Contract error: "NotTradeable - instrument status is neither TRADING nor SETTLING"
        const status = this.amm.status;
        if (status !== Status.TRADING && status !== Status.SETTLING) {
            throw Errors.simulation('Instrument not tradable in current status', ErrorCode.SIMULATION_FAILED);
        }

        // Check 3: Price deviation check (only prevents trades that INCREASE deviation)
        // Contract: checkDeviation() only reverts if price moves FURTHER from benchmark
        // Allows trades that move price CLOSER to benchmark, even if already deviated
        const benchmark = quotationWithSize.quotation.benchmark;
        const prevFair = sqrtX96ToWad(quotationWithSize.quotation.sqrtFairPX96);
        const postFair = sqrtX96ToWad(quotationWithSize.quotation.sqrtPostFairPX96);

        // Calculate deviation ratios
        const prevDeviation = wdiv(abs(prevFair - benchmark), benchmark);
        const postDeviation = wdiv(abs(postFair - benchmark), benchmark);

        // Use MMR as threshold (matching contract's checkDeviation logic)
        const mmrWad = ratioToWad(instrumentSetting.mmr);

        // Check if price crossed benchmark (flipped sides)
        const prevAbove = prevFair >= benchmark;
        const postAbove = postFair >= benchmark;
        const flipped = prevAbove !== postAbove;

        // Case 1: Price crossed benchmark
        if (flipped && postDeviation > mmrWad) {
            throw Errors.validation('Trade crosses benchmark with excessive deviation', ErrorCode.INVALID_PARAM, {
                benchmark: benchmark.toString(),
                postFair: postFair.toString(),
                postDeviation: postDeviation.toString(),
                maxDeviation: mmrWad.toString(),
            });
        }

        // Case 2: Price moved further from benchmark (deviation increased)
        if (!flipped && postDeviation > prevDeviation && postDeviation > mmrWad) {
            throw Errors.validation('Trade would increase price deviation beyond limit', ErrorCode.INVALID_PARAM, {
                prevDeviation: prevDeviation.toString(),
                postDeviation: postDeviation.toString(),
                maxDeviation: mmrWad.toString(),
            });
        }

        // Check 4: Minimum trade value (only for opening NEW positions)
        // Contract (Oyster.sol:338-340): only checks when old.size == 0
        // Does NOT check for increasing existing positions or closing
        if (position.size === ZERO) {
            // Use entryNotional (tradeValue) which is the actual trade value, not markPrice * baseQuantity
            const tradeValue = quotationWithSize.tradeValue;
            if (tradeValue < instrumentSetting.minTradeValue) {
                throw Errors.validation('Trade value below minimum trade value', ErrorCode.INVALID_PARAM, {
                    tradeValue: tradeValue.toString(),
                    minTradeValue: instrumentSetting.minTradeValue.toString(),
                });
            }
        }
    }

    /**
     * Check margin availability for a trader.
     * Calculates the gaps between required margin and available reserve/balance/allowance.
     *
     * Uses quoteState data directly (no RPC calls needed).
     *
     * @param marginRequired - Required margin amount in token decimals
     * @returns Object with `allowanceGap` and `marginGap` (both in token decimals)
     *          - `allowanceGap`: Additional allowance needed (0 if sufficient). If using ERC20 `approve`, approve
     *            `allowance + allowanceGap` (since `approve` sets the allowance value).
     *          - `marginGap`: Additional margin needed (0 if sufficient)
     */
    checkMargin(marginRequired: bigint): { allowanceGap: bigint; marginGap: bigint } {
        const reserve = this.quoteState.reserve;
        const balance = this.quoteState.balance;
        const allowance = this.quoteState.allowance;

        let allowanceGap = 0n;
        let marginGap = 0n;

        // If we have enough reserve, no gaps needed
        if (reserve >= marginRequired) {
            return { allowanceGap, marginGap };
        }

        // Calculate how much we need from balance
        const neededFromBalance = marginRequired - reserve;

        // Check if we have enough total balance (reserve + wallet balance)
        if (balance + reserve >= marginRequired) {
            // We have enough balance, check if we need more allowance
            if (allowance >= neededFromBalance) {
                // We have enough allowance, no gaps
                return { allowanceGap, marginGap };
            } else {
                // Need more allowance for the amount we need to deposit
                allowanceGap = neededFromBalance - allowance;
            }
        } else {
            // Not enough total balance
            marginGap = marginRequired - (balance + reserve);
        }

        return { allowanceGap, marginGap } as const;
    }

    /**
     * Update AMM funding indices based on time elapsed and price difference.
     * Only applies to perpetual contracts (expiry === PERP_EXPIRY).
     *
     * @param timestamp - Current timestamp in seconds (defaults to blockInfo.timestamp)
     * @returns Updated AMM with funding indices applied
     */
    updateAmmFundingIndex(timestamp?: number): Amm {
        const amm = this.amm;
        const timeElapsed = (timestamp ?? this.blockInfo.timestamp) - amm.timestamp;

        if (amm.expiry !== PERP_EXPIRY || timeElapsed <= 0) {
            return amm;
        }

        const markPrice = this.priceData.markPrice;
        const fairPrice = sqrtX96ToWad(amm.sqrtPX96);
        const priceDiff = abs(fairPrice - markPrice);
        const longPayShort = fairPrice > markPrice;

        // Determine payer and receiver sides
        const payerSize = longPayShort ? amm.totalLong : amm.totalShort;
        const receiverSize = longPayShort ? amm.totalShort : amm.totalLong;

        if (payerSize === ZERO) {
            return amm;
        }

        // Calculate funding fee index based on time elapsed
        const fundingFeeIndex = mulDivNearest(
            priceDiff,
            BigInt(timeElapsed),
            BigInt(Math.max(1, this.instrumentSetting.fundingSeconds))
        );

        // Update payer index (decrease by funding fee)
        const payerIndex = longPayShort ? amm.longFundingIndex : amm.shortFundingIndex;
        const updatedPayerIndex = payerIndex - fundingFeeIndex;

        // Calculate total funding fee to distribute
        const totalFundingFee = wmul(fundingFeeIndex, payerSize);

        // Update receiver index or insurance fund
        const receiverIndex = longPayShort ? amm.shortFundingIndex : amm.longFundingIndex;
        let updatedReceiverIndex = receiverIndex;
        let updatedInsuranceFund = amm.insuranceFund;

        if (receiverSize > ZERO) {
            // Distribute funding fee to receiver side
            updatedReceiverIndex += wdiv(totalFundingFee, BigInt(receiverSize));
        } else if (totalFundingFee > ZERO) {
            // No receiver side: funding flows to insurance fund
            updatedInsuranceFund += totalFundingFee;
        }

        // Map back to long/short indices
        const longFundingIndex = longPayShort ? updatedPayerIndex : updatedReceiverIndex;
        const shortFundingIndex = longPayShort ? updatedReceiverIndex : updatedPayerIndex;

        return {
            ...amm,
            longFundingIndex,
            shortFundingIndex,
            insuranceFund: updatedInsuranceFund,
        };
    }
}
