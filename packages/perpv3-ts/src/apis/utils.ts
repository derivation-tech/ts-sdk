import { zeroAddress } from 'viem';
import { DEFAULT_FUNDING_HOUR } from '../constants';
import {
	Condition,
	PairSnapshot,
	type Setting,
	type QuoteParam,
	type Amm,
	type PriceData,
	type Portfolio,
	type QuoteState,
	type SpacingConfig,
	type BlockInfo,
	type Quotation,
	Order,
	Position,
	Range,
} from '../types';
import type {
	OnChainContextQueryResponseFromApi,
	OnChainQuerySettingFromApi,
	OnChainQueryAmmFromApi,
	OnChainQueryPriceDataFromApi,
	OnChainQueryPortfolioFromApi,
	OnChainQueryPositionFromApi,
	OnChainQueryOrderFromApi,
	OnChainQueryRangeFromApi,
	OnChainQueryQuotationFromApi,
	OnChainQueryQuoteStateFromApi,
	OnChainQuerySpacingFromApi,
	OnChainQueryBlockInfoFromApi,
	Bigintish,
} from './interfaces';

export type MinimalPearlTuple = readonly [bigint, bigint];

export function normalizeMinimalPearlTuple(value: unknown): MinimalPearlTuple | null {
	if (Array.isArray(value)) {
		if (value.length < 2) {
			return null;
		}
		const [liquidityNet, left] = value;
		return [toBigIntOrZero(liquidityNet), toBigIntOrZero(left)] as const;
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if ('liquidityNet' in record && 'left' in record) {
			return [toBigIntOrZero(record.liquidityNet), toBigIntOrZero(record.left)] as const;
		}
		if ('0' in record && '1' in record) {
			return [toBigIntOrZero(record[0]), toBigIntOrZero(record[1])] as const;
		}
	}

	return null;
}

function toBigIntOrZero(value: unknown): bigint {
	if (typeof value === 'bigint') {
		return value;
	}
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			return 0n;
		}
		return BigInt(Math.trunc(value));
	}
	if (typeof value === 'string') {
		const normalized = value.trim();
		if (!normalized) {
			return 0n;
		}
		try {
			return BigInt(normalized);
		} catch {
			return 0n;
		}
	}
	return 0n;
}

const SCI_NOTATION_REGEX = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/;

export function toBigIntValue(value: Bigintish | null | undefined): bigint {
	if (value === null || value === undefined) {
		return 0n;
	}
	if (typeof value === 'bigint') {
		return value;
	}

	const normalized = `${value}`.trim();
	if (!normalized) {
		return 0n;
	}

	const scientific = normalizeScientificToBigInt(normalized);
	if (scientific !== null) {
		return scientific;
	}

	const integerString = normalized.includes('.') ? normalized.split('.')[0] || '0' : normalized;
	if (!integerString || integerString === '-' || integerString === '+') {
		return 0n;
	}

	try {
		return BigInt(integerString);
	} catch {
		return 0n;
	}
}

function normalizeScientificToBigInt(value: string): bigint | null {
	const match = value.match(SCI_NOTATION_REGEX);
	if (!match) {
		return null;
	}

	const [, sign, integerPart, fractional = '', exponentStr] = match;
	const digits = (integerPart + fractional).replace(/^0+/, '') || '0';
	const exponent = Number(exponentStr) - fractional.length;
	let normalizedDigits = digits;

	if (exponent >= 0) {
		normalizedDigits = normalizedDigits + '0'.repeat(exponent);
	} else {
		const cutIndex = normalizedDigits.length + exponent;
		if (cutIndex <= 0) {
			normalizedDigits = '0';
		} else {
			normalizedDigits = normalizedDigits.slice(0, cutIndex);
		}
	}

	if (normalizedDigits === '0') {
		return 0n;
	}

	return BigInt(`${sign === '-' ? '-' : ''}${normalizedDigits}`);
}

