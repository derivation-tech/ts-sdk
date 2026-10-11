import type { Hash } from 'viem';
import type { TxLifecycleHooks, TxObserverPhase } from './types';

export function safeNotifyLifecycleHook(
    hooks: TxLifecycleHooks | undefined,
    phase: TxObserverPhase,
    hash: Hash | undefined,
    notify: (() => unknown) | undefined
): void {
    if (!notify) return;

    const report = (error: unknown): void => {
        try {
            const result = hooks?.onObserverError?.({ phase, hash, error, transactionAlreadySent: hash !== undefined });
            void Promise.resolve(result).catch(() => undefined);
        } catch {
            // Observer error reporting must not change the transaction outcome.
        }
    };
    try {
        void Promise.resolve(notify()).catch(report);
    } catch (error) {
        report(error);
    }
}
