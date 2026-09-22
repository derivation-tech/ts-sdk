import assert from 'node:assert/strict';
import {
    createPublicClient,
    createWalletClient,
    custom,
    defineChain,
    encodeAbiParameters,
    encodeEventTopics,
    encodeFunctionData,
    getAbiItem,
    keccak256,
    parseAbi,
    toHex,
} from 'viem';
import type { Address, Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
    assertTransactionSuccess,
    ChainKit,
    LoggerFactory,
    createContractParser,
    sendContractTransaction,
    TransactionRevertedError,
    TransactionSubmissionError,
    WRAPPED_NATIVE_TOKENS,
} from '@derivation-tech/viem-kit';
import type { TypedWriteRequest } from '@derivation-tech/viem-kit';
import * as utils from '@derivation-tech/viem-kit/utils';
import { ArtifactHelper, deployBytecode, getAccount } from '@derivation-tech/viem-kit/node';

// @ts-expect-error Receipt diagnosis is internal; consumers await sent.diagnostics.
assert.equal(utils.diagnoseReceipt, undefined);
// @ts-expect-error Receipt waiting uses sent.receipt or waitForTransactionOutcome.
assert.equal(utils.waitForParsedReceipt, undefined);

assert.equal(TransactionRevertedError, utils.TransactionRevertedError);
assert.equal(LoggerFactory, utils.LoggerFactory);
const logger = { debug() {}, info() {}, warn() {}, error() {} };
LoggerFactory.setLogger('consumer', logger);
assert.equal(utils.LoggerFactory.getLogger('consumer'), logger);
LoggerFactory.clear();

// Generic contract with narrow integers and tuple events exercises ABI inference.
// All addresses, chain metadata and RPC responses are synthetic and remain offline.
const abi = parseAbi([
    'struct LimitConfig { uint16 key; uint8 flags; address asset; uint64 duration; uint32 limit; uint256 quota; }',
    'function setLimit(uint16 key, uint32 limit)',
    'event LimitUpdated(uint16 indexed key, LimitConfig config)',
]);
const sender = '0x0000000000000000000000000000000000000001' as Address;
const target = '0x0000000000000000000000000000000000000002' as Address;
const token = '0x0000000000000000000000000000000000000003' as Address;
const hash = `0x${'11'.repeat(32)}` as Hash;
const chain = defineChain({
    id: 999_999,
    name: 'Consumer fixture',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://unused.invalid'] } },
});
const config = {
    key: 7,
    flags: 0,
    asset: token,
    duration: 60n,
    limit: 1_000,
    quota: 10_000n,
};
const event = getAbiItem({ abi, name: 'LimitUpdated' });
const log = {
    address: target,
    topics: encodeEventTopics({ abi, eventName: 'LimitUpdated', args: { key: 7 } }),
    data: encodeAbiParameters([event.inputs[1]], [config]),
    blockHash: hash,
    blockNumber: '0xa',
    transactionHash: hash,
    transactionIndex: '0x0',
    logIndex: '0x0',
    removed: false,
};
let reverted = false;
const transactions: Record<string, unknown>[] = [];
const transport = custom({
    async request({ method, params }) {
        if (method === 'eth_chainId') return toHex(chain.id);
        if (method === 'eth_sendTransaction') {
            const [transaction] = params as readonly unknown[];
            assert(transaction && typeof transaction === 'object');
            transactions.push(transaction as Record<string, unknown>);
            return hash;
        }
        if (method === 'eth_getTransactionReceipt')
            return {
                transactionHash: hash,
                blockHash: hash,
                blockNumber: '0xa',
                transactionIndex: '0x0',
                from: sender,
                to: target,
                contractAddress: null,
                status: reverted ? '0x0' : '0x1',
                cumulativeGasUsed: '0x5208',
                gasUsed: '0x5208',
                effectiveGasPrice: '0x1',
                logs: reverted ? [] : [log],
                logsBloom: `0x${'00'.repeat(256)}`,
                type: '0x2',
            };
        if (method === 'eth_call' && reverted) throw new Error('execution reverted');
        throw new Error(`Unexpected mock RPC: ${method}`);
    },
});
const publicClient = createPublicClient({ chain, transport, cacheTime: 0 });
const walletClient = createWalletClient({ chain, account: sender, transport });
const builtIn = WRAPPED_NATIVE_TOKENS[chain.id];
const kit = new ChainKit(chain, { publicClient, wrappedNativeToken: null });
kit.registerAddressName(target, 'LimitController');
kit.registerErc20Token({ address: token, symbol: 'TEST', name: 'Test token', decimals: 18 });
const descriptions: string[] = [];
kit.registerParser(
    target,
    createContractParser({
        abi,
        transactions: {
            setLimit: ({ args }) => `${kit.getAddressName(target)}: key ${args[0]} limit ${args[1]}`,
        },
        events: {
            LimitUpdated: ({ args }) => `key ${args.key} limit ${args.config.limit}`,
        },
    })
);
const request = {
    address: target,
    abi,
    functionName: 'setLimit',
    args: [7, 1_000],
    gas: 100_000n,
    nonce: 7,
    maxFeePerGas: 10n,
    maxPriorityFeePerGas: 2n,
} satisfies TypedWriteRequest<typeof abi, 'setLimit'>;
const options = {
    silent: true,
    wait: { confirmations: 1, timeout: 120_000, pollingInterval: 1 },
    hooks: {
        onDescription: ({ description }: { description: string }) => {
            descriptions.push(description);
        },
        onEvent: ({ description }: { description: string }) => {
            descriptions.push(description);
        },
    },
};
const sent = await sendContractTransaction(
    { publicClient, walletClient, chain, resolveParser: (address) => kit.resolveParser(address) },
    request,
    options
);
const receipt = assertTransactionSuccess(await sent.receipt);
assert.deepEqual(await sent.diagnostics, { transaction: 'completed', receipt: 'completed' });
assert.equal(receipt.transactionHash, hash);
assert.equal(transactions.length, 1);
assert.equal(transactions[0].data, encodeFunctionData(request));
assert.equal(transactions[0].maxFeePerGas, '0xa');
assert.equal(transactions[0].maxPriorityFeePerGas, '0x2');
assert.equal(transactions[0].gas, toHex(100_000n));
assert.equal(transactions[0].nonce, '0x7');
assert.deepEqual(descriptions, ['LimitController: key 7 limit 1000', 'key 7 limit 1000']);
assert.equal(kit.wrappedNativeTokenInfo, undefined);
assert.equal(WRAPPED_NATIVE_TOKENS[chain.id], builtIn);
assert.equal(kit.parseErc20Amount('1.25', 'TEST'), 1_250_000_000_000_000_000n);

