import type { TxLifecycleHooks } from '../../src/utils/tx';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
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
import { createParserRegistry } from '../../src/parsers/registry';
import type { ContractParser } from '../../src/types';
import { sendContractTransaction, TransactionReceiptError } from '../../src/utils/tx';

const sender = '0x0000000000000000000000000000000000000001' as Address;
const target = '0x0000000000000000000000000000000000000002' as Address;
const hash = '0x3333333333333333333333333333333333333333333333333333333333333333' as Hash;
const abi = parseAbi([
    'function setValue(uint256 value)',
    'event ValueSet(uint256 value)',
    'event Ping()',
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
        const parseEvent = jest.fn<NonNullable<ContractParser<typeof abi>['parseEvent']>>(async () => 'value:7');
        const parser: ContractParser<typeof abi> = { abi, parseEvent };
        const onEvent = jest.fn<NonNullable<TxLifecycleHooks['onEvent']>>(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onEvent },
        });
        await sent.receipt;
        await sent.diagnostics;

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
        const parseError = jest.fn<NonNullable<ContractParser<typeof abi>['parseError']>>(async () => 'rejected:7');
        const parser: ContractParser<typeof abi> = { abi, parseError };
        const onReverted = jest.fn<NonNullable<TxLifecycleHooks['onReverted']>>(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onReverted },
        });
        await sent.receipt;
        await sent.diagnostics;

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
        const onParseError = jest.fn<NonNullable<TxLifecycleHooks['onParseError']>>(() => undefined);

        const sent = await sendContractTransaction({ publicClient, walletClient, chain: mainnet }, request(parser), {
            silent: true,
            hooks: { onParseError },
        });

        await expect(sent.receipt).resolves.toBe(receipt);
        await sent.diagnostics;
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
        const onParseError = jest.fn<NonNullable<TxLifecycleHooks['onParseError']>>(() => undefined);
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
        await sent.diagnostics;
        expect(onParseError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'event' }));
    });
});

