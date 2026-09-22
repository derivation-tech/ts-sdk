import { expect, it } from '@jest/globals';
import { getAccount } from '../../src/node/account';
import { ChainKit } from '../../src/chain-kit';
import { mainnet } from 'viem/chains';

it('keeps derived-account registration local to each kit', async () => {
    const previous = process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY;
    process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY = `0x${'0'.repeat(63)}1`;
    try {
        const first = new ChainKit(mainnet);
        const second = new ChainKit(mainnet);
        const a = await getAccount(first, 'viem_kit_fixture');
        const b = await getAccount(second, 'viem_kit_fixture');
        expect(a.address).toBe(b.address);
        expect(first.getAddressName(a.address)).toBe('viem_kit_fixture');
        expect(second.getAddressName(b.address)).toBe('viem_kit_fixture');
    } finally {
        if (previous === undefined) delete process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY;
        else process.env.VIEM_KIT_FIXTURE_PRIVATE_KEY = previous;
    }
});
