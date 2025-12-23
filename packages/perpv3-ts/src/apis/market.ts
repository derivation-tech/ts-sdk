import {
	INSTRUMENT_BIGINT_KEYS,
	INQUIRE_BIGINT_KEYS,
	INQUIRE_BY_TICK_BIGINT_KEYS,
	PORTFOLIO_BIG_INT_KEYS,
	API_URLS,
	GATE_BALANCE_BIGINT_KEYS,
	ORDER_DATA_BIGINT_KEYS,
	DEPTH_CHART_BIGINT_KEYS,
	PRICE_DATA_BIGINT_KEYS,
	QUOTE_STATE_BIGINT_KEYS,
} from './constants';
import type {
	FetchFuturesInstrumentInput,
	FetchFuturesInstrumentResponse,
	FetchFuturesInstrumentInquireInput,
	FetchFuturesInstrumentInquireResponse,
	FetchFuturesInstrumentInquireByTickInput,
	FetchFuturesInstrumentInquireByTickResponse,
	FetchFuturesInstrumentInquireByNotionalInput,
	FetchFuturesInstrumentInquireByNotionalResponse,
	FetchGateBalanceResponse,
	FetchGateBalanceInput,
	FetchOnChainContextInput,
	FetchOnChainContextResponse,
	TotalValueRequest,
	TotalValueResponse,
	FetchFuturesPairOrderBookInput,
	OrderDataFromApi,
	IFuturesOrderBookAllSteps,
	FetchFuturesPairOrderBookResponse,
	FetchFuturesPairKlineChartInput,
	FetchFuturesPairDepthChartInput,
	FetchFuturesPairDepthChartResponse,
	KlineDataFromApi,
	FetchFuturesPairKlineChartResponse,
	FetchMarketPairInfoInput,
	FetchMarketPairInfoResponse,
	FetchMarketPairListResponse,
	IMarketPair,
	FetchOnChainContextQueryInput,
	FetchOnChainContextQueryResponse,
	ApiSigner,
} from './interfaces';
import { bigIntObjectCheckByKeys, getRequestUrlWithQuery, HttpClient } from '../utils';
import { buildOnChainContextFromQuery, normalizeMinimalPearlTuple } from './utils';
import { getDepthRangeDataByLiquidityDetails } from '../frontend/chart';

/**
 * MarketModule - Market API endpoints
 */
export class MarketModule {
	constructor(private readonly httpClient: HttpClient, private readonly signer: ApiSigner) {}

