import { keccak256 } from 'viem';
import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Account, Address, Hash, PublicClient, TransactionReceipt, WalletClient } from 'viem';
import {
    createPublicClient as createViemPublicClient,
    createWalletClient as createViemWalletClient,
    custom,
    encodeErrorResult,
    encodeFunctionData,
    parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { createParserRegistry } from '../src/parsers/registry';
import type { ContractParser, ParseTransactionInput, TxContext } from '../src/types';
import { batchSendLocalTransactions, defineWriteRequest, sendContractTransaction } from '../src/utils/tx';

const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
const receiverAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash;

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
    waitForTransactionReceipt: jest.Mock<() => Promise<TransactionReceipt>>;
    call: jest.Mock<() => Promise<never>>;
    getTransactionCount: jest.Mock<() => Promise<number>>;
    sendRawTransaction: jest.Mock<() => Promise<Hash>>;
};

type TestWalletClient = WalletClient & {
    sendTransaction: jest.Mock<() => Promise<Hash>>;
    prepareTransactionRequest: jest.Mock<() => Promise<{ to: Address }>>;
};

function mockTransport() {
    return custom({ request: async () => undefined });
}

function makeReceipt(status: 'success' | 'reverted', hash: Hash = txHash): TransactionReceipt {
    return {
        transactionHash: hash,
        blockNumber: 12345n,
        status,
        logs: [],
        cumulativeGasUsed: 21000n,
        effectiveGasPrice: 1_000_000_000n,
        gasUsed: 21000n,
        from: receiverAddress,
        to: tokenAddress,
        contractAddress: null,
        logsBloom: '0x',
        blockHash: '0xabcd',
        transactionIndex: 0,
        type: 'eip1559',
    };
}

function createTestPublicClient(): TestPublicClient {
    const client = createViemPublicClient({
        chain: mainnet,
        transport: mockTransport(),
    });
    return Object.assign(client, {
        waitForTransactionReceipt: jest.fn<() => Promise<TransactionReceipt>>(async () => makeReceipt('success')),
        call: jest.fn<() => Promise<never>>(),
        getTransactionCount: jest.fn<() => Promise<number>>(async () => 0),
        sendRawTransaction: jest.fn<() => Promise<Hash>>(async () => txHash),
    });
}

function createTestWalletClient(account: Account | Address | undefined = receiverAddress): TestWalletClient {
    const client = createViemWalletClient({
        account,
        chain: mainnet,
        transport: mockTransport(),
    });
    return Object.assign(client, {
        sendTransaction: jest.fn(async () => txHash),
        prepareTransactionRequest: jest.fn(async () => ({ to: tokenAddress })),
    });
}

function createContext(parser?: ContractParser<typeof erc20Abi>): {
    context: TxContext;
    publicClient: TestPublicClient;
    walletClient: TestWalletClient;
} {
    const publicClient = createTestPublicClient();
    const walletClient = createTestWalletClient();
    const registry = createParserRegistry();
    if (parser) registry.registerParser(tokenAddress, parser);
    const context: TxContext = {
        publicClient,
        walletClient,
        chain: mainnet,
        resolveParser: (address) => registry.resolveParser(address),
    };
    return { context, publicClient, walletClient };
}

