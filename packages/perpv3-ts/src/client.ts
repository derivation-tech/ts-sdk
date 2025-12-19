import type { Address } from 'viem';
import { UserSetting } from './types';
import { PairSnapshot } from './types/snapshot';
import { QuotationWithSize } from './types/quotation';
import { TradeInput, type TradeInputOptions, type TradeSimulation } from './actions/trade';
import { PlaceInput, type PlaceInputSimulation } from './actions/order';
import { AdjustInput, type AdjustSimulation } from './actions/adjust';
import { CrossLimitOrderInput } from './actions/crossLimitOrder';
import { ScaledLimitOrderInput, BatchOrderSizeDistribution } from './actions/scaledLimitOrder';
import { AddInput } from './actions/range';
import { RemoveInput } from './actions/range';
import {
    fetchOnchainContext,
    inquireByTick,
    fetchOrderBook,
    type ApiConfig,
    type RpcConfig,
    type ReadOptions,
} from './queries';
import type { TradeParam, PlaceParam, AdjustParam } from './types/contract';
import { Side } from './types/contract';
import type { Quotation } from './types/contract';
import { WebSocketManager } from './wss';
import {
    type OrderBookStreamData,
    type PortfolioStreamData,
    type InstrumentStreamData,
    type MarketPairInfoChangedData,
    type PublicWebsocketClientOptions,
} from './apis/websocket';
import { DEFAULT_PUBLIC_WS_URL } from './apis/constants';

/**
 * PerpClient is a scoped client for interacting with a specific trading pair (instrument + expiry).
 * It centralizes configuration (config, userSetting, instrumentAddress, expiry) and provides
 * a clean API for queries, simulations, and WebSocket subscriptions.
 */
