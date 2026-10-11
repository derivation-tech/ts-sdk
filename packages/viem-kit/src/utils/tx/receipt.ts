import type { Abi, Account, Address, Hash, Hex, TransactionReceipt } from 'viem';
import type { DecodedContractError } from '../../types';
import { decodeContractError, formatContractError } from '../contract-error';
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
        const status = await runDiagnostics(options, hash, async ({ hooks, active }) => {
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
            if (!active() || !decoded) return;
            parsedMessage = await parseErrorDescription(context, request, decoded, hooks, hash);
        });
        // Report the revert once, even when its optional diagnostic work cannot finish.
        safeNotifyLifecycleHook(options.hooks, 'reverted', hash, () =>
            options.hooks?.onReverted?.({
                hash,
                submittedHash,
                receipt,
                error: decoded,
                message: parsedMessage ?? (decoded ? formatContractError(decoded) : undefined),
            })
        );
        return status;
    }

    return runDiagnostics(options, hash, async ({ hooks, active }) => {
        for (let index = 0; index < receipt.logs.length; index += 1) {
            const log = receipt.logs[index];
            const description = await parseEventDescription(context, request, log, hooks, hash);
            if (!active()) return;
            if (!description) continue;
            safeNotifyLifecycleHook(hooks, 'event', hash, () =>
                hooks.onEvent?.({
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
