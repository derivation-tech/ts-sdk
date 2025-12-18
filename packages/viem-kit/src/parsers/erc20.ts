import type { Address } from 'viem';
import { erc20Abi, formatUnits } from 'viem';
import type { ContractParser, Erc20TokenInfo } from '../types';

/**
 * Create ERC20 contract parser with automatic decimal formatting
 * @param tokenInfo - Token information (symbol, decimals, etc.)
 * @param resolveAddress - Function to resolve address to name (e.g., kit.getAddressName)
 */
export function createERC20Parser(
    tokenInfo: Erc20TokenInfo,
    resolveAddress: (addr: Address) => string
): ContractParser<typeof erc20Abi> {
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
        abi: erc20Abi,

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
            // Modern custom errors (Solidity 0.8.4+)
            if (error.name) {
                const formatter = errorFormatters[error.name];
                if (formatter) return formatter(error.args);
                return error.name; // Unknown custom error
            }

            // Old-style string revert (e.g., require("ERC20: insufficient balance"))
            // Viem automatically decodes Error(string) signature (0x08c379a0)
            // The decoded string comes through error.args[0]
            if (error.signature === 'Error(string)' && error.args?.[0]) {
                return String(error.args[0]);
            }

            return error.signature || 'ERC20 error';
        },
    };
}
