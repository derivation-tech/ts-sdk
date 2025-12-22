import { PORTFOLIO_BIG_INT_KEYS, API_URLS } from './constants';
import type {
	FetchPortfolioListFromApiInput,
	FetchPortfolioListFromApiResponse,
} from './interfaces';
import { HttpClient, bigIntObjectCheckByKeys } from '../utils';

/**
 * PublicModule - Public API endpoints
 */
export class PublicModule {
	constructor(private readonly httpClient: HttpClient) {}

	/**
	 * Fetch portfolio list from API
	 */
	async fetchPortfolioList(
		params: FetchPortfolioListFromApiInput,
	): Promise<FetchPortfolioListFromApiResponse | null> {
		const res = await this.httpClient.get<{ data: any }>(API_URLS.PUBLIC.PORTFOLIO, {
			params: {
				chainId: params.chainId,
				userAddress: params.userAddress,
				...(params.instrumentAddress && { instrumentAddress: params.instrumentAddress }),
				...(params.expiry && { expiry: params.expiry }),
			},
		});

		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, [...PORTFOLIO_BIG_INT_KEYS]);
			return data;
		}
		return null;
	}
}

