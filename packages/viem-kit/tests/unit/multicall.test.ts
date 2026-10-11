import { describe, expect, jest, test } from '@jest/globals';
import { createPublicClient, custom, encodeFunctionResult, parseAbi } from 'viem';
import type { Address } from 'viem';
import { mainnet } from 'viem/chains';
import {
    getAllBalances,
    getErc20Balances,
    getMultipleErc20Balances,
    getNativeBalances,
} from '../../src/contracts/multicall';

const token = '0x0000000000000000000000000000000000000001' as Address;
const accounts = [token, '0x0000000000000000000000000000000000000002' as Address, token];
const aggregateAbi = parseAbi([
    'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

function client() {
    return createPublicClient({
        chain: mainnet,
        transport: custom({
            request: async () => {
                throw new Error('Unexpected RPC');
            },
        }),
    });
}

describe('balance multicalls', () => {
    test('preserves genuine zero balances and order across chunks', async () => {
        const rpc = client();
        const calls = jest.spyOn(rpc, 'multicall').mockResolvedValueOnce([0n, 7n]).mockResolvedValueOnce([9n]);
        expect(await getErc20Balances(rpc, token, accounts, 2)).toEqual([0n, 7n, 9n]);
        expect(calls.mock.calls.map(([request]) => request.contracts.length)).toEqual([2, 1]);
        expect(calls.mock.calls.every(([request]) => request.allowFailure === false)).toBe(true);
    });

    test('propagates RPC failures instead of returning zero balances', async () => {
        const rpc = client();
        const failure = new Error('RPC unavailable');
        jest.spyOn(rpc, 'multicall').mockRejectedValue(failure);
        await expect(getErc20Balances(rpc, token, accounts)).rejects.toBe(failure);
        await expect(getNativeBalances(rpc, accounts)).rejects.toBe(failure);
        await expect(getAllBalances(rpc, [token], accounts)).rejects.toBe(failure);
    });

    test('rejects a failed individual contract call through native viem multicall', async () => {
        const rpc = createPublicClient({
            chain: mainnet,
            transport: custom({
                request: async ({ method }) => {
                    if (method !== 'eth_call') throw new Error(`Unexpected RPC ${method}`);
                    return encodeFunctionResult({
                        abi: aggregateAbi,
                        functionName: 'aggregate3',
                        result: [{ success: false, returnData: '0x' }],
                    });
                },
            }),
        });
        await expect(getErc20Balances(rpc, token, [token])).rejects.toThrow();
        await expect(getNativeBalances(rpc, [token])).rejects.toThrow();
    });

    test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
        'rejects invalid batch size %s before querying',
        async (size) => {
            const rpc = client();
            const calls = jest.spyOn(rpc, 'multicall');
            await expect(getErc20Balances(rpc, token, [], size)).rejects.toThrow(RangeError);
            await expect(getNativeBalances(rpc, [], size)).rejects.toThrow(RangeError);
            await expect(getMultipleErc20Balances(rpc, [token], [], size)).rejects.toThrow(RangeError);
            await expect(getAllBalances(rpc, [], [], size)).rejects.toThrow(RangeError);
            expect(calls).not.toHaveBeenCalled();
        }
    );

    test('does not query empty address inputs', async () => {
        const rpc = client();
        const calls = jest.spyOn(rpc, 'multicall');
        expect(await getErc20Balances(rpc, token, [])).toEqual([]);
        expect(await getNativeBalances(rpc, [])).toEqual([]);
        expect(calls).not.toHaveBeenCalled();
    });
});
