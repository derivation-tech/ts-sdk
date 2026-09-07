import type { Address } from 'viem';
import { erc20Abi, formatUnits } from 'viem';
import type { DecodedContractError, Erc20TokenInfo } from '../types';
import { createContractParser } from './types';

function formatNamedAddress(address: Address, resolveAddress: (addr: Address) => string): string {
    const name = resolveAddress(address);
    return name !== 'UNKNOWN' ? `[${name}]${address}` : address;
}

function formatTokenAmount(value: bigint, tokenInfo: Erc20TokenInfo): string {
    return `${formatUnits(value, tokenInfo.decimals)} ${tokenInfo.symbol}`;
}

function formatErc20Error(error: DecodedContractError, tokenInfo: Erc20TokenInfo): string | undefined {
    if (error.kind === 'revertString') return error.reason;
    if (error.kind !== 'custom') return error.message;

    switch (error.name) {
        case 'ERC20InsufficientBalance': {
            const [, balance, needed] = error.args as readonly [Address?, bigint?, bigint?];
            return `Insufficient ${tokenInfo.symbol} balance: ${formatTokenAmount(
                balance ?? 0n,
                tokenInfo
            )} available, ${formatTokenAmount(needed ?? 0n, tokenInfo)} needed`;
        }
        case 'InsufficientBalance': {
            const [requested, available] = error.args as readonly [bigint?, bigint?];
            return `Insufficient ${tokenInfo.symbol} balance: ${formatTokenAmount(
                available ?? 0n,
                tokenInfo
            )} available, ${formatTokenAmount(requested ?? 0n, tokenInfo)} needed`;
        }
        case 'ERC20InsufficientAllowance': {
            const [, allowance, needed] = error.args as readonly [Address?, bigint?, bigint?];
            return `Insufficient ${tokenInfo.symbol} allowance: ${formatTokenAmount(
                allowance ?? 0n,
                tokenInfo
            )} approved, ${formatTokenAmount(needed ?? 0n, tokenInfo)} needed`;
        }
        case 'InsufficientAllowance': {
            const [requested, approved] = error.args as readonly [bigint?, bigint?];
            return `Insufficient ${tokenInfo.symbol} allowance: ${formatTokenAmount(
                approved ?? 0n,
                tokenInfo
            )} approved, ${formatTokenAmount(requested ?? 0n, tokenInfo)} needed`;
        }
        default:
            return error.name;
    }
}

export function createERC20Parser(tokenInfo: Erc20TokenInfo, resolveAddress: (addr: Address) => string) {
    return createContractParser({
        abi: erc20Abi,
        transactions: {
            transfer({ args }) {
                const [to, amount] = args;
                return `transfer(to: ${formatNamedAddress(to, resolveAddress)}, amount: ${formatTokenAmount(
                    amount,
                    tokenInfo
                )})`;
            },
            approve({ args }) {
                const [spender, amount] = args;
                return `approve(spender: ${formatNamedAddress(spender, resolveAddress)}, amount: ${formatTokenAmount(
                    amount,
                    tokenInfo
                )})`;
            },
            transferFrom({ args }) {
                const [from, to, amount] = args;
                return `transferFrom(from: ${formatNamedAddress(
                    from,
                    resolveAddress
                )}, to: ${formatNamedAddress(to, resolveAddress)}, amount: ${formatTokenAmount(amount, tokenInfo)})`;
            },
        },
        events: {
            Transfer({ args }) {
                return `Transfer(from: ${formatNamedAddress(args.from, resolveAddress)}, to: ${formatNamedAddress(
                    args.to,
                    resolveAddress
                )}, amount: ${formatTokenAmount(args.value, tokenInfo)})`;
            },
            Approval({ args }) {
                return `Approval(owner: ${formatNamedAddress(
                    args.owner,
                    resolveAddress
                )}, spender: ${formatNamedAddress(args.spender, resolveAddress)}, amount: ${formatTokenAmount(
                    args.value,
                    tokenInfo
                )})`;
            },
        },
        parseErrorFallback: (error) => formatErc20Error(error, tokenInfo),
    });
}
