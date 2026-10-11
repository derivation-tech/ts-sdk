import { describe, expect, jest, test } from '@jest/globals';
import { createPublicClient, createWalletClient, custom, encodeDeployData, parseAbi } from 'viem';
import type { Address, Hash, TransactionReceipt } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { deployArtifact, deployBytecode } from '../../src/node';
import { TransactionReceiptError, TransactionRevertedError, TransactionSubmissionError } from '../../src/utils/tx';
import { LoggerFactory } from '../../src/utils/logger';

const sender = '0x0000000000000000000000000000000000000001' as Address;
const deployed = '0x0000000000000000000000000000000000000002' as Address;
const hash = `0x${'55'.repeat(32)}` as Hash;
const abi = parseAbi(['constructor(uint256 value)']);
const bytecode = '0x60006000';

function setup(status: 'success' | 'reverted' = 'success') {
    const transport = custom({
        request: async () => {
            throw new Error('Unexpected RPC');
        },
    });
    const publicClient = createPublicClient({ chain: mainnet, transport });
    const walletClient = createWalletClient({ chain: mainnet, account: sender, transport });
    const receipt: TransactionReceipt = {
        transactionHash: hash,
        blockHash: hash,
        blockNumber: 10n,
        transactionIndex: 0,
        from: sender,
        to: null,
        contractAddress: deployed,
        status,
        logs: [],
        logsBloom: '0x',
        cumulativeGasUsed: 21_000n,
        gasUsed: 21_000n,
        effectiveGasPrice: 1n,
        type: 'eip1559',
    };
    const send = jest.spyOn(walletClient, 'sendTransaction').mockResolvedValue(hash);
    const wait = jest.spyOn(publicClient, 'waitForTransactionReceipt').mockResolvedValue(receipt);
    return { publicClient, walletClient, send, wait, receipt };
}

describe('Node deployment helpers', () => {
    test('rejects invalid raw and preloaded artifact bytecode before submission', async () => {
        const { publicClient, walletClient, send } = setup();
        await expect(deployBytecode(publicClient, walletClient, { abi: [], bytecode: '0x60zz' })).rejects.toThrow(
            'hexadecimal bytes'
        );
        await expect(
            deployArtifact(publicClient, walletClient, { artifact: { abi: [], bytecode: '0x123' } })
        ).rejects.toThrow('hexadecimal bytes');
        expect(send).not.toHaveBeenCalled();
    });

    test('forwards constructor, gas, fee and wait overrides', async () => {
        const { publicClient, walletClient, send, wait } = setup();
        const transaction = { nonce: 7, gas: 100_000n, maxFeePerGas: 10n, maxPriorityFeePerGas: 2n };
        const result = await deployBytecode(publicClient, walletClient, {
            abi,
            bytecode,
            constructorArgs: [42n],
            transaction,
            wait: { timeout: 120_000, confirmations: 3 },
            silent: true,
        });
        expect(result).toBe(deployed);
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                ...transaction,
                to: null,
                data: encodeDeployData({ abi, bytecode, args: [42n] }),
                account: walletClient.account,
                chain: mainnet,
            })
        );
        expect(wait).toHaveBeenCalledWith(expect.objectContaining({ hash, timeout: 120_000, confirmations: 3 }));
    });

    test('rejects a known chain mismatch before deployment', async () => {
        const { publicClient } = setup();
        const wallet = createWalletClient({
            chain: sepolia,
            account: sender,
            transport: custom({ request: async () => undefined }),
        });
        const send = jest.spyOn(wallet, 'sendTransaction');
        await expect(deployBytecode(publicClient, wallet, { abi, bytecode, constructorArgs: [1n] })).rejects.toThrow(
            'Chain mismatch'
        );
        expect(send).not.toHaveBeenCalled();
    });

    test('retains reverted receipts and wait timeout evidence', async () => {
        const { publicClient, walletClient, receipt, wait } = setup('reverted');
        await expect(
            deployBytecode(publicClient, walletClient, { abi, bytecode, constructorArgs: [1n], silent: true })
        ).rejects.toBeInstanceOf(TransactionRevertedError);
        wait.mockRejectedValue(new Error('timed out'));
        const attempt = deployBytecode(publicClient, walletClient, {
            abi,
            bytecode,
            constructorArgs: [1n],
            silent: true,
        });
        await expect(attempt).rejects.toBeInstanceOf(TransactionReceiptError);
        await expect(attempt).rejects.toMatchObject({ hash: receipt.transactionHash });
    });

    test('retains encoded deployment data for unknown submission', async () => {
        const { publicClient, walletClient, send } = setup();
        const cause = new Error('connection lost');
        send.mockRejectedValue(cause);
        const result = deployBytecode(publicClient, walletClient, {
            abi,
            bytecode,
            constructorArgs: [42n],
            silent: true,
        });
        await expect(result).rejects.toBeInstanceOf(TransactionSubmissionError);
        await expect(result).rejects.toMatchObject({
            cause,
            request: { from: sender, chainId: 1, data: encodeDeployData({ abi, bytecode, args: [42n] }) },
        });
        expect(send).toHaveBeenCalledTimes(1);
    });

    test('keeps a successful artifact deployment independent of logger failures', async () => {
        const { publicClient, walletClient } = setup();
        const logger = jest.spyOn(LoggerFactory, 'getLogger').mockImplementation(() => {
            throw new Error('logger failed');
        });
        try {
            await expect(
                deployArtifact(publicClient, walletClient, {
                    artifact: { abi, bytecode, contractName: 'Example' },
                    constructorArgs: [42n],
                })
            ).resolves.toBe(deployed);
        } finally {
            logger.mockRestore();
        }
    });

    test('preserves the receipt when a deployment address is missing', async () => {
        const { publicClient, walletClient, receipt } = setup();
        receipt.contractAddress = null;
        await expect(
            deployBytecode(publicClient, walletClient, { abi, bytecode, constructorArgs: [1n], silent: true })
        ).rejects.toMatchObject({ cause: receipt });
    });
});
