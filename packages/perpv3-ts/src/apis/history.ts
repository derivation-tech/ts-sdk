import { API_URLS, DEFAULT_HISTORY_PAGE_SIZE, DEFAULT_PAGE } from './constants';
import type {
	GetTradeHistoryParams,
	GetAccountBalanceHistoryParams,
	GetAccountBalanceHistoryResponse,
	GetFundingHistoryParams,
	GetFundingHistoryResponse,
	GetLiquidityHistoryParams,
	GetLiquidityHistoryResponse,
	GetOrdersHistoryParams,
	GetOrdersHistoryResponse,
	GetTradeHistoryResponse,
	GetTransferHistoryParams,
	GetTransferHistoryResponse,
	GetTransferHistoryItemResponse,
} from './interfaces';
import { HttpClient } from '../utils';
import { getStartEndTimeByRangeType } from '../frontend';

/**
 * HistoryModule - History API endpoints
 */
export class HistoryModule {
	constructor(private readonly httpClient: HttpClient) {}

	/**
	 * Fetch trade history
	 */
	async fetchTradeHistory(
		params: GetTradeHistoryParams,
	): Promise<GetTradeHistoryResponse> {
		const {
			chainId,
			userAddress,
			instrumentAddress,
			expiry,
			page = 1,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			timeRange,
			download = false,
		} = params;

		if (!userAddress) {
			return [];
		}
		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.TRADE, {
			params: {
				chainId,
				userAddress,
				...(download
					? { download: true }
					: {
						...(pageSize !== undefined && { size: pageSize }),
						...(instrumentAddress !== undefined && { instrumentAddress }),
						...(expiry !== undefined && { expiry }),
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
					}),
			},
		});
		const tradeHistoryList = result?.data?.data?.list;
		if (!Array.isArray(tradeHistoryList)) {
			return [];
		}
		type TradeHistoryItem = GetTradeHistoryResponse[number];
		return [...(tradeHistoryList as TradeHistoryItem[])].sort(
			(a: TradeHistoryItem, b: TradeHistoryItem) => b.timestamp - a.timestamp
		);
	}

	/**
	 * Fetch orders history
	 */
	async fetchOrdersHistory(
		params: GetOrdersHistoryParams
	): Promise<GetOrdersHistoryResponse> {
		const {
			chainId,
			userAddress,
			instrumentAddress,
			expiry,
			timeRange,
			page = DEFAULT_PAGE,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			download = false,
		} = params;

		if (!userAddress) {
			return [];
		}
		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.ORDER, {
			params: {
				chainId,
				userAddress,
				...(download
					? { download: true }
					: {
						...(pageSize !== undefined && { size: pageSize }),
						...(instrumentAddress !== undefined && { instrumentAddress }),
						...(expiry !== undefined && { expiry }),
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
					}),
			},
		});
		const orderHistoryList = result?.data?.data?.list;
		if (!Array.isArray(orderHistoryList)) {
			return [];
		}
		type OrderHistoryItem = GetOrdersHistoryResponse[number] & { timestamp?: number };
		const getOrderHistoryTimestamp = (value: OrderHistoryItem): number => value.timestamp ?? value.placeTimestamp ?? 0;

		return [...(orderHistoryList as OrderHistoryItem[])].sort(
			(a: OrderHistoryItem, b: OrderHistoryItem) => getOrderHistoryTimestamp(b) - getOrderHistoryTimestamp(a)
		);
	}

	/**
	 * Fetch funding history
	 */
	async fetchFundingHistory(
		params: GetFundingHistoryParams,
	): Promise<GetFundingHistoryResponse> {
		const {
			chainId,
			userAddress,
			instrumentAddress,
			expiry,
			timeRange,
			page = DEFAULT_PAGE,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			download = false,
		} = params;

		if (!userAddress) return [];

		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.FUNDING, {
			params: {
				chainId,
				userAddress,
				...(download
					? { download: true }
					: {
						...(pageSize !== undefined && { size: pageSize }),
						...(instrumentAddress !== undefined && { instrumentAddress }),
						...(expiry !== undefined && { expiry }),
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
					}),
			},
		});

		const historyList = result.data.data.list || [];
		return historyList;
	}

	/**
	 * Fetch transfer history
	 */
	async fetchTransferHistory(
		params: GetTransferHistoryParams,
	): Promise<GetTransferHistoryResponse> {
		const {
			chainId,
			userAddress,
			instrumentAddress,
			expiry,
			timeRange,
			page = DEFAULT_PAGE,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			download = false,
		} = params;

		if (!userAddress) return [];

		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.TRANSFER, {
			params: {
				chainId,
				userAddress,
				...(download
					? { download: true }
					: {
						...(pageSize !== undefined && { size: pageSize }),
						...(instrumentAddress !== undefined && { instrumentAddress }),
						...(expiry !== undefined && { expiry }),
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
					}),
			},
		});

		const historyList = result.data.data.list || [];

		return (
			historyList?.map((history: GetTransferHistoryItemResponse) => ({
				...history,
			})) || []
		);
	}

	/**
	 * Fetch liquidity history
	 */
	async fetchLiquidityHistory(
		params: GetLiquidityHistoryParams,
	): Promise<GetLiquidityHistoryResponse> {
		const {
			chainId,
			userAddress,
			instrumentAddress,
			expiry,
			timeRange,
			page = DEFAULT_PAGE,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			download = false,
		} = params;

		if (!userAddress) return [];

		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.LQUIDITY, {
			params: {
				chainId,
				userAddress,
				...(download
					? { download: true }
					: {
						...(pageSize !== undefined && { size: pageSize }),
						...(instrumentAddress !== undefined && { instrumentAddress }),
						...(expiry !== undefined && { expiry }),
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
					}),
			},
		});

		const eventList = result.data.data.list || [];
		return eventList;
	}

	/**
	 * Fetch account balance history
	 */
	async fetchAccountBalanceHistory(
		params: GetAccountBalanceHistoryParams,
	): Promise<GetAccountBalanceHistoryResponse> {
		const {
			chainId,
			userAddress,
			timeRange,
			page = DEFAULT_PAGE,
			size: pageSize = DEFAULT_HISTORY_PAGE_SIZE,
			download = false,
		} = params;

		if (!userAddress) return [];

		const { startTime, endTime } = getStartEndTimeByRangeType(timeRange);
		const result = await this.httpClient.get<{ data: { list: any[] } }>(API_URLS.HISTORY.ACCOUNT, {
			params: {
				chainId,
				userAddress,

				...(download
					? { download: true }
					: {
						...(startTime !== undefined && { startTime }),
						...(endTime !== undefined && { endTime }),
						...(page !== undefined && { page }),
						...(pageSize !== undefined && { size: pageSize }),
					}),
			},
		});

		const eventList = result.data.data.list || [];
		return eventList || [];
	}
}

