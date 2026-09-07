import type { Account, Address, Chain, LocalAccount, PublicClient, WalletClient } from 'viem';
import { isAddressEqual } from 'viem';
import { encodeRuntimeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import type {
    BatchTransactionPhase,
    BatchTransactionProgress,
    BatchTransactionResult,
    DefinedWriteRequest,
} from './types';
import { BatchTransactionError } from './types';

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
    nonce: number
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
        data: encodeRuntimeWriteRequestData(request),
        nonce,
    });
}

function progressSnapshot(progress: readonly BatchTransactionProgress[]): BatchTransactionProgress[] {
    return progress.map((entry) => ({ ...entry }));
}

export async function batchSendLocalTransactions(
    publicClient: PublicClient,
    walletClients: readonly WalletClient[],
    requests: readonly DefinedWriteRequest[]
): Promise<BatchTransactionResult[]> {
    if (walletClients.length !== requests.length) {
        throw new Error('walletClients length must equal requests length');
    }

    const progress: BatchTransactionProgress[] = [];
    const nextNonceByAccount = new Map<string, number>();

    for (let index = 0; index < requests.length; index += 1) {
        const client = walletClients[index];
        const account = requireLocalAccount(client, index);
        const request = requests[index];
        assertRequestAccount(index, account, request.account);

        let phase: BatchTransactionPhase = 'prepare';
        try {
            const resolved = resolveTxExecutionContext(
                { publicClient, walletClient: client, chain: publicClient.chain },
                request.account,
                request.chain
            );
            const nonce = await allocateNonce(publicClient, resolved.chain, account, nextNonceByAccount);
            const prepared = await prepareRequest(client, account, request, resolved.chain, nonce);

            phase = 'sign';
            const raw = await account.signTransaction(prepared as Parameters<LocalAccount['signTransaction']>[0]);

            phase = 'send';
            const hash = await publicClient.sendRawTransaction({ serializedTransaction: raw });
            progress.push({ index, hash });
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
            entry.receipt = await publicClient.waitForTransactionReceipt({ hash: entry.hash! });
        } catch (error) {
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
