/**
 * Example: Send an ERC20 transfer with ChainKit parser-backed logging.
 *
 * Run with a shell-provided signer:
 * NEO_MNEMONIC="word word word..." RUN_TX=1 pnpm exec tsx examples/erc20-transfer.ts
 * SIGNER_NEO_0=0x... RUN_TX=1 pnpm exec tsx examples/erc20-transfer.ts
 */

import type { Address, LocalAccount } from 'viem';
import { createPublicClient, createWalletClient, erc20Abi, http } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ChainKitRegistry } from '../src/index';

function getAccountFromSigner(signerId: string): LocalAccount | null {
    const [name, index] = signerId.split(':');
    if (!name || index === undefined) return null;

    const privateKey = process.env[`SIGNER_${name.toUpperCase()}_${index}`];
    if (privateKey) return privateKeyToAccount(privateKey as `0x${string}`);

    const mnemonic = process.env[`${name.toUpperCase()}_MNEMONIC`];
    if (mnemonic) {
        return mnemonicToAccount(mnemonic, { addressIndex: Number.parseInt(index, 10) });
    }

    return null;
}

async function erc20TransferExample() {
    const kit = ChainKitRegistry.for(base);
    kit.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
    });

    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http('https://mainnet.base.org'),
    });
    kit.publicClient = publicClient;

    const account = getAccountFromSigner('neo:0');
    if (!account) {
        console.log('Set NEO_MNEMONIC or SIGNER_NEO_0 to run this example');
        return;
    }

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
    });
    const usdc = kit.getErc20TokenInfo('usdc')!;
    const recipient = '0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address;

    const receipt = await kit.sendTx(walletClient, {
        address: usdc.address,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipient, kit.parseErc20Amount('100', usdc.address)],
    });

    console.log('Receipt:', receipt.transactionHash);
}

if (process.env.RUN_TX) {
    erc20TransferExample().catch(console.error);
} else {
    console.log('Set NEO_MNEMONIC or SIGNER_NEO_0 and RUN_TX=1 to execute the transfer');
}
