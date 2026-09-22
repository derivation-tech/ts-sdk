import { createRequire } from 'node:module';
import type { EventEmitter } from 'node:events';
import {
    DeviceActionStatus,
    DeviceManagementKitBuilder,
    type DeviceManagementKit,
    type DeviceSessionId,
    type ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit';
import { nodeHidTransportFactory } from '@ledgerhq/device-transport-kit-node-hid';
import { filter, firstValueFrom, map, timeout } from 'rxjs';

export interface LedgerSession {
    dmk: DeviceManagementKit;
    sessionId: DeviceSessionId;
}

interface OwnedSession extends LedgerSession {
    close(): void;
}
let defaultSession: Promise<OwnedSession> | undefined;
const queues = new WeakMap<DeviceManagementKit, Map<DeviceSessionId, Promise<unknown>>>();

/** Serialize confirmation and signing together, including accounts sharing an injected session. */
export function inSession<T>(session: LedgerSession, operation: () => Promise<T>): Promise<T> {
    let sessions = queues.get(session.dmk);
    if (!sessions) {
        sessions = new Map();
        queues.set(session.dmk, sessions);
    }
    const previous = sessions.get(session.sessionId) ?? Promise.resolve();
    const result = previous
        .catch(() => undefined)
        .then(() => {
            session.dmk.getConnectedDevice({ sessionId: session.sessionId });
            return operation();
        });
    sessions.set(session.sessionId, result);
    void result
        .finally(() => {
            if (sessions.get(session.sessionId) === result) sessions.delete(session.sessionId);
        })
        .catch(() => undefined);
    return result;
}

export async function runAction<T>(
    action: ExecuteDeviceActionReturnType<T, unknown, unknown>,
    timeoutMs: number
): Promise<T> {
    try {
        return await firstValueFrom(
            action.observable.pipe(
                filter(
                    (state) =>
                        state.status === DeviceActionStatus.Completed ||
                        state.status === DeviceActionStatus.Error ||
                        state.status === DeviceActionStatus.Stopped
                ),
                map((state) => {
                    if (state.status === DeviceActionStatus.Completed) return state.output;
                    if (state.status === DeviceActionStatus.Error) {
                        throw state.error instanceof Error
                            ? state.error
                            : new Error('Ledger device action failed', { cause: state.error });
                    }
                    throw new Error('Ledger device action stopped');
                }),
                timeout({ first: timeoutMs })
            )
        );
    } catch (error) {
        // Unsubscribe alone does not cancel the underlying device action.
        action.cancel();
        throw error;
    }
}

export function getDefaultSession(): Promise<LedgerSession> {
    if (!defaultSession) {
        const pending = connect().catch((error) => {
            if (defaultSession === pending) defaultSession = undefined;
            throw error;
        });
        defaultSession = pending;
    }
    return defaultSession;
}

async function connect(): Promise<OwnedSession> {
    // Node HID 1.0.1 registers global listeners, but DMK.close() only closes sessions.
    // Resolve the transport's own usb instance; consumers may have another usb version.
    const transportRequire = createRequire(require.resolve('@ledgerhq/device-transport-kit-node-hid'));
    const { usb } = transportRequire('usb') as { usb: EventEmitter };
    const sources: ReadonlyArray<readonly [EventEmitter, string]> = [
        [usb, 'attach'],
        [usb, 'detach'],
        [process, 'exit'],
    ];
    const ownedListeners: Array<Array<(...args: unknown[]) => void>> = sources.map(() => []);
    const dmk = new DeviceManagementKitBuilder()
        .addTransport((args) => {
            // DMK constructs transports lazily, when discovery first accesses the transport service.
            const existing = sources.map(([emitter, event]) => new Set(emitter.listeners(event)));
            try {
                return nodeHidTransportFactory(args);
            } finally {
                sources.forEach(([emitter, event], index) => {
                    ownedListeners[index] = emitter
                        .listeners(event)
                        .filter((listener) => !existing[index].has(listener)) as Array<(...args: unknown[]) => void>;
                });
            }
        })
        .build();
    const close = () => {
        try {
            dmk.close();
        } finally {
            // The transport's destroy() removes ALL usb listeners, including caller-owned ones.
            sources.forEach(([emitter, event], index) => {
                for (const listener of ownedListeners[index]) emitter.removeListener(event, listener);
            });
        }
    };
    try {
        const device = await (async () => {
            try {
                return await firstValueFrom(dmk.startDiscovering({}).pipe(timeout({ first: 10_000 })));
            } finally {
                await dmk.stopDiscovering();
            }
        })();
        const sessionId = await dmk.connect({ device });
        return { dmk, sessionId, close };
    } catch (error) {
        close();
        throw error;
    }
}

/** Close the shared HID connection after queued operations. Injected sessions remain caller-owned. */
export async function disconnectLedger(): Promise<void> {
    const pending = defaultSession;
    defaultSession = undefined;
    if (!pending) return;
    const session = await pending;
    try {
        await inSession(session, () => session.dmk.disconnect({ sessionId: session.sessionId }));
    } finally {
        session.close();
    }
}
