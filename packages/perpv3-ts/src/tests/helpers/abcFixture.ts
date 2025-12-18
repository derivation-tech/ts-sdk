import { Condition } from '../../types';
import { Position } from '../../types/position';
import { Range } from '../../types/range';
import { Order } from '../../types/order';
import {
    type Amm,
    type BlockInfo,
    type Portfolio,
    type PriceData,
    type QuoteState,
    type Quotation,
    type Setting,
    type SpacingConfig,
} from '../../types/contract';
import { PairSnapshot } from '../../types/snapshot';

type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface RawOnchainContext {
    setting: unknown;
    condition?: unknown;
    amm: unknown;
    priceData: unknown;
    portfolio?: unknown;
    quotation?: unknown;
    quoteState?: unknown;
    spacing: unknown;
    blockInfo: unknown;
}

export interface RawQuotation {
    benchmark: JsonPrimitive;
    sqrtFairPX96: JsonPrimitive;
    tick: number;
    mark: JsonPrimitive;
    entryNotional: JsonPrimitive;
    fee: JsonPrimitive;
    minAmount: JsonPrimitive;
    sqrtPostFairPX96: JsonPrimitive;
    postTick: number;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
    if (!value || typeof value !== 'object') {
        return {};
    }
    return value as UnknownRecord;
}

export function parseBigInt(value: JsonPrimitive): bigint {
    if (typeof value === 'bigint') {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return BigInt(value);
    }
    throw new Error(`Invalid bigint value in fixture: ${String(value)}`);
}

function parsePriceData(raw: unknown): PriceData {
    const record = asRecord(raw);
    return {
        instrument: record.instrument as PriceData['instrument'],
        expiry: Number(record.expiry ?? 0),
        markPrice: parseBigInt(record.markPrice as JsonPrimitive),
        spotPrice: parseBigInt(record.spotPrice as JsonPrimitive),
        benchmarkPrice: parseBigInt(record.benchmarkPrice as JsonPrimitive),
        feeder0: record.feeder0 as PriceData['feeder0'],
        feeder1: record.feeder1 as PriceData['feeder1'],
        feeder0UpdatedAt: parseBigInt(record.feeder0UpdatedAt as JsonPrimitive),
        feeder1UpdatedAt: parseBigInt(record.feeder1UpdatedAt as JsonPrimitive),
    };
}

function parseAmm(raw: unknown): Amm {
    const record = asRecord(raw);
    return {
        expiry: Number(record.expiry ?? 0),
        timestamp: Number(record.timestamp ?? 0),
        status: Number(record.status ?? 0),
        tick: Number(record.tick ?? 0),
        sqrtPX96: parseBigInt(record.sqrtPX96 as JsonPrimitive),
        liquidity: parseBigInt(record.liquidity as JsonPrimitive),
        totalLiquidity: parseBigInt(record.totalLiquidity as JsonPrimitive),
        totalShort: parseBigInt(record.totalShort as JsonPrimitive),
        openInterests: parseBigInt(record.openInterests as JsonPrimitive),
        totalLong: parseBigInt(record.totalLong as JsonPrimitive),
        involvedFund: parseBigInt(record.involvedFund as JsonPrimitive),
        feeIndex: parseBigInt(record.feeIndex as JsonPrimitive),
        protocolFee: parseBigInt(record.protocolFee as JsonPrimitive),
        longSocialLossIndex: parseBigInt(record.longSocialLossIndex as JsonPrimitive),
        shortSocialLossIndex: parseBigInt(record.shortSocialLossIndex as JsonPrimitive),
        longFundingIndex: parseBigInt(record.longFundingIndex as JsonPrimitive),
        shortFundingIndex: parseBigInt(record.shortFundingIndex as JsonPrimitive),
        insuranceFund: parseBigInt(record.insuranceFund as JsonPrimitive),
        settlementPrice: parseBigInt(record.settlementPrice as JsonPrimitive),
    };
}

