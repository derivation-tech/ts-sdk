import type { Address, Hash, Hex, PublicClient, TransactionReceipt } from 'viem';
import { safeNotifyLifecycleHook } from './hooks';
import type { SendTransactionOptions, TransactionSubmissionPhase } from './types';

export type TransactionIdentity = {
    from: Address;
    to?: Address;
    data: Hex;
    chainId?: number;
    nonce?: number;
    value?: bigint;
};

export class TransactionSubmissionError extends Error {
    readonly outcome: 'not-sent' | 'unknown';
    readonly phase: TransactionSubmissionPhase;
    readonly hash?: Hash;

    constructor(
        public readonly request: TransactionIdentity,
        cause: unknown,
        evidence: { phase: TransactionSubmissionPhase; hash?: Hash } = { phase: 'send' }
    ) {
        super(
            evidence.phase === 'send'
                ? 'Transaction submission outcome is unknown; reconcile before retrying'
                : `Transaction ${evidence.phase} failed before broadcast`,
            { cause }
        );
        this.name = 'TransactionSubmissionError';
        this.phase = evidence.phase;
        this.outcome = evidence.phase === 'send' ? 'unknown' : 'not-sent';
        this.hash = evidence.hash;
    }
}

export class TransactionReceiptError extends Error {
    constructor(
        public readonly hash: Hash,
        cause: unknown
    ) {
        super(`Could not confirm transaction ${hash}; reconcile before retrying`, { cause });
        this.name = 'TransactionReceiptError';
    }
}

export class TransactionReplacementError extends Error {
    constructor(
        public readonly hash: Hash,
        public readonly receipt: TransactionReceipt,
        public readonly reason: 'replaced' | 'cancelled' | 'unknown'
    ) {
        super(
            `Transaction ${hash} was ${reason === 'unknown' ? 'replaced without intent information' : reason} by ${receipt.transactionHash}`
        );
        this.name = 'TransactionReplacementError';
    }
}

export class TransactionRevertedError extends Error {
    constructor(public readonly receipt: TransactionReceipt) {
        super(`Transaction reverted: ${receipt.transactionHash}`);
        this.name = 'TransactionRevertedError';
    }
}

export function assertTransactionSuccess<TReceipt extends TransactionReceipt>(receipt: TReceipt): TReceipt {
    if (receipt.status === 'reverted') throw new TransactionRevertedError(receipt);
    return receipt;
}

/** Wait for the original intent. Repricing preserves intent; cancellation and replacement do not. */
export async function waitForTransactionOutcome(
    publicClient: PublicClient,
    submittedHash: Hash,
    options: SendTransactionOptions = {}
): Promise<TransactionReceipt> {
    let repriced = false;
    let changedIntent: 'replaced' | 'cancelled' | undefined;
    let receipt: TransactionReceipt;
    try {
        receipt = await publicClient.waitForTransactionReceipt({
            ...options.wait,
            hash: submittedHash,
            onReplaced(event) {
                if (event.reason === 'repriced') repriced = true;
                else changedIntent = event.reason;
                safeNotifyLifecycleHook(options.hooks, 'replaced', event.transactionReceipt.transactionHash, () =>
                    options.hooks?.onReplaced?.({ ...event, submittedHash })
                );
            },
        });
    } catch (error) {
        throw new TransactionReceiptError(submittedHash, error);
    }

    const hash = receipt.transactionHash;
    safeNotifyLifecycleHook(options.hooks, 'receipt', hash, () =>
        options.hooks?.onReceipt?.({ hash, submittedHash, receipt })
    );
    if (changedIntent || (hash !== submittedHash && !repriced)) {
        throw new TransactionReplacementError(submittedHash, receipt, changedIntent ?? 'unknown');
    }
    return receipt;
}
