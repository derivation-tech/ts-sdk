import type { Address, PublicClient } from 'viem';
import { erc20Abi } from 'viem';
import { MULTICALL3_ABI } from '../abis';

function assertBatchSize(batchSize: number): void {
    if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
        throw new RangeError('batchSize must be a positive safe integer');
    }
}

/** Query native balances in order. A failed call rejects instead of reporting a zero balance. */
export async function getNativeBalances(
    publicClient: PublicClient,
    addresses: Address[],
    batchSize = 500
): Promise<bigint[]> {
    assertBatchSize(batchSize);
    if (addresses.length === 0) return [];
    const multicallAddress = publicClient.chain?.contracts?.multicall3?.address;
    if (!multicallAddress) throw new Error('Native balance queries require a configured multicall3 address');
    const results: bigint[] = [];
    for (let i = 0; i < addresses.length; i += batchSize) {
        const balances = await publicClient.multicall({
            contracts: addresses.slice(i, i + batchSize).map((address) => ({
                address: multicallAddress,
                abi: MULTICALL3_ABI,
                functionName: 'getEthBalance' as const,
                args: [address],
            })),
            allowFailure: false,
        });
        results.push(...(balances as bigint[]));
    }
    return results;
}

/** Query ERC20 balances in order. A failed call rejects instead of reporting a zero balance. */
export async function getErc20Balances(
    publicClient: PublicClient,
    tokenAddress: Address,
    addresses: Address[],
    batchSize = 500
): Promise<bigint[]> {
    assertBatchSize(batchSize);
    const results: bigint[] = [];
    for (let i = 0; i < addresses.length; i += batchSize) {
        const balances = await publicClient.multicall({
            contracts: addresses.slice(i, i + batchSize).map((address) => ({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'balanceOf' as const,
                args: [address],
            })),
            allowFailure: false,
        });
        results.push(...balances);
    }
    return results;
}

/**
 * Query multiple ERC20 token balances for multiple addresses using multicall with batching
 * @param publicClient - The viem public client
 * @param tokenAddresses - Array of ERC20 token contract addresses
 * @param addresses - Array of addresses to query
 * @param batchSize - Number of addresses to query per batch (default: 500)
 * @returns 2D array of balances [tokenIndex][addressIndex]
 */
export async function getMultipleErc20Balances(
    publicClient: PublicClient,
    tokenAddresses: Address[],
    addresses: Address[],
    batchSize: number = 500
): Promise<bigint[][]> {
    assertBatchSize(batchSize);
    // Query each token in parallel with batching
    const promises = tokenAddresses.map(async (tokenAddress) => {
        return getErc20Balances(publicClient, tokenAddress, addresses, batchSize);
    });

    const tokenResults = await Promise.all(promises);
    return tokenResults;
}

/**
 * Query both native and ERC20 token balances for multiple addresses with batching
 * @param publicClient - The viem public client
 * @param tokenAddresses - Array of ERC20 token contract addresses
 * @param addresses - Array of addresses to query
 * @param batchSize - Number of addresses to query per batch (default: 500)
 * @returns Object containing native and ERC20 balances
 */
export async function getAllBalances(
    publicClient: PublicClient,
    tokenAddresses: Address[],
    addresses: Address[],
    batchSize: number = 500
): Promise<{
    nativeBalances: bigint[];
    erc20Balances: bigint[][];
}> {
    assertBatchSize(batchSize);
    // Query native and ERC20 balances in parallel with batching
    const [nativeBalances, erc20Balances] = await Promise.all([
        getNativeBalances(publicClient, addresses, batchSize),
        getMultipleErc20Balances(publicClient, tokenAddresses, addresses, batchSize),
    ]);

    return {
        nativeBalances,
        erc20Balances,
    };
}

/**
 * Batch fetch ERC20 token metadata (symbol, name, decimals) for multiple addresses using multicall.
 * Returns an array aligned with input addresses; null entry when a call fails for that token.
 */
export async function getErc20TokenInfos(
    publicClient: PublicClient,
    tokenAddresses: Address[]
): Promise<({ address: Address; symbol: string; name: string; decimals: number } | null)[]> {
    if (tokenAddresses.length === 0) return [];

    // Prepare three multicalls: symbol, name, decimals
    const symbolCalls = tokenAddresses.map((addr) => ({
        address: addr,
        abi: erc20Abi,
        functionName: 'symbol' as const,
    }));
    const nameCalls = tokenAddresses.map((addr) => ({ address: addr, abi: erc20Abi, functionName: 'name' as const }));
    const decimalsCalls = tokenAddresses.map((addr) => ({
        address: addr,
        abi: erc20Abi,
        functionName: 'decimals' as const,
    }));

    const [symbols, names, decimals] = await Promise.all([
        publicClient.multicall({ contracts: symbolCalls }),
        publicClient.multicall({ contracts: nameCalls }),
        publicClient.multicall({ contracts: decimalsCalls }),
    ]);

    const results: ({ address: Address; symbol: string; name: string; decimals: number } | null)[] = [];
    for (let i = 0; i < tokenAddresses.length; i++) {
        const s = symbols[i];
        const n = names[i];
        const d = decimals[i];
        if (s?.status === 'success' && n?.status === 'success' && d?.status === 'success') {
            results.push({
                address: tokenAddresses[i],
                symbol: String(s.result),
                name: String(n.result),
                decimals: Number(d.result as number),
            });
        } else {
            results.push(null);
        }
    }

    return results;
}
