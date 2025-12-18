import { describe, test, expect, jest } from '@jest/globals';
import type { PublicClient, WalletClient, Account, TransactionReceipt, Address } from 'viem';
import {
    sendTxWithLog,
    sendTxSilent,
    batchSendTxWithLog,
    batchSendTxSilent,
    handleError,
    type TxRequest,
} from '../src/utils/tx';
import { ChainKit } from '../src/chain-kit';
import { mainnet } from 'viem/chains';

// Mock setup
const createMockAccount = (): Account => ({
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address,
    type: 'local',
    source: 'privateKey',
    publicKey: '0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
    signMessage: jest.fn() as any,
    signTransaction: jest.fn() as any,
    signTypedData: jest.fn() as any,
});

const createMockPublicClient = (): Partial<PublicClient> => ({
    waitForTransactionReceipt: jest.fn() as any,
    call: jest.fn() as any,
    getTransactionCount: jest.fn() as any,
    sendRawTransaction: jest.fn() as any,
});

const createMockWalletClient = (account?: Account): Partial<WalletClient> => ({
    account: account || createMockAccount(),
    writeContract: jest.fn() as any,
    deployContract: jest.fn() as any,
    prepareTransactionRequest: jest.fn() as any,
    signTransaction: jest.fn() as any,
    sendRawTransaction: jest.fn() as any,
});

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

const txTarget = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

const makeReceipt = (
    status: 'success' | 'reverted',
    txHash: `0x${string}`,
    from: Address,
    to: Address
): TransactionReceipt => ({
    transactionHash: txHash,
    blockNumber: 12345n,
    status,
    logs: [],
    cumulativeGasUsed: 21000n,
    effectiveGasPrice: 1000000000n,
    gasUsed: 21000n,
    from,
    to,
    contractAddress: null,
    logsBloom: '0x' as `0x${string}`,
    blockHash: '0xabcd' as `0x${string}`,
    transactionIndex: 0,
    type: 'eip1559',
});

