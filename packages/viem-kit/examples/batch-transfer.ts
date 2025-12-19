/**
 * Example: Batch Transfer USDM
 * Send 1 USDM from neo:0-99 to neo:100-199
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { ChainKitRegistry, batchSendTxWithLog, LoggerFactory, LogLevel, abctest } from '../src/index';

const logger = LoggerFactory.getLogger('Batch-Transfer', LogLevel.Info);

async function batchTransfer() {
    logger.info('\n💸 Batch Transfer: neo:0-99 → neo:100-199\n');
    logger.info('='.repeat(80));

    if (!process.env.NEO_MNEMONIC) {
        logger.error('Set NEO_MNEMONIC to run this example');
        return;
    }

    // ==========================================
    // STEP 1: Setup ChainKit
    // ==========================================
    const kit = ChainKitRegistry.for(abctest);
    kit.registerErc20Token({
        symbol: 'USDM',
        name: 'Test USDM',
        address: '0x8da593B1084727DD82212A0b812415851F29cdec',
        decimals: 6,
    });

    const usdm = kit.getErc20TokenInfo('usdm')!;

    // ==========================================
    // STEP 2: Create accounts neo:0-199
    // ==========================================
    const mnemonic = process.env.NEO_MNEMONIC;
    const senders = Array.from({ length: 100 }, (_, i) => mnemonicToAccount(mnemonic, { addressIndex: i }));
    const recipients = Array.from({ length: 100 }, (_, i) => mnemonicToAccount(mnemonic, { addressIndex: i + 100 }));

    // Register addresses for logging
    senders.forEach((acc, i) => kit.registerAddressName(acc.address, `neo:${i}`));
    recipients.forEach((acc, i) => kit.registerAddressName(acc.address, `neo:${i + 100}`));

    logger.info(`Senders: neo:0-99`);
    logger.info(`Recipients: neo:100-199`);
    logger.info('');

    // ==========================================
    // STEP 3: Create viem client
    // ==========================================
    const publicClient = createPublicClient({
        chain: abctest,
        transport: http(),
        batch: { multicall: true }, // Enable batching
    });

    // Create wallet clients for all senders
    const walletClients = senders.map((account) =>
        createWalletClient({
            account,
            chain: abctest,
            transport: http(),
        })
    );

    // ==========================================
    // STEP 4: Build 100 transfer transactions
    // ==========================================
    const transferAmount = kit.parseErc20Amount('1', 'usdm'); // 1 USDM each

    const txs = recipients.map((recipient) => ({
        address: usdm.address,
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer' as const,
        args: [recipient.address, transferAmount] as const,
    }));

    logger.info(`Built ${txs.length} transfer transactions (1 USDM each)`);
    logger.info('');

    // ==========================================
    // STEP 5: Batch send with logging
    // ==========================================
    const startTime = Date.now();

    const receipts = await batchSendTxWithLog(publicClient, walletClients, kit, txs);

    const duration = Date.now() - startTime;

    // ==========================================
    // STEP 6: Summary
    // ==========================================
    logger.info('');
    logger.info('📊 Summary:');
    logger.info(`  Total transfers: ${receipts.length}`);
    logger.info(`  Total gas used: ${receipts.reduce((sum: bigint, r: any) => sum + (r.gasUsed as bigint), 0n).toString()}`);
    logger.info(`  Duration: ${duration}ms`);
    logger.info(`  Average: ${(duration / receipts.length).toFixed(0)}ms per tx`);
    logger.info('');
    logger.info('🎉 Batch transfer complete!\n');
}

batchTransfer().catch((error) => {
    logger.error('❌ Error:', error.message);
    process.exit(1);
});
