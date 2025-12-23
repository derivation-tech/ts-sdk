import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { getHeaders, type APIHeaders } from './mm';
import { API_DOMAIN, API_DEFAULT_TIMEOUT, API_DEFAULT_RETRIES } from '../apis/constants';
import type { AuthInfo } from '../apis/interfaces';
import { ErrorCode, SynfError } from '../types/error';

/**
 * Get the sorted query string from the parameters
 * @param params - The parameters to get the sorted query string from
 * @returns The sorted query string
 */
export function getSortedQueryString(params: Record<string, string>): string {
    if (Object.keys(params).length === 0) {
        return '';
    }
    const pa = new URLSearchParams(params);
    pa.sort();
    return pa.toString();
}

/**
 * Get the request path from the URL
 * @param url - The Full URL to get the request path from
 * @returns The request path from the URL
 */
export function getRequestUrlFromSortedQuery(url: string, sortedQuery: string): string {
    if (!sortedQuery) {
        return url;
    }
    return url + (url.includes('?') ? '&' : '?') + sortedQuery;
}


/**
 * 
 * @param url - The base URL to get the request URL from
 * @param params - The parameters to get the request URL from
 * @returns 
 */

export function getRequestUrlWithQuery(url: string, params: Record<string, any>): string {
    const sortedQuery = getSortedQueryString(params);
    return getRequestUrlFromSortedQuery(url, sortedQuery);
}


/**
 * Get the request path from the full URL
 * @param url - The Full URL to get the request path from
 * @returns The request path from the URL
 */
export function getRequestPathFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
}

// ============================================================================
// Axios Functions
// ============================================================================
export async function axiosGet<T = any>({
    url,
    config,
    jwtToken,
    authInfo,
}: {
    url: string;
    config?: AxiosRequestConfig;
    authInfo?: AuthInfo;
    jwtToken?: string;
}): Promise<AxiosResponse> {
    const httpClient = new HttpClient({
        authInfo,
        jwtToken,
    });
    return await httpClient.get<T>(url, config);
}


/**
 * HttpClient config
 */
export interface HttpClientConfig {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    jwtToken?: string;
    authInfo?: AuthInfo;
}

/**
 * HttpClient
 * This class is used to make HTTP requests to the API.
 */
export class HttpClient {
    private client: AxiosInstance;
    private config: HttpClientConfig;

    constructor(config: HttpClientConfig) {
        const baseUrl = config.baseUrl ?? API_DOMAIN;
        this.config = {
            baseUrl,
            timeout: config.timeout ?? API_DEFAULT_TIMEOUT,
            retries: config.retries ?? API_DEFAULT_RETRIES,
            authInfo: config.authInfo,
            jwtToken: config.jwtToken,
        };

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'accept': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private isRequireAuth(url?: string): boolean {
        return !!url?.startsWith('/v4/public/mm');
    }

    private hasAuthInfo(): boolean {
        return !!(this.config.authInfo?.apiKey && this.config.authInfo?.passphrase && this.config.authInfo?.secretKey)
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                // Checks if auth info is required for this request
                if (this.isRequireAuth(config.url) && !this.hasAuthInfo()) {
                    throw new SynfError(
                        'API key is required for API calls. Please provide apiKey in HttpClient config. ' +
                        'Note: API key is not required with public api url.'
                        , ErrorCode.INVALID_PARAM,
                    );
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                // Retry logic
                if (
                    error.response?.status >= 500 &&
                    originalRequest._retryCount < (this.config.retries ?? 3)
                ) {
                    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

                    // Exponential backoff
                    const delay = Math.pow(2, originalRequest._retryCount) * 100;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    return this.client(originalRequest);
                }

                throw this.handleError(error);
            }
        );
    }

    private handleError(error: any): SynfError {
        if (error.response) {
            // Server responded with error status
            const message = error.response.data?.message || error.response.data?.error || error.message;
            return new SynfError(
                message,
                ErrorCode.API_REQUEST_FAILED,
                {
                    status: error.response.status,
                    data: error.response.data,
                }
            );
        } else if (error.request) {
            // Request was made but no response received
            return new SynfError('Network error: No response received', ErrorCode.API_REQUEST_FAILED);
        } else {
            return new SynfError(error.message, ErrorCode.API_REQUEST_FAILED);
        }
    }

    /**
     * Get authentication headers if required
     */
    private async getAuthHeaders(url: string, method: string): Promise<APIHeaders | undefined> {
        if (!this.isRequireAuth(url)) {
            return undefined;
        }
        if (!this.config.authInfo) {
            return undefined;
        }
        const requestPath = getRequestPathFromUrl(this.config.baseUrl! + url);
        return await getHeaders({
            method,
            requestPath,
            ...this.config.authInfo,
        });
    }

    /**
     * Build request config with authentication headers
     */
    private async buildRequestConfig(
        config?: AxiosRequestConfig,
        url?: string,
        method?: string
    ): Promise<AxiosRequestConfig> {
        const extraHeaders = url && method ? await this.getAuthHeaders(url, method) : undefined;
        return {
            ...config,
            headers: {
                ...config?.headers,
                Authorization: this.config.jwtToken,
                ...extraHeaders,
            },
        };
    }

    async get<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        const { params, ...extraConfig } = config || {};
        if (params) {
            const sortedParams = getSortedQueryString(params);
            url += (url.includes('?') ? '&' : '?') + sortedParams;

        }
        const requestConfig = await this.buildRequestConfig(extraConfig, url, 'GET');
        return await this.client.get(url, requestConfig);
    }

    async post<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        const requestConfig = await this.buildRequestConfig(config, url, 'POST');
        return await this.client.post(url, data, requestConfig);
    }

    async put<T = unknown>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        const requestConfig = await this.buildRequestConfig(config, url, 'PUT');
        return await this.client.put(url, data, requestConfig);
    }

    async delete<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        const requestConfig = await this.buildRequestConfig(config, url, 'DELETE');
        return await this.client.delete(url, requestConfig);
    }

} 