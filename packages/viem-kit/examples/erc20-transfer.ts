/**
 * Example: Send an ERC20 transfer with ChainKit parser-backed logging.
 *
 * Run with a shell-provided signer:
 * NEO_MNEMONIC="word word word..." RECIPIENT=0x... RUN_TX=1 pnpm exec tsx examples/erc20-transfer.ts
 * NEO_PRIVATE_KEY=0x... RECIPIENT=0x... RUN_TX=1 pnpm exec tsx examples/erc20-transfer.ts
 */

import type { Chain } from 'viem';
import { createPublicClient, createWalletClient, erc20Abi, getAddress, http } from 'viem';
import { getAccount } from '../src/node';
import { base } from 'viem/chains';
import { ChainKit } from '../src/index';

async function erc20TransferExample() {
    const chain: Chain = base;
    const publicClient = createPublicClient({ chain, transport: http('https://mainnet.base.org') });
    const kit = new ChainKit(chain, { publicClient });
    kit.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
    });

    const account = await getAccount(kit, 'neo');
    const recipient = getAddress(process.env.RECIPIENT ?? '');

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
    });
    const usdc = kit.getErc20TokenInfo('usdc')!;

    const receipt = await kit.sendTx(walletClient, {
        address: usdc.address,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient, kit.parseErc20Amount('100', usdc.address)],
    });

    console.log('Receipt:', receipt.transactionHash);
}

if (process.env.RUN_TX === '1') {
    erc20TransferExample().catch(console.error);
} else {
    console.log('Set NEO_MNEMONIC or NEO_PRIVATE_KEY, RECIPIENT, and RUN_TX=1 to execute the transfer');
}
