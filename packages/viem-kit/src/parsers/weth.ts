import type { Address } from 'viem';
import { formatUnits } from 'viem';
import { WETH_ABI } from '../abis';
import type { DecodedContractError, Erc20TokenInfo } from '../types';
import { createContractParser } from './types';

function formatNamedAddress(address: Address, resolveAddress: (addr: Address) => string): string {
    const name = resolveAddress(address);
    return name !== 'UNKNOWN' ? `[${name}]${address}` : address;
}

function formatTokenAmount(value: bigint, tokenInfo: Erc20TokenInfo): string {
    return `${formatUnits(value, tokenInfo.decimals)} ${tokenInfo.symbol}`;
}

function formatWethError(error: DecodedContractError, tokenInfo: Erc20TokenInfo): string {
    if (error.kind === 'revertString') return error.reason;
    if (error.kind === 'custom') return error.name;
    return error.message || `${tokenInfo.symbol} error`;
}

export function createWETHParser(tokenInfo: Erc20TokenInfo, resolveAddress: (addr: Address) => string) {
    return createContractParser({
        abi: WETH_ABI,
        transactions: {
            deposit({ value }) {
                return value === undefined ? 'deposit()' : `deposit(value: ${formatTokenAmount(value, tokenInfo)})`;
            },
            withdraw({ args }) {
                const [amount] = args;
                return `withdraw(amount: ${formatTokenAmount(amount, tokenInfo)})`;
            },
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
            Deposit({ args }) {
                return `Deposit(dst: ${formatNamedAddress(args.dst, resolveAddress)}, amount: ${formatTokenAmount(
                    args.wad,
                    tokenInfo
                )})`;
            },
            Withdrawal({ args }) {
                return `Withdrawal(src: ${formatNamedAddress(args.src, resolveAddress)}, amount: ${formatTokenAmount(
                    args.wad,
                    tokenInfo
                )})`;
            },
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
        parseErrorFallback: (error) => formatWethError(error, tokenInfo),
    });
}
