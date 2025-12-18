import { type Abi, decodeErrorResult } from 'viem';
import { type ParsedContractError } from '../types';

export function extractContractError(err: any, abi?: Abi): ParsedContractError | string {
    const errorObj = err?.cause || err;
    const data = errorObj?.data || errorObj?.cause?.data || err?.data;
    // Fallback message
    const msg = err?.shortMessage || err?.cause?.reason || err?.cause?.message || err?.message || String(err);
    if (data) {
        if (data.errorName === 'Panic') {
            return msg;
        }

        // Case 1: Already decoded object from viem
        if (typeof data === 'object' && data !== null && 'errorName' in data) {
            const decoded = data as { errorName: string; args?: readonly unknown[] };
            const isRevertString = decoded.errorName === 'Error' && Array.isArray(decoded.args);

            return {
                name: isRevertString ? undefined : (decoded.errorName as any),
                signature: isRevertString ? 'Error(string)' : errorObj.signature || decoded.errorName,
                args: decoded.args as any,
            };
        }

        // Case 2: Raw hex string - decode using ABI
        if (typeof data === 'string' && data.startsWith('0x') && abi) {
            try {
                const decoded = decodeErrorResult({ abi, data: data as `0x${string}` });
                if (decoded.errorName === 'Panic') {
                    // Panic error, return the message for better readability
                    return msg;
                }
                const isRevertString = decoded.errorName === 'Error' && Array.isArray(decoded.args);
                return {
                    name: isRevertString ? undefined : (decoded.errorName as any),
                    signature: isRevertString ? 'Error(string)' : decoded.errorName,
                    args: decoded.args as any,
                };
            } catch {
                // Decode failed, fall through
            }
        }
    }
    // Fallback: return string message
    return msg;
}
