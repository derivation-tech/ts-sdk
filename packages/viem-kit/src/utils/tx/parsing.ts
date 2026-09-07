import type { Abi, Address, ContractEventName, Hash, Hex, Log } from 'viem';
import { decodeEventLog, isAddressEqual } from 'viem';
import type { ContractParser, ParseEventInput, ParseTransactionInput } from '../../parsers/types';
import type { DecodedContractError } from '../../types';
import { safeNotifyLifecycleHook } from './hooks';
import type { SendTransactionOptions, TxContext, TypedWriteRequest, WriteFunctionName } from './types';

type ResolvedParser<TAbi extends Abi> =
    | { source: 'request'; parser: ContractParser<TAbi> }
    | { source: 'registry'; parser: ContractParser };

function isParserEventArgs(value: unknown): value is readonly unknown[] | Record<string, unknown> {
    return Array.isArray(value) || (typeof value === 'object' && value !== null);
}

function toParserArgs(args: unknown): readonly unknown[] {
    if (args === undefined) return [];
    if (!Array.isArray(args)) {
        throw new Error('Contract write request args must be an array');
    }
    return args;
}

function toRequestParserInput<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    request: TypedWriteRequest<TAbi, TFunctionName>
): ParseTransactionInput<TAbi, TFunctionName> {
    return {
        functionName: request.functionName,
        args: toParserArgs(request.args),
        value: request.value,
    } as unknown as ParseTransactionInput<TAbi, TFunctionName>;
}

function narrowEventInput<TAbi extends Abi>(event: ParseEventInput<Abi>): ParseEventInput<TAbi> {
    return {
        eventName: event.eventName as ContractEventName<TAbi>,
        args: event.args,
    } as ParseEventInput<TAbi>;
}

export function resolveParserForAddress<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    address: Address
): ResolvedParser<TAbi> | undefined {
    if (request.parser && isAddressEqual(address, request.address)) {
        return { source: 'request', parser: request.parser };
    }
    const registered = context.resolveParser?.(address);
    return registered ? { source: 'registry', parser: registered.parser } : undefined;
}

export async function parseTransactionDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    options: SendTransactionOptions
): Promise<string | undefined> {
    try {
        if (request.parser?.parseTransaction) {
            return await request.parser.parseTransaction<TFunctionName>(toRequestParserInput(request));
        }

        const parser = context.resolveParser?.(request.address)?.parser;
        if (!parser?.parseTransaction) return undefined;
        const input: ParseTransactionInput<Abi> = {
            functionName: request.functionName,
            args: toParserArgs(request.args),
            value: request.value,
        };
        return await parser.parseTransaction(input);
    } catch (error) {
        options.hooks?.onParseError?.({ phase: 'transaction', error });
        return undefined;
    }
}

export async function parseEventDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    log: Log,
    options: SendTransactionOptions,
    hash: Hash
): Promise<string | undefined> {
    const resolved = resolveParserForAddress(context, request, log.address);
    if (!resolved || log.topics.length === 0) return undefined;

    try {
        const decodedLog = decodeEventLog({
            abi: resolved.parser.abi,
            data: log.data,
            topics: log.topics as [Hex, ...Hex[]],
            strict: false,
        });
        if (!decodedLog.eventName || !isParserEventArgs(decodedLog.args)) return undefined;
        const input: ParseEventInput<Abi> = {
            eventName: decodedLog.eventName,
            args: decodedLog.args,
        };
        if (resolved.source === 'request') {
            return await resolved.parser.parseEvent?.(narrowEventInput<TAbi>(input));
        }
        return await resolved.parser.parseEvent?.(input);
    } catch (error) {
        safeNotifyLifecycleHook(options.hooks, 'parseError', hash, () =>
            options.hooks?.onParseError?.({ phase: 'event', error })
        );
        return undefined;
    }
}

export async function parseErrorDescription<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    context: TxContext,
    request: TypedWriteRequest<TAbi, TFunctionName>,
    error: DecodedContractError,
    options: SendTransactionOptions,
    hash: Hash
): Promise<string | undefined> {
    const resolved = resolveParserForAddress(context, request, request.address);
    if (!resolved?.parser.parseError) return undefined;

    try {
        return await resolved.parser.parseError(error);
    } catch (parseError) {
        safeNotifyLifecycleHook(options.hooks, 'parseError', hash, () =>
            options.hooks?.onParseError?.({ phase: 'error', error: parseError })
        );
        return undefined;
    }
}
