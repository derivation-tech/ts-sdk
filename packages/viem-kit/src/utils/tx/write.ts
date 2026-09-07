import type { Abi, Account, Address, Chain, Hash, Hex } from 'viem';
import { decodeContractError } from '../contract-error';
import { LoggerFactory } from '../logger';
import type { DecodedContractError } from '../../types';
import { encodeWriteRequestData } from './calldata';
import { resolveTxExecutionContext } from './context';
import { safeNotifyLifecycleHook } from './hooks';
import { TransactionSubmissionError } from './outcome';
import { parseTransactionDescription } from './parsing';
import { waitForParsedReceipt } from './receipt';
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
    return context.walletClient.sendTransaction({
        ...transaction,
        account,
        chain,
        to: address,
        data: calldata,
    } as Parameters<typeof context.walletClient.sendTransaction>[0]);
}

export async function sendContractTransaction<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    options: SendTransactionOptions = {}
): Promise<SentTransaction> {
    request = { ...request };
    const { account, chain } = resolveTxExecutionContext(context, request.account, request.chain);
    const log = (hash: Hash | undefined, message: string) => {
        if (options.silent) return;
        safeNotifyLifecycleHook(options.hooks, 'log', hash, () =>
            LoggerFactory.getLogger(`${chain?.name ?? 'unknown'}::Tx`).info(message)
        );
    };
    const calldata = encodeWriteRequestData(request);
    const description = await parseTransactionDescription(context, request, options);

    let hash: Hash;
    try {
        hash = await sendTypedContractTransaction(context, request, calldata, account, chain);
    } catch (error) {
        const decoded = decodeContractError(error, request.abi);
        log(undefined, `Tx submission not confirmed: ${errorMessage(decoded)}`);
        throw new TransactionSubmissionError(
            {
                from: typeof account === 'string' ? account : account.address,
                to: request.address,
                data: calldata,
                chainId: chain?.id,
                nonce: request.nonce,
                value: request.value,
            },
            error
        );
    }

    log(hash, `Sent tx: ${hash}${description ? ` ${description}` : ''}`);
    safeNotifyLifecycleHook(options.hooks, 'sent', hash, () => options.hooks?.onSent?.({ hash, description }));
    return {
        hash,
        receipt: waitForParsedReceipt(context, hash, request, calldata, account, options),
    };
}
