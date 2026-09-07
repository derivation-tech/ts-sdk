import { describe, expect, test } from '@jest/globals';
import { erc20Abi } from 'viem';
import type { Address } from 'viem';
import { WETH_ABI } from '../src/abis';
import { createERC20Parser } from '../src/parsers/erc20';
import { createWETHParser } from '../src/parsers/weth';
import type { DecodedContractError } from '../src/types';

const token = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    decimals: 6,
};

const resolveAddress = (address: Address) =>
    address.toLowerCase() === token.address.toLowerCase() ? 'USDC' : 'UNKNOWN';

describe('contract parsers', () => {
    test('formats ERC20 transfer transaction through parser API only', async () => {
        const parser = createERC20Parser(token, resolveAddress);
        const formatted = await parser.parseTransaction?.({
            functionName: 'transfer',
            args: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 1_000_000n],
        });

        expect(formatted).toContain('transfer');
        expect(formatted).toContain('1');
        expect(formatted).toContain('USDC');
        expect('formatTransaction' in parser).toBe(false);
    });

    test('formats ERC20 Transfer event without old compatibility surface', async () => {
        const parser = createERC20Parser(token, resolveAddress);
        const formatted = await parser.parseEvent?.({
            eventName: 'Transfer',
            args: {
                from: token.address,
                to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                value: 2_000_000n,
            },
        });

        expect(formatted).toContain('Transfer');
        expect(formatted).toContain('2');
        expect(parser.abi).toBe(erc20Abi);
        expect('formatEvent' in parser).toBe(false);
    });

    test('formats WETH deposit and withdrawal events through parser API only', async () => {
        const parser = createWETHParser({ ...token, symbol: 'WETH', decimals: 18 }, resolveAddress);

        const deposit = await parser.parseEvent?.({
            eventName: 'Deposit',
            args: {
                dst: token.address,
                wad: 1_000_000_000_000_000_000n,
            },
        });
        const withdrawal = await parser.parseEvent?.({
            eventName: 'Withdrawal',
            args: {
                src: token.address,
                wad: 2_000_000_000_000_000_000n,
            },
        });

        expect(deposit).toContain('Deposit');
        expect(deposit).toContain('1');
        expect(withdrawal).toContain('Withdrawal');
        expect(withdrawal).toContain('2');
        expect(parser.abi).toBe(WETH_ABI);
        expect('formatError' in parser).toBe(false);
    });

    test('formats standardized and legacy ERC20 balance and allowance errors', async () => {
        const parser = createERC20Parser(token, resolveAddress);
        const customError = (name: string, args: readonly unknown[]): DecodedContractError => ({
            kind: 'custom',
            name,
            args,
            message: name,
        });

        expect(
            await parser.parseError?.(customError('ERC20InsufficientBalance', [token.address, 1_000_000n, 2_000_000n]))
        ).toBe('Insufficient USDC balance: 1 USDC available, 2 USDC needed');
        expect(await parser.parseError?.(customError('InsufficientBalance', [2_000_000n, 1_000_000n]))).toBe(
            'Insufficient USDC balance: 1 USDC available, 2 USDC needed'
        );
        expect(
            await parser.parseError?.(
                customError('ERC20InsufficientAllowance', [token.address, 3_000_000n, 4_000_000n])
            )
        ).toBe('Insufficient USDC allowance: 3 USDC approved, 4 USDC needed');
        expect(await parser.parseError?.(customError('InsufficientAllowance', [4_000_000n, 3_000_000n]))).toBe(
            'Insufficient USDC allowance: 3 USDC approved, 4 USDC needed'
        );
    });
});