export function buildOnChainContextFromQuery(data: OnChainContextQueryResponseFromApi): PairSnapshot {
	const setting = normalizeSettingFromQuery(data.Setting);
	return new PairSnapshot({
		setting,
		condition: Number(data.Condition ?? 0) as Condition,
		amm: normalizeAmmFromQuery(data.Amm),
		priceData: normalizePriceDataFromQuery(data.PriceData),
		spacing: normalizeSpacingFromQuery(data.Spacing),
		blockInfo: normalizeBlockInfoFromQuery(data.BlockInfo),
		portfolio: data.Portfolio ? normalizePortfolioFromQuery(data.Portfolio) : PairSnapshot.emptyPortfolio(),
		quotation: data.Quotation ? normalizeQuotationFromQuery(data.Quotation) : undefined,
		quoteState: data.QuoteState
			? normalizeQuoteStateFromQuery(data.QuoteState)
			: PairSnapshot.emptyQuoteState(setting.quote, setting.decimals, ''),
	});
}

function normalizeSettingFromQuery(raw: OnChainQuerySettingFromApi): Setting {
	const param = raw.Param;
	const fundingHour = Number(raw.FundingHour ?? 0);
	return {
		symbol: raw.Symbol,
		config: raw.Config,
		gate: raw.Gate,
		market: raw.Market,
		quote: raw.Quote,
		decimals: Number(raw.Decimals ?? 0),
		initialMarginRatio: Number(raw.InitialMarginRatio ?? 0),
		maintenanceMarginRatio: Number(raw.MaintenanceMarginRatio ?? 0),
		placePaused: Boolean(raw.PlacePaused),
		fundingHour: fundingHour > 0 ? fundingHour : DEFAULT_FUNDING_HOUR,
		disableOrderRebate: Boolean(raw.DisableOrderRebate),
		param: {
			minMarginAmount: toBigIntValue(param?.MinMarginAmount),
			tradingFeeRatio: Number(param?.TradingFeeRatio ?? 0),
			protocolFeeRatio: Number(param?.ProtocolFeeRatio ?? 0),
			qtype: Number(param?.Qtype ?? 0) as QuoteParam['qtype'],
			tip: toBigIntValue(param?.Tip),
		},
	};
}

function normalizeAmmFromQuery(raw: OnChainQueryAmmFromApi): Amm {
	return {
		expiry: Number(raw.Expiry ?? 0),
		timestamp: Number(raw.Timestamp ?? 0),
		status: Number(raw.Status ?? 0),
		tick: Number(raw.Tick ?? 0),
		sqrtPX96: toBigIntValue(raw.SqrtPX96),
		liquidity: toBigIntValue(raw.Liquidity),
		totalLiquidity: toBigIntValue(raw.TotalLiquidity),
		totalShort: toBigIntValue(raw.TotalShort),
		openInterests: toBigIntValue(raw.OpenInterests),
		totalLong: toBigIntValue(raw.TotalLong),
		involvedFund: toBigIntValue(raw.InvolvedFund),
		feeIndex: toBigIntValue(raw.FeeIndex),
		protocolFee: toBigIntValue(raw.ProtocolFee),
		longSocialLossIndex: toBigIntValue(raw.LongSocialLossIndex),
		shortSocialLossIndex: toBigIntValue(raw.ShortSocialLossIndex),
		longFundingIndex: toBigIntValue(raw.LongFundingIndex),
		shortFundingIndex: toBigIntValue(raw.ShortFundingIndex),
		insuranceFund: toBigIntValue(raw.InsuranceFund),
		settlementPrice: toBigIntValue(raw.SettlementPrice),
	};
}

function normalizePriceDataFromQuery(raw: OnChainQueryPriceDataFromApi): PriceData {
	return {
		instrument: raw.Instrument ?? zeroAddress,
		expiry: Number(raw.Expiry ?? 0),
		markPrice: toBigIntValue(raw.MarkPrice),
		spotPrice: toBigIntValue(raw.SpotPrice),
		benchmarkPrice: toBigIntValue(raw.BenchmarkPrice),
		feeder0: raw.Feeder0 ?? zeroAddress,
		feeder1: raw.Feeder1 ?? zeroAddress,
		feeder0UpdatedAt: toBigIntValue(raw.Feeder0UpdatedAt),
		feeder1UpdatedAt: toBigIntValue(raw.Feeder1UpdatedAt),
	};
}

