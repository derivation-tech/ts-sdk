import { describe, expect, test } from '@jest/globals';
import { encodeErrorResult, parseAbi } from 'viem';
import { decodeContractError } from '../../src/utils/contract-error';

const ABI = parseAbi(['error OrderImrUnsafe(uint256 amount, uint256 minAmount)', 'error Unauthorized(address caller)']);

describe('decodeContractError', () => {
    test('root error API exposes decodeContractError as the main error decoder', async () => {
        const root = await import('../../src');
        expect(typeof root.decodeContractError).toBe('function');
        expect('extractContractError' in root).toBe(false);
    });

    test('contract-error utility does not expose the old extractContractError compatibility API', async () => {
        const contractError = await import('../../src/utils/contract-error');
        expect('extractContractError' in contractError).toBe(false);
    });

    test('decodes custom errors from raw revert data', () => {
        const data = encodeErrorResult({
            abi: ABI,
            errorName: 'OrderImrUnsafe',
            args: [1n, 2n],
        });

        const error = decodeContractError({ cause: { data } }, ABI);

        expect(error.kind).toBe('custom');
        if (error.kind !== 'custom') throw new Error('expected custom error');
        expect(error.name).toBe('OrderImrUnsafe');
        expect(error.args).toEqual([1n, 2n]);
        expect(error.data).toBe(data);
    });

    test('decodes Error(string)', () => {
        const data = encodeErrorResult({
            abi: parseAbi(['error Error(string)']),
            errorName: 'Error',
            args: ['bad input'],
        });

        const error = decodeContractError({ data, shortMessage: 'execution reverted' }, ABI);

        expect(error.kind).toBe('revertString');
        if (error.kind !== 'revertString') throw new Error('expected revertString');
        expect(error.reason).toBe('bad input');
    });

    test('decodes Panic(uint256)', () => {
        const data = encodeErrorResult({
            abi: parseAbi(['error Panic(uint256)']),
            errorName: 'Panic',
            args: [0x11n],
        });

        const error = decodeContractError({ data }, ABI);

        expect(error.kind).toBe('panic');
        if (error.kind !== 'panic') throw new Error('expected panic');
        expect(error.code).toBe(0x11n);
    });

    test('preserves raw revert data when ABI cannot decode it', () => {
        const error = decodeContractError({ data: '0x12345678' }, ABI);

        expect(error.kind).toBe('raw');
        if (error.kind !== 'raw') throw new Error('expected raw');
        expect(error.data).toBe('0x12345678');
    });

    test('returns unknown for errors without revert data', () => {
        const error = decodeContractError(new Error('network unavailable'), ABI);

        expect(error.kind).toBe('unknown');
        expect(error.message).toContain('network unavailable');
    });
});
