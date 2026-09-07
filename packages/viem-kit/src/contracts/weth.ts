import { parseEther } from 'viem';
import type { Account, Address, PublicClient, WalletClient, TransactionReceipt } from 'viem';
import { ChainKit } from '../chain-kit';
import { sendContractTransaction } from '../utils/tx';
import { WETH_ABI } from '../abis';

function requireAccount(walletClient: WalletClient): Account | Address {
    if (!walletClient.account) throw new Error('WalletClient must have an account configured');
    return walletClient.account;
}

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
    const wrappedEther = publicClient.chain?.contracts?.wrappedEther;
    const wrappedTokenAddress =
        typeof wrappedEther === 'object' && 'address' in wrappedEther ? wrappedEther.address : null;
    const wrappedTokenInfo =
        (wrappedTokenAddress ? kit.getErc20TokenInfo(wrappedTokenAddress) : null) ?? kit.wrappedNativeTokenInfo;
    if (!wrappedTokenInfo) {
        throw new Error(`Wrapped native token not found for chain ${publicClient.chain?.id}`);
    }

    const amountWei = parseEther(amount);

    const sent = await sendContractTransaction(
        {
            publicClient,
            walletClient,
            chain: kit.chain,
            resolveParser: (address) => kit.resolveParser(address),
        },
        {
            address: wrappedTokenInfo.address,
            abi: WETH_ABI,
            functionName: 'deposit',
            args: [],
            value: amountWei,
            account: requireAccount(walletClient),
        }
    );
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
    const wrappedEther = publicClient.chain?.contracts?.wrappedEther;
    const wrappedTokenAddress =
        typeof wrappedEther === 'object' && 'address' in wrappedEther ? wrappedEther.address : null;
    const wrappedTokenInfo =
        (wrappedTokenAddress ? kit.getErc20TokenInfo(wrappedTokenAddress) : null) ?? kit.wrappedNativeTokenInfo;
    if (!wrappedTokenInfo) {
        throw new Error(`Wrapped native token not found for chain ${publicClient.chain?.id}`);
    }

    const amountWei = kit.parseErc20Amount(amount, wrappedTokenInfo.address);

    const sent = await sendContractTransaction(
        {
            publicClient,
            walletClient,
            chain: kit.chain,
            resolveParser: (address) => kit.resolveParser(address),
        },
        {
            address: wrappedTokenInfo.address,
            abi: WETH_ABI,
            functionName: 'withdraw',
            args: [amountWei],
            account: requireAccount(walletClient),
        }
    );
    return sent.receipt;
}