function parsePosition(raw: unknown): Position {
    const record = asRecord(raw);
    return new Position(
        parseBigInt(record.balance as JsonPrimitive),
        parseBigInt(record.size as JsonPrimitive),
        parseBigInt(record.entryNotional as JsonPrimitive),
        parseBigInt(record.entrySocialLossIndex as JsonPrimitive),
        parseBigInt(record.entryFundingIndex as JsonPrimitive)
    );
}

function parseOrder(raw: unknown, tick: number, nonce: number): Order {
    const record = asRecord(raw);
    return new Order(
        parseBigInt(record.balance as JsonPrimitive),
        parseBigInt(record.size as JsonPrimitive),
        tick,
        nonce
    );
}

function parseRange(raw: unknown, tickLower: number, tickUpper: number): Range {
    const record = asRecord(raw);
    return new Range(
        parseBigInt(record.liquidity as JsonPrimitive),
        parseBigInt(record.entryFeeIndex as JsonPrimitive),
        parseBigInt(record.balance as JsonPrimitive),
        parseBigInt(record.sqrtEntryPX96 as JsonPrimitive),
        tickLower,
        tickUpper
    );
}

function parsePortfolio(raw: unknown): Portfolio {
    const record = asRecord(raw);
    const position = parsePosition(record.position);
    const oids = Array.isArray(record.oids)
        ? record.oids.map((oid: unknown) => Number((oid as JsonPrimitive) ?? 0))
        : [];
    const orders = Array.isArray(record.orders)
        ? record.orders.map((order: unknown, index: number) => {
              const oid = oids[index];
              if (oid === undefined) {
                  throw new Error('Order oid is missing');
              }
              const { tick, nonce } = Order.unpackKey(oid);
              return parseOrder(order, tick, nonce);
          })
        : [];
    const rids = Array.isArray(record.rids)
        ? record.rids.map((rid: unknown) => Number((rid as JsonPrimitive) ?? 0))
        : [];
    const ranges = Array.isArray(record.ranges)
        ? record.ranges.map((range: unknown, index: number) => {
              const rid = rids[index];
              if (rid === undefined) {
                  throw new Error('Range rid is missing');
              }
              const { tickLower, tickUpper } = Range.unpackKey(rid);
              return parseRange(range, tickLower, tickUpper);
          })
        : [];
    const ordersTaken = Array.isArray(record.ordersTaken)
        ? record.ordersTaken.map((item: unknown) => parseBigInt(item as JsonPrimitive))
        : [];

    return {
        oids,
        rids,
        position,
        orders,
        ranges,
        ordersTaken,
    };
}

function parseQuoteState(raw: unknown): QuoteState {
    const record = asRecord(raw);
    const fundFlow = asRecord(record.fundFlow);
    const pending = asRecord(record.pending);
    return {
        quote: record.quote as QuoteState['quote'],
        decimals: Number(record.decimals ?? 0),
        symbol: String(record.symbol ?? ''),
        threshold: parseBigInt(record.threshold as JsonPrimitive),
        reserve: parseBigInt(record.reserve as JsonPrimitive),
        balance: parseBigInt(record.balance as JsonPrimitive),
        allowance: parseBigInt(record.allowance as JsonPrimitive),
        fundFlow: {
            totalIn: parseBigInt(fundFlow.totalIn as JsonPrimitive),
            totalOut: parseBigInt(fundFlow.totalOut as JsonPrimitive),
        },
        pending: {
            timestamp: Number(pending.timestamp ?? 0),
            native: Boolean(pending.native),
            amount: parseBigInt(pending.amount as JsonPrimitive),
            exemption: parseBigInt(pending.exemption as JsonPrimitive),
        },
    };
}

function parseSpacing(raw: unknown): SpacingConfig {
    const record = asRecord(raw);
    return {
        pearl: Number(record.pearl ?? 0),
        order: Number(record.order ?? 0),
        range: Number(record.range ?? 0),
    };
}

