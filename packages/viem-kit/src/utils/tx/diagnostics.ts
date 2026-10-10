import type { Hash } from 'viem';
import { safeNotifyLifecycleHook } from './hooks';
import type { SendTransactionOptions, TxDiagnosticStatus, TxLifecycleHooks } from './types';

export type DiagnosticScope = {
    /** The caller's hooks, silenced once diagnostics time out or are cancelled. */
    hooks: TxLifecycleHooks;
    /** False after a timeout or cancellation; use it to stop remaining diagnostic work. */
    active: () => boolean;
};

// Checked before submission: setTimeout would silently clamp an invalid delay after the transaction is sent.
export function validateDiagnosticOptions(options: SendTransactionOptions): void {
    const timeout = options.diagnostics?.timeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0 || timeout > 2_147_483_647)) {
        throw new RangeError('Diagnostic timeout must be between 0 and 2147483647 milliseconds');
    }
}

function gateHooks(hooks: TxLifecycleHooks | undefined, active: () => boolean): TxLifecycleHooks {
    const gated: Record<string, (event: never) => unknown> = {};
    for (const [name, hook] of Object.entries(hooks ?? {})) {
        gated[name] = (event) => (active() ? hook(event) : undefined);
    }
    return gated as TxLifecycleHooks;
}

/** Bound SDK waiting and delivery without claiming to cancel consumer-owned promises. */
export function runDiagnostics(
    options: SendTransactionOptions,
    hash: Hash,
    run: (scope: DiagnosticScope) => Promise<void>
): Promise<TxDiagnosticStatus> {
    const { timeout = 5_000, signal } = options.diagnostics ?? {};
    if (signal?.aborted) return Promise.resolve('cancelled');
    if (timeout === 0) return Promise.resolve('timed-out');

    return new Promise((resolve) => {
        let status: TxDiagnosticStatus | undefined;
        // Completed diagnostics may still report late observer errors; abandoned ones stay silent.
        const active = () => status === undefined || status === 'completed';
        const finish = (next: TxDiagnosticStatus) => {
            if (status) return;
            status = next;
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
            resolve(next);
        };
        const cancel = () => finish('cancelled');
        // A referenced timer keeps CLI processes alive until diagnostics finish or reach the deadline.
        const timer = setTimeout(() => finish('timed-out'), timeout);
        signal?.addEventListener('abort', cancel, { once: true });
        const hooks = gateHooks(options.hooks, active);
        run({ hooks, active }).then(
            () => finish('completed'),
            (error: unknown) => {
                safeNotifyLifecycleHook(hooks, 'diagnostics', hash, () => {
                    throw error;
                });
                finish('completed');
            }
        );
    });
}
