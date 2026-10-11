const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SignerEthBuilder } = require('@ledgerhq/device-signer-kit-ethereum');
const { DeviceActionStatus: Status } = require('@ledgerhq/device-management-kit');
const { defer, of, map, Subject, Observable, EMPTY, NEVER } = require('rxjs');
const {
    createWalletClient,
    custom,
    parseSignature,
    parseTransaction,
    toHex,
    verifyMessage,
    verifyTypedData,
    recoverTransactionAddress,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');
const { ledgerToAccount, AddressValidation } = require('../dist');

// Public test key. Mock the SDK/device boundary and independently recover signatures with viem.
const signer = privateKeyToAccount(`0x${'01'.padStart(64, '0')}`);
const completed = (output) => ({ status: Status.Completed, output });
function signed(operation) {
    return {
        observable: defer(operation).pipe(
            map((hex) => {
                const signature = parseSignature(hex);
                return completed({ r: signature.r, s: signature.s, v: Number(signature.v) });
            })
        ),
        cancel() {},
    };
}
function device(t) {
    let connected = true;
    const session = {
        dmk: {
            getConnectedDevice() {
                if (!connected) throw new Error('Device disconnected');
                return {};
            },
        },
        sessionId: 'fixture',
    };
    const address = t.mock.fn(() => ({
        observable: of(completed({ address: signer.address, publicKey: signer.publicKey })),
        cancel() {},
    }));
    const sign = t.mock.fn((_path, bytes) => signed(() => signer.signMessage({ message: { raw: bytes } })));
    const typed = t.mock.fn((_path, payload) => signed(() => signer.signTypedData(payload)));
    const transaction = t.mock.fn((_path, bytes) =>
        signed(() => {
            const tx = parseTransaction(toHex(bytes));
            delete tx.r;
            delete tx.s;
            delete tx.v;
            delete tx.yParity;
            return signer.signTransaction(tx).then((serialized) => {
                const result = parseTransaction(serialized);
                // Convert the transaction's EIP-155 v back to a recoverable message signature.
                const { serializeSignature } = require('viem');
                return serializeSignature({
                    r: result.r,
                    s: result.s,
                    yParity: result.yParity ?? Number((result.v - 35n) % 2n),
                });
            });
        })
    );
    t.mock.method(SignerEthBuilder.prototype, 'build', () => ({
        getAddress: address,
        signMessage: sign,
        signTypedData: typed,
        signTransaction: transaction,
    }));
    return {
        session,
        address,
        sign,
        typed,
        transaction,
        disconnect() {
            connected = false;
        },
    };
}

test('raw Hex and raw bytes preserve binary data; strings sign UTF-8 text', async (t) => {
    const { session, sign } = device(t);
    const account = await ledgerToAccount({ session, addressValidation: AddressValidation.never });
    const signatures = [];
    for (const message of [{ raw: '0x1234' }, { raw: new Uint8Array([0x12, 0x34]) }, '0x1234']) {
        const signature = await account.signMessage({ message });
        assert.equal(await verifyMessage({ address: signer.address, message, signature }), true);
        signatures.push(signature);
    }
    assert.equal(signatures[0], signatures[1]);
    assert.notEqual(signatures[0], signatures[2]);
    assert.deepEqual(
        sign.mock.calls.map(({ arguments: args }) => toHex(args[1])),
        ['0x1234', '0x1234', '0x307831323334']
    );
    assert.equal(sign.mock.calls[0].arguments[0], "44'/60'/0'/0/0");
    assert.equal(account.source, 'ledger');
    assert.equal(account.type, 'local');
});

for (const [policy, confirmations] of [
    [AddressValidation.never, [false]],
    [AddressValidation.initializationOnly, [true]],
    [AddressValidation.firstTransactionPerAddress, [false, true]],
    [AddressValidation.everyTransaction, [false, true, true]],
]) {
    test(`address confirmation policy: ${policy}`, async (t) => {
        const { session, address } = device(t);
        const account = await ledgerToAccount({ session, addressValidation: policy });
        await account.signMessage({ message: 'first' });
        await account.signMessage({ message: 'second' });
        assert.deepEqual(
            address.mock.calls.map(({ arguments: args }) => args[1].checkOnDevice),
            confirmations
        );
    });
}

test('a changed confirmed address prevents signing', async (t) => {
    const { session, address, sign } = device(t);
    const account = await ledgerToAccount({ session });
    address.mock.mockImplementation(() => ({
        observable: of(completed({ address: `0x${'22'.repeat(20)}` })),
        cancel() {},
    }));
    await assert.rejects(account.signMessage({ message: 'fixture' }), /address changed/);
    assert.equal(sign.mock.callCount(), 0);
});

const typedData = {
    domain: { name: 'Fixture', version: '1', chainId: 1n, verifyingContract: signer.address },
    types: {
        Item: [{ name: 'value', type: 'uint256' }],
        Batch: [
            { name: 'items', type: 'Item[]' },
            { name: 'payload', type: 'bytes' },
        ],
    },
    primaryType: 'Batch',
    message: { items: [{ value: 2n ** 200n }], payload: '0x001234' },
};
test('EIP-712 forwards full nested types and exact bigint values, with a recoverable signature', async (t) => {
    const { session, typed } = device(t);
    const account = await ledgerToAccount({ session });
    const signature = await account.signTypedData(typedData);
    assert.equal(await verifyTypedData({ ...typedData, signature, address: signer.address }), true);
    const payload = typed.mock.calls[0].arguments[1];
    assert.deepEqual(payload.message, typedData.message);
    assert.deepEqual(payload.types.Batch, typedData.types.Batch);
    assert.ok(payload.types.EIP712Domain);
    assert.equal(payload.domain.chainId, 1);
});

test('unsafe typed-data chain IDs fail before any signing action', async (t) => {
    const { session, typed, address } = device(t);
    const account = await ledgerToAccount({ session });
    await assert.rejects(account.signTypedData({ ...typedData, domain: { chainId: 2n ** 60n } }), /safe integer/);
    assert.equal(typed.mock.callCount(), 0);
    assert.equal(address.mock.callCount(), 1);
});

for (const fee of [
    { type: 'legacy', gasPrice: 10n },
    { type: 'eip1559', maxFeePerGas: 10n, maxPriorityFeePerGas: 1n },
]) {
    test(`serializes and recovers ${fee.type} transactions`, async (t) => {
        const { session, transaction } = device(t);
        const account = await ledgerToAccount({ session });
        const tx = { ...fee, chainId: 1, nonce: 2, gas: 21000n, to: signer.address, value: 123n };
        const serializedTransaction = await account.signTransaction(tx);
        assert.equal(await recoverTransactionAddress({ serializedTransaction }), signer.address);
        const parsed = parseTransaction(serializedTransaction);
        assert.equal(parsed.value, tx.value);
        assert.equal(parsed.nonce, tx.nonce);
        assert.equal(transaction.mock.callCount(), 1);
    });
}

test('signs through a wallet client whose chain serializer matches the standard encoding', async (t) => {
    const { session, transaction } = device(t);
    const account = await ledgerToAccount({ session });
    // viem hands the chain serializer (Base: OP stack) to account.signTransaction.
    const client = createWalletClient({
        account,
        chain: base,
        transport: custom({ request: async ({ method }) => (method === 'eth_chainId' ? '0x2105' : null) }),
    });
    const serializedTransaction = await client.signTransaction({
        type: 'eip1559',
        nonce: 0,
        gas: 21000n,
        maxFeePerGas: 10n,
        maxPriorityFeePerGas: 1n,
        to: signer.address,
    });
    assert.equal(await recoverTransactionAddress({ serializedTransaction }), signer.address);
    assert.equal(transaction.mock.callCount(), 1);
});

test('a chain serializer with a different encoding fails before any device action', async (t) => {
    const { session, transaction, address } = device(t);
    const account = await ledgerToAccount({ session });
    const deposit = {
        type: 'deposit',
        sourceHash: `0x${'11'.repeat(32)}`,
        from: signer.address,
        to: signer.address,
        mint: 1n,
        gas: 21000n,
    };
    await assert.rejects(
        account.signTransaction(deposit, { serializer: base.serializers.transaction }),
        /chain serializer encodes it differently/
    );
    assert.equal(transaction.mock.callCount(), 0);
    assert.equal(address.mock.callCount(), 1);
});

for (const [name, stream, pattern] of [
    ['stopped', () => of({ status: Status.Stopped }), /stopped/],
    ['empty completion', () => EMPTY, /no elements/],
    ['never completes', () => NEVER, /Timeout/],
]) {
    test(`${name} rejects, cancels, and releases the operation queue`, async (t) => {
        const { session, sign } = device(t);
        const account = await ledgerToAccount({ session, timeoutMs: 20, addressValidation: AddressValidation.never });
        const cancel = t.mock.fn();
        sign.mock.mockImplementationOnce(() => ({ observable: stream(), cancel }));
        await assert.rejects(account.signMessage({ message: 'failure' }), pattern);
        assert.equal(cancel.mock.callCount(), 1);
        await account.signMessage({ message: 'next' });
        assert.equal(sign.mock.callCount(), 2);
    });
}

test('SDK user rejection is preserved without retrying a signature', async (t) => {
    const { session, sign } = device(t);
    const account = await ledgerToAccount({ session, addressValidation: AddressValidation.never });
    const rejected = new Error('User rejected');
    const cancel = t.mock.fn();
    sign.mock.mockImplementationOnce(() => ({ observable: of({ status: Status.Error, error: rejected }), cancel }));
    await assert.rejects(account.signMessage({ message: 'reject' }), (error) => error === rejected);
    assert.equal(sign.mock.callCount(), 1);
    assert.equal(cancel.mock.callCount(), 1);
});

test('pending states neither complete a signature nor extend its deadline; subscription is disposed', async (t) => {
    const { session, sign } = device(t);
    const account = await ledgerToAccount({ session, timeoutMs: 20, addressValidation: AddressValidation.never });
    const dispose = t.mock.fn();
    sign.mock.mockImplementationOnce(() => ({
        observable: new Observable((subscriber) => {
            subscriber.next({ status: Status.Pending, intermediateValue: {} });
            return dispose;
        }),
        cancel() {},
    }));
    await assert.rejects(account.signMessage({ message: 'pending' }), /Timeout/);
    assert.equal(dispose.mock.callCount(), 1);
});

test('accounts sharing a session serialize whole signing operations', async (t) => {
    const { session, sign } = device(t);
    const first = await ledgerToAccount({ session, addressValidation: AddressValidation.never });
    const second = await ledgerToAccount({ session: { ...session }, addressValidation: AddressValidation.never });
    const pending = new Subject();
    sign.mock.mockImplementationOnce(() => ({ observable: pending, cancel() {} }));
    const firstSignature = first.signMessage({ message: 'first' });
    const secondSignature = second.signMessage({ message: 'second' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sign.mock.callCount(), 1);
    const signature = parseSignature(await signer.signMessage({ message: 'first' }));
    pending.next(completed({ ...signature, v: Number(signature.v) }));
    await Promise.all([firstSignature, secondSignature]);
    assert.equal(sign.mock.callCount(), 2);
    assert.equal(pending.observed, false);
});

test('disconnected accounts fail before issuing another SDK action', async (t) => {
    const { session, sign, disconnect } = device(t);
    const account = await ledgerToAccount({ session });
    disconnect();
    await assert.rejects(account.signMessage({ message: 'disconnected' }), /disconnected/);
    assert.equal(sign.mock.callCount(), 0);
});

test('invalid action timeouts fail before accessing a device', async () => {
    for (const timeoutMs of [0, -1, NaN, Infinity, 2 ** 31, 1.5]) {
        await assert.rejects(ledgerToAccount({ timeoutMs }), /timeoutMs/);
    }
});
