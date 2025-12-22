// Re-export module classes
export { PublicModule } from './public';
export { MarketModule } from './market';
export { MarketMakerModule } from './mm';
export { TokenModule } from './token';
export { HistoryModule } from './history';

// Re-export utils
export * from './utils';

// Backward compatibility: export functions that use the modules
import { PublicModule } from './public';
import { MarketModule } from './market';
import { MarketMakerModule } from './mm';
import { TokenModule } from './token';
import { HistoryModule } from './history';
import { HttpClient } from '../utils';
import type {
    FetchFuturesInstrumentInput,
    FetchFuturesInstrumentResponse,
    FetchFuturesInstrumentInquireInput,
    FetchFuturesInstrumentInquireResponse,
    FetchFuturesInstrumentInquireByTickInput,
    FetchFuturesInstrumentInquireByTickResponse,
    FetchFuturesInstrumentInquireByNotionalInput,
    FetchFuturesInstrumentInquireByNotionalResponse,
    FetchPortfolioListFromApiResponse,
    FetchGateBalanceResponse,
    FetchGateBalanceInput,
    FetchPortfolioListFromApiInput,
    FetchOnChainContextInput,
    FetchOnChainContextResponse,
    FetchTokenPriceMapInput,
    FetchTokenPriceMapResponse,
    TotalValueRequest,
    TotalValueResponse,
    FetchFuturesPairOrderBookInput,
    FetchFuturesPairOrderBookResponse,
    FetchFuturesPairKlineChartInput,
    FetchFuturesPairDepthChartInput,
    FetchFuturesPairDepthChartResponse,
    AuthInfo,
    FetchFuturesPairKlineChartResponse,
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
    FetchMarketPairInfoInput,
    FetchMarketPairInfoResponse,
    FetchMarketPairListResponse,
    FetchOnChainContextQueryInput,
    FetchOnChainContextQueryResponse,
    FetchMmOrderBookInput,
    FetchMmOrderBookResponse,
    FetchMmWalletBalanceInput,
    FetchMmWalletBalanceResponse,
    FetchMmPositionListInput,
    FetchMmPositionListResponse,
} from './interfaces';

// Create a HttpClient instance for backward compatibility
// Note: This requires authInfo to be passed to each function
const createHttpClient = (authInfo: AuthInfo) => new HttpClient({ authInfo });

// Market functions
export const fetchFuturesInstrument = async (
    params: FetchFuturesInstrumentInput,
    authInfo: AuthInfo
): Promise<FetchFuturesInstrumentResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesInstrument(params);
};

export const fetchMarketOnChainContext = async (
    params: FetchOnChainContextInput,
    authInfo: AuthInfo
): Promise<FetchOnChainContextResponse | null> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchMarketOnChainContext(params);
};

export const fetchMarketOnChainContextQuery = async (
    params: FetchOnChainContextQueryInput,
    authInfo: AuthInfo
): Promise<FetchOnChainContextQueryResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchMarketOnChainContextQuery(params);
};

export const fetchFuturesInstrumentInquire = async (
    params: FetchFuturesInstrumentInquireInput,
    authInfo: AuthInfo
): Promise<FetchFuturesInstrumentInquireResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesInstrumentInquire(params);
};

export const fetchFuturesInstrumentInquireByTick = async (
    params: FetchFuturesInstrumentInquireByTickInput,
    authInfo: AuthInfo
): Promise<FetchFuturesInstrumentInquireByTickResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesInstrumentInquireByTick(params);
};

export const fetchFuturesInstrumentInquireByNotional = async (
    params: FetchFuturesInstrumentInquireByNotionalInput,
    authInfo: AuthInfo
): Promise<FetchFuturesInstrumentInquireByNotionalResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesInstrumentInquireByNotional(params);
};

export const fetchFuturesPairOrderBook = async (
    params: FetchFuturesPairOrderBookInput,
    authInfo: AuthInfo
): Promise<FetchFuturesPairOrderBookResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesPairOrderBook(params);
};

export const fetchUserGateBalanceFromApi = async (
    params: FetchGateBalanceInput,
    authInfo: AuthInfo
): Promise<FetchGateBalanceResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchUserGateBalance(params);
};

