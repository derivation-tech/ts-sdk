/**
 * ERC20 Utilities - Helper functions for ERC20 token operations
 *
 * Provides common ERC20 methods without repetitive boilerplate
 */

import type { PublicClient, WalletClient, Address, TransactionReceipt } from 'viem';
import type { ChainKit } from '../chain-kit';
import { sendTxWithLog, sendTxSilent } from '../utils/tx';
import { erc20Abi } from 'viem';

/**
 * Get ERC20 balance
 */
export async function balanceOf(publicClient: PublicClient, token: Address, account: Address): Promise<bigint> {
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account],
    })) as bigint;
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
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
    })) as bigint;
}

/**
 * Get ERC20 total supply
 */
export async function totalSupply(publicClient: PublicClient, token: Address): Promise<bigint> {
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'totalSupply',
    })) as bigint;
}

/**
 * Get ERC20 decimals
 */
export async function decimals(publicClient: PublicClient, token: Address): Promise<number> {
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'decimals',
    })) as number;
}

/**
 * Get ERC20 symbol
 */
export async function symbol(publicClient: PublicClient, token: Address): Promise<string> {
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'symbol',
    })) as string;
}

/**
 * Get ERC20 name
 */
export async function name(publicClient: PublicClient, token: Address): Promise<string> {
    return (await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'name',
    })) as string;
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
    return await sendTxWithLog(publicClient, walletClient, kit, {
        address: token,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amount],
    });
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
    return await sendTxSilent(publicClient, walletClient, {
        address: token,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amount],
    });
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
    return await sendTxWithLog(publicClient, walletClient, kit, {
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
    });
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
    return await sendTxWithLog(publicClient, walletClient, kit, {
        address: token,
        abi: erc20Abi,
        functionName: 'transferFrom',
        args: [from, to, amount],
    });
}

/**
 * Batch get balances for multiple accounts (auto-chunks for large arrays)
 */
export async function batchBalanceOf(
    publicClient: PublicClient,
    token: Address,
    accounts: Address[]
): Promise<bigint[]> {
    const CHUNK_SIZE = 500;
    const allResults: bigint[] = [];

    // Process in chunks to avoid gas limit / RPC timeout
    for (let i = 0; i < accounts.length; i += CHUNK_SIZE) {
        const chunk = accounts.slice(i, i + CHUNK_SIZE);

        const results = await publicClient.multicall({
            contracts: chunk.map((account) => ({
                address: token,
                abi: erc20Abi,
                functionName: 'balanceOf' as const,
                args: [account] as const,
            })),
            allowFailure: false,
        });

        allResults.push(...(results as bigint[]));
    }

    return allResults;
}
