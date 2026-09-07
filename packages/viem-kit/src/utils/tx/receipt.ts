import type { Abi, Account, Address, Hash, Hex, TransactionReceipt } from 'viem';
import type { DecodedContractError } from '../../types';
import { decodeContractError } from '../contract-error';
import { safeNotifyLifecycleHook } from './hooks';
import { parseErrorDescription, parseEventDescription } from './parsing';
import type { SendTransactionOptions, TxContext, TypedWriteRequest, WriteFunctionName } from './types';

function accountAddress(account: Account | Address | null | undefined): Address | undefined {
    if (!account) return undefined;
    return typeof account === 'string' ? account : account.address;
}

function errorMessage(error: DecodedContractError): string {
    switch (error.kind) {
        case 'custom':
            return error.name;
        case 'revertString':
            return error.reason;
        case 'panic':
            return error.code === undefined ? error.message : `Panic(${error.code})`;
        case 'raw':
        case 'unknown':
            return error.message;
    }
}

export async function waitForParsedReceipt<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    hash: Hash,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    calldata: Hex,
    account: Account | Address,
    options: SendTransactionOptions = {}
): Promise<TransactionReceipt> {
    const receipt = await context.publicClient.waitForTransactionReceipt({ hash });
    safeNotifyLifecycleHook(options.hooks, 'receipt', hash, () => options.hooks?.onReceipt?.({ hash, receipt }));

    if (receipt.status === 'reverted') {
        let decoded: DecodedContractError | undefined;
        try {
            await context.publicClient.call({
                account: accountAddress(account),
                to: request.address,
                data: calldata,
                value: request.value,
                blockNumber: receipt.blockNumber,
            });
        } catch (error) {
            decoded = decodeContractError(error, request.abi);
        }
        const parsedMessage = decoded
            ? await parseErrorDescription(context, request, decoded, options, hash)
            : undefined;
        safeNotifyLifecycleHook(options.hooks, 'reverted', hash, () =>
            options.hooks?.onReverted?.({
                hash,
                receipt,
                error: decoded,
                message: parsedMessage ?? (decoded ? errorMessage(decoded) : undefined),
            })
        );
        return receipt;
    }

    for (let index = 0; index < receipt.logs.length; index += 1) {
        const log = receipt.logs[index];
        const description = await parseEventDescription(context, request, log, options, hash);
        if (!description) continue;
        safeNotifyLifecycleHook(options.hooks, 'event', hash, () =>
            options.hooks?.onEvent?.({
                hash,
                receipt,
                logIndex: log.logIndex ?? index,
                description,
            })
        );
    }

    return receipt;
}
