const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DeviceManagementKitBuilder } = require('@ledgerhq/device-management-kit');
const { Observable, throwError, of } = require('rxjs');
const { disconnectLedger } = require('../dist');
const { getDefaultSession, inSession } = require('../dist/session');

function device(t) {
    let connected = false;
    const discovered = { id: 'fixture-device' };
    const unsubscribe = t.mock.fn();
    const dmk = {
        startDiscovering: t.mock.fn(
            () =>
                new Observable((subscriber) => {
                    subscriber.next(discovered);
                    return unsubscribe;
                })
        ),
        stopDiscovering: t.mock.fn(async () => {}),
        connect: t.mock.fn(async () => {
            connected = true;
            return 'fixture-session';
        }),
        disconnect: t.mock.fn(async () => {
            connected = false;
        }),
        getConnectedDevice() {
            if (!connected) throw new Error('Device disconnected');
            return discovered;
        },
        close: t.mock.fn(() => {
            connected = false;
        }),
    };
    t.mock.method(DeviceManagementKitBuilder.prototype, 'build', () => dmk);
    return { dmk, discovered, unsubscribe };
}

test('default connection is shared, discovery is stopped, and disconnect invalidates old sessions', async (t) => {
    const { dmk, discovered, unsubscribe } = device(t);
    const [first, second] = await Promise.all([getDefaultSession(), getDefaultSession()]);
    assert.equal(first, second);
    assert.deepEqual(dmk.connect.mock.calls[0].arguments, [{ device: discovered }]);
    assert.equal(dmk.connect.mock.callCount(), 1);
    assert.equal(dmk.stopDiscovering.mock.callCount(), 1);
    assert.equal(unsubscribe.mock.callCount(), 1);
    await disconnectLedger();
    assert.equal(dmk.disconnect.mock.callCount(), 1);
    assert.equal(dmk.close.mock.callCount(), 1);
    await assert.rejects(
        inSession(first, async () => {}),
        /disconnected/
    );
    await disconnectLedger();
    assert.equal(dmk.close.mock.callCount(), 1);
});

test('failed discovery stops scanning and closes DMK; the next attempt can reconnect', async (t) => {
    const { dmk } = device(t);
    const error = new Error('Discovery failed');
    dmk.startDiscovering.mock.mockImplementationOnce(() => throwError(() => error));
    await assert.rejects(getDefaultSession(), (err) => err === error);
    assert.equal(dmk.stopDiscovering.mock.callCount(), 1);
    assert.equal(dmk.close.mock.callCount(), 1);
    dmk.startDiscovering.mock.mockImplementation(() => of({ id: 'fixture-device' }));
    await getDefaultSession();
    await disconnectLedger();
    assert.equal(dmk.connect.mock.callCount(), 1);
});

test('failed connect closes the manager and allows retry', async (t) => {
    const { dmk } = device(t);
    dmk.connect.mock.mockImplementationOnce(async () => {
        throw new Error('Cannot connect');
    });
    await assert.rejects(getDefaultSession(), /Cannot connect/);
    assert.equal(dmk.close.mock.callCount(), 1);
    await getDefaultSession();
    await disconnectLedger();
});

test('disconnect waits for queued signing work before closing the connection', async (t) => {
    const { dmk } = device(t);
    const session = await getDefaultSession();
    let finish;
    const operation = inSession(
        session,
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    await new Promise((resolve) => setImmediate(resolve));
    const closing = disconnectLedger();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(dmk.disconnect.mock.callCount(), 0);
    finish();
    await Promise.all([operation, closing]);
    assert.equal(dmk.disconnect.mock.callCount(), 1);
    assert.equal(dmk.close.mock.callCount(), 1);
});

test('disconnect failure still closes the manager', async (t) => {
    const { dmk } = device(t);
    await getDefaultSession();
    dmk.disconnect.mock.mockImplementationOnce(async () => {
        throw new Error('Disconnect failed');
    });
    await assert.rejects(disconnectLedger(), /Disconnect failed/);
    assert.equal(dmk.close.mock.callCount(), 1);
});

test('real SDK transport construction releases listeners without device discovery or I/O', async (t) => {
    const { createRequire } = require('node:module');
    const { DeviceManagementKit } = require('@ledgerhq/device-management-kit');
    const { usb } = createRequire(require.resolve('@ledgerhq/device-transport-kit-node-hid'))('usb');
    const external = () => {};
    usb.on('attach', external);
    process.on('exit', external);
    t.after(() => {
        usb.removeListener('attach', external);
        process.removeListener('exit', external);
    });
    const before = [usb.listeners('attach'), usb.listeners('detach'), process.listeners('exit')];
    t.mock.method(DeviceManagementKit.prototype, 'startDiscovering', function () {
        this.isEnvironmentSupported(); // Construct the real transport, without enumerating or opening devices.
        return of({ id: 'fixture' });
    });
    t.mock.method(DeviceManagementKit.prototype, 'stopDiscovering', async () => {});
    t.mock.method(DeviceManagementKit.prototype, 'connect', async () => 'fixture-session');
    t.mock.method(DeviceManagementKit.prototype, 'getConnectedDevice', () => ({}));
    t.mock.method(DeviceManagementKit.prototype, 'disconnect', async () => {});
    await getDefaultSession();
    assert.ok(usb.listeners('attach').length > before[0].length);
    await disconnectLedger();
    assert.deepEqual([usb.listeners('attach'), usb.listeners('detach'), process.listeners('exit')], before);
});
