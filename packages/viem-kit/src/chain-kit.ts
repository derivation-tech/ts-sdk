import type { Abi, Address, Chain, PublicClient, TransactionReceipt, WalletClient } from 'viem';
import { createPublicClient, formatUnits, getAddress, http, parseUnits, zeroAddress } from 'viem';
import { AddressBook } from './utils/address-book';
import { createERC20Parser } from './parsers/erc20';
import { createWETHParser } from './parsers/weth';
import { createDefaultParser } from './parsers/default';
import { createParserRegistry, type ParserRegistry, type RegisteredParser } from './parsers/registry';
import { getWrappedNativeToken } from './tokens/wrapped';
import { getCommonErc20Tokens } from './tokens/erc20';
import type {
    Erc20TokenInfo,
    ContractParser,
    TypedWriteRequest,
    WriteFunctionName,
    SendTransactionOptions,
} from './types';
import { sendContractTransaction } from './utils/tx';

export type ChainKitOptions = {
    publicClient?: PublicClient;
    /** Omit to use built-ins; null disables wrapped-native registration. */
    wrappedNativeToken?: Erc20TokenInfo | null;
    addressNames?: Array<{ address: Address; name: string }>;
};

/**
 * ChainKit - Utilities for a single chain
 * Contains: AddressBook, TokenRegistry, Parsers
 */
export class ChainKit {
    public readonly chain: Chain;

    public readonly addressBook: AddressBook;

    public readonly tokens = new Map<string, Erc20TokenInfo>();

    public readonly parserRegistry: ParserRegistry;

    public readonly nativeTokenInfo: Erc20TokenInfo;
    private wrappedNativeToken: Erc20TokenInfo | undefined;

    get wrappedNativeTokenInfo(): Erc20TokenInfo | undefined {
        return this.wrappedNativeToken;
    }

    public readonly publicClient: PublicClient;

    constructor(chain: Chain, options: ChainKitOptions = {}) {
        if (options.publicClient?.chain && options.publicClient.chain.id !== chain.id) {
            throw new Error(
                `Chain mismatch: publicClient uses ${options.publicClient.chain.id} but kit uses ${chain.id}`
            );
        }
        this.chain = chain;
        this.addressBook = new AddressBook();
        this.publicClient = options.publicClient ?? createPublicClient({ chain, transport: http() });

        // Load address names if provided
        if (options.addressNames) {
            this.addressBook.loadAddresses(options.addressNames);
        }

        this.parserRegistry = createParserRegistry(createDefaultParser((addr) => this.getAddressName(addr)));

        // Initialize native token info
        this.nativeTokenInfo = {
            address: zeroAddress,
            symbol: chain.nativeCurrency.symbol,
            name: chain.nativeCurrency.name,
            decimals: chain.nativeCurrency.decimals,
        };

        // Auto-register native token
        this.registerNativeToken();

        const wrappedInfo =
            options.wrappedNativeToken === undefined ? getWrappedNativeToken(chain.id) : options.wrappedNativeToken;
        if (wrappedInfo) this.registerWrappedNativeToken(wrappedInfo);

        // Auto-load common ERC20 tokens for this chain
        const commonTokens = getCommonErc20Tokens(chain.id);
        for (const token of commonTokens) {
            this.registerErc20Token(token);
        }
    }

    // ==========================================
    // TOKEN OPERATIONS
    // ==========================================

    /**
     * Register native token (ETH, MATIC, etc.)
     * Internal use only - called in constructor
     */
    private registerNativeToken(): void {
        const nativeToken: Erc20TokenInfo = {
            symbol: this.chain.nativeCurrency.symbol,
            name: this.chain.nativeCurrency.name,
            address: zeroAddress,
            decimals: this.chain.nativeCurrency.decimals,
        };
        this.tokens.set(getAddress(nativeToken.address), nativeToken);
        this.addressBook.registerAddressName(nativeToken.address, nativeToken.symbol);
    }

    /**
     * Check if address is the native token (0x0000...0000)
     */
    isNativeToken(address: Address): boolean {
        try {
            return getAddress(address) === getAddress(zeroAddress);
        } catch {
            return false;
        }
    }

