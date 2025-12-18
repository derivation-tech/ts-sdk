import type { Address, Abi, ContractFunctionName, ContractFunctionArgs } from 'viem';
import type { ContractParser } from '../types';

/**
 * Create default parser with basic formatting
 * Used as fallback when no specific parser is registered
 * @param resolveAddressName - Function to resolve address to name (e.g., kit.getAddressName)
 */
export function createDefaultParser(resolveAddressName: (addr: Address) => string): ContractParser<Abi> {
    return {
        abi: [] as Abi,

        async parseTransaction(tx) {
            const formatValue = (val: any) => {
                if (typeof val === 'string' && val.startsWith('0x') && val.length === 42) {
                    const name = resolveAddressName(val as Address);
                    return name !== 'UNKNOWN' ? `[${name}]${val}` : val;
                }
                if (typeof val === 'bigint') {
                    return val.toString();
                }
                return String(val);
            };

            const argsStr = (tx.args as ContractFunctionArgs<Abi, 'nonpayable' | 'payable', ContractFunctionName<Abi>>)
                .map(formatValue)
                .join(', ');
            return `${tx.functionName}(${argsStr})`;
        },

        async parseEvent(event) {
            return `${event.eventName}(...)`;
        },

        async parseError(error) {
            if (typeof error === "string") {
                return error;
            }
            return error.name || 'Contract error';
        },
    };
}
