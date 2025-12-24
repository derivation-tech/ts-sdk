import type { Address } from 'viem';
import { DEFAULT_PUBLIC_WS_URL } from './apis/constants';
import type {
    InstrumentStreamData,
    MarketPairInfoChangedData,
    OrderBookStreamData,
    PortfolioStreamData,
    PublicWebsocketClientOptions,
} from './apis/websocket';
import {
    fetchOnchainContext,
    fetchOrderBook,
    inquireByTick,
    isApiConfig,
    type ApiConfig,
    type ReadOptions,
    type RpcConfig,
} from './queries';
import {
    UserSetting,
    type PairSnapshot,
    type Quotation,
} from './types';
import { WebSocketManager } from './wss';
import { httpClient, MarketMakerModule } from './apis';

/**
 * PerpClient is a scoped client for interacting with a specific trading pair (instrument + expiry).
 * It centralizes configuration (config, userSetting, instrumentAddress, expiry) and provides
 * a clean API for queries and WebSocket subscriptions.
 *
 * For simulations, use the input classes directly (TradeInput, PlaceInput, etc.) with snapshots
 * fetched via getSnapshot().
 */
export class PerpClient {
    private readonly _config: ApiConfig | RpcConfig;
    private readonly _userSetting: UserSetting;
    private readonly _instrumentAddress: Address;
    private readonly _expiry: number;
    private readonly wsManager: WebSocketManager;
    private readonly wsUrl: string;
    private readonly wsOptions?: PublicWebsocketClientOptions;

    private readonly _mm?: MarketMakerModule;

    /**
     * Create a new PerpClient instance.
     * @param config - API or RPC configuration
     * @param userSetting - User settings (leverage, slippage, deadline, etc.)
     * @param instrumentAddress - Instrument contract address
     * @param expiry - Expiry timestamp (use PERP_EXPIRY for perpetuals)
     * @param options - Optional WebSocket configuration
     */
    constructor(
        config: ApiConfig | RpcConfig,
        userSetting: UserSetting,
        instrumentAddress: Address,
        expiry: number,
        options?: {
            wsManager?: WebSocketManager; // Optional - defaults to singleton
            wsUrl?: string;
            wsOptions?: PublicWebsocketClientOptions;
        }
    ) {
        this._config = config;
        this._userSetting = userSetting;
        this._instrumentAddress = instrumentAddress;
        this._expiry = expiry;
        this.wsManager = options?.wsManager ?? WebSocketManager.getInstance();
        this.wsUrl = options?.wsUrl ?? DEFAULT_PUBLIC_WS_URL;
        this.wsOptions = options?.wsOptions;
        if (isApiConfig(this._config) && this._config.authInfo) {
            this._mm = new MarketMakerModule(httpClient, this._config.authInfo);
        }
    }

    /**
     * Get the instrument address this client is scoped to.
     */
    get instrumentAddress(): Address {
        return this._instrumentAddress;
    }

    /**
     * Get the expiry this client is scoped to.
     */
    get expiry(): number {
        return this._expiry;
    }

    /**
     * Get the user setting configured for this client.
     */
    get userSetting(): UserSetting {
        return this._userSetting;
    }

    /**
     * Get the config (API or RPC) used by this client.
     */
    get config(): ApiConfig | RpcConfig {
        return this._config;
    }

    /**
     * Gets the Market Maker module. Throws an error if not initialized.
     */
    get mm(): MarketMakerModule {
        if (!this._mm) {
            throw new Error('mm module is not initialized, please check if the config is an API config and has authInfo');
        }
        return this._mm;
    }

    /**
     * Check if this client is scoped to a specific pair.
     */
    isForPair(instrumentAddress: Address, expiry: number): boolean {
        return this._instrumentAddress === instrumentAddress && this._expiry === expiry;
    }

    // ============================================================================
    // Query Methods
    // ============================================================================

    /**
     * Fetch on-chain context (snapshot) for this pair.
     * @param traderAddress - Optional trader address to fetch portfolio
     * @param signedSize - Optional signed size to fetch quotation
     * @param options - Optional read options (blockNumber, blockTag) - only used for RPC config
     * @returns PairSnapshot with required fields and optional quotation
     */
    async getSnapshot(traderAddress?: Address, signedSize?: bigint, options?: ReadOptions): Promise<PairSnapshot> {
        return fetchOnchainContext(
            this._instrumentAddress,
            this._expiry,
            this._config,
            traderAddress,
            signedSize,
            options
        );
    }

    /**
     * Inquire by tick for this pair.
     * @param tick - Target tick
     * @param options - Optional read options (blockNumber, blockTag) - only used for RPC config
     * @returns Object with size and quotation
     */
    async getQuotation(tick: number, options?: ReadOptions): Promise<{ size: bigint; quotation: Quotation }> {
        return inquireByTick(this._instrumentAddress, this._expiry, tick, this._config, options);
    }

    /**
     * Fetch order book for this pair.
     * @param length - Optional order book depth (default: 10) - only used for RPC
     * @param options - Optional read options (blockNumber, blockTag) - only used for RPC config
     * @returns Order book data with bids/asks
     */
    async getOrderBook(length?: number, options?: ReadOptions) {
        return fetchOrderBook(this._instrumentAddress, this._expiry, this._config, length, options);
    }

    // ============================================================================
    // WebSocket Subscriptions
    // ============================================================================

    /**
     * Subscribe to order book updates for this pair.
     * @param handler - Handler function for order book updates
     * @returns Unsubscribe function
     */
    subscribeOrderBook(handler: (data: OrderBookStreamData) => void): () => void {
        const subscription = this.wsManager.subscribeOrderBook(
            this.wsUrl,
            {
                chainId: this._config.chainId,
                instrument: this._instrumentAddress,
                expiry: this._expiry,
                type: 'orderBook',
            },
            handler,
            this.wsOptions
        );
        return () => subscription.unsubscribe();
    }

    /**
     * Subscribe to portfolio updates.
     * @param userAddress - User address to subscribe to
     * @param handler - Handler function for portfolio updates
     * @returns Unsubscribe function
     */
    subscribePortfolio(userAddress: Address, handler: (data: PortfolioStreamData) => void): () => void {
        const subscription = this.wsManager.subscribePortfolio(
            this.wsUrl,
            {
                chainId: this._config.chainId,
                userAddress,
                type: 'portfolio',
            },
            handler,
            this.wsOptions
        );
        return () => subscription.unsubscribe();
    }

    /**
     * Subscribe to instrument updates for this pair.
     * @param handler - Handler function for instrument updates
     * @returns Unsubscribe function
     */
    subscribeInstrument(handler: (data: InstrumentStreamData | MarketPairInfoChangedData) => void): () => void {
        const subscription = this.wsManager.subscribeInstrument(
            this.wsUrl,
            {
                chainId: this._config.chainId,
                instrument: this._instrumentAddress,
                expiry: this._expiry,
                type: 'instrument',
            },
            handler,
            this.wsOptions
        );
        return () => subscription.unsubscribe();
    }
}
