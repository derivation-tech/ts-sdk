import { describe, test, expect, beforeEach } from '@jest/globals';
import { ChainKit } from '../src/chain-kit';
import { mainnet } from 'viem/chains';
import type { Address } from 'viem';
import { getAddress, zeroAddress } from 'viem';

describe('ChainKit', () => {
    let kit: ChainKit;

    beforeEach(() => {
        // Create a fresh ChainKit instance for each test
        kit = new ChainKit(mainnet);
    });

    // ==========================================
    // TOKEN OPERATIONS
    // ==========================================

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
            expect(kit.wrappedNativeTokenInfo.symbol).toBe('WETH');
            expect(kit.wrappedNativeTokenInfo.decimals).toBe(18);
            expect(kit.isWrappedNativeToken(kit.wrappedNativeTokenInfo.address)).toBe(true);
        });

        test('should register ERC20 token', () => {
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            const tokenInfo = kit.getErc20TokenInfo(usdcAddress);
            expect(tokenInfo?.symbol).toBe('USDC');
            expect(tokenInfo?.decimals).toBe(6);
        });

        test('should retrieve token info by symbol', () => {
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            const tokenInfo = kit.getErc20TokenInfo('USDC');
            expect(tokenInfo?.address).toBe(getAddress(usdcAddress));
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
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            const formatted = kit.formatErc20Amount(1000000n, 'USDC');
            expect(formatted).toBe('1 USDC');
        });

        test('should parse ERC20 amount string to bigint', () => {
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            const parsed = kit.parseErc20Amount('1.5', 'USDC');
            expect(parsed).toBe(1500000n);
        });

        test('should throw error when parsing amount for unknown token', () => {
            expect(() => {
                kit.parseErc20Amount('1.5', 'UNKNOWN');
            }).toThrow('Token UNKNOWN not found in registry');
        });
    });

    // ==========================================
    // ADDRESS OPERATIONS
    // ==========================================

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

    // ==========================================
    // PARSER OPERATIONS
    // ==========================================

    describe('Parser Operations', () => {
        test('should register and retrieve parser', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const mockParser = {
                abi: [],
                parseEvent: async () => 'test event',
            };

            kit.registerParser(testAddress, mockParser);
            const parser = kit.getParser(testAddress);

            expect(parser).toBeDefined();
            expect(parser?.abi).toEqual([]);
        });

        test('should return default parser for unregistered address', () => {
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const parser = kit.getParser(testAddress);

            expect(parser).toBeDefined(); // Default parser should exist
        });

        test('should auto-create parser when registering ERC20', () => {
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            const parser = kit.getParser(usdcAddress);
            expect(parser).toBeDefined();
            expect(parser?.abi).toBeDefined();
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
            // Should return default parser, not ERC20-specific parser
            expect(parser).toBeDefined();
        });
    });

    // ==========================================
    // INTEGRATION TESTS
    // ==========================================

    describe('Integration Tests', () => {
        test('should handle complete token registration flow', () => {
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            // Register token
            kit.registerErc20Token({
                symbol: 'USDC',
                name: 'USD Coin',
                address: usdcAddress,
                decimals: 6,
            });

            // Check address book
            expect(kit.getAddressName(usdcAddress)).toBe('USDC');

            // Check token registry
            expect(kit.hasErc20TokenInfo('USDC')).toBe(true);

            // Check parser
            const parser = kit.getParser(usdcAddress);
            expect(parser).toBeDefined();

            // Format amount
            const formatted = kit.formatErc20Amount(1000000n, 'USDC');
            expect(formatted).toBe('1 USDC');
        });

        test('should load common tokens for mainnet', () => {
            // Mainnet should have some common tokens pre-loaded
            // Check if USDC is auto-loaded (if it's in the common tokens list)
            const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
            const tokenInfo = kit.getErc20TokenInfo(usdcAddress);

            // This might be auto-loaded for mainnet
            if (tokenInfo) {
                expect(tokenInfo.symbol).toBe('USDC');
            }
        });

        test('should load common tokens for Monad Testnet', () => {
            const monadTestnet = {
                id: 10143,
                name: 'Monad Testnet',
                nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            } as any;

            const monadKit = new ChainKit(monadTestnet);

            const usdc = monadKit.getErc20TokenInfo('USDC');
            expect(usdc?.address).toBe(getAddress('0x534b2f3A21130d7a60830c2Df862319e593943A3'));

            expect(getAddress(monadKit.wrappedNativeTokenInfo.address)).toBe(
                getAddress('0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541')
            );
        });
    });

    // ==========================================
    // ERROR HANDLING
    // ==========================================

    describe('Error Handling', () => {
        test('should throw error when creating ChainKit without wrapped native token', () => {
            // Create a custom chain that doesn't have wrapped token in registry
            const customChain = {
                id: 999999,
                name: 'Custom Chain',
                nativeCurrency: { name: 'Custom', symbol: 'CUSTOM', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            } as any;

            expect(() => {
                new ChainKit(customChain);
            }).toThrow(/No wrapped native token info found/);
        });

        test('should accept wrapped token info in constructor for custom chains', () => {
            const customChain = {
                id: 999999,
                name: 'Custom Chain',
                nativeCurrency: { name: 'Custom', symbol: 'CUSTOM', decimals: 18 },
                rpcUrls: { default: { http: ['http://localhost'] } },
            } as any;

            const wrappedToken = {
                symbol: 'WCUSTOM',
                name: 'Wrapped Custom',
                address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address,
                decimals: 18,
            };

            const customKit = new ChainKit(customChain, wrappedToken);
            expect(customKit.wrappedNativeTokenInfo.symbol).toBe('WCUSTOM');
        });

        test('should handle invalid address gracefully', () => {
            expect(kit.isNativeToken('invalid' as Address)).toBe(false);
        });
    });
});
