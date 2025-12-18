/**
 * Example: ERC20 Transfer with Beautiful Logging
 *
 * Shows:
 * - Address name resolution
 * - Amount formatting with decimals
 * - Event parsing with proper formatting
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ChainKitRegistry, sendTxWithLog, type Address } from '../index.js';
import { ERC20_ABI } from '../abis/index.js';

async function erc20TransferExample() {
    // ==========================================
    // STEP 1: Setup ChainKit singleton
    // ==========================================
    const kit = ChainKitRegistry.for('base');

    // Register USDC (auto-creates ERC20 parser with decimal formatting!)
    kit.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        decimals: 6,
    });

    // Register addresses for pretty names
    kit.registerAddressName('0x94CB98AAAa0b2fec6cD97F3A5Adf1Fd22F08cbC7' as Address, 'JPEG-MM');
    kit.registerAddressName('0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address, 'Asymmetric-MM');

    // ==========================================
    // STEP 2: Create viem clients
    // ==========================================
    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    // Get account from neo:0 signer
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

    // ==========================================
    // STEP 3: Use sendTxWithLog for beautiful logging
    // ==========================================

    // ==========================================
    // STEP 4: Send transfer with automatic logging
    // ==========================================
    const usdc = kit.getErc20TokenInfo('usdc')!;
    const recipient = '0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address;

    console.log('\n💸 Sending USDC Transfer\n');

    const receipt = await sendTxWithLog(publicClient, walletClient, kit, {
        address: usdc.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient, kit.parseErc20Amount('100', usdc.address)], // Handles 6 decimals!
    });

    // ==========================================
    // CONSOLE OUTPUT (Automatic!):
    // ==========================================
    // 📦   request → BASE [Alice]0x123... USDC::transfer(to: Asymmetric-MM, amount: 100 USDC)
    // 📦 submitted → BASE txHash: https://basescan.org/tx/0xabc... gas: 65000, gasPrice: 0.05 gwei
    // 📦    minted → BASE block: 12345, gasUsed: 52341 (80.52%), fee: 0.00261705 ETH
    // 📦     event → #0 USDC-Transfer(from: Alice, to: Asymmetric-MM, amount: 100 USDC)

    console.log('\n✅ Transfer complete!');
    console.log('Receipt:', receipt.transactionHash);
}

// ==========================================
// ALTERNATIVE: Manual logging (more control)
// ==========================================
async function manualLogging() {
    const kit = ChainKitRegistry.for('base');
    kit.registerErc20Token({
        symbol: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        decimals: 6,
    });
    kit.registerAddressName('0x94CB98AAAa0b2fec6cD97F3A5Adf1Fd22F08cbC7' as Address, 'JPEG-MM');
    kit.registerAddressName('0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address, 'Asymmetric-MM');

    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    const usdc = kit.getErc20TokenInfo('usdc')!;
    const recipient = '0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address;
    const amount = kit.parseErc20Amount('100', 'usdc');

    // ==========================================
    // STEP 1: Build transaction request
    // ==========================================
    const txRequest = {
        address: usdc.address,
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer' as const,
        args: [recipient, amount] as const,
    };

    // ==========================================
    // STEP 2: Log transaction (before sending)
    // ==========================================
    console.log('\n💸 Preparing transfer:');
    const txDescription = await kit.parserRegistry.parseTransaction(
        usdc.address,
        {
            functionName: 'transfer',
            args: [recipient, amount],
        },
        kit.addressBook
    );
    console.log('  From:', account.address);
    console.log('  Call:', txDescription);

    // ==========================================
    // STEP 3: Sign and send to blockchain
    // ==========================================
    const hash = await walletClient.writeContract(txRequest);

    console.log('  TX Hash:', hash);

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('  Block:', receipt.blockNumber.toString());
    console.log('  Gas Used:', receipt.gasUsed.toString());
    console.log('  Status:', receipt.status);

    // Parse events manually
    console.log('\n📢 Events:');
    for (const log of receipt.logs) {
        const parser = kit.getParser(log.address);
        if (parser) {
            const decoded = decodeEventLog({
                abi: parser.abi,
                data: log.data,
                topics: log.topics,
                strict: false,
            });

            // Use parser with addressBook for beautiful output
            const formatted = await kit.parserRegistry.parseEvent(log.address, decoded, kit.addressBook);
            console.log(`  #${log.logIndex}`, formatted);
            // Output: "Transfer(from: Alice, to: Asymmetric-MM, amount: 100 USDC)"
        }
    }

    console.log('\n✅ Done!\n');
}

// ==========================================
// HELPER: Get account from signer pattern
// ==========================================
import { mnemonicToAccount } from 'viem/accounts';
import { decodeEventLog } from 'viem';

function getAccountFromSigner(signerId: string): ReturnType<typeof privateKeyToAccount> | null {
    // Pattern: neo:0, alice:1, etc.
    if (signerId.includes(':')) {
        const [name, index] = signerId.split(':');

        // Try private key first: SIGNER_NEO_0
        const pkeyEnv = `SIGNER_${name.toUpperCase()}_${index}`;
        if (process.env[pkeyEnv]) {
            return privateKeyToAccount(process.env[pkeyEnv] as `0x${string}`);
        }

        // Try mnemonic: NEO_MNEMONIC with index
        const mnemonicEnv = `${name.toUpperCase()}_MNEMONIC`;
        if (process.env[mnemonicEnv]) {
            return mnemonicToAccount(process.env[mnemonicEnv]!, {
                addressIndex: parseInt(index),
            });
        }
    }

    return null;
}

// Run example
if (process.env.RUN_TX) {
    erc20TransferExample().catch(console.error);
} else {
    console.log('Set NEO_MNEMONIC or SIGNER_NEO_0 and RUN_TX=1 to execute transfer');
    console.log('Example:');
    console.log('  NEO_MNEMONIC="word word word..." RUN_TX=1 tsx example-erc20-transfer.ts');
    console.log('  # or');
    console.log('  SIGNER_NEO_0=0x... RUN_TX=1 tsx example-erc20-transfer.ts');
}

// For manual logging example
// manualLogging().catch(console.error);
