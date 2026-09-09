import type { Hash } from 'viem';
import { safeNotifyLifecycleHook } from './hooks';
import type { SendTransactionOptions, TxDiagnosticStatus } from './types';

export function validateDiagnosticOptions(options: SendTransactionOptions): void {
    const timeout = options.diagnostics?.timeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0 || timeout > 2_147_483_647)) {
        throw new RangeError('Diagnostic timeout must be between 0 and 2147483647 milliseconds');
    }
}

/** Bound SDK waiting and delivery without claiming to cancel consumer-owned promises. */
export function runDiagnostics(
    options: SendTransactionOptions,
    hash: Hash,
    run: (scope: { options: SendTransactionOptions; active: () => boolean }) => Promise<void>
): Promise<TxDiagnosticStatus> {
    const { timeout = 5_000, signal } = options.diagnostics ?? {};
    if (signal?.aborted) return Promise.resolve('cancelled');
    if (timeout === 0) return Promise.resolve('timed-out');

    return new Promise((resolve) => {
        let active = true;
        let settled = false;
        const finish = (status: TxDiagnosticStatus) => {
            if (settled) return;
            settled = true;
            if (status !== 'completed') active = false;
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
            resolve(status);
        };
        const cancel = () => finish('cancelled');
        const timer = setTimeout(() => finish('timed-out'), timeout);
        signal?.addEventListener('abort', cancel, { once: true });
        const scopedOptions: SendTransactionOptions = {
            ...options,
            hooks: {
                ...options.hooks,
                onParseError: (event) => {
                    if (active) return options.hooks?.onParseError?.(event);
                },
                onObserverError: (event) => {
                    if (active) return options.hooks?.onObserverError?.(event);
                },
            },
        };
        void Promise.resolve()
            .then(() => (active ? run({ options: scopedOptions, active: () => active }) : undefined))
            .then(
                () => finish('completed'),
                (error: unknown) => {
                    if (active) {
                        safeNotifyLifecycleHook(scopedOptions.hooks, 'diagnostics', hash, () => {
                            throw error;
                        });
                    }
                    finish('completed');
                }
            );
    });
}
