import {
    getContractError,
    type Abi,
    type Account,
    type Address,
    type BaseError,
    type Chain,
    type Hash,
    type Hex,
} from 'viem';
import { LoggerFactory } from '../logger';
import { encodeRuntimeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import { runDiagnostics, validateDiagnosticOptions } from './diagnostics';
import { safeNotifyLifecycleHook } from './hooks';
import { TransactionSubmissionError, waitForTransactionOutcome } from './outcome';
import { parseTransactionDescription } from './parsing';
import { diagnoseReceipt } from './receipt';
import { submitTransaction } from './submission';
import type {
    RuntimeWriteRequest,
    SendTransactionOptions,
    SentTransaction,
    TxContext,
    TypedWriteRequest,
    WriteFunctionName,
} from './types';

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
    validateDiagnosticOptions(options);
    const { account, chain } = resolveTxExecutionContext(context, request.account, request.chain);
    const log = (hash: Hash | undefined, message: string) => {
        if (options.silent) return;
        safeNotifyLifecycleHook(options.hooks, 'log', hash, () =>
            LoggerFactory.getLogger(`${chain?.name ?? 'unknown'}::Tx`).info(message)
        );
    };
    const calldata = encodeRuntimeWriteRequestData(request as unknown as RuntimeWriteRequest);

    let hash: Hash;
    try {
        hash = await sendTypedContractTransaction(context, request, calldata, account, chain);
    } catch (error) {
        if (!(error instanceof TransactionSubmissionError)) throw error;
        // Describe the failure against the contract ABI, as viem's writeContract does.
        const contractError = getContractError(error.cause as BaseError, {
            abi: request.abi,
            address: request.address,
            functionName: request.functionName,
            args: request.args,
            sender: error.request.from,
        });
        log(undefined, `Tx submission failed: ${contractError.shortMessage}`);
        throw new TransactionSubmissionError(error.request, contractError, { phase: error.phase, hash: error.hash });
    }

    log(hash, `Sent tx: ${hash}`);
    safeNotifyLifecycleHook(options.hooks, 'sent', hash, () => options.hooks?.onSent?.({ hash }));
    const receipt = waitForTransactionOutcome(context.publicClient, hash, options);
    const transactionDiagnostics = runDiagnostics(options, hash, async ({ hooks, active }) => {
        const description = await parseTransactionDescription(context, request, hooks, hash);
        if (!active() || !description) return;
        log(hash, `Tx ${hash}: ${description}`);
        safeNotifyLifecycleHook(hooks, 'description', hash, () => hooks.onDescription?.({ hash, description }));
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