	/**
	 * Fetch futures instrument
	 */
	async fetchFuturesInstrument(
		params: FetchFuturesInstrumentInput,
	): Promise<FetchFuturesInstrumentResponse> {
		const requestUrl = API_URLS.MARKET.INSTRUMENT;
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: params,
			headers: {
				...extraHeaders,
			},
		});

		if (res?.data?.data) {
			return bigIntObjectCheckByKeys(res.data.data, INSTRUMENT_BIGINT_KEYS);
		}
		return null;
	}

	/**
	 * Fetch market on-chain context
	 */
	async fetchMarketOnChainContext(
		params: FetchOnChainContextInput,
	): Promise<FetchOnChainContextResponse | null> {
		const requestUrl = API_URLS.MARKET.ONCHAIN_CONTEXT;
		const requestParams = {
			chainId: params.chainId,
			instrument: params.instrument,
			expiry: params.expiry,
			...(params.userAddress ? { userAddress: params.userAddress } : {}),
			...(params.signedSize !== undefined ? { signedSize: params.signedSize } : {}),
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders
			}
		});
		if (!res?.data?.data) {
			return null;
		}

		const { instrument: instrumentData, inquireRes, portfolioRes, priceData, quoteState } = res.data.data;

		const normalizedInstrument = instrumentData
			? bigIntObjectCheckByKeys(instrumentData, INSTRUMENT_BIGINT_KEYS)
			: null;

		const normalizedQuotation = inquireRes
			? (() => {
				const inquireData = bigIntObjectCheckByKeys(inquireRes, INQUIRE_BIGINT_KEYS);
				return {
					...inquireData,
					tick: Number(inquireData.tick),
					postTick: Number(inquireData.postTick),
				};
			})()
			: null;

		const normalizedPortfolio = portfolioRes
			? bigIntObjectCheckByKeys(portfolioRes, [...PORTFOLIO_BIG_INT_KEYS])
			: null;

		const normalizedPriceData = priceData ? bigIntObjectCheckByKeys(priceData, PRICE_DATA_BIGINT_KEYS) : null;

		const normalizedQuoteState = quoteState ? bigIntObjectCheckByKeys(quoteState, QUOTE_STATE_BIGINT_KEYS) : null;

		return {
			instrument: normalizedInstrument,
			inquireRes: normalizedQuotation,
			portfolioRes: normalizedPortfolio,
			priceData: normalizedPriceData,
			quoteState: normalizedQuoteState,
		};
	}

	/**
	 * Fetch market on-chain context query
	 */
	async fetchMarketOnChainContextQuery(
		params: FetchOnChainContextQueryInput,
	): Promise<FetchOnChainContextQueryResponse> {
		const requestUrl = API_URLS.MARKET.ONCHAIN_CONTEXT_QUERY;
		const requestParams = {
			chainId: params.chainId,
			instrument: params.instrument,
			expiry: params.expiry,
			...(params.userAddress ? { userAddress: params.userAddress } : {}),
			...(params.signedSize !== undefined ? { signedSize: params.signedSize } : {}),
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});

		if (!res?.data?.data) {
			return null;
		}

		const rawData = res.data.data;

		if (!rawData?.Setting || !rawData?.Amm || !rawData?.PriceData || !rawData?.Spacing || !rawData?.BlockInfo) {
			return null;
		}

		return buildOnChainContextFromQuery(rawData);
	}

	/**
	 * Fetch futures instrument inquire
	 */
	async fetchFuturesInstrumentInquire(
		params: FetchFuturesInstrumentInquireInput,
	): Promise<FetchFuturesInstrumentInquireResponse> {
		const requestUrl = API_URLS.MARKET.INQUIRE;
		const requestParams = {
			chainId: params.chainId,
			instrument: params.instrument,
			expiry: params.expiry,
			size: params.size,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, INQUIRE_BIGINT_KEYS);

			return {
				...data,
				tick: Number(data.tick),
				postTick: Number(data.postTick),
			};
		}
		return null;
	}

	/**
	 * Fetch futures instrument inquire by tick
	 */
	async fetchFuturesInstrumentInquireByTick(
		params: FetchFuturesInstrumentInquireByTickInput,
	): Promise<FetchFuturesInstrumentInquireByTickResponse> {
		const requestUrl = API_URLS.MARKET.INQUIRE_BY_TICK;
		const requestParams = {
			chainId: params.chainId,
			instrument: params.instrument,
			expiry: params.expiry,
			tick: params.tick,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, INQUIRE_BY_TICK_BIGINT_KEYS);

			return {
				benchmark: data.benchmark,
				sqrtFairPX96: data.sqrtFairPX96,
				tick: Number(data.tick),
				mark: data.mark,
				entryNotional: data.entryNotional,
				fee: data.fee,
				size: BigInt(data.size || 0),
				minAmount: data.minAmount,
				sqrtPostFairPX96: data.sqrtPostFairPX96,
				postTick: Number(data.postTick),
			};
		}
		return null;
	}

	/**
	 * Fetch futures instrument inquire by notional
	 */
	async fetchFuturesInstrumentInquireByNotional(
		params: FetchFuturesInstrumentInquireByNotionalInput,
	): Promise<FetchFuturesInstrumentInquireByNotionalResponse> {
		const requestUrl = API_URLS.MARKET.INQUIRE_BY_NOTIONAL;
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, INQUIRE_BY_TICK_BIGINT_KEYS);

			return {
				benchmark: data.benchmark,
				sqrtFairPX96: data.sqrtFairPX96,
				tick: Number(data.tick),
				mark: data.mark,
				entryNotional: data.entryNotional,
				fee: data.fee,
				size: BigInt(data.size || 0),
				minAmount: data.minAmount,
				sqrtPostFairPX96: data.sqrtPostFairPX96,
				postTick: Number(data.postTick),
			};
		}
		return null;
	}

	/**
	 * Fetch futures pair order book
	 */
	async fetchFuturesPairOrderBook(
		params: FetchFuturesPairOrderBookInput,
	): Promise<FetchFuturesPairOrderBookResponse> {
		const requestUrl = API_URLS.MARKET.ORDER_BOOK;
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params,
			headers: {
				...extraHeaders,
			},
		});

		if (res?.data?.data) {
			const newData = Object.entries(res.data.data).reduce((acc, [key, depth]: [string, any]) => {
				const bids: OrderDataFromApi[] = (depth.bids || [])
					.map((b: OrderDataFromApi) => bigIntObjectCheckByKeys(b, ORDER_DATA_BIGINT_KEYS))
					.sort((a: OrderDataFromApi, b: OrderDataFromApi) => b.tick - a.tick);

				const asks: OrderDataFromApi[] = (depth.asks || [])
					.map((a: OrderDataFromApi) => bigIntObjectCheckByKeys(a, ORDER_DATA_BIGINT_KEYS))
					.sort((a: OrderDataFromApi, b: OrderDataFromApi) => a.tick - b.tick);

				acc[key] = { asks, bids };
				return acc;
			}, {} as IFuturesOrderBookAllSteps);

			return newData;
		}
		return null;
	}

	/**
	 * Fetch user gate balance from API
	 */
	async fetchUserGateBalance(
		params: FetchGateBalanceInput,
	): Promise<FetchGateBalanceResponse> {
		const requestUrl = API_URLS.MARKET.GATE_BALANCE;
		const requestParams = {
			chainId: params.chainId,
			userAddress: params.userAddress,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: { data: { portfolios?: any } } }>(API_URLS.MARKET.GATE_BALANCE, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data?.data?.portfolios) {
			const data = bigIntObjectCheckByKeys(res.data.data.data.portfolios, GATE_BALANCE_BIGINT_KEYS);
			return data;
		}
		return null;
	}

	/**
	 * Fetch user total value
	 */
	async fetchUserTotalValue(
		params: TotalValueRequest,
	): Promise<TotalValueResponse> {
		const requestUrl = API_URLS.MARKET.USER_VOLUME;
		const requestParams = {
			chainId: params.chainId,
			userAddress: params.userAddress,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: TotalValueResponse }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		return res?.data?.data;
	}

	/**
	 * Fetch futures pair kline chart
	 */
	async fetchFuturesPairKlineChart(
		params: FetchFuturesPairKlineChartInput,
	): Promise<FetchFuturesPairKlineChartResponse> {
		const requestUrl = API_URLS.MARKET.KLINE_CHARTS;
		const requestParams = {
			chainId: params.chainId,
			instrument: params.instrument,
			expiry: params.expiry,
			interval: params.interval,
			...(params.endTime && { endTime: params.endTime }),
			limit: params.limit ?? 1000,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: KlineDataFromApi[] }>(API_URLS.MARKET.KLINE_CHARTS, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		const rawData = res?.data?.data;
		return rawData.map((d) => ({
			...d,
			timestamp: d.openTimestamp,
		}));
	}

	/**
	 * Fetch futures pair depth chart
	 */
	async fetchFuturesPairDepthChart(
		params: FetchFuturesPairDepthChartInput,
	): Promise<FetchFuturesPairDepthChartResponse> {
		const requestUrl = API_URLS.MARKET.DEPTH_CHARTS;
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: params,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, DEPTH_CHART_BIGINT_KEYS);
			const tick2PearlRaw = (data as { tick2Pearl?: unknown }).tick2Pearl;
			const tick2PearlEntries =
				tick2PearlRaw && typeof tick2PearlRaw === 'object'
					? Object.entries(tick2PearlRaw as Record<string, unknown>)
					: [];

			data.tick2Pearl = tick2PearlEntries.reduce((acc, [key, value]) => {
				const pearlTuple = normalizeMinimalPearlTuple(value);
				if (!pearlTuple) {
					return acc;
				}
				const [liquidityNet, left] = pearlTuple;
				acc.set(Number(key), { liquidityNet, left });
				return acc;
			}, new Map());

			const newData = getDepthRangeDataByLiquidityDetails(data, data.size, data.stepRatio);
			return newData;
		}
		return null;
	}

	/**
	 * Fetch market pair info
	 */
	async fetchMarketPairInfo(
		params: FetchMarketPairInfoInput,
	): Promise<FetchMarketPairInfoResponse> {
		const requestUrl = API_URLS.MARKET.PAIR_INFO;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
			expiry: params.expiry,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			const p = res?.data?.data;
			return {
				...p,
				chainId: params.chainId,
			};
		}
		return null;
	}

	/**
	 * Fetch market pair list
	 */
	async fetchMarketPairList(
		params: { chainId: number },
	): Promise<FetchMarketPairListResponse> {
		const requestUrl = API_URLS.MARKET.PAIR_LIST;
		const requestParams = {
			chainId: params.chainId,
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, requestParams),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: IMarketPair[] }>(requestUrl, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});
		if (res?.data?.data) {
			return res?.data?.data.map((p: IMarketPair) => {
				return {
					...p,
					chainId: params.chainId,
				};
			});
		}
		return undefined;
	}
}

