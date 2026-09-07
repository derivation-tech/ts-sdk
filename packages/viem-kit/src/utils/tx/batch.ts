import type { Account, Address, Chain, Hex, LocalAccount, PublicClient, WalletClient } from 'viem';
import { isAddressEqual, keccak256 } from 'viem';
import { encodeRuntimeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import type {
    BatchTransactionOptions,
    BatchTransactionPhase,
    BatchTransactionProgress,
    BatchTransactionResult,
    DefinedWriteRequest,
} from './types';
import { BatchTransactionError } from './types';
import { safeNotifyLifecycleHook } from './hooks';
import { TransactionReplacementError, waitForTransactionOutcome } from './outcome';

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

async function prepareRequest(
    client: WalletClient,
    account: LocalAccount,
    request: DefinedWriteRequest,
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
    return client.prepareTransactionRequest({
        ...transaction,
        account,
        chain,
        to: address,
        data,
        nonce,
    });
}

function progressSnapshot(progress: readonly BatchTransactionProgress[]): BatchTransactionProgress[] {
    return progress.map((entry) => ({ ...entry }));
}

export async function batchSendLocalTransactions(
    publicClient: PublicClient,
    walletClients: readonly WalletClient[],
    requests: readonly DefinedWriteRequest[],
    options: BatchTransactionOptions = {}
): Promise<BatchTransactionResult[]> {
    if (walletClients.length !== requests.length) {
        throw new BatchTransactionError('walletClients length must equal requests length', 'prepare', 0, [], {
            cause: new Error('Mismatched batch lengths'),
        });
    }

    // Complete static validation before any nonce allocation, signing or broadcast.
    const calls = requests.map((input, index) => {
        try {
            const request = { ...input };
            const client = walletClients[index];
            const account = requireLocalAccount(client, index);
            assertRequestAccount(index, account, request.account);
            const { chain } = resolveTxExecutionContext(
                { publicClient, walletClient: client, chain: publicClient.chain },
                request.account,
                request.chain
            );
            if (options.nonceManager && !chain) throw new Error('A shared NonceManager requires an explicit chain');
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
        let phase: BatchTransactionPhase = 'prepare';
        const entry: BatchTransactionProgress = { index, submission: 'not-sent' };
        progress.push(entry);
        try {
            entry.nonce = options.nonceManager
                ? await options.nonceManager.consume({
                      address: account.address.toLowerCase() as Address,
                      chainId: chain!.id,
                      client: publicClient,
                  })
                : await allocateNonce(publicClient, chain, account, nextNonceByAccount);
            const prepared = await prepareRequest(client, account, request, chain, entry.nonce, data);

            phase = 'sign';
            const raw = await account.signTransaction(prepared as Parameters<LocalAccount['signTransaction']>[0]);
            entry.hash = keccak256(raw);

            phase = 'send';
            entry.submission = 'unknown';
            const returnedHash = await publicClient.sendRawTransaction({ serializedTransaction: raw });
            if (returnedHash.toLowerCase() !== entry.hash)
                throw new Error('RPC returned a hash that does not match the signed transaction');
            entry.submission = 'submitted';
            const hash = entry.hash;
            safeNotifyLifecycleHook(options.hooks, 'sent', hash, () => options.hooks?.onSent?.({ hash }));
        } catch (error) {
            throw new BatchTransactionError(
                `Batch transaction ${index} failed during ${phase}`,
                phase,
                index,
                progressSnapshot(progress),
                { cause: error }
            );
        }
    }

    for (const entry of progress) {
        try {
            entry.receipt = await waitForTransactionOutcome(publicClient, entry.hash!, options);
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
    }

    return progress.map(({ index, hash, receipt }) => {
        if (!hash || !receipt) {
            throw new Error(`Batch transaction ${index} completed without a hash or receipt`);
        }
        return { index, hash, receipt };
    });
}
