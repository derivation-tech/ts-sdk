const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { deriveLedgerPath, parseLedgerPath } = require('../dist');

describe('ledger path parsing', () => {
    it('uses defaults when no env overrides are set', () => {
        const parsed = parseLedgerPath('ledger', {});
        assert.equal(parsed.path, "m/44'/60'/0'/0/0");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 0);
    });

    it('prefers LEDGER_INDEX over LEDGER_PATH', () => {
        const parsed = parseLedgerPath('ledger', { LEDGER_INDEX: '3', LEDGER_PATH: "m/44'/60'/9'/0/0" });
        assert.equal(parsed.path, "m/44'/60'/3'/0/0");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 3);
    });

    it('uses LEDGER_PATH when provided without index override', () => {
        const parsed = parseLedgerPath('ledger', { LEDGER_PATH: "m/44'/60'/5'/0/0" });
        assert.equal(parsed.path, "m/44'/60'/5'/0/0");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 5);
    });

    it('derives full path with custom base path', () => {
        const derived = deriveLedgerPath({ basePath: "m/44'/60'", index: 2 });
        assert.equal(derived.path, "m/44'/60'/2'/0/0");
        assert.equal(derived.basePath, "m/44'/60'");
        assert.equal(derived.index, 2);
    });

    it('parses numeric index in signerId as account index', () => {
        const parsed = parseLedgerPath('ledger:5', {});
        assert.equal(parsed.path, "m/44'/60'/5'/0/0");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 5);
    });

    it('parses explicit full path in signerId', () => {
        const parsed = parseLedgerPath("ledger:m/44'/60'/7'/0/0", {});
        assert.equal(parsed.path, "m/44'/60'/7'/0/0");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 7);
    });

    it('supports address-level paths (non-standard)', () => {
        const parsed = parseLedgerPath("ledger:m/44'/60'/0'/0/5", {});
        assert.equal(parsed.path, "m/44'/60'/0'/0/5");
        assert.equal(parsed.basePath, "m/44'/60'");
        assert.equal(parsed.index, 0); // account index is 0
    });
});
