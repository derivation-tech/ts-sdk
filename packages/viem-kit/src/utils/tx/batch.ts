import type { Account, Address, Chain, Hex, LocalAccount, PublicClient, WalletClient } from 'viem';
import { isAddressEqual } from 'viem';
import { encodeRuntimeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import type {
    BatchTransactionOptions,
    BatchTransactionPhase,
    BatchTransactionProgress,
    BatchTransactionResult,
    BatchWriteCall,
} from './types';
import { BatchTransactionError } from './types';
import { safeNotifyLifecycleHook } from './hooks';
import { TransactionReplacementError, TransactionSubmissionError, waitForTransactionOutcome } from './outcome';
import { submitTransaction } from './submission';

function requireLocalAccount(client: WalletClient, index: number): LocalAccount {
    const account = client.account;
    if (!account) throw new Error(`WalletClient at index ${index} must have an account configured`);
    if (typeof account === 'string' || account.type !== 'local') {
        throw new Error(`WalletClient at index ${index} must use a local account for batch signing`);
    }
    return account;
}

function assertRequestAccount(
    index: number,
    account: LocalAccount,
    requestAccount: Account | Address | null | undefined
): void {
    if (!requestAccount) return;

    const requested = typeof requestAccount === 'string' ? requestAccount : requestAccount.address;
    if (!isAddressEqual(requested, account.address)) {
        throw new Error(`Batch request ${index} account ${requested} does not match wallet account ${account.address}`);
    }
}

async function allocateNonce(
    publicClient: PublicClient,
    chain: Chain | undefined,
    account: LocalAccount,
    nextNonceByAccount: Map<string, number>
): Promise<number> {
    const key = `${chain?.id ?? 0}:${account.address.toLowerCase()}`;
    const cached = nextNonceByAccount.get(key);
    if (cached !== undefined) {
        nextNonceByAccount.set(key, cached + 1);
        return cached;
    }

    const nonce = await publicClient.getTransactionCount({
        address: account.address,
        blockTag: 'pending',
    });
    nextNonceByAccount.set(key, nonce + 1);
    return nonce;
}

function submissionRequest(
    account: LocalAccount,
    request: BatchWriteCall['request'],
    chain: Chain | undefined,
    nonce: number,
    data: Hex
) {
    const {
        address,
        abi: _abi,
        functionName: _functionName,
        args: _args,
        account: _account,
        chain: _chain,
        parser: _parser,
        dataSuffix: _dataSuffix,
        ...transaction
    } = request;
    return {
        ...transaction,
        account,
        chain,
        to: address,
        data,
        nonce,
    } as Parameters<typeof submitTransaction>[1];
}

function progressSnapshot(progress: readonly BatchTransactionProgress[]): BatchTransactionProgress[] {
    return progress.map((entry) => ({ ...entry }));
}

/**
 * Sign and broadcast contract writes in order, then wait for every receipt.
 * Nonces are allocated from the pending count once per account and incremented locally; this does not
 * coordinate with concurrent batches or other writers using the same account.
 */
export async function batchSendLocalTransactions(
    publicClient: PublicClient,
    batch: readonly BatchWriteCall[],
    options: BatchTransactionOptions = {}
): Promise<BatchTransactionResult[]> {
    // Complete static validation before any nonce allocation, signing or broadcast.
    const calls = batch.map(({ walletClient: client, request }, index) => {
        try {
            const account = requireLocalAccount(client, index);
            assertRequestAccount(index, account, request.account);
            const { chain } = resolveTxExecutionContext(
                { publicClient, walletClient: client, chain: publicClient.chain },
                request.account,
                request.chain
            );
            if (
                ('nonce' in request && request.nonce !== undefined) ||
                ('chainId' in request && request.chainId !== undefined)
            )
                throw new Error('Batch nonce and chainId overrides are not supported');
            return { request, client, account, chain, data: encodeRuntimeWriteRequestData(request) };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid batch request';
            throw new BatchTransactionError(message, 'prepare', index, [], { cause: error });
        }
    });
    const progress: BatchTransactionProgress[] = [];
    const nextNonceByAccount = new Map<string, number>();

    for (const [index, { request, client, account, chain, data }] of calls.entries()) {
        const entry: BatchTransactionProgress = { index, submission: 'not-sent' };
        progress.push(entry);
        try {
            entry.nonce = await allocateNonce(publicClient, chain, account, nextNonceByAccount);
            entry.hash = await submitTransaction(
                client,
                submissionRequest(account, request, chain, entry.nonce, data),
                (raw) => publicClient.sendRawTransaction(raw)
            );
            entry.submission = 'submitted';
            const hash = entry.hash;
            safeNotifyLifecycleHook(options.hooks, 'sent', hash, () => options.hooks?.onSent?.({ hash }));
        } catch (error) {
            const failure =
                error instanceof TransactionSubmissionError
                    ? error
                    : new TransactionSubmissionError(
                          {
                              from: account.address,
                              to: request.address,
                              data,
                              chainId: chain?.id,
                              nonce: entry.nonce,
                              value: request.value,
                          },
                          error,
                          { phase: 'prepare' }
                      );
            entry.submission = failure.outcome;
            entry.hash = failure.hash;
            entry.nonce = failure.request.nonce ?? entry.nonce;
            const phase: BatchTransactionPhase = failure.phase;
            throw new BatchTransactionError(
                `Batch transaction ${index} failed during ${phase}`,
                phase,
                index,
                progressSnapshot(progress),
                { cause: failure }
            );
        }
    }

    const results: BatchTransactionResult[] = [];
    for (const entry of progress) {
        // Every entry reaching this loop was submitted, so its hash is set.
        const hash = entry.hash!;
        try {
            entry.receipt = await waitForTransactionOutcome(publicClient, hash, options);
        } catch (error) {
            if (error instanceof TransactionReplacementError) entry.receipt = error.receipt;
            throw new BatchTransactionError(
                `Batch transaction ${entry.index} failed during receipt`,
                'receipt',
                entry.index,
                progressSnapshot(progress),
                { cause: error }
            );
        }
        results.push({ index: entry.index, hash, receipt: entry.receipt });
    }
    return results;
}
