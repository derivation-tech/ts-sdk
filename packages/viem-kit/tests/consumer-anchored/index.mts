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
    parseAbi,
    toHex,
} from 'viem';
import type { Address, Hash } from 'viem';
import {
    assertTransactionSuccess,
    ChainKit,
    createContractParser,
    sendContractTransaction,
    TransactionRevertedError,
    WRAPPED_NATIVE_TOKENS,
} from '@derivation-tech/viem-kit';
import type { TypedWriteRequest } from '@derivation-tech/viem-kit';
import { ArtifactHelper, getAccount } from '@derivation-tech/viem-kit/node';

// Signature and event shape from Anchored's AncFundController ABI at f9fd04e.
// Addresses and RPC responses below are synthetic; this fixture never uses a network transport.
const abi = parseAbi([
    'struct FundConfig { uint16 index; uint16 feeBps; address shareToken; uint64 subscriptionWindow; uint64 currentRedemptionSchedule; uint64 nextRedemptionSchedule; uint32 minSubscriptionUsd; uint32 minRedemptionWholeShares; uint8 flags; }',
    'function setFundMinSubscriptionUsd(uint16 fundId, uint32 minSubscriptionUsd)',
    'event FundConfigUpdated(uint16 indexed fundId, FundConfig config)',
]);
const sender = '0x0000000000000000000000000000000000000001' as Address;
const controller = '0x0000000000000000000000000000000000000002' as Address;
const token = '0x0000000000000000000000000000000000000003' as Address;
const hash = `0x${'11'.repeat(32)}` as Hash;
const chain = defineChain({
    id: 46630,
    name: 'Anchored fixture',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://unused.invalid'] } },
});
const config = {
    index: 7,
    feeBps: 0,
    shareToken: token,
    subscriptionWindow: 0n,
    currentRedemptionSchedule: 0n,
    nextRedemptionSchedule: 0n,
    minSubscriptionUsd: 1_000,
    minRedemptionWholeShares: 0,
    flags: 0,
};
const event = getAbiItem({ abi, name: 'FundConfigUpdated' });
const log = {
    address: controller,
    topics: encodeEventTopics({ abi, eventName: 'FundConfigUpdated', args: { fundId: 7 } }),
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
                to: controller,
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
kit.registerAddressName(controller, 'FundController');
kit.registerErc20Token({ address: token, symbol: 'FUND', name: 'Fund share', decimals: 18 });
const descriptions: string[] = [];
kit.registerParser(
    controller,
    createContractParser({
        abi,
        transactions: {
            setFundMinSubscriptionUsd: ({ args }) =>
                `${kit.getAddressName(controller)}: fund ${args[0]} minimum ${args[1]}`,
        },
        events: {
            FundConfigUpdated: ({ args }) => `fund ${args.fundId} minimum ${args.config.minSubscriptionUsd}`,
        },
    })
);
const request = {
    address: controller,
    abi,
    functionName: 'setFundMinSubscriptionUsd',
    args: [7, 1_000],
    gas: 100_000n,
    nonce: 7,
    maxFeePerGas: 10n,
    maxPriorityFeePerGas: 2n,
} satisfies TypedWriteRequest<typeof abi, 'setFundMinSubscriptionUsd'>;
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
assert.deepEqual(descriptions, ['FundController: fund 7 minimum 1000', 'fund 7 minimum 1000']);
assert.equal(kit.wrappedNativeTokenInfo, undefined);
assert.equal(WRAPPED_NATIVE_TOKENS[chain.id], builtIn);
assert.equal(kit.parseErc20Amount('1.25', 'FUND'), 1_250_000_000_000_000_000n);

reverted = true;
await assert.rejects(
    async () => assertTransactionSuccess(await kit.sendTx(walletClient, request, options)),
    TransactionRevertedError
);
assert.equal(transactions.length, 2);
assert.deepEqual(ArtifactHelper.loadABI(JSON.stringify(abi)), abi);
await assert.rejects(getAccount(kit, 'ledger'), /not installed/);

function checkInvalidArgs() {
    const invalid = {
        ...request,
        // @ts-expect-error uint32 is a number, not an unchecked string.
        args: [7, '1000'],
    } satisfies TypedWriteRequest<typeof abi, 'setFundMinSubscriptionUsd'>;
    void invalid;
}
void checkInvalidArgs;
console.log(
    'Anchored packed ESM consumer: typed admin call, fees, parser, revert assertion and optional Ledger passed'
);
