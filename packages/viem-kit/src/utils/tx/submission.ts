import { concatHex, fromRlp, keccak256, toRlp } from 'viem';
import type { Account, Address, Chain, Hash, Hex, LocalAccount, WalletClient } from 'viem';
import { sendTransaction } from 'viem/actions';
import { TransactionSubmissionError, type TransactionIdentity } from './outcome';
import type { TransactionSubmissionPhase } from './types';

type SubmissionRequest = Parameters<WalletClient['sendTransaction']>[0] & {
    account: Account | Address;
    chain: Chain | undefined;
    data: Hex;
};

function signedTransactionHash(raw: Hex, chain: Chain | undefined): Hash | undefined {
    // A custom chain serializer may define a hash other than keccak256(serialized).
    if (chain?.serializers?.transaction) return undefined;
    if (raw.startsWith('0x03')) {
        const envelope = fromRlp(`0x${raw.slice(4)}`, 'hex');
        // EIP-4844 network wrappers include blob sidecars outside the signed transaction body.
        if (Array.isArray(envelope) && Array.isArray(envelope[0])) {
            return keccak256(concatHex(['0x03', toRlp(envelope[0])]));
        }
    }
    return keccak256(raw);
}

/** Observe native viem boundaries without mutating the caller's client or account. */
export async function submitTransaction(
    walletClient: WalletClient,
    transaction: SubmissionRequest,
    sendRaw: WalletClient['sendRawTransaction'] = (request) => walletClient.sendRawTransaction(request)
): Promise<Hash> {
    const { account, chain } = transaction;
    let identity: TransactionIdentity = {
        from: typeof account === 'string' ? account : account.address,
        to: transaction.to ?? undefined,
        data: transaction.data,
        chainId: chain?.id,
        nonce: transaction.nonce,
        value: transaction.value,
    };
    let phase: TransactionSubmissionPhase = 'send';
    let hash: Hash | undefined;
    try {
        // Wallet-controlled preparation/signing/broadcast is opaque to the SDK.
        if (typeof account === 'string' || account.type !== 'local') {
            return await walletClient.sendTransaction(transaction);
        }

        phase = 'prepare';
        const trackedAccount: LocalAccount = {
            ...account,
            signTransaction: async (request, options) => {
                phase = 'sign';
                return account.signTransaction(request, options);
            },
        };
        const prepare: WalletClient['prepareTransactionRequest'] = async (request) => {
            identity = { ...identity, data: request.data ?? identity.data };
            const prepared = await walletClient.prepareTransactionRequest(request);
            // viem's chain-generic result hides these standard EVM identity fields from TypeScript.
            const fields = prepared as Partial<TransactionIdentity>;
            identity = {
                ...identity,
                to: fields.to ?? identity.to,
                data: fields.data ?? identity.data,
                nonce: fields.nonce ?? identity.nonce,
                chainId: fields.chainId ?? identity.chainId,
                value: fields.value ?? identity.value,
            };
            return prepared;
        };
        const trackedClient = {
            ...walletClient,
            prepareTransactionRequest: prepare,
            sendRawTransaction: async (request: Parameters<WalletClient['sendRawTransaction']>[0]) => {
                hash = signedTransactionHash(request.serializedTransaction, chain);
                phase = 'send';
                const returnedHash = await sendRaw(request);
                if (hash && returnedHash.toLowerCase() !== hash) {
                    throw new Error('RPC returned a hash that does not match the signed transaction');
                }
                return hash ?? returnedHash;
            },
        };
        return await sendTransaction(trackedClient, { ...transaction, account: trackedAccount });
    } catch (cause) {
        throw new TransactionSubmissionError(identity, cause, { phase, hash });
    }
}
