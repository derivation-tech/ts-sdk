import { describe, expect, jest, test } from '@jest/globals';
import type { Address, Chain, Hash, Hex, TransactionReceipt } from 'viem';
import { concatHex, createPublicClient, createWalletClient, custom, encodeFunctionData, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { sendContractTransaction } from '../src/utils/tx';
import { ChainKit } from '../src/chain-kit';
import * as WETH from '../src/contracts/weth';

const sender = '0x0000000000000000000000000000000000000001' as Address;
const target = '0x0000000000000000000000000000000000000002' as Address;
const hash = '0x2222222222222222222222222222222222222222222222222222222222222222' as Hash;
const suffix = '0xdeadbeef' as Hex;
const abi = parseAbi(['function setValue(uint256 value)']);
const payableAbi = parseAbi(['function deposit() payable']);

function setup(status: 'success' | 'reverted' = 'success', chain: Chain = mainnet) {
    const transport = custom({ request: async () => undefined });
    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ account: sender, chain, transport });
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

describe('wrapped-native instance configuration', () => {
    test('fails before sending when wrapped-native metadata is disabled', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const kit = new ChainKit(mainnet, { publicClient, wrappedNativeToken: null });
        await expect(WETH.deposit(publicClient, walletClient, kit, '1')).rejects.toThrow(
            'Wrapped native token not found'
        );
        await expect(WETH.withdraw(publicClient, walletClient, kit, '1')).rejects.toThrow(
            'Wrapped native token not found'
        );
        expect(sendTransaction).not.toHaveBeenCalled();
    });

    test('uses explicit instance metadata instead of client metadata and preserves native units', async () => {
        const oldWrappedAddress = '0x0000000000000000000000000000000000000099' as Address;
        const chain: Chain = {
            ...mainnet,
            id: 999999,
            nativeCurrency: { name: 'Custom', symbol: 'C', decimals: 6 },
            contracts: { wrappedEther: { address: oldWrappedAddress } },
        };
        const { publicClient, walletClient, sendTransaction } = setup('success', chain);
        const kit = new ChainKit(chain, {
            publicClient,
            wrappedNativeToken: { address: target, symbol: 'WC', name: 'Wrapped Custom', decimals: 6 },
        });
        kit.registerErc20Token({ address: oldWrappedAddress, symbol: 'OLD', name: 'Old Wrapped', decimals: 6 });
        await WETH.deposit(publicClient, walletClient, kit, '1.25');
        expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ to: target, value: 1_250_000n }));
        await WETH.withdraw(publicClient, walletClient, kit, '1.25');
        expect(sendTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ to: target }));
    });
});
