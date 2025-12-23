import { API_URLS } from './constants';
import type {
	ApiSigner,
	FetchTokenPriceMapInput,
	FetchTokenPriceMapResponse,
	TokenPriceFromApi,
} from './interfaces';
import { getRequestUrlWithQuery, HttpClient } from '../utils';

/**
 * TokenModule - Token API endpoints
 */
export class TokenModule {
	constructor(private readonly httpClient: HttpClient, private readonly signer: ApiSigner) {}

	/**
	 * Fetch token price map from API
	 */
	async fetchTokenPriceMap(
		params: FetchTokenPriceMapInput,
	): Promise<FetchTokenPriceMapResponse> {
		const requestUrl = API_URLS.TOKEN.TOKEN_ALL_PRICE;
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(requestUrl, params),
			ts: Date.now(),
		});
		const response = await this.httpClient.get<{ data: TokenPriceFromApi[] }>(API_URLS.TOKEN.TOKEN_ALL_PRICE, {
			params,
			headers: {
				...extraHeaders,
			},
		});
		const tokenPriceMap = Object.fromEntries(
			((response?.data?.data as TokenPriceFromApi[]) || []).map((item) => [item.address, item])
		);

		return tokenPriceMap;
	}
}

