/**
 * Example: USDM Transfer on ABC Testnet
 * Transfer from neo:0 to neo:1 with beautiful logging
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { ChainKitRegistry } from '../index';
import { abctest } from '../chains/abctest';
import * as ERC20 from '../contracts/erc20';

// Removed logger - using console.log instead

async function transferUSDM() {
    console.log('\n💸 USDM Transfer on ABC Testnet\n');
    console.log('='.repeat(80));

    // ==========================================
    // STEP 1: Setup ChainKit for ABC testnet
    // ==========================================
    const kit = ChainKitRegistry.for(abctest);

    // Register USDM token (auto-creates ERC20 parser with decimal formatting!)
    kit.registerErc20Token({
        symbol: 'USDM',
        name: 'Test USDM',
        address: '0x8da593B1084727DD82212A0b812415851F29cdec',
        decimals: 6,
    });

    // ==========================================
    // STEP 2: Get accounts from NEO_MNEMONIC
    // ==========================================
    if (!process.env.NEO_MNEMONIC) {
        console.error('❌ Set NEO_MNEMONIC environment variable');
        console.log('Example: NEO_MNEMONIC="word word word..." npx tsx abc-transfer.ts\n');
        return;
    }

    const neo0 = mnemonicToAccount(process.env.NEO_MNEMONIC, { addressIndex: 0 });
    const neo1 = mnemonicToAccount(process.env.NEO_MNEMONIC, { addressIndex: 1 });

    // Register addresses for pretty names
    kit.registerAddressName(neo0.address, 'neo:0');
    kit.registerAddressName(neo1.address, 'neo:1');

    console.log(`Transfer: [neo:0]${neo0.address} → [neo:1]${neo1.address} | Amount: 100 USDM`);

    // ==========================================
    // STEP 3: Create viem clients
    // ==========================================
    const publicClient = createPublicClient({
        chain: abctest,
        transport: http(),
        pollingInterval: 100, // 50ms blocks, poll frequently
    });

    const walletClient = createWalletClient({
        account: neo0,
        chain: abctest,
        transport: http(),
    });

    // ==========================================
    // STEP 4: Check balances before (ERC20 helper!)
    // ==========================================
    const usdm = kit.getErc20TokenInfo('usdm')!;

    const balance0Before = await ERC20.balanceOf(publicClient, usdm.address, neo0.address);
    const balance1Before = await ERC20.balanceOf(publicClient, usdm.address, neo1.address);

    console.log(
        `📊 Before: neo:0=${kit.formatErc20Amount(balance0Before, 'usdm')}, neo:1=${kit.formatErc20Amount(balance1Before, 'usdm')}`
    );

    // ==========================================
    // STEP 5: Transfer (ERC20 helper with logging!)
    // ==========================================
    await ERC20.transfer(
        publicClient,
        walletClient,
        kit,
        usdm.address,
        neo1.address,
        kit.parseErc20Amount('100', 'usdm')
    );

    // ==========================================
    // STEP 6: Check balances after (ERC20 helper!)
    // ==========================================
    const balance0After = await ERC20.balanceOf(publicClient, usdm.address, neo0.address);
    const balance1After = await ERC20.balanceOf(publicClient, usdm.address, neo1.address);

    const delta0 = balance0After - balance0Before;
    const delta1 = balance1After - balance1Before;

    console.log(
        `📊 After: neo:0=${kit.formatErc20Amount(balance0After as bigint, 'usdm')} (${delta0 >= 0n ? '+' : ''}${kit.formatErc20Amount(delta0, 'usdm')}), neo:1=${kit.formatErc20Amount(balance1After as bigint, 'usdm')} (${delta1 >= 0n ? '+' : ''}${kit.formatErc20Amount(delta1, 'usdm')}) | 🎉 Complete!`
    );
}

transferUSDM().catch((error) => {
    console.error('❌ Error:', (error as any).shortMessage || (error as any).message);
    process.exit(1);
});
