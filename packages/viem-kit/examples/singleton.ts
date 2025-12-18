/**
 * Example: Using ChainKitRegistry Singleton Pattern
 *
 * Shows how to use registries without Context wrapper
 * - Direct viem client access
 * - Shared singleton registries per chain
 * - Auto ERC20 parser generation
 */

import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ChainKitRegistry, type Address } from '../index';

// ==========================================
// SETUP: Initialize Base chain registry (once, anywhere)
// ==========================================
function initBaseRegistry() {
    const baseCtx = ChainKitRegistry.for('base');

    // Register tokens (auto-creates ERC20 parsers with decimals!)
    baseCtx.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        decimals: 6,
    });

    baseCtx.registerErc20Token({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0x4200000000000000000000000000000000000006' as Address,
        decimals: 18,
    });

    // Register contract addresses
    baseCtx.registerAddressName('0x94CB98AAAa0b2fec6cD97F3A5Adf1Fd22F08cbC7' as Address, 'JPEG-MM');
    baseCtx.registerAddressName('0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address, 'Asymmetric-MM');
    baseCtx.registerAddressName('0x208B443983D8BcC8578e9D86Db23FbA547071270' as Address, 'Gate');

    console.log('✅ Base registry initialized');
}

// ==========================================
// EXAMPLE 1: Read balances (no Context wrapper!)
// ==========================================
async function example1_readBalances() {
    console.log('\n📊 Example 1: Read Balances\n');

    // Direct viem client
    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    // Access singleton registry
    const baseCtx = ChainKitRegistry.for('base');

    const balance = await publicClient.readContract({
        address: baseCtx.getErc20TokenInfo('usdc')!.address,
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        functionName: 'balanceOf',
        args: ['0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address],
    });

    // Format with decimals from registry
    console.log('Balance:', baseCtx.formatErc20Amount(balance as bigint, 'usdc'));
    console.log('Address:', baseCtx.getAddressName('0xb643cDf292C76a16CC45Ea24768D921Ac02f3944' as Address));
}

// ==========================================
// EXAMPLE 2: Send tx and parse events
// ==========================================
async function example2_sendTxWithParsing() {
    console.log('\n💸 Example 2: Send TX with Event Parsing\n');

    if (!process.env.PRIVATE_KEY) {
        console.log('Skipped (no PRIVATE_KEY)');
        return;
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

    // Direct viem clients
    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
    });

    // Access singleton registry
    const baseCtx = ChainKitRegistry.for('base');
    const usdc = baseCtx.getErc20TokenInfo('usdc')!;

    // Send transaction (pure viem, no wrapper!)
    const hash = await walletClient.writeContract({
        address: usdc.address,
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer',
        args: ['0x...' as Address, baseCtx.parseErc20Amount('100', 'usdc')],
    });

    console.log('TX sent:', hash);

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Parse events using registry
    for (const log of receipt.logs) {
        const parser = baseCtx.getParser(log.address);
        if (parser) {
            const decoded = decodeEventLog({
                abi: parser.abi,
                data: log.data,
                topics: log.topics,
                strict: false,
            });

            // Use parser to format (includes decimals!)
            if (!decoded.eventName) continue;
            const formatted = await parser.parseEvent!({
                eventName: decoded.eventName as string,
                args: decoded.args as any,
            });

            console.log(`Event #${log.logIndex}:`, formatted);
            // Output: "Transfer(from: Alice, to: Bob, amount: 100 USDC)"
        }
    }
}

// ==========================================
// EXAMPLE 3: Multi-file access (same singleton!)
// ==========================================
async function example3_crossFileAccess() {
    console.log('\n🔗 Example 3: Cross-File Access\n');

    // File 1: balance.ts
    const file1Access = ChainKitRegistry.for(8453); // By ID
    console.log('File 1 sees USDC?', file1Access.getErc20TokenInfo('usdc')?.symbol);

    // File 2: transfer.ts (different file, same singleton!)
    const file2Access = ChainKitRegistry.for('base'); // By name
    console.log('File 2 sees USDC?', file2Access.getErc20TokenInfo('usdc')?.symbol);

    // Prove they're the same instance
    console.log('Same instance?', file1Access === file2Access); // true!
}

// ==========================================
// EXAMPLE 4: Multiple chains
// ==========================================
async function example4_multipleChains() {
    console.log('\n🌐 Example 4: Multiple Chains\n');

    // Initialize Base
    const baseCtx = ChainKitRegistry.for('base');
    baseCtx.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
        decimals: 6,
    });

    // Initialize Optimism (separate singleton!)
    const opCtx = ChainKitRegistry.for('optimism');
    opCtx.registerErc20Token({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Address,
        decimals: 6,
    });

    console.log('Base USDC:', baseCtx.getErc20TokenInfo('usdc')?.address);
    console.log('OP USDC:', opCtx.getErc20TokenInfo('usdc')?.address);
    console.log('Different singletons:', baseCtx !== opCtx); // true

    console.log(
        '\nAll initialized chains:',
        ChainKitRegistry.getAll().map((c: any) => c.chain.name)
    );
}

// ==========================================
// RUN EXAMPLES
// ==========================================
async function runExamples() {
    // Setup (would be in your app init)
    initBaseRegistry();

    await example1_readBalances();
    await example3_crossFileAccess();
    await example4_multipleChains();

    // example2 needs private key
    if (process.env.PRIVATE_KEY) {
        await example2_sendTxWithParsing();
    }

    console.log('\n✅ All examples complete!\n');
}

runExamples().catch(console.error);
