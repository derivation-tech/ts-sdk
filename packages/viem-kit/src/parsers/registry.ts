import type { Abi, Address, ContractEventName, ContractFunctionArgs } from 'viem';
import { getAddress } from 'viem';
import type { ContractParser, ContractWriteFunctionName, ParseEventInput, ParseTransactionInput } from './types';

export type RegisteredParser<TAbi extends Abi = Abi> = {
    address: Address;
    parser: ContractParser<TAbi>;
    isDefault: boolean;
};

export type ParserResolver = (address: Address) => RegisteredParser | undefined;

export class ParserRegistry {
    private readonly parsers = new Map<Address, ContractParser>();

    constructor(private readonly defaultParser?: ContractParser) {}

    registerParser<TAbi extends Abi>(address: Address, parser: ContractParser<TAbi>): void {
        this.parsers.set(getAddress(address), widenParser(parser));
    }

    resolveParser(address: Address): RegisteredParser | undefined {
        const normalized = getAddress(address);
        const parser = this.parsers.get(normalized);
        if (parser) return { address: normalized, parser, isDefault: false };
        if (this.defaultParser) return { address: normalized, parser: this.defaultParser, isDefault: true };
        return undefined;
    }
}

export function createParserRegistry(defaultParser?: ContractParser): ParserRegistry {
    return new ParserRegistry(defaultParser);
}

function narrowTransactionInput<TAbi extends Abi>(request: ParseTransactionInput<Abi>): ParseTransactionInput<TAbi> {
    return {
        functionName: request.functionName as ContractWriteFunctionName<TAbi>,
        args: request.args as ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', ContractWriteFunctionName<TAbi>>,
        value: request.value,
    } as ParseTransactionInput<TAbi>;
}

function narrowEventInput<TAbi extends Abi>(event: ParseEventInput<Abi>): ParseEventInput<TAbi> {
    return {
        eventName: event.eventName as ContractEventName<TAbi>,
        args: event.args,
    } as ParseEventInput<TAbi>;
}

function widenParser<TAbi extends Abi>(parser: ContractParser<TAbi>): ContractParser {
    return {
        abi: parser.abi,
        parseTransaction: parser.parseTransaction
            ? (request) => parser.parseTransaction?.(narrowTransactionInput<TAbi>(request))
            : undefined,
        parseEvent: parser.parseEvent ? (event) => parser.parseEvent?.(narrowEventInput<TAbi>(event)) : undefined,
        parseError: parser.parseError,
    };
}
