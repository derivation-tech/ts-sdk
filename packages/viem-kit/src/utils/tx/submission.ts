import { BaseError, keccak256, UserRejectedRequestError } from 'viem';
import type { Account, Address, Chain, Hash, Hex, WalletClient } from 'viem';
import { sendTransaction } from 'viem/actions';
import { TransactionSubmissionError, type TransactionIdentity } from './outcome';
import type { TransactionSubmissionPhase } from './types';

type SubmissionRequest = Parameters<WalletClient['sendTransaction']>[0] & {
    account: Account | Address;
    chain: Chain | undefined;
    data: Hex;
};

function localTransactionHash(serialized: Hex, chain: Chain | undefined): Hash | undefined {
    // An envelope wraps the signed transaction in broadcast bytes whose keccak256 is not the hash.
    if (chain?.serializers?.transactionEnvelope) return undefined;
    // The hash of a legacy (RLP list, first byte >= 0xc0) or 0x01/0x02/0x04 transaction is keccak256 of its
    // canonical signed bytes. viem's built-in OP-stack, Celo and zkSync serializers emit that canonical encoding
    // for these types; a custom serializer that encodes them differently would make this hash disagree with the
    // RPC result. Other types (an EIP-4844 network wrapper, chain-specific types) may hash differently.
    const type = Number.parseInt(serialized.slice(2, 4), 16);
    return type >= 0xc0 || type === 0x01 || type === 0x02 || type === 0x04 ? keccak256(serialized) : undefined;
}

function isWalletRejection(error: unknown): boolean {
    return error instanceof BaseError && error.walk((cause) => cause instanceof UserRejectedRequestError) !== null;
}

/** Submit through viem's sendTransaction and record which step failed. */
export async function submitTransaction(
    walletClient: WalletClient,
    transaction: SubmissionRequest,
    sendRaw: WalletClient['sendRawTransaction'] = (request) => walletClient.sendRawTransaction(request)
): Promise<Hash> {
    // `data` already carries the effective suffix; an empty suffix stops viem appending client.dataSuffix again.
    transaction = { ...transaction, dataSuffix: '0x' };
    const { account, chain } = transaction;
    let identity: TransactionIdentity = {
        from: typeof account === 'string' ? account : account.address,
        to: transaction.to ?? undefined,
        data: transaction.data,
        chainId: chain?.id,
        nonce: transaction.nonce,
        value: transaction.value,
    };
    // Wallet-controlled preparation/signing/broadcast is opaque to the SDK.
    const walletControlled = typeof account === 'string' || account.type !== 'local';
    let phase: TransactionSubmissionPhase = 'send';
    let hash: Hash | undefined;
    try {
        if (walletControlled) {
            return await walletClient.sendTransaction(transaction);
        }

        phase = 'prepare';
        // viem's sendTransaction resolves these actions on the client first, so overriding them observes each
        // step while viem keeps nonce management, data suffixes, serializers and error formatting.
        const tracked = walletClient.extend(() => ({
            prepareTransactionRequest: (async (request) => {
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
                // Signing (and any chain envelope) is the only work between preparation and broadcast.
                phase = 'sign';
                return prepared;
            }) as WalletClient['prepareTransactionRequest'],
            sendRawTransaction: (async (request) => {
                phase = 'send';
                hash = localTransactionHash(request.serializedTransaction, chain);
                const returnedHash = await sendRaw(request);
                if (hash && returnedHash.toLowerCase() !== hash) {
                    throw new Error('RPC returned a hash that does not match the signed transaction');
                }
                return hash ?? returnedHash;
            }) as WalletClient['sendRawTransaction'],
        }));
        return await sendTransaction(tracked, transaction);
    } catch (cause) {
        // A wallet that refuses the request has not signed it. A local account's rejection after
        // eth_sendRawTransaction keeps the send phase: the signed transaction may already be broadcast.
        if (walletControlled && isWalletRejection(cause)) phase = 'sign';
        throw new TransactionSubmissionError(identity, cause, { phase, hash });
    }
}
