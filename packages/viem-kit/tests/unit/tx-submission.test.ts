import { describe, expect, jest, test } from '@jest/globals';
import {
    createNonceManager,
    createPublicClient,
    createWalletClient,
    concatHex,
    custom,
    encodeDeployData,
    encodeFunctionData,
    fromRlp,
    keccak256,
    parseAbi,
    parseTransaction,
    serializeTransaction,
    toRlp,
} from 'viem';
import type { Address, Chain, Hex, TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { deployBytecode } from '../../src/node';
import {
    batchSendLocalTransactions,
    defineWriteRequest,
    sendContractTransaction,
    TransactionSubmissionError,
} from '../../src/utils/tx';

const target = '0x0000000000000000000000000000000000000002' as Address;
const abi = parseAbi(['function setValue(uint256 value)']);
const request = {
    address: target,
    abi,
    functionName: 'setValue',
    args: [7n],
    type: 'legacy',
    gasPrice: 1n,
    nonce: 7,
} as const;

function setup(mode: 'success' | 'prepare' | 'send' | 'wrong-hash' = 'success', chain: Chain = mainnet) {
    const account = privateKeyToAccount(`0x${'01'.padStart(64, '0')}`);
    const sign = jest.spyOn(account, 'signTransaction');
    const broadcasts: Hex[] = [];
    const methods: string[] = [];
    const transport = custom(
        {
            async request({ method, params }) {
                methods.push(method);
                if (method === 'eth_fillTransaction') throw { code: -32601, message: 'Method not found' };
                if (method === 'eth_chainId') return '0x1';
                if (method === 'eth_getTransactionCount') return '0x7';
                if (method === 'eth_estimateGas') {
                    if (mode === 'prepare') throw { code: 3, message: 'execution reverted', data: '0x' };
                    return '0x10000';
                }
                if (method === 'eth_sendRawTransaction') {
                    const raw = (params as [Hex])[0];
                    broadcasts.push(raw);
                    if (mode === 'send') throw new Error('response lost after acceptance');
                    return mode === 'wrong-hash' ? `0x${'ff'.repeat(32)}` : keccak256(raw);
                }
                throw new Error(`Unexpected RPC method: ${method}`);
            },
        },
        { retryCount: 0 }
    );
    const walletClient = createWalletClient({ chain, account, transport });
    const publicClient = createPublicClient({ chain, transport });
    const wait = jest.spyOn(publicClient, 'waitForTransactionReceipt').mockImplementation(
        async ({ hash }) =>
            ({
                transactionHash: hash,
                blockHash: hash,
                blockNumber: 10n,
                transactionIndex: 0,
                from: account.address,
                to: target,
                contractAddress: target,
                status: 'success',
                logs: [],
                logsBloom: '0x',
                cumulativeGasUsed: 21_000n,
                gasUsed: 21_000n,
                effectiveGasPrice: 1n,
                type: 'legacy',
            }) satisfies TransactionReceipt
    );
    return { publicClient, walletClient, account, sign, broadcasts, methods, wait };
}

describe('native viem submission evidence', () => {
    test('identifies a gas-estimation revert before signing or broadcast', async () => {
        const context = setup('prepare');
        const result = sendContractTransaction(context, request, { silent: true });
        await expect(result).rejects.toBeInstanceOf(TransactionSubmissionError);
        await expect(result).rejects.toMatchObject({
            phase: 'prepare',
            outcome: 'not-sent',
            hash: undefined,
            request: { from: context.account.address, to: target, nonce: 7, data: encodeFunctionData(request) },
            cause: expect.any(Error),
        });
        expect(context.methods).toContain('eth_estimateGas');
        expect(context.sign).not.toHaveBeenCalled();
        expect(context.broadcasts).toHaveLength(0);
        expect(context.wait).not.toHaveBeenCalled();
    });

    test('identifies signing refusal and retains the prepared nonce', async () => {
        const context = setup();
        context.sign.mockRejectedValueOnce(new Error('signing refused'));
        const result = sendContractTransaction(context, { ...request, nonce: undefined }, { silent: true });
        await expect(result).rejects.toMatchObject({
            phase: 'sign',
            outcome: 'not-sent',
            hash: undefined,
            request: { nonce: 7, chainId: 1 },
        });
        expect(context.sign).toHaveBeenCalledTimes(1);
        expect(context.methods).toContain('eth_getTransactionCount');
        expect(context.broadcasts).toHaveLength(0);
    });

    test.each(['send', 'wrong-hash'] as const)(
        'preserves signed evidence after %s failure without retrying',
        async (mode) => {
            const context = setup(mode);
            const result = sendContractTransaction(context, request, { silent: true });
            await expect(result).rejects.toBeInstanceOf(TransactionSubmissionError);
            expect(context.broadcasts).toHaveLength(1);
            await expect(result).rejects.toMatchObject({
                phase: 'send',
                outcome: 'unknown',
                hash: keccak256(context.broadcasts[0]),
                request: { nonce: 7, from: context.account.address, to: target, data: encodeFunctionData(request) },
            });
            expect(context.sign).toHaveBeenCalledTimes(1);
            expect(context.wait).not.toHaveBeenCalled();
        }
    );

    test('preserves viem serialization, fees, suffix and an explicit nonce on success', async () => {
        const context = setup();
        const sendMethod = context.walletClient.sendTransaction;
        const prepareMethod = context.walletClient.prepareTransactionRequest;
        const sent = await sendContractTransaction(
            context,
            { ...request, nonce: 42, dataSuffix: '0xdeadbeef' },
            { silent: true }
        );
        await sent.receipt;
        await sent.diagnostics;
        expect(sent.hash).toBe(keccak256(context.broadcasts[0]));
        expect(parseTransaction(context.broadcasts[0])).toMatchObject({
            chainId: 1,
            nonce: 42,
            gas: 65_536n,
            gasPrice: 1n,
            to: target,
            data: `${encodeFunctionData(request)}deadbeef`,
        });
        expect(context.walletClient.sendTransaction).toBe(sendMethod);
        expect(context.walletClient.prepareTransactionRequest).toBe(prepareMethod);
        expect(context.account.signTransaction).toBe(context.sign);
    });

    test('preserves the local account nonce manager during preparation', async () => {
        const context = setup();
        const get = jest.fn(async () => 11);
        context.account.nonceManager = createNonceManager({ source: { get, set: () => undefined } });
        const sent = await sendContractTransaction(context, { ...request, nonce: undefined }, { silent: true });
        await sent.receipt;
        await sent.diagnostics;
        expect(parseTransaction(context.broadcasts[0]).nonce).toBe(11);
        expect(get).toHaveBeenCalledTimes(1);
        expect(context.methods).not.toContain('eth_getTransactionCount');
    });

    test('retains a custom serializer without assuming its transaction hash algorithm', async () => {
        const serializer = jest.fn(serializeTransaction);
        const context = setup('send', { ...mainnet, serializers: { transaction: serializer } });
        const result = sendContractTransaction(context, request, { silent: true });
        await expect(result).rejects.toMatchObject({
            phase: 'send',
            outcome: 'unknown',
            hash: undefined,
            request: { nonce: 7 },
        });
        expect(serializer).toHaveBeenCalled();
        expect(context.sign).toHaveBeenCalledTimes(1);
        expect(context.broadcasts).toHaveLength(1);
    });

    test('retains a chain transaction envelope without assuming the broadcast bytes are the hash', async () => {
        const transactionEnvelope = jest.fn(async ({ serializedTransaction }: { serializedTransaction: Hex }) =>
            concatHex(['0x7e', serializedTransaction])
        );
        const context = setup('send', { ...mainnet, serializers: { transactionEnvelope } } as Chain);
        const result = sendContractTransaction(context, request, { silent: true });
        await expect(result).rejects.toMatchObject({ phase: 'send', outcome: 'unknown', hash: undefined });
        expect(transactionEnvelope).toHaveBeenCalled();
        expect(context.broadcasts[0].startsWith('0x7e')).toBe(true);
    });

    test('does not hash EIP-4844 network payloads locally', async () => {
        const context = setup('send');
        const body = serializeTransaction(
            {
                type: 'eip4844',
                chainId: 1,
                nonce: 7,
                gas: 65_536n,
                to: target,
                maxFeePerGas: 10n,
                maxPriorityFeePerGas: 1n,
                maxFeePerBlobGas: 1n,
                blobVersionedHashes: [`0x01${'00'.repeat(31)}`],
            },
            { r: '0x01', s: '0x02', yParity: 0 }
        );
        const networkPayload = concatHex([
            '0x03',
            toRlp([fromRlp(`0x${body.slice(4)}`, 'hex'), ['0x1234'], ['0x5678'], ['0x9abc']]),
        ]);
        context.sign.mockResolvedValueOnce(networkPayload);
        const result = sendContractTransaction(context, request, { silent: true });
        await expect(result).rejects.toMatchObject({ phase: 'send', outcome: 'unknown', hash: undefined });
        expect(context.broadcasts).toEqual([networkPayload]);
    });

    test('classifies a JSON-RPC wallet rejection as not sent', async () => {
        const account = '0x0000000000000000000000000000000000000001' as Address;
        const transport = custom(
            {
                async request({ method }) {
                    if (method === 'eth_chainId') return '0x1';
                    if (method === 'eth_sendTransaction') throw { code: 4001, message: 'User rejected the request.' };
                    throw new Error(`Unexpected RPC method: ${method}`);
                },
            },
            { retryCount: 0 }
        );
        const walletClient = createWalletClient({ chain: mainnet, account, transport });
        const publicClient = createPublicClient({ chain: mainnet, transport });
        const result = sendContractTransaction({ publicClient, walletClient }, request, { silent: true });
        await expect(result).rejects.toMatchObject({ phase: 'sign', outcome: 'not-sent', hash: undefined });
    });

    test('treats other JSON-RPC wallet failures as unknown', async () => {
        const account = '0x0000000000000000000000000000000000000001' as Address;
        const transport = custom(
            {
                async request({ method }) {
                    if (method === 'eth_chainId') return '0x1';
                    if (method === 'eth_sendTransaction') throw new Error('connection closed');
                    throw new Error(`Unexpected RPC method: ${method}`);
                },
            },
            { retryCount: 0 }
        );
        const walletClient = createWalletClient({ chain: mainnet, account, transport });
        const publicClient = createPublicClient({ chain: mainnet, transport });
        const result = sendContractTransaction({ publicClient, walletClient }, request, { silent: true });
        await expect(result).rejects.toMatchObject({ phase: 'send', outcome: 'unknown' });
    });
});

describe('submission evidence across entry points', () => {
    const deployAbi = parseAbi(['constructor(uint256 value)']);
    const bytecode = '0x60006000';

    test.each(['prepare', 'send'] as const)('deployment retains %s evidence', async (phase) => {
        const context = setup(phase);
        const result = deployBytecode(context.publicClient, context.walletClient, {
            abi: deployAbi,
            bytecode,
            constructorArgs: [7n],
            transaction: { gasPrice: 1n, nonce: 7 },
            silent: true,
        });
        await expect(result).rejects.toBeInstanceOf(TransactionSubmissionError);
        await expect(result).rejects.toMatchObject({
            phase,
            outcome: phase === 'prepare' ? 'not-sent' : 'unknown',
            request: {
                from: context.account.address,
                to: undefined,
                data: encodeDeployData({ abi: deployAbi, bytecode, args: [7n] }),
                nonce: 7,
            },
        });
        expect(context.broadcasts).toHaveLength(phase === 'prepare' ? 0 : 1);
        if (phase === 'send') await expect(result).rejects.toMatchObject({ hash: keccak256(context.broadcasts[0]) });
    });

    test.each(['prepare', 'send'] as const)('batch retains the shared %s error and progress', async (phase) => {
        const context = setup(phase);
        const result = batchSendLocalTransactions(context.publicClient, [
            { walletClient: context.walletClient, request: defineWriteRequest({ ...request, nonce: undefined }) },
        ]);
        await expect(result).rejects.toMatchObject({
            phase,
            index: 0,
            cause: expect.any(TransactionSubmissionError),
            progress: [{ index: 0, nonce: 7, submission: phase === 'prepare' ? 'not-sent' : 'unknown' }],
        });
        await expect(result).rejects.toMatchObject({
            cause: { phase, request: { nonce: 7, data: encodeFunctionData(request) } },
        });
        expect(context.broadcasts).toHaveLength(phase === 'prepare' ? 0 : 1);
        if (phase === 'send')
            await expect(result).rejects.toMatchObject({
                progress: [{ hash: keccak256(context.broadcasts[0]) }],
                cause: { hash: keccak256(context.broadcasts[0]) },
            });
    });
});
