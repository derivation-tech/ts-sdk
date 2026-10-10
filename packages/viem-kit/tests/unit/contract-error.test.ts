import { describe, expect, test } from '@jest/globals';
import { createPublicClient, createWalletClient, custom, encodeErrorResult, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { decodeContractError } from '../../src/utils/contract-error';
import { sendContractTransaction } from '../../src/utils/tx';

const ABI = parseAbi(['error OrderImrUnsafe(uint256 amount, uint256 minAmount)', 'error Unauthorized(address caller)']);

describe('decodeContractError', () => {
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

    test('decodes custom errors nested deep in a viem submission error chain', async () => {
        const data = encodeErrorResult({ abi: ABI, errorName: 'Unauthorized', args: [`0x${'11'.repeat(20)}`] });
        const transport = custom(
            {
                async request({ method }) {
                    if (method === 'eth_chainId') return '0x1';
                    if (method === 'eth_getTransactionCount') return '0x0';
                    if (method === 'eth_estimateGas') throw { code: 3, message: 'execution reverted', data };
                    throw new Error(`Unexpected RPC method: ${method}`);
                },
            },
            { retryCount: 0 }
        );
        const account = privateKeyToAccount(`0x${'01'.padStart(64, '0')}`);
        const context = {
            walletClient: createWalletClient({ chain: mainnet, account, transport }),
            publicClient: createPublicClient({ chain: mainnet, transport }),
        };
        const writeAbi = [...ABI, ...parseAbi(['function setValue(uint256 value)'])];

        const thrown = await sendContractTransaction(
            context,
            {
                address: `0x${'22'.repeat(20)}`,
                abi: writeAbi,
                functionName: 'setValue',
                args: [1n],
                type: 'legacy',
                gasPrice: 1n,
            },
            { silent: true }
        ).catch((error: unknown) => error);
        // The submission error keeps viem's contract-level description of the revert.
        expect(thrown).toMatchObject({
            phase: 'prepare',
            outcome: 'not-sent',
            cause: {
                name: 'ContractFunctionExecutionError',
                cause: { name: 'ContractFunctionRevertedError', data: { errorName: 'Unauthorized' } },
            },
        });
        const error = decodeContractError(thrown, writeAbi);

        expect(error.kind).toBe('custom');
        if (error.kind !== 'custom') throw new Error('expected custom error');
        expect(error.name).toBe('Unauthorized');
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
