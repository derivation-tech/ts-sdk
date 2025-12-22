import { API_URLS } from './constants';
import type {
	FetchTokenPriceMapInput,
	FetchTokenPriceMapResponse,
	TokenPriceFromApi,
} from './interfaces';
import { HttpClient } from '../utils';

/**
 * TokenModule - Token API endpoints
 */
export class TokenModule {
	constructor(private readonly httpClient: HttpClient) {}

	/**
	 * Fetch token price map from API
	 */
	async fetchTokenPriceMap(
		params: FetchTokenPriceMapInput,
	): Promise<FetchTokenPriceMapResponse> {
		const response = await this.httpClient.get<{ data: TokenPriceFromApi[] }>(API_URLS.TOKEN.TOKEN_ALL_PRICE, {
			params: { chainId: params.chainId },
		});
		const tokenPriceMap = Object.fromEntries(
			((response?.data?.data as TokenPriceFromApi[]) || []).map((item) => [item.address, item])
		);

		return tokenPriceMap;
	}
}

