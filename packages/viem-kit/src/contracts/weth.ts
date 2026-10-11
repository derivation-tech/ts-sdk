import { parseUnits } from 'viem';
import type { PublicClient, WalletClient, TransactionReceipt } from 'viem';
import type { ChainKit } from '../chain-kit';
import { sendContractTransaction } from '../utils/tx';
import { WETH_ABI } from '../abis';
import { kitTxContext } from './tx-context';

/**
 * Deposit native token to get wrapped native token (with logging)
 * @param publicClient - Public client for reading
 * @param walletClient - Wallet client for signing
 * @param kit - ChainKit instance for logging
 * @param amount - Amount in native token (e.g., ETH)
 * @returns Transaction receipt
 */
export async function deposit(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    amount: string
): Promise<TransactionReceipt> {
    const wrappedTokenInfo = kit.wrappedNativeTokenInfo;
    if (!wrappedTokenInfo) {
        throw new Error(`Wrapped native token not found for chain ${publicClient.chain?.id}`);
    }

    const amountWei = parseUnits(amount, kit.nativeTokenInfo.decimals);

    const sent = await sendContractTransaction(kitTxContext(publicClient, walletClient, kit), {
        address: wrappedTokenInfo.address,
        abi: WETH_ABI,
        functionName: 'deposit',
        args: [],
        value: amountWei,
    });
    return sent.receipt;
}

/**
 * Withdraw wrapped native token to get native token (with logging)
 * @param publicClient - Public client for reading
 * @param walletClient - Wallet client for signing
 * @param kit - ChainKit instance for logging
 * @param amount - Amount in wrapped native token (e.g., WETH)
 * @returns Transaction receipt
 */
export async function withdraw(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    amount: string
): Promise<TransactionReceipt> {
    const wrappedTokenInfo = kit.wrappedNativeTokenInfo;
    if (!wrappedTokenInfo) {
        throw new Error(`Wrapped native token not found for chain ${publicClient.chain?.id}`);
    }

    const amountWei = kit.parseErc20Amount(amount, wrappedTokenInfo.address);

    const sent = await sendContractTransaction(kitTxContext(publicClient, walletClient, kit), {
        address: wrappedTokenInfo.address,
        abi: WETH_ABI,
        functionName: 'withdraw',
        args: [amountWei],
    });
    return sent.receipt;
}
