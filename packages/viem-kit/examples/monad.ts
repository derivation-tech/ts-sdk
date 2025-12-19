/**
 * Example: Using Custom ABC Testnet Chain
 * Shows how to work with internal test chain
 */

import { createPublicClient, http } from 'viem';
import { ChainKitRegistry, monad } from '../src/index';

async function monadExample() {
    console.log('\n🧪 Monad Mainnet Beta Example\n');

    // ==========================================
    // METHOD 1: Use custom chain directly
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
    const kit = ChainKitRegistry.for(monad); // Pass custom chain object

    // Register USDM token (auto-creates ERC20 parser!)
    kit.registerErc20Token({
        symbol: 'USDC',
        name: 'USDC',
        address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
        decimals: 6,
    });

    // Register test contracts (add your deployed addresses here)
    // kit.registerAddress('0x...' as Address, 'TestGate');
    // kit.registerAddress('0x...' as Address, 'TestInstrument');

    console.log('\nKit chain:', kit.chain.name);
    console.log('Native token:', kit.chain.nativeCurrency.name);

    console.log('\n✅ Monad ready to use!\n');
}

monadExample().catch(console.error);
