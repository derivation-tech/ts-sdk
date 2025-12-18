import { defineChain } from 'viem';

/**
 * Monad Mainnet beta version
 */
export const monad = defineChain({
    id: 143,
    name: 'Monad Mainnet',
    nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc-mainnet.monadinfra.com/rpc/HxAj0ITnxARXpB2Qx0abDyhLUnDZXSJQ'],
            webSocket: [''],
        },
        public: {
            http: ['https://rpc-mainnet.monadinfra.com/rpc/HxAj0ITnxARXpB2Qx0abDyhLUnDZXSJQ'],
            webSocket: [''],
        },
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://mainnet-beta.monvision.io',
            apiUrl: '',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            // Canonical Multicall3 address (if deployed)
        },
    },
});
