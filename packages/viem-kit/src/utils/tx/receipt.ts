import type { Abi, Account, Address, Hash, Hex, TransactionReceipt } from 'viem';
import type { DecodedContractError } from '../../types';
import { decodeContractError } from '../contract-error';
import { runDiagnostics } from './diagnostics';
import { safeNotifyLifecycleHook } from './hooks';
import { parseErrorDescription, parseEventDescription } from './parsing';
import type {
    SendTransactionOptions,
    TxContext,
    TxDiagnosticStatus,
    TypedWriteRequest,
    WriteFunctionName,
} from './types';

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

export async function diagnoseReceipt<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    submittedHash: Hash,
    receipt: TransactionReceipt,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    calldata: Hex,
    account: Account | Address,
    options: SendTransactionOptions
): Promise<TxDiagnosticStatus> {
    const hash = receipt.transactionHash;

    if (receipt.status === 'reverted') {
        let decoded: DecodedContractError | undefined;
        let parsedMessage: string | undefined;
        const status = await runDiagnostics(options, hash, async (scope) => {
            try {
                await context.publicClient.call({
                    account: accountAddress(account),
                    to: request.address,
                    data: calldata,
                    value: request.value,
                    blockNumber: receipt.blockNumber,
                });
            } catch (error) {
                if (scope.active()) decoded = decodeContractError(error, request.abi);
            }
            if (!scope.active() || !decoded) return;
            const message = await parseErrorDescription(context, request, decoded, scope.options, hash);
            if (scope.active()) parsedMessage = message;
        });
        // Report the revert once, even when its optional diagnostic work cannot finish.
        safeNotifyLifecycleHook(options.hooks, 'reverted', hash, () =>
            options.hooks?.onReverted?.({
                hash,
                submittedHash,
                receipt,
                error: decoded,
                message: parsedMessage ?? (decoded ? errorMessage(decoded) : undefined),
            })
        );
        return status;
    }

    return runDiagnostics(options, hash, async (scope) => {
        for (let index = 0; index < receipt.logs.length; index += 1) {
            const log = receipt.logs[index];
            const description = await parseEventDescription(context, request, log, scope.options, hash);
            if (!scope.active()) return;
            if (!description) continue;
            safeNotifyLifecycleHook(scope.options.hooks, 'event', hash, () =>
                options.hooks?.onEvent?.({
                    hash,
                    submittedHash,
                    receipt,
                    logIndex: log.logIndex ?? index,
                    description,
                })
            );
        }
    });
}