describe('Transaction Utilities', () => {
    let kit: ChainKit;
    let mockPublicClient: Partial<PublicClient>;
    let mockWalletClient: Partial<WalletClient>;
    let mockAccount: Account;

    beforeEach(() => {
        kit = new ChainKit(mainnet);
        mockAccount = createMockAccount();
        mockPublicClient = createMockPublicClient();
        mockWalletClient = createMockWalletClient(mockAccount);
    });

    // ==========================================
    // ERROR HANDLING
    // ==========================================

    describe('handleError', () => {
        test('should extract error message from string error', async () => {
            const error = new Error('Transaction failed');
            const result = await handleError(error, {} as any, []);

            expect(result).toContain('Transaction failed');
        });

        test('should handle parsed contract error with name', async () => {
            const error = {
                data: {
                    errorName: 'InsufficientBalance',
                    args: [1000n],
                },
            };

            const result = await handleError(error, {} as any, []);

            expect(typeof result).toBe('object');
            if (typeof result === 'object' && result !== null && 'name' in result) {
                expect(result.name).toBe('InsufficientBalance');
            }
        });

        test('should use custom parser if provided', async () => {
            const mockParser = {
                abi: [],
                parseError: jest.fn(async () => 'Custom error message'),
            };

            const error = { message: 'Test error' };
            const result = await handleError(error, mockParser as any, []);

            expect(mockParser.parseError).toHaveBeenCalled();
            expect(result).toBe('Custom error message');
        });

        test('should handle parser throwing error', async () => {
            const mockParser = {
                abi: [],
                parseError: jest.fn(async () => {
                    throw new Error('Parser failed');
                }),
            };

            const error = { message: 'Test error' };
            const result = await handleError(error, mockParser as any, []);

            expect(typeof result).toBe('string');
            expect(result).toContain('Unknown contract error');
        });
    });

    // ==========================================
    // SEND TX WITH LOG
    // ==========================================

    describe('sendTxWithLog', () => {
        test('should throw error if wallet client has no account', async () => {
            const walletClientNoAccount = createMockWalletClient(undefined);
            walletClientNoAccount.account = undefined;

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            await expect(
                sendTxWithLog(
                    mockPublicClient as PublicClient,
                    walletClientNoAccount as WalletClient,
                    kit,
                    txRequest
                )
            ).rejects.toThrow('WalletClient must have an account configured');
        });

        test('should send transaction successfully', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'success',
                logs: [],
                cumulativeGasUsed: 21000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 21000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
            };

            const receipt = await sendTxWithLog(
                mockPublicClient as PublicClient,
                mockWalletClient as WalletClient,
                kit,
                txRequest
            );

            expect(receipt.status).toBe('success');
            expect(receipt.transactionHash).toBe(txHash);
            expect(mockWalletClient.writeContract).toHaveBeenCalled();
            expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: txHash });
        });

        test('should handle reverted transaction', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'reverted',
                logs: [],
                cumulativeGasUsed: 21000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 21000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            const receipt = await sendTxWithLog(
                mockPublicClient as PublicClient,
                mockWalletClient as WalletClient,
                kit,
                txRequest
            );

            // sendTxWithLog returns the receipt even if reverted
            expect(receipt.status).toBe('reverted');
        });

        test('should throw error if writeContract fails', async () => {
            (mockWalletClient.writeContract as any).mockRejectedValue(new Error('Insufficient funds'));

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            await expect(
                sendTxWithLog(
                    mockPublicClient as PublicClient,
                    mockWalletClient as WalletClient,
                    kit,
                    txRequest
                )
            ).rejects.toThrow('Insufficient funds');
        });
    });

    // ==========================================
    // SEND TX SILENT
    // ==========================================

    describe('sendTxSilent', () => {
        test('should throw error if wallet client has no account', async () => {
            const walletClientNoAccount = createMockWalletClient(undefined);
            walletClientNoAccount.account = undefined;

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            await expect(
                sendTxSilent(
                    mockPublicClient as PublicClient,
                    walletClientNoAccount as WalletClient,
                    txRequest
                )
            ).rejects.toThrow('WalletClient must have an account configured');
        });

        test('should send transaction successfully', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'success',
                logs: [],
                cumulativeGasUsed: 21000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 21000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            const receipt = await sendTxSilent(
                mockPublicClient as PublicClient,
                mockWalletClient as WalletClient,
                txRequest
            );

            expect(receipt.status).toBe('success');
            expect(receipt.transactionHash).toBe(txHash);
        });

        test('should throw error for reverted transaction', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'reverted',
                logs: [],
                cumulativeGasUsed: 21000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 21000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'transfer',
                args: [],
            };

            // sendTxSilent should throw for reverted transactions
            await expect(
                sendTxSilent(
                    mockPublicClient as PublicClient,
                    mockWalletClient as WalletClient,
                    txRequest
                )
            ).rejects.toThrow('Transaction reverted');
        });
    });

    // ==========================================
    // BATCH SEND TX WITH LOG
    // ==========================================

    describe('batchSendTxWithLog', () => {
        test('should throw error if any wallet client has no account', async () => {
            const walletClientNoAccount = createMockWalletClient(undefined);
            walletClientNoAccount.account = undefined;

            const txs: TxRequest[] = [
                {
                    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
                },
                {
                    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
                },
            ];

            await expect(
                batchSendTxWithLog(
                    mockPublicClient as PublicClient,
                    [mockWalletClient as WalletClient, walletClientNoAccount as WalletClient],
                    kit,
                    txs
                )
            ).rejects.toThrow(/index 1/);
        });

        test('should return receipts even when some transactions revert', async () => {
            const secondAccount = createMockAccount();
            secondAccount.address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            const walletClient1 = createMockWalletClient(mockAccount);
            const walletClient2 = createMockWalletClient(secondAccount);
            const publicClient = createMockPublicClient();

            (publicClient.getTransactionCount as any).mockResolvedValueOnce(0n).mockResolvedValueOnce(5n);
            (walletClient1.prepareTransactionRequest as any).mockResolvedValue('prepared1');
            (walletClient2.prepareTransactionRequest as any).mockResolvedValue('prepared2');
            (walletClient1.signTransaction as any).mockResolvedValue('0xraw1');
            (walletClient2.signTransaction as any).mockResolvedValue('0xraw2');
            (publicClient.sendRawTransaction as any)
                .mockResolvedValueOnce('0xhash1' as `0x${string}`)
                .mockResolvedValueOnce('0xhash2' as `0x${string}`);
            (publicClient.waitForTransactionReceipt as any)
                .mockResolvedValueOnce(makeReceipt('success', '0xhash1', mockAccount.address, txTarget))
                .mockResolvedValueOnce(makeReceipt('reverted', '0xhash2', secondAccount.address, txTarget));

            const txs: TxRequest[] = [
                {
                    address: txTarget,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: [secondAccount.address, 1000n],
                },
                {
                    address: txTarget,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: [mockAccount.address, 2000n],
                },
            ];

            const receipts = await batchSendTxWithLog(
                publicClient as PublicClient,
                [walletClient1 as WalletClient, walletClient2 as WalletClient],
                kit,
                txs
            );

            expect(receipts).toHaveLength(2);
            expect(receipts[0].status).toBe('success');
            expect(receipts[1].status).toBe('reverted');
            expect(publicClient.getTransactionCount).toHaveBeenCalledTimes(2);
            expect(publicClient.sendRawTransaction).toHaveBeenCalledTimes(2);
        });
    });

    // ==========================================
    // BATCH SEND TX SILENT
    // ==========================================

    describe('batchSendTxSilent', () => {
        test('should throw error if any wallet client has no account', async () => {
            const walletClientNoAccount = createMockWalletClient(undefined);
            walletClientNoAccount.account = undefined;

            const txs: TxRequest[] = [
                {
                    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
                },
                {
                    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
                },
            ];

            await expect(
                batchSendTxSilent(
                    mockPublicClient as PublicClient,
                    [mockWalletClient as WalletClient, walletClientNoAccount as WalletClient],
                    txs
                )
            ).rejects.toThrow(/index 1/);
        });

        test('should throw error when any receipt is reverted', async () => {
            const secondAccount = createMockAccount();
            secondAccount.address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            const walletClient1 = createMockWalletClient(mockAccount);
            const walletClient2 = createMockWalletClient(secondAccount);
            const publicClient = createMockPublicClient();

            (publicClient.getTransactionCount as any).mockResolvedValueOnce(0n).mockResolvedValueOnce(1n);
            (walletClient1.prepareTransactionRequest as any).mockResolvedValue('prepared1');
            (walletClient2.prepareTransactionRequest as any).mockResolvedValue('prepared2');
            (walletClient1.signTransaction as any).mockResolvedValue('0xraw1');
            (walletClient2.signTransaction as any).mockResolvedValue('0xraw2');
            (publicClient.sendRawTransaction as any)
                .mockResolvedValueOnce('0xhash1' as `0x${string}`)
                .mockResolvedValueOnce('0xhash2' as `0x${string}`);
            (publicClient.waitForTransactionReceipt as any)
                .mockResolvedValueOnce(makeReceipt('success', '0xhash1', mockAccount.address, txTarget))
                .mockResolvedValueOnce(makeReceipt('reverted', '0xhash2', secondAccount.address, txTarget));

            const txs: TxRequest[] = [
                {
                    address: txTarget,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: [secondAccount.address, 1000n],
                },
                {
                    address: txTarget,
                    abi: erc20Abi as unknown as any,
                    functionName: 'transfer',
                    args: [mockAccount.address, 2000n],
                },
            ];

            await expect(
                batchSendTxSilent(
                    publicClient as PublicClient,
                    [walletClient1 as WalletClient, walletClient2 as WalletClient],
                    txs
                )
            ).rejects.toThrow('Transaction reverted: 0xhash2');
        });
    });

    // ==========================================
    // TX REQUEST VALIDATION
    // ==========================================

    describe('TxRequest Validation', () => {
        test('should handle tx request with value', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'success',
                logs: [],
                cumulativeGasUsed: 21000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 21000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'deposit',
                args: [],
                value: 1000000000000000000n, // 1 ETH
            };

            const receipt = await sendTxSilent(
                mockPublicClient as PublicClient,
                mockWalletClient as WalletClient,
                txRequest
            );

            expect(receipt.status).toBe('success');
            expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: 1000000000000000000n,
                })
            );
        });

        test('should handle tx request with custom gas', async () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt: TransactionReceipt = {
                transactionHash: txHash,
                blockNumber: 12345n,
                status: 'success',
                logs: [],
                cumulativeGasUsed: 100000n,
                effectiveGasPrice: 1000000000n,
                gasUsed: 100000n,
                from: mockAccount.address,
                to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                contractAddress: null,
                logsBloom: '0x' as `0x${string}`,
                blockHash: '0xabcd' as `0x${string}`,
                transactionIndex: 0,
                type: 'eip1559',
            };

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (mockPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt);

            const txRequest: TxRequest = {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                abi: [],
                functionName: 'complexFunction',
                args: [],
                gas: 100000n,
            };

            const receipt = await sendTxSilent(
                mockPublicClient as PublicClient,
                mockWalletClient as WalletClient,
                txRequest
            );

            expect(receipt.status).toBe('success');
            expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
                expect.objectContaining({
                    gas: 100000n,
                })
            );
        });
    });

    describe('ChainKit.sendTx', () => {
        test('should send tx using kit public client', async () => {
            const txHash =
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
            const mockReceipt = makeReceipt('success', txHash, mockAccount.address, txTarget);

            const customPublicClient = createMockPublicClient();
            kit.publicClient = customPublicClient as PublicClient;

            (mockWalletClient.writeContract as any).mockResolvedValue(txHash);
            (customPublicClient.waitForTransactionReceipt as any).mockResolvedValue(mockReceipt as any);

            const txRequest: TxRequest = {
                address: txTarget,
                abi: [],
                functionName: 'transfer',
                args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1000n],
            };

            const receipt = await kit.sendTx(mockWalletClient as WalletClient, txRequest);

            expect(receipt.transactionHash).toBe(txHash);
            expect(mockWalletClient.writeContract).toHaveBeenCalled();
            expect(customPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: txHash });
        });
    });
});
