import { createPublicClient, Address } from 'viem';
import { erc20Abi } from 'viem';
import { MULTICALL3_ABI } from '../abis';

/**
 * Multicall utility functions for efficient batch queries
 */

/**
 * Query native token balances for multiple addresses using multicall3 with batching
 * @param publicClient - The viem public client
 * @param addresses - Array of addresses to query
 * @param batchSize - Number of addresses to query per batch (default: 500)
 * @returns Array of native token balances (in wei)
 */
export async function getNativeBalances(
    publicClient: ReturnType<typeof createPublicClient>,
    addresses: Address[],
    batchSize: number = 500
): Promise<bigint[]> {
    const results: bigint[] = new Array(addresses.length).fill(0n);

    // Process addresses in batches to avoid gas limits
    for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchIndex = i;

        try {
            const multicallResults = await publicClient.multicall({
                contracts: batch.map((addr) => ({
                    address: publicClient.chain?.contracts?.multicall3?.address as Address,
                    abi: MULTICALL3_ABI,
                    functionName: 'getEthBalance',
                    args: [addr],
                })),
            });

            // Store results in the correct positions
            multicallResults.forEach((result, index) => {
                results[batchIndex + index] = result.status === 'success' ? (result.result as bigint) : 0n;
            });
        } catch (err: any) {
            console.log(
                `Warning: Error querying native balances batch ${Math.floor(i / batchSize) + 1}: ${err.message}`
            );
            // Set all balances to 0 for this failed batch
            batch.forEach((_, index) => {
                results[batchIndex + index] = 0n;
            });
        }
    }

    return results;
}

/**
 * Query ERC20 token balances for multiple addresses using multicall with batching
 * @param publicClient - The viem public client
 * @param tokenAddress - The ERC20 token contract address
 * @param addresses - Array of addresses to query
 * @param batchSize - Number of addresses to query per batch (default: 500)
 * @returns Array of ERC20 token balances
 */
export async function getErc20Balances(
    publicClient: ReturnType<typeof createPublicClient>,
    tokenAddress: Address,
    addresses: Address[],
    batchSize: number = 500
): Promise<bigint[]> {
    const results: bigint[] = new Array(addresses.length).fill(0n);

    // Process addresses in batches to avoid gas limits
    for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchIndex = i;

        try {
            const multicallResults = await publicClient.multicall({
                contracts: batch.map((addr) => ({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [addr],
                })),
            });

            // Store results in the correct positions
            multicallResults.forEach((result, index) => {
                results[batchIndex + index] = result.status === 'success' ? (result.result as bigint) : 0n;
            });
        } catch (err: any) {
            console.log(
                `Warning: Error querying ERC20 balances batch ${Math.floor(i / batchSize) + 1}: ${err.message}`
            );
            // Set all balances to 0 for this failed batch
            batch.forEach((_, index) => {
                results[batchIndex + index] = 0n;
            });
        }
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
    publicClient: ReturnType<typeof createPublicClient>,
    tokenAddresses: Address[],
    addresses: Address[],
    batchSize: number = 500
): Promise<bigint[][]> {
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
    publicClient: ReturnType<typeof createPublicClient>,
    tokenAddresses: Address[],
    addresses: Address[],
    batchSize: number = 500
): Promise<{
    nativeBalances: bigint[];
    erc20Balances: bigint[][];
}> {
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
 * Returns an array aligned with input addresses; null entry if any call fails for that token.
 */
export async function getErc20TokenInfos(
    publicClient: ReturnType<typeof createPublicClient>,
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