reverted = true;
await assert.rejects(
    async () => assertTransactionSuccess(await kit.sendTx(walletClient, request, options)),
    TransactionRevertedError
);
assert.equal(transactions.length, 2);
await assert.rejects(
    deployBytecode(publicClient, walletClient, { abi: [], bytecode: '0x6000', silent: true, confirmations: 1 }),
    TransactionRevertedError
);
assert.deepEqual(ArtifactHelper.loadABI(JSON.stringify(abi)), abi);
await assert.rejects(getAccount(kit, 'ledger'), /not installed/);

// Exercise native local-account stages against whichever viem peer is installed.
for (const failure of ['prepare', 'send'] as const) {
    const rawTransactions: Hash[] = [];
    const localTransport = custom(
        {
            async request({ method, params }) {
                if (method === 'eth_fillTransaction') throw { code: -32601, message: 'Method not found' };
                if (method === 'eth_estimateGas') {
                    if (failure === 'prepare') throw { code: 3, message: 'execution reverted', data: '0x' };
                    return '0x10000';
                }
                if (method === 'eth_sendRawTransaction') {
                    rawTransactions.push((params as [Hash])[0]);
                    throw new Error('response lost after acceptance');
                }
                throw new Error(`Unexpected local RPC: ${method}`);
            },
        },
        { retryCount: 0 }
    );
    const localAccount = privateKeyToAccount(`0x${'01'.padStart(64, '0')}`);
    const localWallet = createWalletClient({ chain, account: localAccount, transport: localTransport });
    const localPublic = createPublicClient({ chain, transport: localTransport });
    await assert.rejects(
        sendContractTransaction(
            { publicClient: localPublic, walletClient: localWallet },
            {
                address: target,
                abi,
                functionName: 'setLimit',
                args: [7, 1_000],
                nonce: 7,
                type: 'legacy',
                gasPrice: 1n,
            },
            { silent: true }
        ),
        (error: unknown) => {
            assert.ok(error instanceof TransactionSubmissionError);
            assert.equal(error.phase, failure);
            assert.equal(error.outcome, failure === 'prepare' ? 'not-sent' : 'unknown');
            assert.equal(error.request.nonce, 7);
            assert.equal(error.hash, rawTransactions[0] ? keccak256(rawTransactions[0]) : undefined);
            return true;
        }
    );
    assert.equal(rawTransactions.length, failure === 'prepare' ? 0 : 1);
}

function checkInvalidArgs() {
    const invalid = {
        ...request,
        // @ts-expect-error uint32 is a number, not an unchecked string.
        args: [7, '1000'],
    } satisfies TypedWriteRequest<typeof abi, 'setLimit'>;
    void invalid;
}
void checkInvalidArgs;
console.log('Packed ESM consumer: typed contract call, fees, parser, revert assertion and optional Ledger passed');
