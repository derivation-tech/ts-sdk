import { expect, it } from '@jest/globals';
import { expandSignerIdPattern, getAccount } from '../../src/node/account';
import { resolveAddress } from '../../src/node/address-resolver';
import { ChainKit } from '../../src/chain-kit';
import { mainnet } from 'viem/chains';

it('keeps derived-account registration local to each kit', async () => {
    const previous = process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY;
    process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY = `0x${'0'.repeat(63)}1`;
    try {
        const first = new ChainKit(mainnet);
        const second = new ChainKit(mainnet);
        const a = await getAccount(first, expandSignerIdPattern('viem_kit_fixture')[0]);
        const b = await getAccount(second, 'viem_kit_fixture');
        expect(a.address).toBe(b.address);
        expect(first.getAddressName(a.address)).toBe('viem_kit_fixture');
        expect(second.getAddressName(b.address)).toBe('viem_kit_fixture');
    } finally {
        if (previous === undefined) delete process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY;
        else process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY = previous;
    }
});

it('preserves the viem validation cause when a direct address is invalid', async () => {
    await expect(resolveAddress('0x1234', new ChainKit(mainnet))).rejects.toMatchObject({
        message: 'Invalid Ethereum address format: 0x1234. Expected a valid checksummed address.',
        cause: expect.objectContaining({ name: 'InvalidAddressError' }),
    });
});

it.each(['fixture:typo', 'fixture:1.9', 'fixture:1oops', 'fixture:', 'fixture:-1', 'fixture:1:2', ':1', ''])(
    'rejects malformed signer IDs before reading credentials: %s',
    async (input) => {
        await expect(getAccount(new ChainKit(mainnet), input)).rejects.toThrow(/Invalid|empty/);
    }
);

it('preserves signer-index errors when resolving a named address', async () => {
    await expect(resolveAddress('fixture:typo', new ChainKit(mainnet))).rejects.toMatchObject({
        cause: expect.objectContaining({ message: 'Invalid account index: typo' }),
    });
});
