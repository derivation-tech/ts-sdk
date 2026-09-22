import { describe, expect, jest, test } from '@jest/globals';
import type { Address, Hash, LocalAccount, PublicClient, TransactionReceipt, WalletClient } from 'viem';
import {
    concatHex,
    createNonceManager,
    keccak256,
    createPublicClient as createViemPublicClient,
    createWalletClient as createViemWalletClient,
    custom,
    encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { BatchTransactionError, batchSendLocalTransactions, defineWriteRequest } from '../../src/utils/tx';

const tokenAddress = '0x0000000000000000000000000000000000000001' as Address;
const receiverAddress = '0x0000000000000000000000000000000000000002' as Address;
const firstHash = keccak256('0x01');
const secondHash = keccak256('0x02');

const erc20Abi = [
    {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },
] as const;

type TestPublicClient = PublicClient & {
    getTransactionCount: jest.Mock<() => Promise<number>>;
    sendRawTransaction: jest.Mock<() => Promise<Hash>>;
    waitForTransactionReceipt: jest.Mock<() => Promise<TransactionReceipt>>;
};

type TestWalletClient = WalletClient & {
    prepareTransactionRequest: jest.Mock<() => Promise<{ to: Address }>>;
};

function mockTransport() {
    return custom({ request: async () => undefined });
}

function makeReceipt(hash: Hash): TransactionReceipt {
    return {
        transactionHash: hash,
        blockNumber: 1n,
        status: 'success',
        logs: [],
        cumulativeGasUsed: 21_000n,
        effectiveGasPrice: 1n,
        gasUsed: 21_000n,
        from: receiverAddress,
        to: tokenAddress,
        contractAddress: null,
        logsBloom: '0x',
        blockHash: hash,
        transactionIndex: 0,
        type: 'eip1559',
    };
}

function createTestPublicClient(): TestPublicClient {
    const client = createViemPublicClient({ chain: mainnet, transport: mockTransport() });
    return Object.assign(client, {
        getTransactionCount: jest.fn<() => Promise<number>>(async () => 7),
        sendRawTransaction: jest
            .fn<() => Promise<Hash>>()
            .mockResolvedValueOnce(firstHash)
            .mockResolvedValueOnce(secondHash),
        waitForTransactionReceipt: jest
            .fn<() => Promise<TransactionReceipt>>()
            .mockResolvedValueOnce(makeReceipt(firstHash))
            .mockResolvedValueOnce(makeReceipt(secondHash)),
    });
}

function createTestWalletClient(account: LocalAccount): TestWalletClient {
    const client = createViemWalletClient({ account, chain: mainnet, transport: mockTransport() });
    return Object.assign(client, {
        prepareTransactionRequest: jest.fn<() => Promise<{ to: Address }>>(async () => ({ to: tokenAddress })),
    });
}

function createAccount(): LocalAccount {
    return privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001');
}

describe('batchSendLocalTransactions', () => {
    test('allocates pending nonces once per account and preserves exact calldata', async () => {
        const publicClient = createTestPublicClient();
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValueOnce('0x01').mockResolvedValue('0x02');
        const firstWallet = createTestWalletClient(account);
        const secondWallet = createTestWalletClient(account);

        const results = await batchSendLocalTransactions(
            publicClient,
            [firstWallet, secondWallet],
            [
                defineWriteRequest({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [receiverAddress, 1n],
                    account: account.address,
                    dataSuffix: '0xdeadbeef',
                    type: 'eip1559',
                    maxFeePerGas: 10n,
                    maxPriorityFeePerGas: 1n,
                    nonce: undefined,
                    chainId: undefined,
                }),
                defineWriteRequest({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [receiverAddress, 2n],
                    account: account.address,
                }),
            ]
        );

        expect(publicClient.getTransactionCount).toHaveBeenCalledTimes(1);
        expect(publicClient.getTransactionCount).toHaveBeenCalledWith({
            address: account.address,
            blockTag: 'pending',
        });
        expect(firstWallet.prepareTransactionRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                nonce: 7,
                type: 'eip1559',
                maxFeePerGas: 10n,
                maxPriorityFeePerGas: 1n,
                data: concatHex([
                    encodeFunctionData({
                        abi: erc20Abi,
                        functionName: 'transfer',
                        args: [receiverAddress, 1n],
                    }),
                    '0xdeadbeef',
                ]),
            })
        );
        expect(secondWallet.prepareTransactionRequest).toHaveBeenCalledWith(expect.objectContaining({ nonce: 8 }));
        expect(results).toEqual([
            { index: 0, hash: firstHash, receipt: makeReceipt(firstHash) },
            { index: 1, hash: secondHash, receipt: makeReceipt(secondHash) },
        ]);
    });

    test('rejects a request account that differs from the signing wallet', async () => {
        const publicClient = createTestPublicClient();
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValueOnce('0x01').mockResolvedValue('0x02');
        const walletClient = createTestWalletClient(account);

        await expect(
            batchSendLocalTransactions(
                publicClient,
                [walletClient],
                [
                    defineWriteRequest({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'transfer',
                        args: [receiverAddress, 1n],
                        account: receiverAddress,
                    }),
                ]
            )
        ).rejects.toThrow(
            `Batch request 0 account ${receiverAddress} does not match wallet account ${account.address}`
        );
        expect(walletClient.prepareTransactionRequest).not.toHaveBeenCalled();
    });

    test('reports completed sends when a later send fails', async () => {
        const publicClient = createTestPublicClient();
        publicClient.sendRawTransaction.mockReset();
        publicClient.sendRawTransaction
            .mockResolvedValueOnce(firstHash)
            .mockRejectedValueOnce(new Error('second send failed'));
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValueOnce('0x01').mockResolvedValue('0x02');
        const firstWallet = createTestWalletClient(account);
        const secondWallet = createTestWalletClient(account);
        let thrown: unknown;

        try {
            await batchSendLocalTransactions(
                publicClient,
                [firstWallet, secondWallet],
                [
                    defineWriteRequest({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'transfer',
                        args: [receiverAddress, 1n],
                        account: account.address,
                    }),
                    defineWriteRequest({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'transfer',
                        args: [receiverAddress, 2n],
                        account: account.address,
                    }),
                ]
            );
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(BatchTransactionError);
        expect(thrown).toMatchObject({
            phase: 'send',
            index: 1,
            progress: [
                { index: 0, hash: firstHash, nonce: 7, submission: 'submitted' },
                { index: 1, hash: secondHash, nonce: 8, submission: 'unknown' },
            ],
        });
    });
});

