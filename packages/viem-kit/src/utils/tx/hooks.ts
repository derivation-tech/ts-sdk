import type { Hash } from 'viem';
import type { TxLifecycleHooks, TxObserverPhase } from './types';

export function safeNotifyLifecycleHook(
    hooks: TxLifecycleHooks | undefined,
    phase: TxObserverPhase,
    hash: Hash,
    notify: (() => void) | undefined
): void {
    if (!notify) return;

    try {
        notify();
    } catch (error) {
        try {
            hooks?.onObserverError?.({ phase, hash, error, transactionAlreadySent: true });
        } catch {
            // Observer error reporting must not change the transaction outcome.
        }
    }
}
