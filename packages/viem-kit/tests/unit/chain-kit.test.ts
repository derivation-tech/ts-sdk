import { describe, test, expect, beforeEach } from '@jest/globals';
import { ChainKit } from '../../src/chain-kit';
import { anvil, mainnet } from 'viem/chains';
import type { Address } from 'viem';
import { createPublicClient, custom, defineChain, getAddress, erc20Abi, zeroAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { getWrappedNativeToken } from '../../src/tokens/wrapped';

const testToken = {
    address: '0x0000000000000000000000000000000000000042',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 6,
} as const;

describe('ChainKit', () => {
    let kit: ChainKit;

    beforeEach(() => {
        kit = new ChainKit(mainnet);
    });

    describe('Token Operations', () => {
        test('should register native token automatically', () => {
            expect(kit.nativeTokenInfo.symbol).toBe('ETH');
            expect(kit.nativeTokenInfo.decimals).toBe(18);
            expect(kit.nativeTokenInfo.address).toBe(zeroAddress);
        });

        test('should identify native token correctly', () => {
            expect(kit.isNativeToken(zeroAddress)).toBe(true);
            expect(kit.isNativeToken('0x0000000000000000000000000000000000000000' as Address)).toBe(true);
            expect(kit.isNativeToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address)).toBe(false);
        });

        test('should register wrapped native token automatically', () => {
            expect(kit.wrappedNativeTokenInfo?.symbol).toBe('WETH');
            expect(kit.wrappedNativeTokenInfo?.decimals).toBe(18);
            expect(kit.isWrappedNativeToken(kit.wrappedNativeTokenInfo!.address)).toBe(true);
        });

        test('should register ERC20 token', () => {
            const tokenAddress = testToken.address;
            expect(kit.hasErc20TokenInfo(tokenAddress)).toBe(false);
            kit.registerErc20Token(testToken);

            const tokenInfo = kit.getErc20TokenInfo(tokenAddress);
            expect(tokenInfo?.symbol).toBe('TEST');
            expect(tokenInfo?.decimals).toBe(6);
        });

        test('should retrieve token info by symbol', () => {
            const tokenAddress = testToken.address;
            kit.registerErc20Token(testToken);

            const tokenInfo = kit.getErc20TokenInfo('TEST');
            expect(tokenInfo?.address).toBe(getAddress(tokenAddress));
        });

        test('should check if token is registered', () => {
            // Use a custom token address that won't be in common tokens
            const customTokenAddress = '0x1234567890123456789012345678901234567890' as Address;
            expect(kit.hasErc20TokenInfo(customTokenAddress)).toBe(false);

            kit.registerErc20Token({
                symbol: 'CUSTOM',
                name: 'Custom Token',
                address: customTokenAddress,
                decimals: 18,
            });

            expect(kit.hasErc20TokenInfo(customTokenAddress)).toBe(true);
            expect(kit.hasErc20TokenInfo('CUSTOM')).toBe(true);
        });

        test('should format ERC20 amount with correct decimals', () => {
            kit.registerErc20Token(testToken);

            const formatted = kit.formatErc20Amount(1000000n, 'TEST');
            expect(formatted).toBe('1 TEST');
        });

        test('should parse ERC20 amount string to bigint', () => {
            kit.registerErc20Token(testToken);

            const parsed = kit.parseErc20Amount('1.5', 'TEST');
            expect(parsed).toBe(1500000n);
        });

        test('should throw error when parsing amount for unknown token', () => {
            expect(() => {
                kit.parseErc20Amount('1.5', 'UNKNOWN');
            }).toThrow('Token UNKNOWN not found in registry');
        });
    });

    describe('Address Operations', () => {
        test('should register address with name', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            kit.registerAddressName(testAddress, 'TestContract');

            expect(kit.getAddressName(testAddress)).toBe('TestContract');
        });

        test('should return UNKNOWN for unregistered address', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            expect(kit.getAddressName(testAddress)).toBe('UNKNOWN');
        });

        test('should handle case-insensitive address lookup', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            kit.registerAddressName(testAddress, 'TestContract');

            // Different case, same address
            const lowerCaseAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as Address;
            expect(kit.getAddressName(lowerCaseAddress)).toBe('TestContract');
        });
    });

    describe('Parser Operations', () => {
        test('should register and retrieve parser', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const mockParser = {
                abi: [],
                parseEvent: async () => 'test event',
            };

            kit.registerParser(testAddress, mockParser);
            const parser = kit.getParser(testAddress);

            expect(kit.resolveParser(testAddress)?.isDefault).toBe(false);
            expect(parser?.abi).toEqual(mockParser.abi);
        });

        test('should return default parser for unregistered address', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const parser = kit.getParser(testAddress);

            expect(parser).toBeDefined();
            expect(kit.resolveParser(testAddress)?.isDefault).toBe(true);
        });

        test('should auto-create parser when registering ERC20', () => {
            const tokenAddress = testToken.address;
            kit.registerErc20Token(testToken);

            const parser = kit.getParser(tokenAddress);
            expect(parser).toBeDefined();
            expect(parser?.abi).toEqual(erc20Abi);
            expect(kit.resolveParser(tokenAddress)?.isDefault).toBe(false);
        });

        test('should skip auto-parser creation when autoParser is false', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            kit.registerErc20Token(
                {
                    symbol: 'TEST',
                    name: 'Test Token',
                    address: testAddress,
                    decimals: 18,
                },
                false
            );

            const parser = kit.getParser(testAddress);
            expect(parser).toBeDefined();
            expect(kit.resolveParser(testAddress)?.isDefault).toBe(true);
        });
    });

    describe('Token metadata', () => {
        test('uses deployment-owned token metadata on Anvil without stale defaults', () => {
            const localKit = new ChainKit(anvil);
            expect(localKit.chain.id).toBe(31337);
            expect([...localKit.tokens.keys()]).toEqual([zeroAddress]);
            expect(localKit.wrappedNativeTokenInfo).toBeUndefined();

            const wrapped = {
                address: '0x0000000000000000000000000000000000000011',
                symbol: 'WETH',
                name: 'Wrapped Ether',
                decimals: 18,
            } as const;
            localKit.registerWrappedNativeToken(wrapped);
            localKit.registerErc20Token({
                address: '0x0000000000000000000000000000000000000012',
                symbol: 'USDC',
                name: 'Local USD Coin',
                decimals: 6,
            });
            expect(localKit.wrappedNativeTokenInfo).toEqual(wrapped);
            expect(localKit.isWrappedNativeToken(wrapped.address)).toBe(true);
            expect(localKit.parseErc20Amount('1.5', 'USDC')).toBe(1_500_000n);
            expect(localKit.getParser(wrapped.address)?.abi).toBeDefined();
            expect(new ChainKit(anvil).wrappedNativeTokenInfo).toBeUndefined();
        });

        test('should handle complete token registration flow', () => {
            const tokenAddress = testToken.address;

            kit.registerErc20Token(testToken);

            expect(kit.getAddressName(tokenAddress)).toBe('TEST');

            expect(kit.hasErc20TokenInfo('TEST')).toBe(true);

            const parser = kit.getParser(tokenAddress);
            expect(parser).toBeDefined();

            const formatted = kit.formatErc20Amount(1000000n, 'TEST');
            expect(formatted).toBe('1 TEST');
        });

        test('should load common tokens for mainnet', () => {
            const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            const tokenInfo = kit.getErc20TokenInfo(tokenAddress);

            expect(tokenInfo).toMatchObject({ symbol: 'USDC', decimals: 6, address: getAddress(tokenAddress) });
        });

        test('should load common tokens for Monad Testnet', () => {
            const monadTestnet = defineChain({
                id: 10143,
                name: 'Monad Testnet',
                nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            });

            const monadKit = new ChainKit(monadTestnet);

            const usdc = monadKit.getErc20TokenInfo('USDC');
            expect(usdc?.address).toBe(getAddress('0x534b2f3A21130d7a60830c2Df862319e593943A3'));

            expect(getAddress(monadKit.wrappedNativeTokenInfo!.address)).toBe(
                getAddress('0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541')
            );
        });
    });

    describe('Error Handling', () => {
        test('constructs a custom chain without wrapped native metadata', () => {
            // Create a custom chain that doesn't have wrapped token in registry
            const customChain = defineChain({
                id: 999999,
                name: 'Custom Chain',
                nativeCurrency: { name: 'Custom', symbol: 'CUSTOM', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            });

            const customKit = new ChainKit(customChain);
            expect(customKit.wrappedNativeTokenInfo).toBeUndefined();
            expect(customKit.nativeTokenInfo.symbol).toBe('CUSTOM');
            expect([...customKit.tokens.keys()]).toEqual([zeroAddress]);
            expect(customKit.isWrappedNativeToken(zeroAddress)).toBe(false);
        });

        test('should accept wrapped token info in constructor for custom chains', () => {
            const customChain = defineChain({
                id: 999999,
                name: 'Custom Chain',
                nativeCurrency: { name: 'Custom', symbol: 'CUSTOM', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            });

            const wrappedToken = {
                symbol: 'WCUSTOM',
                name: 'Wrapped Custom',
                address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address,
                decimals: 18,
            };

            const customKit = new ChainKit(customChain, { wrappedNativeToken: wrappedToken });
            expect(customKit.wrappedNativeTokenInfo?.symbol).toBe('WCUSTOM');
        });

        test('should handle invalid address gracefully', () => {
            expect(kit.isNativeToken('invalid' as Address)).toBe(false);
        });
    });
    test('isolates clients, names, parsers and wrapped token overrides for the same chain', () => {
        const transport = custom({
            request: async () => {
                throw new Error('Unexpected RPC');
            },
        });
        const firstClient = createPublicClient({ chain: mainnet, transport });
        const secondClient = createPublicClient({ chain: mainnet, transport });
        const address = '0x0000000000000000000000000000000000000011';
        const wrappedToken = { address, symbol: 'ALT', name: 'Alternate wrapped token', decimals: 18 } as const;
        const builtIn = getWrappedNativeToken(mainnet.id);
        const first = new ChainKit(mainnet, { publicClient: firstClient, wrappedNativeToken: wrappedToken });
        const second = new ChainKit(mainnet, { publicClient: secondClient, wrappedNativeToken: null });
        second.registerAddressName(address, 'Second');
        expect(first.publicClient).toBe(firstClient);
        expect(second.publicClient).toBe(secondClient);
        expect(first.getAddressName(address)).toBe('ALT');
        expect(second.getAddressName(address)).toBe('Second');
        expect(first.getParser(address)).not.toBe(second.getParser(address));
        expect(first.isWrappedNativeToken(address)).toBe(true);
        expect(second.isWrappedNativeToken(address)).toBe(false);
        expect(second.wrappedNativeTokenInfo).toBeUndefined();
        expect(getWrappedNativeToken(mainnet.id)).toBe(builtIn);
    });

    test('rejects a client configured for a different chain', () => {
        const client = createPublicClient({ chain: sepolia, transport: custom({ request: async () => undefined }) });
        expect(() => new ChainKit(mainnet, { publicClient: client })).toThrow('Chain mismatch');
    });
});
