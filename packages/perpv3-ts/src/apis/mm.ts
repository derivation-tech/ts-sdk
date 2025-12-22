import { API_URLS, ORDER_DATA_BIGINT_KEYS, MM_WALLET_PORTFOLIO_BIGINT_KEYS, MM_POSITION_BIGINT_KEYS } from './constants';
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
} from './interfaces';
import { HttpClient } from '../utils/axios';
import { bigIntObjectCheckByKeys } from '../utils';

/**
 * MarketMakerModule - Market Maker API endpoints
 */
export class MarketMakerModule {
	constructor(private readonly httpClient: HttpClient) {}

	/**
	 * Fetch MM server time
	 */
	async fetchServerTime(): Promise<number> {
		const res = await this.httpClient.get<{ data: number }>(API_URLS.MM.MM_SERVER_TIME);
		return res.data.data;
	}

	/**
	 * Fetch MM order book
	 */
	async fetchOrderBook(
		params: FetchMmOrderBookInput,
	): Promise<FetchMmOrderBookResponse> {
		const res = await this.httpClient.get<{ data: any }>(API_URLS.MM.MM_ORDER_BOOK, {
			params: { chainId: params.chainId, symbol: params.symbol, ...(params.depth ? { depth: params.depth } : {}) },
		});

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
		const res = await this.httpClient.get<{ data: any }>(API_URLS.MM.MM_WALLET_BALANCE, {
			params: { chainId: params.chainId, address: params.address },
		});

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
		const res = await this.httpClient.get<{ data: MmPositionFromApi[] }>(API_URLS.MM.MM_POSITION_LIST, {
			params: { chainId: params.chainId, address: params.address },
		});

		const data = res?.data?.data;
		if (!data) {
			return null;
		}

		return (data as MmPositionFromApi[]).map((p) =>
			bigIntObjectCheckByKeys(p, MM_POSITION_BIGINT_KEYS as unknown as string[])
		);
	}
}

