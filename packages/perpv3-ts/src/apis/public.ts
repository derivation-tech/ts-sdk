import { PORTFOLIO_BIG_INT_KEYS, API_URLS } from './constants';
import type {
	FetchPortfolioListFromApiInput,
	FetchPortfolioListFromApiResponse,
	ApiSigner,
} from './interfaces';
import { HttpClient, bigIntObjectCheckByKeys, getRequestUrlWithQuery } from '../utils';

/**
 * PublicModule - Public API endpoints
 */
export class PublicModule {
	constructor(private readonly httpClient: HttpClient, private readonly signer: ApiSigner) {}

	/**
	 * Fetch portfolio list from API
	 */
	async fetchPortfolioList(
		params: FetchPortfolioListFromApiInput,
	): Promise<FetchPortfolioListFromApiResponse | null> {
		const requestUrl = API_URLS.PUBLIC.PORTFOLIO;
		const requestParams = {
			chainId: params.chainId,
			userAddress: params.userAddress,
			...(params.instrumentAddress && { instrumentAddress: params.instrumentAddress }),
			...(params.expiry && { expiry: params.expiry }),
		};
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const res = await this.httpClient.get<{ data: any }>(API_URLS.PUBLIC.PORTFOLIO, {
			params: requestParams,
			headers: {
				...extraHeaders,
			},
		});

		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, [...PORTFOLIO_BIG_INT_KEYS]);
			return data;
		}
		return null;
	}
}

