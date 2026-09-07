import { erc20Abi, zeroAddress } from 'viem';
import { WETH_ABI } from '../../src/abis';
import { defineWriteRequest, type DefinedWriteRequest, type TypedWriteRequest } from '../../src/utils/tx';

const transfer = {
    address: zeroAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [zeroAddress, 1n],
} satisfies TypedWriteRequest<typeof erc20Abi, 'transfer'>;

const deposit = {
    address: zeroAddress,
    abi: WETH_ABI,
    functionName: 'deposit',
    value: 1n,
} satisfies TypedWriteRequest<typeof WETH_ABI, 'deposit'>;

const invalidTransfer = {
    address: zeroAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [zeroAddress, 1n],
    // @ts-expect-error ERC20 transfer is nonpayable.
    value: 1n,
} satisfies TypedWriteRequest<typeof erc20Abi, 'transfer'>;

const heterogeneousBatch = [
    defineWriteRequest(transfer),
    defineWriteRequest(deposit),
] satisfies readonly DefinedWriteRequest[];

const requestWithFees = defineWriteRequest({
    ...transfer,
    type: 'eip1559',
    gas: 50_000n,
    maxFeePerGas: 10n,
    maxPriorityFeePerGas: 1n,
});

const requestWithNonce = defineWriteRequest({
    ...transfer,
    // @ts-expect-error Batch nonce allocation is owned by viem-kit.
    nonce: 1,
});

const requestWithChainId = defineWriteRequest({
    ...transfer,
    // @ts-expect-error Batch chain selection is owned by the client context.
    chainId: 1,
});

void invalidTransfer;
void heterogeneousBatch;
void requestWithFees;
void requestWithNonce;
void requestWithChainId;
