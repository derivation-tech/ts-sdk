import { describe, expect, test } from '@jest/globals';
import { erc20Abi, zeroAddress } from 'viem';
import type { Address } from 'viem';
import { createDefaultParser } from '../../src/parsers/default';
import { createERC20Parser } from '../../src/parsers/erc20';
import { ParserRegistry } from '../../src/parsers/registry';

const token = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    decimals: 6,
};

describe('ParserRegistry', () => {
    test('resolves registered parsers by checksummed address', async () => {
        const registry = new ParserRegistry(createDefaultParser(() => 'UNKNOWN'));
        registry.registerParser(
            token.address,
            createERC20Parser(token, () => 'UNKNOWN')
        );

        const parser = registry.resolveParser(token.address.toLowerCase() as Address);
        expect(parser?.abi).toBe(erc20Abi);

        const parsed = await parser?.parseTransaction?.({
            functionName: 'transfer',
            args: [zeroAddress, 1_000_000n],
        });
        expect(parsed).toContain('transfer');
        expect(parsed).toContain('1 USDC');
    });

    test('falls back to the default parser for unregistered addresses', async () => {
        const registry = new ParserRegistry(createDefaultParser(() => 'UNKNOWN'));
        const parser = registry.resolveParser('0x0000000000000000000000000000000000000001');

        expect(parser?.parseEvent).toBeUndefined();
        await expect(
            Promise.resolve(
                parser?.parseTransaction?.({
                    functionName: 'transfer',
                    args: [],
                })
            )
        ).resolves.toBe('transfer()');
    });
});
