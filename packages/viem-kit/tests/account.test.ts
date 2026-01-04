import { describe, expect, it } from '@jest/globals';
import { deriveLedgerPath, parseLedgerPath } from '@derivation-tech/viem-ledger';
import { expandSignerIdPattern } from '../src/utils/account';

describe('expandSignerIdPattern', () => {
    it('expands ranges, defaults, and preserves 0x addresses', () => {
        const result = expandSignerIdPattern('alice:0-2,bob:1,charlie,0xabc');
        expect(result).toEqual(['alice:0', 'alice:1', 'alice:2', 'bob:1', 'charlie:0', '0xabc']);
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

describe('ledger path parsing', () => {
    it('uses defaults when no env overrides are set', () => {
        const parsed = parseLedgerPath('ledger', {});
        expect(parsed.path).toBe("m/44'/60'/0'/0/0");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(0);
    });

    it('prefers LEDGER_INDEX over LEDGER_PATH', () => {
        const parsed = parseLedgerPath('ledger', { LEDGER_INDEX: '3', LEDGER_PATH: "m/44'/60'/9'/0/0" });
        expect(parsed.path).toBe("m/44'/60'/3'/0/0");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(3);
    });

    it('uses LEDGER_PATH when provided without index override', () => {
        const parsed = parseLedgerPath('ledger', { LEDGER_PATH: "m/44'/60'/5'/0/0" });
        expect(parsed.path).toBe("m/44'/60'/5'/0/0");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(5);
    });

    it('derives full path with custom base path', () => {
        const derived = deriveLedgerPath({ basePath: "m/44'/60'", index: 2 });
        expect(derived.path).toBe("m/44'/60'/2'/0/0");
        expect(derived.basePath).toBe("m/44'/60'");
        expect(derived.index).toBe(2);
    });

    it('parses numeric index in signerId as account index', () => {
        const parsed = parseLedgerPath('ledger:5', {});
        expect(parsed.path).toBe("m/44'/60'/5'/0/0");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(5);
    });

    it('parses explicit full path in signerId', () => {
        const parsed = parseLedgerPath("ledger:m/44'/60'/7'/0/0", {});
        expect(parsed.path).toBe("m/44'/60'/7'/0/0");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(7);
    });

    it('supports address-level paths (non-standard)', () => {
        const parsed = parseLedgerPath("ledger:m/44'/60'/0'/0/5", {});
        expect(parsed.path).toBe("m/44'/60'/0'/0/5");
        expect(parsed.basePath).toBe("m/44'/60'");
        expect(parsed.index).toBe(0); // account index is 0
    });
});
