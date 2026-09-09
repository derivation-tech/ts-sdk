import type { Abi, Account, Address, Chain, Hash, Hex } from 'viem';
import { decodeContractError } from '../contract-error';
import { LoggerFactory } from '../logger';
import type { DecodedContractError } from '../../types';
import { encodeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import { runDiagnostics, validateDiagnosticOptions } from './diagnostics';
import { safeNotifyLifecycleHook } from './hooks';
import { waitForTransactionOutcome } from './outcome';
import { parseTransactionDescription } from './parsing';
import { diagnoseReceipt } from './receipt';
import { submitTransaction } from './submission';
import type { SendTransactionOptions, SentTransaction, TxContext, TypedWriteRequest, WriteFunctionName } from './types';

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

async function sendTypedContractTransaction<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    calldata: Hex,
    account: Account | Address,
    chain: Chain | undefined
): Promise<Hash> {
    const {
        parser: _parser,
        abi: _abi,
        functionName: _functionName,
        args: _args,
        dataSuffix: _dataSuffix,
        address,
        ...transaction
    } = request;
    return submitTransaction(context.walletClient, {
        ...transaction,
        account,
        chain,
        to: address,
        data: calldata,
    } as Parameters<typeof submitTransaction>[1]);
}

export async function sendContractTransaction<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    options: SendTransactionOptions = {}
): Promise<SentTransaction> {
    request = { ...request };
    validateDiagnosticOptions(options);
    const { account, chain } = resolveTxExecutionContext(context, request.account, request.chain);
    const log = (hash: Hash | undefined, message: string) => {
        if (options.silent) return;
        safeNotifyLifecycleHook(options.hooks, 'log', hash, () =>
            LoggerFactory.getLogger(`${chain?.name ?? 'unknown'}::Tx`).info(message)
        );
    };
    const calldata = encodeWriteRequestData(request);

    let hash: Hash;
    try {
        hash = await sendTypedContractTransaction(context, request, calldata, account, chain);
    } catch (error) {
        const decoded = decodeContractError(error, request.abi);
        log(undefined, `Tx submission failed: ${errorMessage(decoded)}`);
        throw error;
    }

    log(hash, `Sent tx: ${hash}`);
    safeNotifyLifecycleHook(options.hooks, 'sent', hash, () => options.hooks?.onSent?.({ hash }));
    const receipt = waitForTransactionOutcome(context.publicClient, hash, options);
    const transactionDiagnostics = runDiagnostics(options, hash, async (scope) => {
        const description = await parseTransactionDescription(context, request, scope.options, hash);
        if (!scope.active() || !description) return;
        log(hash, `Tx ${hash}: ${description}`);
        safeNotifyLifecycleHook(scope.options.hooks, 'description', hash, () =>
            options.hooks?.onDescription?.({ hash, description })
        );
    });
    const receiptDiagnostics = receipt.then(
        (confirmed) => diagnoseReceipt(context, hash, confirmed, request, calldata, account, options),
        () => 'skipped' as const
    );
    return {
        hash,
        receipt,
        diagnostics: Promise.all([transactionDiagnostics, receiptDiagnostics]).then(([transaction, receipt]) => ({
            transaction,
            receipt,
        })),
    };
}