export class PerpClient {
    private readonly config: ApiConfig | RpcConfig;
    private readonly userSetting: UserSetting;
    private readonly instrumentAddress: Address;
    private readonly expiry: number;
    private readonly wsManager: WebSocketManager;
    private readonly wsUrl: string;
    private readonly wsOptions?: PublicWebsocketClientOptions;

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
        this.config = config;
        this.userSetting = userSetting;
        this.instrumentAddress = instrumentAddress;
        this.expiry = expiry;
        this.wsManager = options?.wsManager ?? WebSocketManager.getInstance();
        this.wsUrl = options?.wsUrl ?? DEFAULT_PUBLIC_WS_URL;
        this.wsOptions = options?.wsOptions;
    }

    /**
     * Get the instrument address this client is scoped to.
     */
    getInstrumentAddress(): Address {
        return this.instrumentAddress;
    }

    /**
     * Get the expiry this client is scoped to.
     */
    getExpiry(): number {
        return this.expiry;
    }

    /**
     * Get the user setting configured for this client.
     */
    getUserSetting(): UserSetting {
        return this.userSetting;
    }

    /**
     * Check if this client is scoped to a specific pair.
     */
    isForPair(instrumentAddress: Address, expiry: number): boolean {
        return this.instrumentAddress === instrumentAddress && this.expiry === expiry;
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
            this.instrumentAddress,
            this.expiry,
            this.config,
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
        return inquireByTick(this.instrumentAddress, this.expiry, tick, this.config, options);
    }

    /**
     * Fetch order book for this pair.
     * @param length - Optional order book depth (default: 10) - only used for RPC
     * @param options - Optional read options (blockNumber, blockTag) - only used for RPC config
     * @returns Order book data with bids/asks
     */
    async getOrderBook(length?: number, options?: ReadOptions) {
        return fetchOrderBook(this.instrumentAddress, this.expiry, this.config, length, options);
    }

    // ============================================================================
    // Factory Methods for Input Classes
    // ============================================================================

    /**
     * Create a TradeInput instance.
     */
    createTradeInput(
        traderAddress: Address,
        baseQuantity: bigint,
        side: Side,
        options?: TradeInputOptions
    ): TradeInput {
        return new TradeInput(traderAddress, baseQuantity, side, options);
    }

    /**
     * Create a PlaceInput instance.
     */
    createPlaceInput(traderAddress: Address, tick: number, baseQuantity: bigint, side: Side): PlaceInput {
        return new PlaceInput(traderAddress, tick, baseQuantity, side);
    }

    /**
     * Create an AdjustInput instance.
     */
    createAdjustInput(traderAddress: Address, amount?: bigint, transferIn?: boolean): AdjustInput {
        return new AdjustInput(traderAddress, amount, transferIn);
    }

    /**
     * Create a CrossLimitOrderInput instance.
     */
    createCrossLimitOrderInput(
        traderAddress: Address,
        side: Side,
        baseQuantity: bigint,
        targetTick: number
    ): CrossLimitOrderInput {
        return new CrossLimitOrderInput(traderAddress, side, baseQuantity, targetTick);
    }

    /**
     * Create a ScaledLimitOrderInput instance.
     */
    createScaledLimitOrderInput(
        traderAddress: Address,
        side: Side,
        baseQuantity: bigint,
        priceInfo: Array<number | bigint>,
        distribution: BatchOrderSizeDistribution
    ): ScaledLimitOrderInput {
        return new ScaledLimitOrderInput(traderAddress, side, baseQuantity, priceInfo, distribution);
    }

    /**
     * Create an AddInput instance.
     */
    createAddInput(traderAddress: Address, marginAmount: bigint, tickLower: number, tickUpper: number): AddInput {
        return new AddInput(traderAddress, marginAmount, tickLower, tickUpper);
    }

    /**
     * Create a RemoveInput instance.
     */
    createRemoveInput(traderAddress: Address, tickLower: number, tickUpper: number): RemoveInput {
        return new RemoveInput(traderAddress, tickLower, tickUpper);
    }

    // ============================================================================
    // High-level Workflow Methods
    // ============================================================================

    /**
     * Simulate a market trade with full validation.
     * Fetches snapshot and quotation automatically.
     * @param traderAddress - Trader address
     * @param baseQuantity - Base quantity (unsigned)
     * @param side - Trade side (LONG or SHORT)
     * @param options - Optional trade options (margin)
     * @returns Tuple of [TradeParam, TradeSimulation]
     */
    async simulateTrade(
        traderAddress: Address,
        baseQuantity: bigint,
        side: Side,
        options?: TradeInputOptions
    ): Promise<[TradeParam, TradeSimulation]> {
        // Fetch snapshot
        const snapshot = await this.getSnapshot(traderAddress);

        // Fetch quotation
        const signedSize = side === Side.LONG ? baseQuantity : -baseQuantity;
        const snapshotWithQuotation = await this.getSnapshot(traderAddress, signedSize);
        const quotation = snapshotWithQuotation.quotation;
        if (!quotation) {
            throw new Error('Failed to fetch quotation');
        }
        const quotationWithSize = new QuotationWithSize(signedSize, quotation);

        // Create input and simulate
        const tradeInput = this.createTradeInput(traderAddress, baseQuantity, side, options);
        return tradeInput.simulate(snapshot, quotationWithSize, this.userSetting);
    }

    /**
     * Simulate placing a limit order with full validation.
     * Fetches snapshot automatically.
     * @param traderAddress - Trader address
     * @param tick - Order tick
     * @param baseQuantity - Base quantity (unsigned)
     * @param side - Order side (LONG or SHORT)
     * @returns Tuple of [PlaceParam, PlaceInputSimulation]
     */
    async simulatePlaceOrder(
        traderAddress: Address,
        tick: number,
        baseQuantity: bigint,
        side: Side
    ): Promise<[PlaceParam, PlaceInputSimulation]> {
        const snapshot = await this.getSnapshot(traderAddress);
        const placeInput = this.createPlaceInput(traderAddress, tick, baseQuantity, side);
        return placeInput.simulate(snapshot, this.userSetting);
    }

    /**
     * Simulate adjusting margin or leverage with full validation.
     * Fetches snapshot automatically.
     * @param traderAddress - Trader address
     * @param amount - Optional margin amount (if provided, transferIn must also be provided)
     * @param transferIn - Optional transfer direction (true = deposit, false = withdraw)
     * @returns Tuple of [AdjustParam, AdjustSimulation]
     */
    async simulateAdjust(
        traderAddress: Address,
        amount?: bigint,
        transferIn?: boolean
    ): Promise<[AdjustParam, AdjustSimulation]> {
        const snapshot = await this.getSnapshot(traderAddress);
        const adjustInput = this.createAdjustInput(traderAddress, amount, transferIn);
        return adjustInput.simulate(snapshot, this.userSetting);
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
                chainId: this.config.chainId,
                instrument: this.instrumentAddress,
                expiry: this.expiry,
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
                chainId: this.config.chainId,
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
                chainId: this.config.chainId,
                instrument: this.instrumentAddress,
                expiry: this.expiry,
                type: 'instrument',
            },
            handler,
            this.wsOptions
        );
        return () => subscription.unsubscribe();
    }
}
