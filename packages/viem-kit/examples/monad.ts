/**
 * Example: Using the viem Monad chain
 * Shows how to work with Monad via viem's built-in chain definitions.
 */

import { createPublicClient, http } from 'viem';
import { monad } from 'viem/chains';
import { ChainKitRegistry } from '../src/index';

async function monadExample() {
    console.log('\n🧪 Monad Mainnet Beta Example\n');

    // ==========================================
    // METHOD 1: Use viem chain directly
    // ==========================================
    const publicClient = createPublicClient({
        chain: monad,
        transport: http(), // Uses default RPC from chain definition
        pollingInterval: 100, // 50ms blocks, poll frequently
    });

    console.log('Chain:', monad.name);
    console.log('Chain ID:', monad.id);
    console.log('RPC:', monad.rpcUrls.default.http[0]);
    console.log('Explorer:', monad.blockExplorers.default.url);

    const blockNumber = await publicClient.getBlockNumber();
    console.log('Current block:', blockNumber.toString());

    // ==========================================
    // METHOD 2: Use with ChainKit (singleton)
    // ==========================================
    const kit = ChainKitRegistry.for(monad);

    // USDC is auto-loaded from the built-in token registry (COMMON_ERC20_TOKENS)
    const usdc = kit.getErc20TokenInfo('USDC');
    console.log('USDC:', usdc?.address);

    // Register test contracts (add your deployed addresses here)
    // kit.registerAddress('0x...' as Address, 'TestGate');
    // kit.registerAddress('0x...' as Address, 'TestInstrument');

    console.log('\nKit chain:', kit.chain.name);
    console.log('Native token:', kit.chain.nativeCurrency.name);

    console.log('\n✅ Monad ready to use!\n');
}

monadExample().catch(console.error);
