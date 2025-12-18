import type { Erc20TokenInfo } from '../types';

/**
 * Known wrapped native token info per chain
 *
 * Extracted from web3-context/packages/context/src/chain/*.json
 * Covers 30+ chains including mainnet, testnets, and L2s
 */
// prettier-ignore
export const WRAPPED_NATIVE_TOKENS: Record<number, Erc20TokenInfo> = {
    // Ethereum Mainnet
    1: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },

    // Layer 2s - Optimism Stack
    10: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Optimism
    8453: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Base
    81457: { address: '0x4300000000000000000000000000000000000004', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Blast

    // Layer 2s - Arbitrum
    42161: { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Arbitrum One

    // Layer 2s - zkSync
    324: { address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // zkSync Era

    // Layer 2s - Polygon
    137: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped Matic', decimals: 18 }, // Polygon
    1101: { address: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Polygon zkEVM

    // Layer 2s - Other
    534352: { address: '0x5300000000000000000000000000000000000004', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Scroll
    59144: { address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Linea
    169: { address: '0x0Dc808adcE2099A9F62AA87D9670745AbA741746', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Manta
    5000: { address: '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8', symbol: 'WMNT', name: 'Wrapped MNT', decimals: 18 }, // Mantle

    // Other Mainnets
    56: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 }, // BSC
    43114: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18 }, // Avalanche
    100: { address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', symbol: 'WXDAI', name: 'Wrapped XDAI', decimals: 18 }, // Gnosis
    1030: { address: '0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b', symbol: 'WCFX', name: 'Wrapped CFX', decimals: 18 }, // Conflux
    8217: { address: '0x19aac5f612f524b754ca7e7c41cbfa2e981a4432', symbol: 'WKLAY', name: 'Wrapped KLAY', decimals: 18 }, // Klaytn
    22776: { address: '0x13cb04d4a5dfb6398fc5ab005a6c84337256ee23', symbol: 'WMAPO', name: 'Wrapped MAPO', decimals: 18 }, // MAPO
    80084: { address: '0x7507c1dc16935B82698e4C63f2746A2fCf994dF8', symbol: 'WBERA', name: 'Wrapped BERA', decimals: 18 }, // Berachain Bartio

    // Testnets
    5: { address: '0x7539a3af6c019b6816eb367cc38eec7d943aa545', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Goerli
    11155111: { address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Sepolia
    84532: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Base Sepolia
    168587773: { address: '0x4200000000000000000000000000000000000023', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Blast Sepolia
    10143: { address: '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701', symbol: 'WMON', name: 'Wrapped MON', decimals: 18 }, // Monad Testnet
    20250903: { address: '0xd7d13F2D4EBC0E43fa65bB16e831eB2068a2f4ae', symbol: 'WMOCKF', name: 'Wrapped MOCKF', decimals: 18 }, // ABC
    143: { address: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A', symbol: 'WMON', name: 'Wrapped MON', decimals: 18 }, // Monad Mainnet

    // Local
    31337: { address: '0xd723C18b9EbeC382A4cDb22939517ca21729Fb8e', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }, // Local
};

/**
 * Get wrapped native token info for a chain
 */
export function getWrappedNativeToken(chainId: number): Erc20TokenInfo | undefined {
    return WRAPPED_NATIVE_TOKENS[chainId];
}
