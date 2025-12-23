import { PORTFOLIO_BIG_INT_KEYS, API_URLS } from './constants';
import type {
	FetchPortfolioListFromApiInput,
	FetchPortfolioListFromApiResponse,
	ApiSigner,
} from './interfaces';
import { HttpClient, bigIntObjectCheckByKeys } from '../utils';
import { BaseApiModule } from './base';

/**
 * PublicModule - Public API endpoints
 */
export class PublicModule extends BaseApiModule {
	constructor(httpClient: HttpClient, signer: ApiSigner) {
		super(httpClient, signer);
	}

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
		const res = await this.makeSignedRequest<{ data: any }>(requestUrl, requestParams);

		if (res?.data?.data) {
			const data = bigIntObjectCheckByKeys(res.data.data, [...PORTFOLIO_BIG_INT_KEYS]);
			return data;
		}
		return null;
	}
}

