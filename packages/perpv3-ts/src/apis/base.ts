import type { AxiosResponse } from 'axios';
import type { ApiSigner } from './interfaces';
import { getRequestUrlWithQuery, HttpClient } from '../utils';

/**
 * BaseApiModule - Base class for API modules that use ApiSigner
 * Provides common functionality for making signed requests
 */
export abstract class BaseApiModule {
	constructor(
		protected readonly httpClient: HttpClient,
		protected readonly signer: ApiSigner
	) {}

	/**
	 * Helper method to make a signed GET request
	 */
	protected async makeSignedRequest<T>(
		url: string,
		params: Record<string, any>
	): Promise<AxiosResponse<T>> {
		const extraHeaders = this.signer.sign({
			uri: getRequestUrlWithQuery(url, params),
			ts: Date.now(),
		});
		return await this.httpClient.get<T>(url, {
			params,
			headers: {
				...extraHeaders,
			},
		});
	}
}

