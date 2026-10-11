import type { Abi, ContractEventName, ContractFunctionArgs, ContractFunctionName, GetEventArgs } from 'viem';
import type { DecodedContractError, MaybePromise } from '../types';

export type ContractWriteFunctionName<TAbi extends Abi> = ContractFunctionName<TAbi, 'payable' | 'nonpayable'>;

export type ParseTransactionInput<
    TAbi extends Abi,
    TFunctionName extends ContractWriteFunctionName<TAbi> = ContractWriteFunctionName<TAbi>,
> =
    TFunctionName extends ContractWriteFunctionName<TAbi>
        ? {
              functionName: TFunctionName;
              args: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>;
              value?: bigint;
          }
        : never;

export type ParseEventInput<TAbi extends Abi, TEventName extends ContractEventName<TAbi> = ContractEventName<TAbi>> =
    TEventName extends ContractEventName<TAbi>
        ? {
              eventName: TEventName;
              args: GetEventArgs<TAbi, TEventName, { IndexedOnly: false; Required: true }>;
          }
        : never;

export type TransactionParser<TAbi extends Abi, TFunctionName extends ContractWriteFunctionName<TAbi>> = (
    request: ParseTransactionInput<TAbi, TFunctionName>
) => MaybePromise<string | undefined>;

export type EventParser<TAbi extends Abi, TEventName extends ContractEventName<TAbi>> = (
    event: ParseEventInput<TAbi, TEventName>
) => MaybePromise<string | undefined>;

export type ErrorParser = (args: readonly unknown[], error: DecodedContractError) => MaybePromise<string | undefined>;
type ParserMethod<TInput> = {
    bivarianceHack(input: TInput): MaybePromise<string | undefined>;
}['bivarianceHack'];

export type TransactionParserMap<TAbi extends Abi> = Partial<{
    [TFunctionName in ContractWriteFunctionName<TAbi>]: TransactionParser<TAbi, TFunctionName>;
}>;

export type EventParserMap<TAbi extends Abi> = Partial<{
    [TEventName in ContractEventName<TAbi>]: EventParser<TAbi, TEventName>;
}>;

export type ErrorParserMap = Record<string, ErrorParser>;

export interface ContractParser<TAbi extends Abi = Abi> {
    abi: TAbi;
    parseTransaction?<TFunctionName extends ContractWriteFunctionName<TAbi>>(
        request: ParseTransactionInput<TAbi, TFunctionName>
    ): MaybePromise<string | undefined>;
    parseEvent?: ParserMethod<ParseEventInput<TAbi>>;
    parseError?(error: DecodedContractError): MaybePromise<string | undefined>;
}

export type CreateContractParserOptions<TAbi extends Abi> = {
    abi: TAbi;
    transactions?: TransactionParserMap<TAbi>;
    events?: EventParserMap<TAbi>;
    errors?: ErrorParserMap;
    parseTransactionFallback?: (request: ParseTransactionInput<TAbi>) => MaybePromise<string | undefined>;
    parseEventFallback?: (event: ParseEventInput<TAbi>) => MaybePromise<string | undefined>;
    parseErrorFallback?: (error: DecodedContractError) => MaybePromise<string | undefined>;
};

function getTransactionHandler<TAbi extends Abi>(
    handlers: TransactionParserMap<TAbi> | undefined,
    functionName: ContractWriteFunctionName<TAbi>
): TransactionParser<TAbi, typeof functionName> | undefined {
    return handlers?.[functionName] as TransactionParser<TAbi, typeof functionName> | undefined;
}

function getEventHandler<TAbi extends Abi>(
    handlers: EventParserMap<TAbi> | undefined,
    eventName: ContractEventName<TAbi>
): EventParser<TAbi, typeof eventName> | undefined {
    return handlers?.[eventName] as EventParser<TAbi, typeof eventName> | undefined;
}

export function createContractParser<TAbi extends Abi>(
    options: CreateContractParserOptions<TAbi>
): ContractParser<TAbi> {
    const parser: ContractParser<TAbi> = {
        abi: options.abi,
    };

    if (options.transactions || options.parseTransactionFallback) {
        parser.parseTransaction = (request) => {
            const handler = getTransactionHandler(options.transactions, request.functionName);
            if (handler) return handler(request);
            return options.parseTransactionFallback?.(request);
        };
    }

    if (options.events || options.parseEventFallback) {
        parser.parseEvent = (event) => {
            const handler = getEventHandler(options.events, event.eventName);
            if (handler) return handler(event);
            return options.parseEventFallback?.(event);
        };
    }

    if (options.errors || options.parseErrorFallback) {
        parser.parseError = (error) => {
            if (error.kind === 'custom') {
                const handler = options.errors?.[error.name];
                if (handler) return handler(error.args, error);
            }
            return options.parseErrorFallback?.(error);
        };
    }

    return parser;
}
