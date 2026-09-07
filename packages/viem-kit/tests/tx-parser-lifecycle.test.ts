import { describe, expect, jest, test } from '@jest/globals';
import type { Address, Hash, TransactionReceipt } from 'viem';
import {
    createPublicClient,
    createWalletClient,
    custom,
    encodeAbiParameters,
    encodeErrorResult,
    encodeEventTopics,
    parseAbi,
} from 'viem';
import { mainnet } from 'viem/chains';
import type { ContractParser } from '../src/types';
import { sendContractTransaction } from '../src/utils/tx';

const sender = '0x0000000000000000000000000000000000000001' as Address;
const target = '0x0000000000000000000000000000000000000002' as Address;
const hash = '0x3333333333333333333333333333333333333333333333333333333333333333' as Hash;
const abi = parseAbi([
    'function setValue(uint256 value)',
    'event ValueSet(uint256 value)',
    'error ValueRejected(uint256 value)',
]);

function makeReceipt(status: 'success' | 'reverted', logs: TransactionReceipt['logs'] = []): TransactionReceipt {
    return {
        transactionHash: hash,
        blockNumber: 10n,
        status,
        logs,
        cumulativeGasUsed: 21_000n,
        effectiveGasPrice: 1n,
        gasUsed: 21_000n,
        from: sender,
        to: target,
        contractAddress: null,
        logsBloom: '0x',
        blockHash: hash,
        transactionIndex: 0,
        type: 'eip1559',
    };
}

function setup(receipt: TransactionReceipt) {
    const transport = custom({ request: async () => undefined });
    const publicClient = createPublicClient({ chain: mainnet, transport });
    const walletClient = createWalletClient({ account: sender, chain: mainnet, transport });
    jest.spyOn(walletClient, 'sendTransaction').mockResolvedValue(hash);
    jest.spyOn(publicClient, 'waitForTransactionReceipt').mockResolvedValue(receipt);
    return { publicClient, walletClient };
}

function request(parser: ContractParser<typeof abi>) {
    return {
        address: target,
        abi,
        parser,
        functionName: 'setValue',
        args: [7n],
        account: sender,
    } as const;
}

describe('request parser lifecycle', () => {
    test('uses the direct request parser for target-address events', async () => {
        const topics = encodeEventTopics({ abi, eventName: 'ValueSet' });
        const data = encodeAbiParameters([{ type: 'uint256' }], [7n]);
        const receipt = makeReceipt('success', [
            {
                address: target,
                topics: [topics[0]],
                data,
                blockHash: hash,
                blockNumber: 10n,
                transactionHash: hash,
                transactionIndex: 0,
                logIndex: 0,
                removed: false,
            },
        ]);
        const { publicClient, walletClient } = setup(receipt);
        const parseEvent = jest.fn(async () => 'value:7');
        const parser: ContractParser<typeof abi> = { abi, parseEvent };
        const onEvent = jest.fn(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onEvent },
        });
        await sent.receipt;

        expect(parseEvent).toHaveBeenCalledWith({ eventName: 'ValueSet', args: { value: 7n } });
        expect(onEvent).toHaveBeenCalledWith({
            hash,
            submittedHash: hash,
            receipt,
            logIndex: 0,
            description: 'value:7',
        });
    });

    test('uses the direct request parser to describe decoded reverts', async () => {
        const receipt = makeReceipt('reverted');
        const { publicClient, walletClient } = setup(receipt);
        const revertData = encodeErrorResult({ abi, errorName: 'ValueRejected', args: [7n] });
        jest.spyOn(publicClient, 'call').mockRejectedValue({ data: revertData });
        const parseError = jest.fn(async () => 'rejected:7');
        const parser: ContractParser<typeof abi> = { abi, parseError };
        const onReverted = jest.fn(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onReverted },
        });
        await sent.receipt;

        expect(parseError).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'custom', name: 'ValueRejected', args: [7n] })
        );
        expect(onReverted).toHaveBeenCalledWith(expect.objectContaining({ hash, receipt, message: 'rejected:7' }));
    });

    test('reports error-parser failures without rejecting the receipt', async () => {
        const receipt = makeReceipt('reverted');
        const { publicClient, walletClient } = setup(receipt);
        const revertData = encodeErrorResult({ abi, errorName: 'ValueRejected', args: [7n] });
        jest.spyOn(publicClient, 'call').mockRejectedValue({ data: revertData });
        const parser: ContractParser<typeof abi> = {
            abi,
            parseError: () => {
                throw new Error('error parser failed');
            },
        };
        const onParseError = jest.fn(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onParseError },
        });

        await expect(sent.receipt).resolves.toBe(receipt);
        expect(onParseError).toHaveBeenCalledWith({
            phase: 'error',
            error: expect.objectContaining({ message: 'error parser failed' }),
        });
    });
    test('isolates a resolver failure for successful receipt logs', async () => {
        const topics = encodeEventTopics({ abi, eventName: 'ValueSet' });
        const receipt = makeReceipt('success', [
            {
                address: target,
                topics: [topics[0]],
                data: encodeAbiParameters([{ type: 'uint256' }], [7n]),
                blockHash: hash,
                blockNumber: 10n,
                transactionHash: hash,
                transactionIndex: 0,
                logIndex: 0,
                removed: false,
            },
        ]);
        const { publicClient, walletClient } = setup(receipt);
        const onParseError = jest.fn(() => undefined);
        const sent = await sendContractTransaction(
            {
                publicClient,
                walletClient,
                resolveParser: () => {
                    throw new Error('resolver unavailable');
                },
            },
            { address: target, abi, functionName: 'setValue', args: [7n] },
            { silent: true, hooks: { onParseError } }
        );
        await expect(sent.receipt).resolves.toBe(receipt);
        expect(onParseError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'event' }));
    });
});