describe('sendContractTransaction', () => {
    test('does not re-narrow registry parsers to the request ABI in the write path', () => {
        const source = readFileSync(resolve(__dirname, '../src/utils/tx/write.ts'), 'utf8');

        expect(source).not.toContain('as ContractParser<TAbi>');
        expect(source).not.toContain('context.resolveParser?.(request.address)?.parser as ContractParser<TAbi>');
    });

    test('typed write path preserves ABI args for parser invocation', async () => {
        const parseTransaction = jest.fn(async (request: ParseTransactionInput<typeof erc20Abi>) => {
            expect(request.functionName).toBe('transfer');
            expect(request.args).toEqual([receiverAddress, 123n]);
            return `transfer:${request.args[0]}:${request.args[1]}`;
        });
        const parser: ContractParser<typeof erc20Abi> = {
            abi: erc20Abi,
            parseTransaction,
        };
        const { context, walletClient } = createContext(parser);

        const sent = await sendContractTransaction(context, {
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [receiverAddress, 123n],
            account: receiverAddress,
        });
        const receipt = await sent.receipt;
        await sent.diagnostics;

        expect(sent.hash).toBe(txHash);
        expect(receipt.status).toBe('success');
        expect(parseTransaction).toHaveBeenCalledTimes(1);
        expect(walletClient.sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                to: tokenAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [receiverAddress, 123n],
                }),
            })
        );
    });

    test('uses parser carried by typed write request without registry lookup', async () => {
        const parseTransaction = jest.fn(async (request: ParseTransactionInput<typeof erc20Abi>) => {
            expect(request.functionName).toBe('transfer');
            expect(request.args).toEqual([receiverAddress, 123n]);
            return `direct-parser:${request.args[1]}`;
        });
        const parser: ContractParser<typeof erc20Abi> = {
            abi: erc20Abi,
            parseTransaction,
        };
        const { context } = createContext();

        const sent = await sendContractTransaction(context, {
            address: tokenAddress,
            abi: erc20Abi,
            parser,
            functionName: 'transfer',
            args: [receiverAddress, 123n],
            account: receiverAddress,
        });

        expect(sent.hash).toBe(txHash);
        expect(parseTransaction).toHaveBeenCalledTimes(1);
    });

    test('does not log send success or failure when silent is enabled', async () => {
        const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const { context, walletClient } = createContext({ abi: erc20Abi });

        try {
            await sendContractTransaction(
                context,
                {
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [receiverAddress, 1n],
                    account: receiverAddress,
                },
                { silent: true }
            );

            walletClient.sendTransaction.mockRejectedValueOnce(new Error('send failed'));
            await expect(
                sendContractTransaction(
                    context,
                    {
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'transfer',
                        args: [receiverAddress, 1n],
                        account: receiverAddress,
                    },
                    { silent: true }
                )
            ).rejects.toMatchObject({ outcome: 'unknown', cause: expect.objectContaining({ message: 'send failed' }) });

            expect(info).not.toHaveBeenCalled();
        } finally {
            info.mockRestore();
        }
    });

    test('decodes revert replay errors and reports hook', async () => {
        const revertData = encodeErrorResult({
            abi: parseAbi(['error Error(string)']),
            errorName: 'Error',
            args: ['bad transfer'],
        });
        const onReverted = jest.fn(() => undefined);
        const { context, publicClient } = createContext({ abi: erc20Abi });
        const waitForReceipt = publicClient.waitForTransactionReceipt;
        const call = publicClient.call;
        waitForReceipt.mockResolvedValueOnce(makeReceipt('reverted'));
        call.mockRejectedValueOnce({ data: revertData });

        const sent = await sendContractTransaction(
            context,
            {
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [receiverAddress, 1n],
                account: receiverAddress,
            },
            { hooks: { onReverted } }
        );
        const receipt = await sent.receipt;
        await sent.diagnostics;

        expect(receipt.status).toBe('reverted');
        expect(onReverted).toHaveBeenCalledWith(
            expect.objectContaining({
                hash: txHash,
                message: 'bad transfer',
            })
        );
    });
});

describe('batchSendLocalTransactions', () => {
    test('rejects non-local wallet accounts before preparing transactions', async () => {
        const publicClient = createTestPublicClient();
        const walletClient = createTestWalletClient('0x0000000000000000000000000000000000000001' as Address);

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
        ).rejects.toThrow('must use a local account');
    });

    test('signs and sends typed requests with local accounts', async () => {
        const publicClient = createTestPublicClient();
        const account = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001');
        const signTransaction = jest.spyOn(account, 'signTransaction').mockResolvedValue('0x01');
        const walletClient = createTestWalletClient(account);
        const prepare = walletClient.prepareTransactionRequest;
        const sendRaw = publicClient.sendRawTransaction;
        const signedHash = keccak256('0x01');
        sendRaw.mockResolvedValue(signedHash);
        publicClient.waitForTransactionReceipt.mockResolvedValue(makeReceipt('success', signedHash));

        const results = await batchSendLocalTransactions(
            publicClient,
            [walletClient],
            [
                defineWriteRequest({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [receiverAddress, 1n],
                    account: account.address,
                }),
            ]
        );

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ index: 0, hash: signedHash, receipt: { status: 'success' } });
        expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ nonce: 0, to: tokenAddress }));
        expect(signTransaction).toHaveBeenCalledTimes(1);
        expect(sendRaw).toHaveBeenCalledWith({ serializedTransaction: '0x01' });
    });
});