describe('diagnostic liveness', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    const eventLog: TransactionReceipt['logs'][number] = {
        address: target,
        topics: [encodeEventTopics({ abi, eventName: 'ValueSet' })[0]],
        data: encodeAbiParameters([{ type: 'uint256' }], [7n]),
        blockHash: hash,
        blockNumber: 10n,
        transactionHash: hash,
        transactionIndex: 0,
        logIndex: 0,
        removed: false,
    };

    test('returns the hash and receipt while a transaction parser never settles', async () => {
        const receipt = makeReceipt('success');
        const { publicClient, walletClient } = setup(receipt);
        const onSent = jest.fn<NonNullable<TxLifecycleHooks['onSent']>>(() => undefined);
        const onDescription = jest.fn<NonNullable<TxLifecycleHooks['onDescription']>>(() => undefined);
        const sent = await sendContractTransaction(
            { publicClient, walletClient },
            request({ abi, parseTransaction: () => new Promise(() => undefined) }),
            { silent: true, hooks: { onSent, onDescription } }
        );
        expect(sent.hash).toBe(hash);
        expect(onSent).toHaveBeenCalledWith({ hash });
        await expect(sent.receipt).resolves.toBe(receipt);
        let completed = false;
        void sent.diagnostics.then(() => {
            completed = true;
        });
        await jest.advanceTimersByTimeAsync(4_999);
        expect(completed).toBe(false);
        await jest.advanceTimersByTimeAsync(1);
        await expect(sent.diagnostics).resolves.toEqual({ transaction: 'timed-out', receipt: 'completed' });
        expect(onDescription).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    test.each(['event', 'error', 'replay'] as const)(
        'returns a receipt despite a pending %s diagnostic',
        async (kind) => {
            const receipt = makeReceipt(kind === 'event' ? 'success' : 'reverted', [eventLog]);
            const { publicClient, walletClient } = setup(receipt);
            const pending = () => new Promise<string>(() => undefined);
            const parser: ContractParser<typeof abi> = { abi, parseEvent: pending, parseError: pending };
            if (kind === 'replay')
                jest.spyOn(publicClient, 'call').mockImplementation(() => new Promise(() => undefined));
            else
                jest.spyOn(publicClient, 'call').mockRejectedValue({
                    data: encodeErrorResult({ abi, errorName: 'ValueRejected', args: [7n] }),
                });
            const onReverted = jest.fn<NonNullable<TxLifecycleHooks['onReverted']>>(() => undefined);
            const onEvent = jest.fn<NonNullable<TxLifecycleHooks['onEvent']>>(() => undefined);
            const sent = await sendContractTransaction({ publicClient, walletClient }, request(parser), {
                silent: true,
                diagnostics: { timeout: 25 },
                hooks: { onReverted, onEvent },
            });
            await expect(sent.receipt).resolves.toBe(receipt);
            await jest.advanceTimersByTimeAsync(25);
            await expect(sent.diagnostics).resolves.toEqual({ transaction: 'completed', receipt: 'timed-out' });
            expect(onEvent).not.toHaveBeenCalled();
            expect(onReverted).toHaveBeenCalledTimes(kind === 'event' ? 0 : 1);
            if (kind === 'error')
                expect(onReverted).toHaveBeenCalledWith(expect.objectContaining({ message: 'ValueRejected' }));
            expect(jest.getTimerCount()).toBe(0);
        }
    );

    test.each(['timeout', 'cancel'] as const)('suppresses late descriptions after %s', async (mode) => {
        const { publicClient, walletClient } = setup(makeReceipt('success'));
        let complete!: (description: string) => void;
        const description = new Promise<string>((resolve) => {
            complete = resolve;
        });
        const controller = new AbortController();
        const remove = jest.spyOn(controller.signal, 'removeEventListener');
        const onDescription = jest.fn<NonNullable<TxLifecycleHooks['onDescription']>>(() => undefined);
        const sent = await sendContractTransaction(
            { publicClient, walletClient },
            request({ abi, parseTransaction: () => description }),
            { silent: true, diagnostics: { timeout: 10, signal: controller.signal }, hooks: { onDescription } }
        );
        await sent.receipt;
        if (mode === 'cancel') controller.abort();
        else await jest.advanceTimersByTimeAsync(10);
        expect((await sent.diagnostics).transaction).toBe(mode === 'cancel' ? 'cancelled' : 'timed-out');
        complete('too late');
        await jest.advanceTimersByTimeAsync(0);
        expect(onDescription).not.toHaveBeenCalled();
        expect(remove).toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('suppresses a late event-parser rejection after cancellation', async () => {
        const { publicClient, walletClient } = setup(makeReceipt('success', [eventLog]));
        let reject!: (error: Error) => void;
        const parseEvent = jest.fn<NonNullable<ContractParser<typeof abi>['parseEvent']>>(
            () =>
                new Promise<string>((_resolve, fail) => {
                    reject = fail;
                })
        );
        const controller = new AbortController();
        const onParseError = jest.fn<NonNullable<TxLifecycleHooks['onParseError']>>(() => undefined);
        const sent = await sendContractTransaction({ publicClient, walletClient }, request({ abi, parseEvent }), {
            silent: true,
            diagnostics: { signal: controller.signal },
            hooks: { onParseError },
        });
        await sent.receipt;
        await jest.advanceTimersByTimeAsync(0);
        expect(parseEvent).toHaveBeenCalledTimes(1);
        controller.abort();
        expect((await sent.diagnostics).receipt).toBe('cancelled');
        reject(new Error('late rejection'));
        await jest.advanceTimersByTimeAsync(0);
        expect(onParseError).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('skips receipt parsing on a wait failure and resolves diagnostic completion', async () => {
        const { publicClient, walletClient } = setup(makeReceipt('success', [eventLog]));
        jest.spyOn(publicClient, 'waitForTransactionReceipt').mockRejectedValue(new Error('timeout'));
        const parseEvent = jest.fn<NonNullable<ContractParser<typeof abi>['parseEvent']>>(async () => 'event');
        const onDescription = jest.fn<NonNullable<TxLifecycleHooks['onDescription']>>(() => undefined);
        const sent = await sendContractTransaction(
            { publicClient, walletClient },
            request({ abi, parseEvent, parseTransaction: async () => 'admin call' }),
            { silent: true, hooks: { onDescription } }
        );
        await expect(sent.receipt).rejects.toBeInstanceOf(TransactionReceiptError);
        await expect(sent.diagnostics).resolves.toEqual({ transaction: 'completed', receipt: 'skipped' });
        expect(onDescription).toHaveBeenCalledWith({ hash, description: 'admin call' });
        expect(parseEvent).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });
});

describe('event decoding boundaries', () => {
    test.each(['request', 'registry'] as const)('delivers zero-argument events to the %s parser', async (source) => {
        const receipt = makeReceipt('success', [
            {
                address: target,
                topics: [encodeEventTopics({ abi, eventName: 'Ping' })[0]],
                data: '0x',
                blockHash: hash,
                blockNumber: 10n,
                transactionHash: hash,
                transactionIndex: 0,
                logIndex: 0,
                removed: false,
            },
        ]);
        const { publicClient, walletClient } = setup(receipt);
        const parseEvent = jest.fn<NonNullable<ContractParser<typeof abi>['parseEvent']>>(async () => 'ping');
        const parser: ContractParser<typeof abi> = { abi, parseEvent };
        const registry = createParserRegistry();
        registry.registerParser(target, parser);
        const onEvent = jest.fn<NonNullable<TxLifecycleHooks['onEvent']>>(() => undefined);
        const onParseError = jest.fn<NonNullable<TxLifecycleHooks['onParseError']>>(() => undefined);
        const sent = await sendContractTransaction(
            {
                publicClient,
                walletClient,
                resolveParser: source === 'registry' ? (address) => registry.resolveParser(address) : undefined,
            },
            { ...request(parser), parser: source === 'request' ? parser : undefined },
            { silent: true, hooks: { onEvent, onParseError } }
        );
        await sent.receipt;
        await sent.diagnostics;
        expect(parseEvent).toHaveBeenCalledWith({ eventName: 'Ping', args: [] });
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ description: 'ping' }));
        expect(onParseError).not.toHaveBeenCalled();
    });

    test('reports incomplete event data without invoking a parser with missing required arguments', async () => {
        const receipt = makeReceipt('success', [
            {
                address: target,
                topics: [encodeEventTopics({ abi, eventName: 'ValueSet' })[0]],
                data: '0x',
                blockHash: hash,
                blockNumber: 10n,
                transactionHash: hash,
                transactionIndex: 0,
                logIndex: 0,
                removed: false,
            },
        ]);
        const { publicClient, walletClient } = setup(receipt);
        const parseEvent = jest.fn<NonNullable<ContractParser<typeof abi>['parseEvent']>>(async () => 'invalid');
        const onParseError = jest.fn<NonNullable<TxLifecycleHooks['onParseError']>>(() => undefined);
        const sent = await sendContractTransaction({ publicClient, walletClient }, request({ abi, parseEvent }), {
            silent: true,
            hooks: { onParseError },
        });
        await expect(sent.receipt).resolves.toBe(receipt);
        await sent.diagnostics;
        expect(parseEvent).not.toHaveBeenCalled();
        expect(onParseError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'event' }));
    });
});
