import { describe, expect, test } from '@jest/globals';
import { erc20Abi, zeroAddress } from 'viem';
import type { Address } from 'viem';
import { createDefaultParser } from '../src/parsers/default';
import { createERC20Parser } from '../src/parsers/erc20';
import { createParserRegistry } from '../src/parsers/registry';

const token = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    decimals: 6,
};

describe('ParserRegistry', () => {
    test('resolves registered parsers without exposing unknown', async () => {
        const registry = createParserRegistry(createDefaultParser(() => 'UNKNOWN'));
        registry.registerParser(
            token.address,
            createERC20Parser(token, () => 'UNKNOWN')
        );

        const registered = registry.resolveParser(token.address);
        expect(registered?.address).toBe(token.address);
        expect(registered?.parser.abi).toBe(erc20Abi);

        const parsed = await registered?.parser.parseTransaction?.({
            functionName: 'transfer',
            args: [zeroAddress, 1_000_000n],
        });
        expect(parsed).toContain('transfer');
        expect(parsed).toContain('1 USDC');
    });

    test('falls back to default parser with normalized address', async () => {
        const registry = createParserRegistry(createDefaultParser(() => 'UNKNOWN'));
        const registered = registry.resolveParser('0x0000000000000000000000000000000000000001');

        expect(registered?.address).toBe('0x0000000000000000000000000000000000000001');
        expect(registered?.isDefault).toBe(true);
        await expect(
            Promise.resolve(
                registered?.parser.parseTransaction?.({
                    functionName: 'transfer',
                    args: [],
                })
            )
        ).resolves.toBe('transfer()');
    });
});
