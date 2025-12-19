/**
 * Example: Using Custom ABC Testnet Chain
 * Shows how to work with internal test chain
 */

import { createPublicClient, http } from 'viem';
import { ChainKitRegistry, abctest } from '../src/index';

async function abcTestnetExample() {
    console.log('\n🧪 SynFutures ABC Testnet Example\n');

    // ==========================================
    // METHOD 1: Use custom chain directly
    // ==========================================
    const publicClient = createPublicClient({
        chain: abctest,
        transport: http(), // Uses default RPC from chain definition
        pollingInterval: 100, // 50ms blocks, poll frequently
    });

    console.log('Chain:', abctest.name);
    console.log('Chain ID:', abctest.id);
    console.log('RPC:', abctest.rpcUrls.default.http[0]);
    console.log('WSS:', abctest.rpcUrls.default.webSocket?.[0]);
    console.log('Explorer:', abctest.blockExplorers.default.url);

    const blockNumber = await publicClient.getBlockNumber();
    console.log('Current block:', blockNumber.toString());

    // ==========================================
    // METHOD 2: Use with ChainKit (singleton)
    // ==========================================
    const kit = ChainKitRegistry.for(abctest); // Pass custom chain object

    // Register USDM token (auto-creates ERC20 parser!)
    kit.registerErc20Token({
        symbol: 'USDM',
        name: 'Test USDM',
        address: '0x8da593B1084727DD82212A0b812415851F29cdec',
        decimals: 6,
    });

    // Register test contracts (add your deployed addresses here)
    // kit.registerAddress('0x...' as Address, 'TestGate');
    // kit.registerAddress('0x...' as Address, 'TestInstrument');

    console.log('\nKit chain:', kit.chain.name);
    console.log('Native token:', kit.chain.nativeCurrency.symbol);

    // ==========================================
    // METHOD 3: Explorer links
    // ==========================================
    const txHash = '0x18ec5e56622f2f550ea57d2b9cb124ba980fbf25c13451a3d45d6e5c265fd9ca';
    const explorerLink = `${abctest.blockExplorers.default.url}/tx/${txHash}`;
    console.log('\nExample TX:', explorerLink);
    // https://synfutures-abc-testnet.cloud.blockscout.com/tx/0x18ec...

    console.log('\n✅ ABC Testnet ready to use!\n');
}

abcTestnetExample().catch(console.error);