function normalizePortfolioFromQuery(raw?: OnChainQueryPortfolioFromApi | null): Portfolio {
	if (!raw) {
		return PairSnapshot.emptyPortfolio();
	}

	const position = normalizePositionFromQuery(raw.Position);
	const oids = Array.isArray(raw.Oids) ? raw.Oids.map((oid) => Number(oid ?? 0)) : [];
	const orders = Array.isArray(raw.Orders)
		? raw.Orders.map((order, index) => {
			const oid = oids[index];
			if (oid === undefined) {
				throw new Error('Order oid is missing');
			}
			const { tick, nonce } = Order.unpackKey(oid);
			return normalizeOrderFromQuery(order, tick, nonce);
		})
		: [];
	const rids = Array.isArray(raw.Rids) ? raw.Rids.map((rid) => Number(rid ?? 0)) : [];
	const ranges = Array.isArray(raw.Ranges)
		? raw.Ranges.map((range, index) => {
			const rid = rids[index];
			if (rid === undefined) {
				throw new Error('Range rid is missing');
			}
			const { tickLower, tickUpper } = Range.unpackKey(rid);
			return normalizeRangeFromQuery(range, tickLower, tickUpper);
		})
		: [];
	const ordersTaken = Array.isArray(raw.OrdersTaken) ? raw.OrdersTaken.map((value) => toBigIntValue(value)) : [];

	return {
		oids,
		rids,
		position,
		orders,
		ranges,
		ordersTaken,
	};
}

function normalizePositionFromQuery(raw?: OnChainQueryPositionFromApi | null): Position {
	if (!raw) {
		return Position.empty();
	}

	return new Position(
		toBigIntValue(raw.Balance),
		toBigIntValue(raw.Size),
		toBigIntValue(raw.EntryNotional),
		toBigIntValue(raw.EntrySocialLossIndex),
		toBigIntValue(raw.EntryFundingIndex)
	);
}

function normalizeOrderFromQuery(raw: OnChainQueryOrderFromApi, tick: number, nonce: number): Order {
	return new Order(toBigIntValue(raw.Balance), toBigIntValue(raw.Size), tick, nonce);
}

function normalizeRangeFromQuery(raw: OnChainQueryRangeFromApi, tickLower: number, tickUpper: number): Range {
	return new Range(
		toBigIntValue(raw.Liquidity),
		toBigIntValue(raw.EntryFeeIndex),
		toBigIntValue(raw.Balance),
		toBigIntValue(raw.SqrtEntryPX96),
		tickLower,
		tickUpper
	);
}

function normalizeQuotationFromQuery(raw: OnChainQueryQuotationFromApi): Quotation {
	return {
		benchmark: toBigIntValue(raw.Benchmark),
		sqrtFairPX96: toBigIntValue(raw.SqrtFairPX96),
		tick: Number(raw.Tick ?? 0),
		mark: toBigIntValue(raw.Mark),
		entryNotional: toBigIntValue(raw.EntryNotional),
		fee: toBigIntValue(raw.Fee),
		minAmount: toBigIntValue(raw.MinAmount),
		sqrtPostFairPX96: toBigIntValue(raw.SqrtPostFairPX96),
		postTick: Number(raw.PostTick ?? 0),
	};
}

function normalizeQuoteStateFromQuery(raw: OnChainQueryQuoteStateFromApi): QuoteState {
	return {
		quote: raw.Quote ?? zeroAddress,
		decimals: Number(raw.Decimals ?? 0),
		symbol: raw.Symbol ?? '',
		threshold: toBigIntValue(raw.Threshold),
		reserve: toBigIntValue(raw.Reserve),
		balance: toBigIntValue(raw.Balance),
		allowance: toBigIntValue(raw.Allowance),
		fundFlow: {
			totalIn: toBigIntValue(raw.FundFlow?.TotalIn),
			totalOut: toBigIntValue(raw.FundFlow?.TotalOut),
		},
		pending: {
			timestamp: Number(raw.Pending?.Timestamp ?? 0),
			native: Boolean(raw.Pending?.Native),
			amount: toBigIntValue(raw.Pending?.Amount),
			exemption: toBigIntValue(raw.Pending?.Exemption),
		},
	};
}

function normalizeSpacingFromQuery(raw: OnChainQuerySpacingFromApi): SpacingConfig {
	return {
		pearl: Number(raw.Pearl ?? 0),
		order: Number(raw.Order ?? 0),
		range: Number(raw.Range ?? 0),
	};
}

function normalizeBlockInfoFromQuery(raw: OnChainQueryBlockInfoFromApi): BlockInfo {
	return {
		timestamp: Number(raw.Timestamp ?? 0),
		height: Number(raw.Height ?? 0),
	};
}

