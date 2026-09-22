import { describe, expect, it } from '@jest/globals';
import { expandSignerIdPattern } from '../../src/node/account';

describe('expandSignerIdPattern', () => {
    it('expands ranges, defaults, and preserves 0x addresses', () => {
        const result = expandSignerIdPattern('alice:0-2,bob:1,charlie,0xabc');
        expect(result).toEqual(['alice:0', 'alice:1', 'alice:2', 'bob:1', 'charlie', '0xabc']);
    });

    it('handles explicit ledger paths without expansion', () => {
        const result = expandSignerIdPattern("ledger:m/44'/60'/0'/0/3");
        expect(result).toEqual(["ledger:m/44'/60'/0'/0/3"]);
    });

    it('expands ledger/custom path ranges', () => {
        const result = expandSignerIdPattern("ledger:m/44'/60'/0'/0/5-6");
        expect(result).toEqual(["ledger:m/44'/60'/0'/0/5", "ledger:m/44'/60'/0'/0/6"]);
    });

    it('keeps bare ledger id to allow env overrides', () => {
        const result = expandSignerIdPattern('ledger');
        expect(result).toEqual(['ledger']);
    });

    it('handles ledger with numeric index', () => {
        const result = expandSignerIdPattern('ledger:0');
        expect(result).toEqual(['ledger:0']);
    });

    it('expands ledger numeric index ranges', () => {
        const result = expandSignerIdPattern('ledger:0-2');
        expect(result).toEqual(['ledger:0', 'ledger:1', 'ledger:2']);
    });
});

it.each([
    'alice:typo',
    'alice:1.9',
    'alice:1oops',
    'alice:',
    'alice:-1',
    'alice:1:2',
    ':1',
    'alice:2147483648',
    'alice:0-9999999999999999',
    'alice:0-1000',
])('rejects malformed or excessive signer pattern %s', (input) => {
    expect(() => expandSignerIdPattern(input)).toThrow();
});

it('bounds the total expansion across multiple ranges', () => {
    expect(expandSignerIdPattern('alice:999-0')).toHaveLength(1000);
    expect(() => expandSignerIdPattern('alice:0-500,bob:0-500')).toThrow('at most 1000');
});
