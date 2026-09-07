import { decodeErrorResult, parseAbi } from 'viem';
import type { Abi, Hex } from 'viem';
import type { ContractErrorAbiItem, DecodedContractError } from '../types';

const STANDARD_ERROR_ABI = parseAbi(['error Error(string)', 'error Panic(uint256)']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function messageOf(error: unknown): string {
    if (isRecord(error) && typeof error.shortMessage === 'string') return error.shortMessage;
    if (isRecord(error) && isRecord(error.cause) && typeof error.cause.reason === 'string') return error.cause.reason;
    if (isRecord(error) && isRecord(error.cause) && typeof error.cause.message === 'string') return error.cause.message;
    if (error instanceof Error) return error.message;
    return String(error);
}

function asHex(value: unknown): Hex | undefined {
    return typeof value === 'string' && value.startsWith('0x') ? (value as Hex) : undefined;
}

function revertDataOf(error: unknown): unknown {
    if (!isRecord(error)) return undefined;
    const cause = isRecord(error.cause) ? error.cause : undefined;
    const nestedCause = cause && isRecord(cause.cause) ? cause.cause : undefined;
    return error.data ?? cause?.data ?? nestedCause?.data;
}

function fromDecodedObject(value: Record<string, unknown>, message: string, data?: Hex): DecodedContractError | null {
    const errorName = typeof value.errorName === 'string' ? value.errorName : undefined;
    if (!errorName) return null;

    const args = Array.isArray(value.args) ? (value.args as readonly unknown[]) : [];
    if (errorName === 'Error') {
        return {
            kind: 'revertString',
            reason: typeof args[0] === 'string' ? args[0] : message,
            data,
            message,
        };
    }

    if (errorName === 'Panic') {
        return {
            kind: 'panic',
            code: typeof args[0] === 'bigint' ? args[0] : undefined,
            data,
            message,
        };
    }

    return {
        kind: 'custom',
        name: errorName,
        args,
        abiItem: isRecord(value.abiItem) ? (value.abiItem as ContractErrorAbiItem) : undefined,
        data,
        message,
    };
}

function decodeWithAbi(data: Hex, abi?: Abi): DecodedContractError | null {
    const decodeAbi = abi ? ([...abi, ...STANDARD_ERROR_ABI] as Abi) : STANDARD_ERROR_ABI;
    try {
        const decoded = decodeErrorResult({ abi: decodeAbi, data });
        return fromDecodedObject(
            {
                errorName: decoded.errorName,
                args: decoded.args ?? [],
                abiItem: decoded.abiItem,
            },
            decoded.errorName,
            data
        );
    } catch {
        return null;
    }
}

export function decodeContractError(error: unknown, abi?: Abi): DecodedContractError {
    const message = messageOf(error);
    const rawData = revertDataOf(error) ?? error;
    const data = asHex(rawData);

    if (isRecord(rawData)) {
        const decoded = fromDecodedObject(rawData, message);
        if (decoded) return decoded;
    }

    if (data) {
        const decoded = decodeWithAbi(data, abi);
        if (decoded) {
            return { ...decoded, message };
        }
        return { kind: 'raw', data, message };
    }

    return { kind: 'unknown', message };
}