    /**
     * Register wrapped native token (e.g., WETH, WMATIC)
     *
     * Auto-called during construction if chain is in WRAPPED_NATIVE_TOKENS registry.
     * Can be called manually for custom chains.
     *
     * @example
     * kit.registerWrappedNativeToken({
     *     symbol: 'WETH',
     *     name: 'Wrapped Ether',
     *     address: '0x4200000000000000000000000000000000000006',
     *     decimals: 18,
     * });
     */
    registerWrappedNativeToken(wrappedNativeToken: Erc20TokenInfo): void {
        wrappedNativeToken = { ...wrappedNativeToken };
        const checksummedAddr = getAddress(wrappedNativeToken.address);

        // Register address name
        this.addressBook.registerAddressName(checksummedAddr, wrappedNativeToken.symbol);

        // Register in token registry
        this.tokens.set(checksummedAddr, wrappedNativeToken);

        // Create WETH parser (supports deposit/withdraw)
        const wethParser = createWETHParser(wrappedNativeToken, (addr) => this.getAddressName(addr));
        this.registerParser(checksummedAddr, wethParser);
        this.wrappedNativeToken = wrappedNativeToken;
    }

    /**
     * Check if address is the wrapped native token
     */
    isWrappedNativeToken(address: Address): boolean {
        const wrappedInfo = this.wrappedNativeTokenInfo;
        if (!wrappedInfo) return false;

        try {
            return getAddress(address) === getAddress(wrappedInfo.address);
        } catch {
            return false;
        }
    }

    /**
     * Register ERC20 token + auto-create parser
     */
    registerErc20Token(tokenInfo: Erc20TokenInfo, autoParser = true): void {
        tokenInfo = { ...tokenInfo };
        const checksummedAddr = getAddress(tokenInfo.address);

        // Register address name (for symbol lookup)
        this.addressBook.registerAddressName(checksummedAddr, tokenInfo.symbol);

        // Register in token registry (address → info only)
        this.tokens.set(checksummedAddr, tokenInfo);

        // Auto-create ERC20 parser
        if (autoParser) {
            const erc20Parser = createERC20Parser(tokenInfo, (addr) => this.getAddressName(addr));
            this.registerParser(checksummedAddr, erc20Parser);
        }
    }

    /**
     * Get ERC20 token info (includes decimals)
     */
    getErc20TokenInfo(symbolOrAddress: string): Erc20TokenInfo | undefined {
        // Try as address first
        try {
            const checksummed = getAddress(symbolOrAddress as Address);
            return this.tokens.get(checksummed);
        } catch {
            // If not an address, try as symbol → resolve to address → get info
            const address = this.addressBook.getNamedAddress(symbolOrAddress);
            if (address) {
                return this.tokens.get(getAddress(address));
            }
            return undefined;
        }
    }

    /**
     * Check if token is registered
     */
    hasErc20TokenInfo(symbolOrAddress: string): boolean {
        return this.getErc20TokenInfo(symbolOrAddress) !== undefined;
    }

    /**
     * Format ERC20 amount with token decimals
     */
    formatErc20Amount(amount: bigint, tokenSymbolOrAddress: string): string {
        const token = this.getErc20TokenInfo(tokenSymbolOrAddress);
        if (!token) return amount.toString();

        return `${formatUnits(amount, token.decimals)} ${token.symbol}`;
    }

    /**
     * Parse ERC20 amount string to bigint with token decimals
     */
    parseErc20Amount(amount: string, tokenSymbolOrAddress: string): bigint {
        const token = this.getErc20TokenInfo(tokenSymbolOrAddress);
        if (!token) throw new Error(`Token ${tokenSymbolOrAddress} not found in registry`);

        return parseUnits(amount, token.decimals);
    }

    // ==========================================
    // ADDRESS OPERATIONS
    // ==========================================

    /**
     * Register address with name
     */
    registerAddressName(address: Address, name: string): void {
        this.addressBook.registerAddressName(address, name);
    }

    /**
     * Get name for address
     */
    getAddressName(address: Address): string {
        return this.addressBook.getAddressName(address);
    }

    // ==========================================
    // PARSER OPERATIONS
    // ==========================================

    /**
     * Register contract parser
     */
    registerParser<TAbi extends Abi>(address: Address, parser: ContractParser<TAbi>): void {
        this.parserRegistry.registerParser(address, parser);
    }

    /**
     * Resolve parser with address metadata (falls back to default parser)
     */
    resolveParser(address: Address): RegisteredParser | undefined {
        return this.parserRegistry.resolveParser(address);
    }

    /**
     * Get parser for contract address (falls back to default parser)
     */
    getParser(address: Address): ContractParser | undefined {
        return this.resolveParser(getAddress(address))?.parser;
    }

    /**
     * Send a contract transaction with logging using this ChainKit's PublicClient.
     */
    async sendTx<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
        walletClient: WalletClient,
        request: TypedWriteRequest<TAbi, TFunctionName>,
        options: SendTransactionOptions = {}
    ): Promise<TransactionReceipt> {
        const sent = await sendContractTransaction(
            {
                publicClient: this.publicClient,
                walletClient,
                chain: this.chain,
                resolveParser: (address) => this.resolveParser(address),
            },
            request,
            options
        );
        return sent.receipt;
    }
}
