import { describe, expect, jest, test } from '@jest/globals';
import type { Account, Address, Hash, PublicClient, WalletClient } from 'viem';
import {
    createPublicClient as createViemPublicClient,
    createWalletClient as createViemWalletClient,
    custom,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import type { TxContext } from '../../src/types';
import { sendContractTransaction } from '../../src/utils/tx';

const senderAddress = '0x0000000000000000000000000000000000000001' as Address;
const receiverAddress = '0x0000000000000000000000000000000000000002' as Address;
const tokenAddress = '0x0000000000000000000000000000000000000003' as Address;
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
    waitForTransactionReceipt: jest.Mock<PublicClient['waitForTransactionReceipt']>;
};

type TestWalletClient = WalletClient & {
    sendTransaction: jest.Mock<WalletClient['sendTransaction']>;
};

function mockTransport() {
    return custom({ request: async () => undefined });
}

function createContext(walletChain: typeof mainnet | typeof sepolia): {
    context: TxContext;
    walletClient: TestWalletClient;
} {
    const publicClient = Object.assign(
        createViemPublicClient({
            chain: mainnet,
            transport: mockTransport(),
        }),
        {
            waitForTransactionReceipt: jest.fn<PublicClient['waitForTransactionReceipt']>(async () => {
                return {
                    transactionHash: txHash,
                    blockNumber: 1n,
                    status: 'success',
                    logs: [],
                    cumulativeGasUsed: 21_000n,
                    effectiveGasPrice: 1n,
                    gasUsed: 21_000n,
                    from: senderAddress,
                    to: tokenAddress,
                    contractAddress: null,
                    logsBloom: '0x',
                    blockHash: txHash,
                    transactionIndex: 0,
                    type: 'eip1559',
                };
            }),
        }
    ) as TestPublicClient;
    const walletClient = Object.assign(
        createViemWalletClient({
            account: senderAddress as Account | Address,
            chain: walletChain,
            transport: mockTransport(),
        }),
        {
            sendTransaction: jest.fn<WalletClient['sendTransaction']>(async () => txHash),
        }
    ) as TestWalletClient;

    return {
        context: {
            publicClient,
            walletClient,
            chain: mainnet,
        },
        walletClient,
    };
}

const request = {
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [receiverAddress, 1n],
    account: senderAddress,
} as const;

describe('transaction execution context', () => {
    test('rejects a wallet chain mismatch before sending', async () => {
        const { context, walletClient } = createContext(sepolia);

        await expect(sendContractTransaction(context, request, { silent: true })).rejects.toThrow(
            'Chain mismatch: walletClient uses 11155111 but transaction uses 1'
        );
        expect(walletClient.sendTransaction).not.toHaveBeenCalled();
    });

    test('sends and resolves the receipt when every chain matches', async () => {
        const { context, walletClient } = createContext(mainnet);

        const sent = await sendContractTransaction(context, request, { silent: true });
        const receipt = await sent.receipt;

        expect(sent.hash).toBe(txHash);
        expect(receipt.status).toBe('success');
        expect(walletClient.sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ account: senderAddress, chain: mainnet })
        );
    });
});
