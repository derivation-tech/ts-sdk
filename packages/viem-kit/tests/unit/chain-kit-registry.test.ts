import { afterEach, describe, expect, test } from '@jest/globals';
import { defineChain } from 'viem';
import { base } from 'viem/chains';
import { ChainKitRegistry } from '../../src/chain-kit-registry';
import { getCommonErc20Tokens } from '../../src/tokens/erc20';
import { getWrappedNativeToken } from '../../src/tokens/wrapped';

describe('ChainKitRegistry', () => {
    afterEach(() => ChainKitRegistry.clear());

    test('resolves built-in names without case sensitivity and shares the ID cache', () => {
        const kit = ChainKitRegistry.for('BASE');
        expect(kit.chain.id).toBe(base.id);
        expect(ChainKitRegistry.for(base.id)).toBe(kit);
        expect(ChainKitRegistry.has('base')).toBe(true);
        ChainKitRegistry.clearChain('BaSe');
        expect(ChainKitRegistry.has('BASE')).toBe(false);
        expect(ChainKitRegistry.has(base.id)).toBe(false);
    });

    test('supports caller-defined chains without a built-in chain entry', () => {
        const chain = defineChain({
            id: 999999,
            name: 'Custom fixture',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: { default: { http: ['http://localhost:8545'] } },
        });
        const kit = ChainKitRegistry.for(chain);
        expect(kit.chain).toBe(chain);
        expect(ChainKitRegistry.has(chain.id)).toBe(true);
        ChainKitRegistry.clearChain(chain.id);
        expect(ChainKitRegistry.has(chain.id)).toBe(false);
    });

    test('rejects unknown names and IDs without creating cached kits or default tokens', () => {
        expect(() => ChainKitRegistry.for('unknown-fixture')).toThrow('Unknown chain');
        expect(() => ChainKitRegistry.for(Number.MAX_SAFE_INTEGER)).toThrow('Unknown chain');
        expect(ChainKitRegistry.has('UNKNOWN-FIXTURE')).toBe(false);
        expect(ChainKitRegistry.has(Number.MAX_SAFE_INTEGER)).toBe(false);
        expect(getCommonErc20Tokens(Number.MAX_SAFE_INTEGER)).toEqual([]);
        expect(getWrappedNativeToken(Number.MAX_SAFE_INTEGER)).toBeUndefined();
    });
});
