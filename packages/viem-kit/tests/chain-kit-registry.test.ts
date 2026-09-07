import { describe, expect, test } from '@jest/globals';
import { ChainKitRegistry } from '../src/chain-kit-registry';

describe('ChainKitRegistry local chains', () => {
    test('has and clearChain observe local chains registered by for()', () => {
        const kit = ChainKitRegistry.for('abctest');

        expect(kit.chain.id).toBe(20_250_903);
        expect(ChainKitRegistry.has('ABCTEST')).toBe(true);

        ChainKitRegistry.clearChain('AbcTest');
        expect(ChainKitRegistry.has('ABCTEST')).toBe(false);
    });
});