function parseBlockInfo(raw: unknown): BlockInfo {
    const record = asRecord(raw);
    return {
        timestamp: Number(record.timestamp ?? 0),
        height: Number(record.height ?? 0),
    };
}

export function parseQuotation(raw: unknown): Quotation {
    const record = asRecord(raw);
    return {
        benchmark: parseBigInt(record.benchmark as JsonPrimitive),
        sqrtFairPX96: parseBigInt(record.sqrtFairPX96 as JsonPrimitive),
        tick: Number(record.tick ?? 0),
        mark: parseBigInt(record.mark as JsonPrimitive),
        entryNotional: parseBigInt(record.entryNotional as JsonPrimitive),
        fee: parseBigInt(record.fee as JsonPrimitive),
        minAmount: parseBigInt(record.minAmount as JsonPrimitive),
        sqrtPostFairPX96: parseBigInt(record.sqrtPostFairPX96 as JsonPrimitive),
        postTick: Number(record.postTick ?? 0),
    };
}

export function parseOnchainContext(raw: RawOnchainContext): PairSnapshot {
    const settingRaw = asRecord(raw.setting);
    const priceDataRaw = raw.priceData;
    const ammRaw = raw.amm;
    const portfolioRaw = raw.portfolio;
    const quoteStateRaw = raw.quoteState;
    const spacingRaw = raw.spacing;
    const blockInfoRaw = raw.blockInfo;
    const paramRaw = asRecord(settingRaw.param);

    const setting = {
        symbol: String(settingRaw.symbol ?? ''),
        config: settingRaw.config as Setting['config'],
        gate: settingRaw.gate as Setting['gate'],
        market: settingRaw.market as Setting['market'],
        quote: settingRaw.quote as Setting['quote'],
        decimals: Number(settingRaw.decimals ?? 0),
        initialMarginRatio: Number(settingRaw.initialMarginRatio ?? 0),
        maintenanceMarginRatio: Number(settingRaw.maintenanceMarginRatio ?? 0),
        placePaused: Boolean(settingRaw.placePaused),
        fundingHour: Number(settingRaw.fundingHour ?? 0),
        disableOrderRebate: Boolean(settingRaw.disableOrderRebate),
        param: {
            minMarginAmount: parseBigInt(paramRaw.minMarginAmount as JsonPrimitive),
            tradingFeeRatio: Number(paramRaw.tradingFeeRatio ?? 0),
            protocolFeeRatio: Number(paramRaw.protocolFeeRatio ?? 0),
            qtype: Number(paramRaw.qtype ?? 0),
            tip: parseBigInt(paramRaw.tip as JsonPrimitive),
        },
    };

    const portfolio = portfolioRaw ? parsePortfolio(portfolioRaw) : PairSnapshot.emptyPortfolio();
    const quoteState = quoteStateRaw
        ? parseQuoteState(quoteStateRaw)
        : PairSnapshot.emptyQuoteState(setting.quote, setting.decimals, '');
    const quotation = raw.quotation ? parseQuotation(raw.quotation) : undefined;

    return new PairSnapshot({
        setting,
        condition: raw.condition !== undefined ? (Number(raw.condition) as Condition) : Condition.NORMAL,
        amm: parseAmm(ammRaw),
        priceData: parsePriceData(priceDataRaw),
        spacing: parseSpacing(spacingRaw),
        blockInfo: parseBlockInfo(blockInfoRaw),
        portfolio,
        quotation,
        quoteState,
    });
}

export function normalizeBigIntObject<T>(value: T): T {
    return normalizeBigIntInternal(value) as T;
}

function normalizeBigIntInternal(value: unknown): unknown {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalizeBigIntInternal(item));
    }
    if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            result[key] = normalizeBigIntInternal(entry);
        }
        return result;
    }
    return value;
}
