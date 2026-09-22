const assert = require('node:assert/strict');
const { test } = require('node:test');
const Eth = require('@ledgerhq/hw-app-eth').default;
const { parseSignature, verifyMessage } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { ledgerToAccount, AddressValidation } = require('../dist');

// Public test key. Only the device boundary is mocked; viem verifies the signatures.
const signer = privateKeyToAccount(`0x${'01'.padStart(64, '0')}`);
function device(t) {
    const transport = {
        decorateAppAPIMethods() {},
        async send() {
            return Buffer.from([1, 8, ...Buffer.from('Ethereum')]);
        },
    };
    t.mock.method(Eth.prototype, 'getAppConfiguration', async () => ({ arbitraryDataEnabled: true }));
    const address = t.mock.method(Eth.prototype, 'getAddress', async () => ({
        address: signer.address.slice(2),
        publicKey: signer.publicKey.slice(2),
    }));
    const sign = t.mock.method(Eth.prototype, 'signPersonalMessage', async (_path, hex) => {
        const signature = parseSignature(await signer.signMessage({ message: { raw: `0x${hex}` } }));
        return { r: signature.r.slice(2), s: signature.s.slice(2), v: Number(signature.v) };
    });
    return { transport, address, sign };
}

test('raw Hex and raw bytes sign the same bytes, while strings sign UTF-8 text', async (t) => {
    const { transport, sign } = device(t);
    const account = await ledgerToAccount({ transport, addressValidation: AddressValidation.never });
    const signatures = [];
    for (const message of [{ raw: '0x1234' }, { raw: new Uint8Array([0x12, 0x34]) }, '0x1234']) {
        const signature = await account.signMessage({ message });
        assert.equal(await verifyMessage({ address: signer.address, message, signature }), true);
        signatures.push(signature);
    }
    assert.equal(signatures[0], signatures[1]);
    assert.notEqual(signatures[0], signatures[2]);
    assert.deepEqual(
        sign.mock.calls.map(({ arguments: args }) => args[1]),
        ['1234', '1234', '307831323334']
    );
});

for (const [policy, confirmations] of [
    [AddressValidation.never, [false]],
    [AddressValidation.initializationOnly, [true]],
    [AddressValidation.firstTransactionPerAddress, [false, true]],
    [AddressValidation.everyTransaction, [false, true, true]],
]) {
    test(`address confirmation policy: ${policy}`, async (t) => {
        const { transport, address } = device(t);
        const account = await ledgerToAccount({ transport, addressValidation: policy });
        await account.signMessage({ message: 'first' });
        await account.signMessage({ message: 'second' });
        assert.deepEqual(
            address.mock.calls.map(({ arguments: args }) => args[1]),
            confirmations
        );
    });
}

test('a different confirmed address prevents signing', async (t) => {
    const { transport, address, sign } = device(t);
    const account = await ledgerToAccount({ transport });
    address.mock.mockImplementation(async () => ({ address: '22'.repeat(20) }));
    await assert.rejects(account.signMessage({ message: 'fixture' }), /address changed/);
    assert.equal(sign.mock.callCount(), 0);
});

test('a busy device retries, but a user rejection is returned without another signing attempt', async (t) => {
    const { transport, sign } = device(t);
    const account = await ledgerToAccount({ transport, addressValidation: AddressValidation.never });
    sign.mock.mockImplementationOnce(async () => {
        throw { id: 'TransportLocked' };
    });
    await account.signMessage({ message: 'retry' });
    assert.equal(sign.mock.callCount(), 2);
    const rejected = new Error('User rejected');
    sign.mock.mockImplementationOnce(async () => {
        throw rejected;
    });
    await assert.rejects(account.signMessage({ message: 'reject' }), (error) => error === rejected);
    assert.equal(sign.mock.callCount(), 3);
});