function transferRequest(account: Address = createAccount().address) {
    return defineWriteRequest({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [receiverAddress, 1n],
        account,
    });
}

describe('batch preflight and reconciliation', () => {
    test('rejects defined nonce and chain ID overrides before allocating or sending', async () => {
        const publicClient = createTestPublicClient();
        const wallet = createTestWalletClient(createAccount());
        for (const override of [{ nonce: 7 }, { chainId: mainnet.id }]) {
            const invalid = { ...transferRequest(), ...override };
            await expect(batchSendLocalTransactions(publicClient, [wallet], [invalid])).rejects.toMatchObject({
                phase: 'prepare',
                index: 0,
                progress: [],
                cause: { message: 'Batch nonce and chainId overrides are not supported' },
            });
        }
        expect(publicClient.getTransactionCount).not.toHaveBeenCalled();
        expect(publicClient.sendRawTransaction).not.toHaveBeenCalled();
    });

    test('checks the entire batch before sending when a later account is invalid', async () => {
        const publicClient = createTestPublicClient();
        const account = createAccount();
        const wallet = createTestWalletClient(account);
        const result = batchSendLocalTransactions(
            publicClient,
            [wallet, wallet],
            [transferRequest(), transferRequest(receiverAddress)]
        );
        await expect(result).rejects.toMatchObject({ phase: 'prepare', index: 1, progress: [] });
        expect(wallet.prepareTransactionRequest).not.toHaveBeenCalled();
        expect(publicClient.getTransactionCount).not.toHaveBeenCalled();
        expect(publicClient.sendRawTransaction).not.toHaveBeenCalled();
    });

    test('checks later calldata before any broadcast', async () => {
        const publicClient = createTestPublicClient();
        const wallet = createTestWalletClient(createAccount());
        const invalid = { ...transferRequest(), functionName: 'missing' };
        await expect(
            batchSendLocalTransactions(publicClient, [wallet, wallet], [transferRequest(), invalid])
        ).rejects.toMatchObject({ phase: 'prepare', index: 1, progress: [] });
        expect(publicClient.sendRawTransaction).not.toHaveBeenCalled();
        expect(publicClient.getTransactionCount).not.toHaveBeenCalled();
    });

    test('shares native viem nonce allocation across concurrent batches', async () => {
        const publicClient = createTestPublicClient();
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValueOnce('0x01').mockResolvedValueOnce('0x02');
        const first = createTestWalletClient(account);
        const second = createTestWalletClient(account);
        const get = jest.fn(async () => 7);
        const nonceManager = createNonceManager({ source: { get, set: () => undefined } });
        await Promise.all([
            batchSendLocalTransactions(publicClient, [first], [transferRequest()], { nonceManager }),
            batchSendLocalTransactions(publicClient, [second], [transferRequest()], { nonceManager }),
        ]);
        expect(first.prepareTransactionRequest).toHaveBeenCalledWith(expect.objectContaining({ nonce: 7 }));
        expect(second.prepareTransactionRequest).toHaveBeenCalledWith(expect.objectContaining({ nonce: 8 }));
        expect(get).toHaveBeenCalledTimes(1);
        expect(publicClient.getTransactionCount).not.toHaveBeenCalled();
    });

    test('preserves reserved nonce and prior broadcast on a later signing failure', async () => {
        const publicClient = createTestPublicClient();
        const account = createAccount();
        jest.spyOn(account, 'signTransaction')
            .mockResolvedValueOnce('0x01')
            .mockRejectedValueOnce(new Error('device unavailable'));
        const wallet = createTestWalletClient(account);
        await expect(
            batchSendLocalTransactions(publicClient, [wallet, wallet], [transferRequest(), transferRequest()])
        ).rejects.toMatchObject({
            phase: 'sign',
            index: 1,
            progress: [
                { index: 0, nonce: 7, hash: firstHash, submission: 'submitted' },
                { index: 1, nonce: 8, submission: 'not-sent' },
            ],
        });
        expect(publicClient.sendRawTransaction).toHaveBeenCalledTimes(1);
    });

    test('retains the signed hash when RPC returns an inconsistent hash', async () => {
        const publicClient = createTestPublicClient();
        publicClient.sendRawTransaction.mockReset().mockResolvedValue(secondHash);
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValue('0x01');
        const wallet = createTestWalletClient(account);
        await expect(batchSendLocalTransactions(publicClient, [wallet], [transferRequest()])).rejects.toMatchObject({
            phase: 'send',
            progress: [{ index: 0, hash: firstHash, submission: 'unknown' }],
        });
        expect(publicClient.sendRawTransaction).toHaveBeenCalledTimes(1);
        expect(publicClient.waitForTransactionReceipt).not.toHaveBeenCalled();
    });

    test('preserves progress and wait configuration after a receipt timeout', async () => {
        const publicClient = createTestPublicClient();
        publicClient.waitForTransactionReceipt.mockReset().mockRejectedValue(new Error('timed out'));
        const account = createAccount();
        jest.spyOn(account, 'signTransaction').mockResolvedValue('0x01');
        const wallet = createTestWalletClient(account);
        await expect(
            batchSendLocalTransactions(publicClient, [wallet], [transferRequest()], { wait: { timeout: 120_000 } })
        ).rejects.toMatchObject({
            phase: 'receipt',
            progress: [{ index: 0, hash: firstHash, submission: 'submitted' }],
            cause: { hash: firstHash },
        });
        expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: 120_000 })
        );
    });
});
