import type { AxiosResponse } from 'axios';
import { API_URLS, ORDER_DATA_BIGINT_KEYS, MM_WALLET_PORTFOLIO_BIGINT_KEYS, MM_POSITION_BIGINT_KEYS, DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './constants';
import type {
	FetchMmOrderBookInput,
	FetchMmOrderBookResponse,
	FetchMmWalletBalanceInput,
	FetchMmWalletBalanceResponse,
	FetchMmPositionListInput,
	FetchMmPositionListResponse,
	OrderDataFromApi,
	IFuturesOrderBookAllSteps,
	MmWalletPortfolio,
	MmPositionFromApi,
	AuthInfo,
	FetchMmTickersResponse,
	FetchMmTickersInput,
	FetchMmAccountTransactionHistoryInput,
	FetchMmAccountTransactionHistoryResponse,
	FetchTradeHistoryInput,
	FetchTradeHistoryResponse,
	FetchMmFundingHistoryInput,
	FetchMmFundingHistoryResponse,
	FetchMmInstrumentInfoInput,
	FetchMmInstrumentInfoResponse,
	FetchMmKlineInput,
	FetchMmKlineResponse,
	FetchMmLiquidityListInput,
	FetchMmLiquidityListResponse,
	FetchMmLiquidityHistoryInput,
	FetchMmLiquidityHistoryResponse,
	FetchMmOrderHistoryInput,
	FetchMmOrderHistoryResponse,
} from './interfaces';
import { HttpClient, getRequestUrlWithQuery } from '../utils/axios';
import { bigIntObjectCheckByKeys, ApiAuthSigner } from '../utils';


/**
 * MarketMakerModule - Market Maker API endpoints
 */
export class MarketMakerModule {
	private readonly signer: ApiAuthSigner;

	constructor(
		private readonly httpClient: HttpClient,
		signerOrAuthInfo: ApiAuthSigner | AuthInfo
	) {
		if (signerOrAuthInfo instanceof ApiAuthSigner) {
			this.signer = signerOrAuthInfo;
		} else {
			this.signer = new ApiAuthSigner(signerOrAuthInfo);
		}
	}

	/**
	 * Make a signed GET request using ApiAuthSigner
	 */
	private async makeSignedRequest<T>(
		url: string,
		params?: Record<string, any>,
		body?: string,
		contentType?: string
	): Promise<AxiosResponse<T>> {
		const urlWithQuery = getRequestUrlWithQuery(url, params ?? {});
		const extraHeaders = await this.signer.sign('GET', urlWithQuery, body, contentType);
		return await this.httpClient.get<T>(urlWithQuery, {
			headers: {
				...extraHeaders,
			},
		});
	}

	/**
	 * Fetch MM server time
	 */
	async fetchServerTime(): Promise<number> {
		const requestUrl = API_URLS.MM.MM_SERVER_TIME;
		const res = await this.makeSignedRequest<{ data: number }>(requestUrl);
		return res.data.data;
	}

	/**
	 * Fetch MM order book
	 */
	async fetchOrderBook(
		params: FetchMmOrderBookInput,
	): Promise<FetchMmOrderBookResponse> {
		const requestUrl = API_URLS.MM.MM_ORDER_BOOK;
		const requestParams = { chainId: params.chainId, symbol: params.symbol, ...(params.depth ? { depth: params.depth } : {}) };
		const res = await this.makeSignedRequest<{ data: any }>(requestUrl, requestParams);

		if (res?.data?.data) {
			const newData = Object.entries(res.data.data).reduce((acc, [key, depthData]: [string, any]) => {
				const bids: OrderDataFromApi[] = (depthData.bids || [])
					.map((b: OrderDataFromApi) => bigIntObjectCheckByKeys(b, ORDER_DATA_BIGINT_KEYS))
					.sort((a: OrderDataFromApi, b: OrderDataFromApi) => b.tick - a.tick);

				const asks: OrderDataFromApi[] = (depthData.asks || [])
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
	 * Fetch MM wallet balance
	 */
	async fetchWalletBalance(
		params: FetchMmWalletBalanceInput,
	): Promise<FetchMmWalletBalanceResponse | null> {
		const requestUrl = API_URLS.MM.MM_WALLET_BALANCE;
		const requestParams = { chainId: params.chainId, address: params.address };
		const res = await this.makeSignedRequest<{ data: any }>(requestUrl, requestParams);

		const data = res?.data?.data;
		if (!data) {
			return null;
		}

		const portfolios: MmWalletPortfolio[] = (data.portfolios ?? []).map((p: MmWalletPortfolio) =>
			bigIntObjectCheckByKeys(p, MM_WALLET_PORTFOLIO_BIGINT_KEYS as unknown as string[])
		);

		return {
			...data,
			portfolios,
			pendingDuration: BigInt(data.pendingDuration ?? 0),
		};
	}

	/**
	 * Fetch MM position list
	 */
	async fetchPositionList(
		params: FetchMmPositionListInput,
	): Promise<FetchMmPositionListResponse | null> {
		const requestUrl = API_URLS.MM.MM_POSITION_LIST;
		const requestParams = { chainId: params.chainId, address: params.address };
		const res = await this.makeSignedRequest<{ data: MmPositionFromApi[] }>(requestUrl, requestParams);

		const data = res?.data?.data;
		if (!data) {
			return null;
		}

		return (data as MmPositionFromApi[]).map((p) =>
			bigIntObjectCheckByKeys(p, MM_POSITION_BIGINT_KEYS as unknown as string[])
		);
	}

	/**
	 * Fetch MM account transaction history
	 */
	async fetchAccountTransactionHistory(params: FetchMmAccountTransactionHistoryInput): Promise<FetchMmAccountTransactionHistoryResponse | null> {
		const requestUrl = API_URLS.MM.MM_ACCOUNT_TRANSACTION_HISTORY;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
			page: params.page ?? DEFAULT_PAGE,
			size: params.size ?? DEFAULT_PAGE_SIZE
		};
		const res = await this.makeSignedRequest<{ data: FetchMmAccountTransactionHistoryResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}

	async fetchTradeHistory(params: FetchTradeHistoryInput): Promise<FetchTradeHistoryResponse> {
		const requestUrl = API_URLS.MM.MM_TRADE_HISTORY;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
			...(params.symbol !== undefined && { symbol: params.symbol }),
			...(params.startTime !== undefined && { startTime: params.startTime }),
			...(params.endTime !== undefined && { endTime: params.endTime }),
			page: params.page ?? DEFAULT_PAGE,
			size: params.size ?? DEFAULT_PAGE_SIZE
		};
		const res = await this.makeSignedRequest<{ data: FetchTradeHistoryResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}

	/**
	 * Fetch MM tickets
	 */
	async fetchTickers(params: FetchMmTickersInput): Promise<FetchMmTickersResponse | null> {
		const requestUrl = API_URLS.MM.MM_TICKERS;
		const requestParams = {
			chainId: params.chainId,
			...(params.symbol !== undefined && { symbol: params.symbol }),
		};
		const res = await this.makeSignedRequest<{ data: FetchMmTickersResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}


	/**
	 * Fetch MM funding history
	 * @param params FetchMmFundingHistoryInput
	 * @returns FetchMmFundingHistoryResponse
	 */
	async fetchFundingHistory(params: FetchMmFundingHistoryInput): Promise<FetchMmFundingHistoryResponse | null> {
		const requestUrl = API_URLS.MM.MM_FUNDING_HISTORY;
		const requestParams = {
			chainId: params.chainId,
			symbol: params.symbol,
			...(params.startTime !== undefined && { startTime: params.startTime }),
			...(params.endTime !== undefined && { endTime: params.endTime }),
			...(params.limit !== undefined && { limit: params.limit }),
		};
		const res = await this.makeSignedRequest<{ data: FetchMmFundingHistoryResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}


	/**
	 * Fetch MM instrument info
	 * @param params FetchMmInstrumentInfoInput
	 * @returns FetchMmInstrumentInfoResponse
	 */
	async fetchInstrumentInfo(params: FetchMmInstrumentInfoInput): Promise<FetchMmInstrumentInfoResponse | null> {
		const requestUrl = API_URLS.MM.MM_INSTRUMENT_INFO;
		const requestParams = {
			chainId: params.chainId,
			...(params.symbol !== undefined && { symbol: params.symbol }),
		};
		const res = await this.makeSignedRequest<{ data: FetchMmInstrumentInfoResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}


	/**
	 * Fetch MM kline
	 * @param params FetchMmKlineInput
	 * @returns FetchMmKlineResponse
	 */
	async fetchKline(params: FetchMmKlineInput): Promise<FetchMmKlineResponse | null> {
		const requestUrl = API_URLS.MM.MM_KLINE;
		const requestParams = {
			chainId: params.chainId,
			symbol: params.symbol,
			...(params.interval !== undefined && { interval: params.interval }),
			...(params.start !== undefined && { start: params.start }),
			...(params.end !== undefined && { end: params.end }),
			...(params.limit !== undefined && { limit: params.limit }),
		};
		const res = await this.makeSignedRequest<{ data: FetchMmKlineResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}

	/**
	 * Fetch MM liquidity history
	 * @param params GetLiquidityListInput
	 * @returns GetLiquidityHistoryResponse
	 */
	async fetchLiquidityHistory(params: FetchMmLiquidityHistoryInput): Promise<FetchMmLiquidityHistoryResponse | null> {
		const requestUrl = API_URLS.MM.MM_LIQUIDITY_HISTORY;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
			...(params.symbol !== undefined && { symbol: params.symbol }),
			...(params.startTime !== undefined && { startTime: params.startTime }),
			...(params.endTime !== undefined && { endTime: params.endTime }),
			page: params.page ?? DEFAULT_PAGE,
			size: params.size ?? DEFAULT_PAGE_SIZE,
		};
		const res = await this.makeSignedRequest<{ data: FetchMmLiquidityHistoryResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}

	/**
	 * Fetch MM liquidity list
	 * @param params GetLiquidityListInput
	 * @returns GetLiquidityListResponse
	 */
	async fetchLiquidityList(params: FetchMmLiquidityListInput): Promise<FetchMmLiquidityListResponse | null> {
		const requestUrl = API_URLS.MM.MM_LIQUIDITY_LIST;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
		};
		const res = await this.makeSignedRequest<{ data: FetchMmLiquidityListResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}


	/**
	 * Fetch MM order history
	 * @param params FetchMmOrderHistoryInput
	 * @returns FetchMmOrderHistoryResponse
	 */
	async fetchOrderHistory(params: FetchMmOrderHistoryInput): Promise<FetchMmOrderHistoryResponse | null> {
		const requestUrl = API_URLS.MM.MM_ORDER_HISTORY;
		const requestParams = {
			chainId: params.chainId,
			address: params.address,
			...(params.symbol !== undefined && { symbol: params.symbol }),
			...(params.startTime !== undefined && { startTime: params.startTime }),
			...(params.endTime !== undefined && { endTime: params.endTime }),
			page: params.page ?? DEFAULT_PAGE,
			size: params.size ?? DEFAULT_PAGE_SIZE,
		};
		const res = await this.makeSignedRequest<{ data: FetchMmOrderHistoryResponse }>(requestUrl, requestParams);
		return res?.data?.data ?? null;
	}
}