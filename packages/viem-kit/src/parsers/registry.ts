import type { Abi, Address } from 'viem';
import { getAddress } from 'viem';
import type { ContractParser } from './types';

export type ParserResolver = (address: Address) => ContractParser | undefined;

export class ParserRegistry {
    private readonly parsers = new Map<Address, ContractParser>();

    constructor(private readonly defaultParser?: ContractParser) {}

    registerParser<TAbi extends Abi>(address: Address, parser: ContractParser<TAbi>): void {
        // Handlers are keyed by the ABI they were written for; callers pass inputs decoded with that ABI.
        this.parsers.set(getAddress(address), parser as unknown as ContractParser);
    }

    resolveParser(address: Address): ContractParser | undefined {
        return this.parsers.get(getAddress(address)) ?? this.defaultParser;
    }
}
