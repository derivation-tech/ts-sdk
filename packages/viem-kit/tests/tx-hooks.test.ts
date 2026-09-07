import { describe, expect, jest, test } from '@jest/globals';
import type { Address, Chain, Hash, Hex, TransactionReceipt } from 'viem';
import { concatHex, createPublicClient, createWalletClient, custom, encodeFunctionData, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import {
    assertTransactionSuccess,
    sendContractTransaction,
    TransactionReceiptError,
    TransactionReplacementError,
    TransactionRevertedError,
    TransactionSubmissionError,
    type TxReplacementEvent,
} from '../src/utils/tx';
import { ChainKit } from '../src/chain-kit';
import * as WETH from '../src/contracts/weth';
import { LoggerFactory } from '../src/utils/logger';

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
    return { publicClient, walletClient, sendTransaction, receipt };
}

describe('transaction lifecycle observers', () => {
    test('does not reject an already-sent transaction when onSent throws', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const onObserverError = jest.fn(() => undefined);
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

const writeRequest = { address: target, abi, functionName: 'setValue', args: [1n] } as const;
const replacementHash = '0x4444444444444444444444444444444444444444444444444444444444444444' as Hash;

function transaction(txHash: Hash): TxReplacementEvent['transaction'] {
    return {
        blockHash: null,
        blockNumber: null,
        from: sender,
        gas: 21_000n,
        hash: txHash,
        input: '0x',
        nonce: 7,
        r: '0x',
        s: '0x',
        to: target,
        transactionIndex: null,
        type: 'legacy',
        typeHex: '0x0',
        value: 0n,
        v: 27n,
        gasPrice: 1n,
    };
}

describe('transaction outcome contracts', () => {
    test('forwards fees, nonce and wait options through ChainKit', async () => {
        const { publicClient, walletClient, sendTransaction, receipt } = setup();
        const kit = new ChainKit(mainnet, { publicClient });
        const wait = { confirmations: 3, timeout: 120_000, pollingInterval: 500, checkReplacement: true };
        await expect(
            kit.sendTx(
                walletClient,
                {
                    ...writeRequest,
                    maxFeePerGas: 10n,
                    maxPriorityFeePerGas: 2n,
                    nonce: 42,
                    gas: 70_000n,
                },
                { silent: true, wait }
            )
        ).resolves.toBe(receipt);
        expect(sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                maxFeePerGas: 10n,
                maxPriorityFeePerGas: 2n,
                nonce: 42,
                gas: 70_000n,
            })
        );
        expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
            ...wait,
            hash,
            onReplaced: expect.any(Function),
        });
    });

    test('isolates rejected async hooks including the observer-error hook', async () => {
        const { publicClient, walletClient, receipt } = setup();
        const onObserverError = jest.fn(async (_event: import('../src/utils/tx').TxObserverErrorEvent) => {
            throw new Error('report failed');
        });
        const sent = await sendContractTransaction({ publicClient, walletClient }, writeRequest, {
            silent: true,
            hooks: {
                onSent: async () => {
                    throw new Error('sent observer failed');
                },
                onReceipt: async () => {
                    throw new Error('receipt observer failed');
                },
                onObserverError,
            },
        });
        await expect(sent.receipt).resolves.toBe(receipt);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(onObserverError.mock.calls.map(([event]) => event.phase)).toEqual(['sent', 'receipt']);
    });

    test('does not wait for pending receipt observers', async () => {
        const { publicClient, walletClient, receipt } = setup();
        const sent = await sendContractTransaction({ publicClient, walletClient }, writeRequest, {
            silent: true,
            hooks: { onReceipt: () => new Promise<void>(() => undefined) },
        });
        await expect(sent.receipt).resolves.toBe(receipt);
    });

    test('keeps broadcast evidence when the logger throws', async () => {
        const { publicClient, walletClient, receipt } = setup();
        const logger = jest.spyOn(LoggerFactory, 'getLogger').mockImplementation(() => {
            throw new Error('log failed');
        });
        const onObserverError = jest.fn(() => undefined);
        try {
            const sent = await sendContractTransaction({ publicClient, walletClient }, writeRequest, {
                hooks: { onObserverError },
            });
            expect(sent.hash).toBe(hash);
            await expect(sent.receipt).resolves.toBe(receipt);
            expect(onObserverError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'log', hash }));
        } finally {
            logger.mockRestore();
        }
    });

    test('retains a receipt when parser resolution and parse-error observers fail', async () => {
        const { publicClient, walletClient, receipt } = setup('reverted');
        jest.spyOn(publicClient, 'call').mockRejectedValue(new Error('reverted'));
        const onObserverError = jest.fn(() => undefined);
        const sent = await sendContractTransaction(
            {
                publicClient,
                walletClient,
                resolveParser: () => {
                    throw new Error('resolver failed');
                },
            },
            writeRequest,
            {
                silent: true,
                hooks: {
                    onParseError: async () => {
                        throw new Error('parse observer failed');
                    },
                    onObserverError,
                },
            }
        );
        await expect(sent.receipt).resolves.toBe(receipt);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(onObserverError).toHaveBeenCalledWith(expect.objectContaining({ transactionAlreadySent: false }));
        expect(onObserverError).toHaveBeenCalledWith(expect.objectContaining({ hash, transactionAlreadySent: true }));
        expect(() => assertTransactionSuccess(receipt)).toThrow(TransactionRevertedError);
    });

    test('retains hash and cause for a wait timeout without resending', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const cause = new Error('timed out');
        jest.spyOn(publicClient, 'waitForTransactionReceipt').mockRejectedValue(cause);
        const sent = await sendContractTransaction({ publicClient, walletClient }, writeRequest, { silent: true });
        await expect(sent.receipt).rejects.toBeInstanceOf(TransactionReceiptError);
        await expect(sent.receipt).rejects.toMatchObject({ hash, cause });
        expect(sendTransaction).toHaveBeenCalledTimes(1);
    });

    test('classifies ambiguous wallet submission without automatically retrying', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const cause = new Error('connection lost');
        sendTransaction.mockRejectedValue(cause);
        const result = sendContractTransaction({ publicClient, walletClient }, writeRequest, { silent: true });
        await expect(result).rejects.toBeInstanceOf(TransactionSubmissionError);
        await expect(result).rejects.toMatchObject({
            outcome: 'unknown',
            cause,
            request: { from: sender, to: target, chainId: 1 },
        });
        expect(sendTransaction).toHaveBeenCalledTimes(1);
        expect(publicClient.waitForTransactionReceipt).not.toHaveBeenCalled();
    });

    test.each(['repriced', 'replaced', 'cancelled'] as const)(
        'handles %s with the actual receipt hash',
        async (reason) => {
            const { publicClient, walletClient, receipt } = setup();
            const replacementReceipt = { ...receipt, transactionHash: replacementHash };
            jest.spyOn(publicClient, 'waitForTransactionReceipt').mockImplementation(async (options) => {
                options.onReplaced?.({
                    reason,
                    replacedTransaction: transaction(hash),
                    transaction: transaction(replacementHash),
                    transactionReceipt: replacementReceipt,
                });
                return replacementReceipt;
            });
            const onReceipt = jest.fn(() => undefined);
            const onReplaced = jest.fn(() => undefined);
            const sent = await sendContractTransaction({ publicClient, walletClient }, writeRequest, {
                silent: true,
                hooks: { onReceipt, onReplaced },
            });
            expect(sent.hash).toBe(hash);
            if (reason === 'repriced') await expect(sent.receipt).resolves.toBe(replacementReceipt);
            else {
                await expect(sent.receipt).rejects.toBeInstanceOf(TransactionReplacementError);
                await expect(sent.receipt).rejects.toMatchObject({ hash, reason, receipt: replacementReceipt });
            }
            expect(onReceipt).toHaveBeenCalledWith({
                hash: replacementHash,
                submittedHash: hash,
                receipt: replacementReceipt,
            });
            expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ reason, submittedHash: hash }));
        }
    );
    test('encodes the intended call before an async parser can mutate caller data', async () => {
        const { publicClient, walletClient, sendTransaction } = setup();
        const request = { ...writeRequest, args: [1n] as [bigint], gas: 50_000n };
        const sent = await sendContractTransaction(
            { publicClient, walletClient },
            {
                ...request,
                parser: {
                    abi,
                    parseTransaction: async () => {
                        request.args[0] = 2n;
                        request.gas = 99_000n;
                        return 'admin call';
                    },
                },
            },
            { silent: true }
        );
        await sent.receipt;
        expect(sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                gas: 50_000n,
                data: encodeFunctionData({ abi, functionName: 'setValue', args: [1n] }),
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
