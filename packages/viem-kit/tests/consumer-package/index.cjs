const assert = require('node:assert/strict');
const core = require('@derivation-tech/viem-kit');
const utils = require('@derivation-tech/viem-kit/utils');
const node = require('@derivation-tech/viem-kit/node');
assert.equal(typeof core.ChainKit, 'function');
assert.equal(typeof utils.sendContractTransaction, 'function');
assert.equal(typeof node.getAccount, 'function');
assert.equal(typeof node.deployArtifact, 'function');
assert.equal('getAccount' in core, false);
assert.throws(() => require.resolve('@derivation-tech/viem-kit/utils/tx/diagnostics'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
});
assert.equal('ArtifactHelper' in utils, false);
assert.equal('diagnoseReceipt' in utils, false);
assert.equal('waitForParsedReceipt' in utils, false);
assert.throws(() => require.resolve('@derivation-tech/viem-ledger'), { code: 'MODULE_NOT_FOUND' });
console.log('Packed CJS consumer: core and Node entries load without Ledger');
