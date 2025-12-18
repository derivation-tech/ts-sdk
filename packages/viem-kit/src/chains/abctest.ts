import { defineChain } from 'viem';

/**
 * SynFutures ABC Testnet
 * Internal test chain with 50ms block time
 */
export const abctest = defineChain({
    id: 20250903,
    name: 'SynFutures ABC Testnet',
    nativeCurrency: {
        name: 'Test',
        symbol: 'TEST',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.synfutures-abc-testnet.raas.gelato.cloud/2ff2e1ea1a68484785779c5a072bed95'],
            webSocket: ['wss://ws.synfutures-abc-testnet.raas.gelato.cloud/2ff2e1ea1a68484785779c5a072bed95'],
        },
        public: {
            http: ['https://rpc.synfutures-abc-testnet.raas.gelato.cloud/2ff2e1ea1a68484785779c5a072bed95'],
            webSocket: ['wss://ws.synfutures-abc-testnet.raas.gelato.cloud/2ff2e1ea1a68484785779c5a072bed95'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://synfutures-abc-testnet.cloud.blockscout.com',
            apiUrl: 'https://synfutures-abc-testnet.cloud.blockscout.com/api',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            // Canonical Multicall3 address (if deployed)
        },
    },
    testnet: true,
});
