import type { Address, Abi } from 'viem';
import type { DecodedContractError } from '../types';
import { createContractParser } from './types';

function formatNamedAddress(address: Address, resolveAddressName: (addr: Address) => string): string {
    const name = resolveAddressName(address);
    return name !== 'UNKNOWN' ? `[${name}]${address}` : address;
}

function formatParserError(error: DecodedContractError): string {
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

export function createDefaultParser(resolveAddressName: (addr: Address) => string) {
    return createContractParser({
        abi: [] as Abi,
        parseTransactionFallback(request) {
            const args = request.args.map((arg) =>
                typeof arg === 'string' && arg.startsWith('0x') && arg.length === 42
                    ? formatNamedAddress(arg as Address, resolveAddressName)
                    : String(arg)
            );
            return `${request.functionName}(${args.join(', ')})`;
        },
        parseEventFallback(event) {
            return `${event.eventName}(${JSON.stringify(event.args)})`;
        },
        parseErrorFallback: formatParserError,
    });
}
