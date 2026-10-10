import type { Address, Abi } from 'viem';
import { formatContractError } from '../utils/contract-error';
import { createContractParser } from './types';

function formatNamedAddress(address: Address, resolveAddressName: (addr: Address) => string): string {
    const name = resolveAddressName(address);
    return name !== 'UNKNOWN' ? `[${name}]${address}` : address;
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
        parseErrorFallback: formatContractError,
    });
}
