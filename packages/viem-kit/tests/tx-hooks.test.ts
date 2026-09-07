import { describe, expect, jest, test } from '@jest/globals';
import type { Address, Hash, Hex, TransactionReceipt } from 'viem';
import { concatHex, createPublicClient, createWalletClient, custom, encodeFunctionData, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { sendContractTransaction } from '../src/utils/tx';

const sender = '0x0000000000000000000000000000000000000001' as Address;
const target = '0x0000000000000000000000000000000000000002' as Address;
const hash = '0x2222222222222222222222222222222222222222222222222222222222222222' as Hash;
const suffix = '0xdeadbeef' as Hex;
const abi = parseAbi(['function setValue(uint256 value)']);
const payableAbi = parseAbi(['function deposit() payable']);

function setup(status: 'success' | 'reverted' = 'success') {
    const transport = custom({ request: async () => undefined });
    const publicClient = createPublicClient({ chain: mainnet, transport });
    const walletClient = createWalletClient({ account: sender, chain: mainnet, transport });
    const receipt: TransactionReceipt = {
        transactionHash: hash,
        blockNumber: 10n,
        status,
        logs: [],
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
    const sendTransaction = jest.spyOn(walletClient, 'sendTransaction').mockResolvedValue(hash);
    jest.spyOn(walletClient, 'writeContract').mockResolvedValue(hash);
    jest.spyOn(publicClient, 'waitForTransactionReceipt').mockResolvedValue(receipt);
    return { publicClient, walletClient, sendTransaction };
}

describe('transaction lifecycle observers', () => {
    test('does not reject an already-sent transaction when onSent throws', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const onObserverError = jest.fn();
        const hooks = {
            onSent: () => {
                throw new Error('observer failed');
            },
            onObserverError,
        };

        const sent = await sendContractTransaction(
            { publicClient, walletClient, chain: mainnet },
            { address: target, abi, functionName: 'setValue', args: [1n], account: sender },
            { silent: true, hooks }
        );

        expect(sent.hash).toBe(hash);
        expect(sendTransaction).toHaveBeenCalledTimes(1);
        expect(onObserverError).toHaveBeenCalledWith({
            phase: 'sent',
            hash,
            error: expect.objectContaining({ message: 'observer failed' }),
            transactionAlreadySent: true,
        });
    });

    test('sends and replays a reverted request with the exact suffixed calldata', async () => {
        const { publicClient, walletClient, sendTransaction } = setup('reverted');
        const call = jest.spyOn(publicClient, 'call').mockRejectedValue(new Error('reverted'));

        const sent = await sendContractTransaction(
            { publicClient, walletClient, chain: mainnet },
            {
                address: target,
                abi,
                functionName: 'setValue',
                args: [1n],
                account: sender,
                dataSuffix: suffix,
            },
            { silent: true }
        );
        await sent.receipt;

        const functionData = encodeFunctionData({ abi, functionName: 'setValue', args: [1n] });
        const calldata = concatHex([functionData, suffix]);
        expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ to: target, data: calldata }));
        expect(call).toHaveBeenCalledWith(expect.objectContaining({ data: calldata, blockNumber: 10n }));
    });

    test('encodes a zero-argument payable request without an args property', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();

        const sent = await sendContractTransaction(
            { publicClient, walletClient, chain: mainnet },
            {
                address: target,
                abi: payableAbi,
                functionName: 'deposit',
                value: 1n,
                account: sender,
            },
            { silent: true }
        );
        await sent.receipt;

        expect(sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                to: target,
                value: 1n,
                data: encodeFunctionData({ abi: payableAbi, functionName: 'deposit' }),
            })
        );
    });
});
