/**
 * ERC20 Utilities - Helper functions for ERC20 token operations
 *
 * Provides common ERC20 methods without repetitive boilerplate
 */

import type { PublicClient, WalletClient, Address, TransactionReceipt } from 'viem';
import type { ChainKit } from '../chain-kit';
import { assertTransactionSuccess, sendContractTransaction } from '../utils/tx';
import { erc20Abi } from 'viem';
import { getErc20Balances } from './multicall';
import { kitTxContext } from './tx-context';

/**
 * Get ERC20 balance
 */
export async function balanceOf(publicClient: PublicClient, token: Address, account: Address): Promise<bigint> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account],
    });
}

/**
 * Get ERC20 allowance
 */
export async function allowanceOf(
    publicClient: PublicClient,
    token: Address,
    owner: Address,
    spender: Address
): Promise<bigint> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
    });
}

/**
 * Get ERC20 total supply
 */
export async function totalSupply(publicClient: PublicClient, token: Address): Promise<bigint> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'totalSupply',
    });
}

/**
 * Get ERC20 decimals
 */
export async function decimals(publicClient: PublicClient, token: Address): Promise<number> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'decimals',
    });
}

/**
 * Get ERC20 symbol
 */
export async function symbol(publicClient: PublicClient, token: Address): Promise<string> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'symbol',
    });
}

/**
 * Get ERC20 name
 */
export async function name(publicClient: PublicClient, token: Address): Promise<string> {
    return publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'name',
    });
}

/**
 * Transfer ERC20 tokens (with logging)
 */
export async function transfer(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    token: Address,
    to: Address,
    amount: bigint
): Promise<TransactionReceipt> {
    const sent = await sendContractTransaction(kitTxContext(publicClient, walletClient, kit), {
        address: token,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amount],
    });
    return sent.receipt;
}

/**
 * Transfer ERC20 tokens (silent, no logging)
 */
export async function transferSilent(
    publicClient: PublicClient,
    walletClient: WalletClient,
    token: Address,
    to: Address,
    amount: bigint
): Promise<TransactionReceipt> {
    const sent = await sendContractTransaction(
        { publicClient, walletClient },
        {
            address: token,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [to, amount],
        },
        { silent: true }
    );
    return assertTransactionSuccess(await sent.receipt);
}

/**
 * Approve ERC20 spending (with logging)
 */
export async function approve(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    token: Address,
    spender: Address,
    amount: bigint
): Promise<TransactionReceipt> {
    const sent = await sendContractTransaction(kitTxContext(publicClient, walletClient, kit), {
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
    });
    return sent.receipt;
}

/**
 * TransferFrom ERC20 tokens (with logging)
 */
export async function transferFrom(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    token: Address,
    from: Address,
    to: Address,
    amount: bigint
): Promise<TransactionReceipt> {
    const sent = await sendContractTransaction(kitTxContext(publicClient, walletClient, kit), {
        address: token,
        abi: erc20Abi,
        functionName: 'transferFrom',
        args: [from, to, amount],
    });
    return sent.receipt;
}

/**
 * Batch get balances for multiple accounts (auto-chunks for large arrays)
 */
export async function batchBalanceOf(
    publicClient: PublicClient,
    token: Address,
    accounts: Address[]
): Promise<bigint[]> {
    return getErc20Balances(publicClient, token, accounts);
}
