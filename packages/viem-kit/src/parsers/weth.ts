import type { Address } from 'viem';
import { formatUnits } from 'viem';
import type { ContractParser, Erc20TokenInfo } from '../types';
import { WETH_ABI } from '../abis';

type WETHAbi = typeof WETH_ABI;

/**
 * Create WETH contract parser with deposit/withdraw support
 * @param tokenInfo - Wrapped native token information
 * @param resolveAddress - Function to resolve address to name (e.g., kit.getAddressName)
 */
export function createWETHParser(
    tokenInfo: Erc20TokenInfo,
    resolveAddress: (addr: Address) => string
): ContractParser<WETHAbi> {
    // Helper functions
    const formatAmount = (amt: bigint) => formatUnits(amt, tokenInfo.decimals);
    const formatAddress = (addr: Address) => {
        const name = resolveAddress(addr);
        return name !== 'UNKNOWN' ? `[${name}]${addr}` : addr;
    };

    // Transaction formatters
    const txFormatters: Record<string, (args: readonly unknown[]) => string> = {
        transfer: (args) => {
            const [to, amount] = args as readonly [Address, bigint];
            return `transfer(to: ${formatAddress(to)}, amount: ${formatAmount(amount)} ${tokenInfo.symbol})`;
        },
        approve: (args) => {
            const [spender, amount] = args as readonly [Address, bigint];
            return `approve(spender: ${formatAddress(spender)}, amount: ${formatAmount(amount)} ${tokenInfo.symbol})`;
        },
        transferFrom: (args) => {
            const [from, to, amount] = args as readonly [Address, Address, bigint];
            return `transferFrom(from: ${formatAddress(from)}, to: ${formatAddress(to)}, amount: ${formatAmount(amount)} ${tokenInfo.symbol})`;
        },
        deposit: () => {
            return `deposit() → wrap native token to ${tokenInfo.symbol}`;
        },
        withdraw: (args) => {
            const [amount] = args as readonly [bigint];
            return `withdraw(amount: ${formatAmount(amount)} ${tokenInfo.symbol}) → unwrap to native`;
        },
    };

    // Event formatters
    const eventFormatters: Record<string, (args: Record<string, any>) => string> = {
        Transfer: (args) => {
            const { from, to, value } = args as { from: Address; to: Address; value: bigint };
            return `Transfer(from: ${formatAddress(from)}, to: ${formatAddress(to)}, amount: ${formatAmount(value)} ${tokenInfo.symbol})`;
        },
        Approval: (args) => {
            const { owner, spender, value } = args as { owner: Address; spender: Address; value: bigint };
            return `Approval(owner: ${formatAddress(owner)}, spender: ${formatAddress(spender)}, amount: ${formatAmount(value)} ${tokenInfo.symbol})`;
        },
        Deposit: (args) => {
            const { dst, wad } = args as { dst: Address; wad: bigint };
            return `Deposit(account: ${formatAddress(dst)}, amount: ${formatAmount(wad)} ${tokenInfo.symbol})`;
        },
        Withdrawal: (args) => {
            const { src, wad } = args as { src: Address; wad: bigint };
            return `Withdrawal(account: ${formatAddress(src)}, amount: ${formatAmount(wad)} ${tokenInfo.symbol})`;
        },
    };

    // Error formatters
    const errorFormatters: Record<string, (args?: readonly unknown[]) => string> = {
        InsufficientBalance: (args) =>
            `Insufficient ${tokenInfo.symbol} balance: ${formatAmount((args?.[1] as bigint) || 0n)} available, ${formatAmount((args?.[0] as bigint) || 0n)} needed`,
        ERC20InsufficientBalance: (args) =>
            `Insufficient ${tokenInfo.symbol} balance: ${formatAmount((args?.[1] as bigint) || 0n)} available, ${formatAmount((args?.[0] as bigint) || 0n)} needed`,
        InsufficientAllowance: (args) =>
            `Insufficient ${tokenInfo.symbol} allowance: ${formatAmount((args?.[1] as bigint) || 0n)} approved, ${formatAmount((args?.[0] as bigint) || 0n)} needed`,
        ERC20InsufficientAllowance: (args) =>
            `Insufficient ${tokenInfo.symbol} allowance: ${formatAmount((args?.[1] as bigint) || 0n)} approved, ${formatAmount((args?.[0] as bigint) || 0n)} needed`,
    };

    return {
        abi: WETH_ABI,

        async parseTransaction(tx) {
            const formatter = txFormatters[tx.functionName];
            return formatter ? formatter(tx.args as readonly unknown[]) : `${tx.functionName}(...)`;
        },

        async parseEvent(event) {
            const formatter = eventFormatters[event.eventName];
            return formatter ? formatter(event.args as Record<string, any>) : `${event.eventName}(...)`;
        },

        async parseError(error) {
            if (typeof error === "string") {
                return error;
            }
            // Modern custom errors
            if (error.name) {
                const formatter = errorFormatters[error.name];
                if (formatter) return formatter(error.args);
                return error.name;
            }

            // Old-style string revert
            if (error.signature === 'Error(string)' && error.args?.[0]) {
                return String(error.args[0]);
            }

            return error.signature || 'WETH error';
        },
    };
}
