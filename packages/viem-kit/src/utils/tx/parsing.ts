import type { Abi, Address, Hash, Hex, Log } from 'viem';
import { decodeEventLog, isAddressEqual } from 'viem';
import type { ContractParser, ParseTransactionInput } from '../../parsers/types';
import type { DecodedContractError } from '../../types';
import { safeNotifyLifecycleHook } from './hooks';
import type { TxContext, TxLifecycleHooks, TypedWriteRequest, WriteFunctionName } from './types';

function resolveParser<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    address: Address
): ContractParser | undefined {
    if (request.parser && isAddressEqual(address, request.address)) return request.parser as unknown as ContractParser;
    return context.resolveParser?.(address);
}

export async function parseTransactionDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    hooks: TxLifecycleHooks | undefined,
    hash?: Hash
): Promise<string | undefined> {
    try {
        const parser = resolveParser(context, request, request.address);
        if (!parser?.parseTransaction) return undefined;
        const input: ParseTransactionInput<Abi> = {
            functionName: request.functionName,
            // viem types write args as ContractFunctionArgs, which is always a tuple at runtime.
            args: (request.args ?? []) as readonly unknown[],
            value: request.value,
        };
        return await parser.parseTransaction(input);
    } catch (error) {
        safeNotifyLifecycleHook(hooks, 'parseError', hash, () =>
            hooks?.onParseError?.({ phase: 'transaction', error })
        );
        return undefined;
    }
}

export async function parseEventDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    log: Log,
    hooks: TxLifecycleHooks | undefined,
    hash: Hash
): Promise<string | undefined> {
    try {
        // Only decode logs whose parser can describe events; other contracts' logs are not errors.
        const parser = resolveParser(context, request, log.address);
        if (!parser?.parseEvent || log.topics.length === 0) return undefined;
        const decodedLog = decodeEventLog({
            abi: parser.abi,
            data: log.data,
            topics: log.topics as [Hex, ...Hex[]],
            strict: true,
        });
        // Strict decoding throws instead of returning a nameless log; this check narrows viem's type.
        if (!decodedLog.eventName) return undefined;
        return await parser.parseEvent({
            eventName: decodedLog.eventName,
            // viem represents a successfully decoded zero-argument event with undefined args.
            args: decodedLog.args ?? [],
        });
    } catch (error) {
        safeNotifyLifecycleHook(hooks, 'parseError', hash, () => hooks?.onParseError?.({ phase: 'event', error }));
        return undefined;
    }
}

export async function parseErrorDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    error: DecodedContractError,
    hooks: TxLifecycleHooks | undefined,
    hash: Hash
): Promise<string | undefined> {
    try {
        const parser = resolveParser(context, request, request.address);
        if (!parser?.parseError) return undefined;
        return await parser.parseError(error);
    } catch (parseError) {
        safeNotifyLifecycleHook(hooks, 'parseError', hash, () =>
            hooks?.onParseError?.({ phase: 'error', error: parseError })
        );
        return undefined;
    }
}