export const fetchUserTotalValue = async (
    params: TotalValueRequest,
    authInfo: AuthInfo
): Promise<TotalValueResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchUserTotalValue(params);
};

export const fetchFuturesPairKlineChart = async (
    params: FetchFuturesPairKlineChartInput,
    authInfo: AuthInfo
): Promise<FetchFuturesPairKlineChartResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesPairKlineChart(params);
};

export const fetchFuturesPairDepthChart = async (
    params: FetchFuturesPairDepthChartInput,
    authInfo: AuthInfo
): Promise<FetchFuturesPairDepthChartResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchFuturesPairDepthChart(params);
};

export const fetchMarketPairInfo = async (
    params: FetchMarketPairInfoInput,
    authInfo: AuthInfo
): Promise<FetchMarketPairInfoResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchMarketPairInfo(params);
};

export const fetchMarketPairList = async (
    params: { chainId: number },
    authInfo: AuthInfo
): Promise<FetchMarketPairListResponse> => {
    const market = new MarketModule(createHttpClient(authInfo));
    return market.fetchMarketPairList(params);
};

// Public functions
export const fetchPortfolioListFromApi = async (
    params: FetchPortfolioListFromApiInput,
    authInfo?: AuthInfo
): Promise<FetchPortfolioListFromApiResponse | null> => {
    if (!authInfo) {
        throw new Error('authInfo is required for fetchPortfolioListFromApi');
    }
    const publicModule = new PublicModule(createHttpClient(authInfo));
    return publicModule.fetchPortfolioList(params);
};

// MM functions
export const fetchMmServerTime = async (authInfo: AuthInfo): Promise<number> => {
    const mm = new MarketMakerModule(createHttpClient(authInfo));
    return mm.fetchServerTime();
};

export const fetchMmOrderBook = async (
    params: FetchMmOrderBookInput,
    authInfo: AuthInfo
): Promise<FetchMmOrderBookResponse> => {
    const mm = new MarketMakerModule(createHttpClient(authInfo));
    return mm.fetchOrderBook(params);
};

export const fetchMmWalletBalance = async (
    params: FetchMmWalletBalanceInput,
    authInfo: AuthInfo
): Promise<FetchMmWalletBalanceResponse | null> => {
    const mm = new MarketMakerModule(createHttpClient(authInfo));
    return mm.fetchWalletBalance(params);
};

export const fetchMmPositionList = async (
    params: FetchMmPositionListInput,
    authInfo: AuthInfo
): Promise<FetchMmPositionListResponse | null> => {
    const mm = new MarketMakerModule(createHttpClient(authInfo));
    return mm.fetchPositionList(params);
};

// Token functions
export const fetchTokenPriceMapFromApi = async (
    params: FetchTokenPriceMapInput,
    authInfo: AuthInfo
): Promise<FetchTokenPriceMapResponse> => {
    const token = new TokenModule(createHttpClient(authInfo));
    return token.fetchTokenPriceMap(params);
};

// History functions
export const fetchTradeHistory = async (
    params: GetTradeHistoryParams,
    authInfo: AuthInfo
): Promise<GetTradeHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchTradeHistory(params);
};

export const fetchOrdersHistory = async (
    params: GetOrdersHistoryParams,
    authInfo: AuthInfo
): Promise<GetOrdersHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchOrdersHistory(params);
};

export const fetchFundingHistory = async (
    params: GetFundingHistoryParams,
    authInfo: AuthInfo
): Promise<GetFundingHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchFundingHistory(params);
};

export const fetchTransferHistory = async (
    params: GetTransferHistoryParams,
    authInfo: AuthInfo
): Promise<GetTransferHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchTransferHistory(params);
};

export const fetchLiquidityHistory = async (
    params: GetLiquidityHistoryParams,
    authInfo: AuthInfo
): Promise<GetLiquidityHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchLiquidityHistory(params);
};

export const fetchAccountBalanceHistory = async (
    params: GetAccountBalanceHistoryParams,
    authInfo: AuthInfo
): Promise<GetAccountBalanceHistoryResponse> => {
    const history = new HistoryModule(createHttpClient(authInfo));
    return history.fetchAccountBalanceHistory(params);
};
