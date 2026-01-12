import type { Erc20TokenInfo } from '../types';

/**
 * Common ERC20 tokens per chain
 *
 * Extracted from web3-context/packages/context/src/chain/*.json
 * Covers 25+ chains with 150+ tokens total
 */
// prettier-ignore
export const COMMON_ERC20_TOKENS: Record<number, Erc20TokenInfo[]> = {
    // ABC (Chain ID: 20250903)
    20250903: [
        { symbol: "USDM", name: "USD Mock Token", address: "0x8da593B1084727DD82212A0b812415851F29cdec", decimals: 6 },
    ],

    // Monad mainnet
    143: [
        { symbol: "AUSD", name: "AUSD", address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a", decimals: 6 },
        { symbol: "SOL", name: "Wrapped SOL", address: "0xea17E5a9efEBf1477dB45082d67010E2245217f1", decimals: 9 },
        { symbol: "USDC", name: "USD Coin", address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", decimals: 6 },
        { symbol: "USDT0", name: "USDT0", address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D", decimals: 6 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c", decimals: 8 },
        { symbol: "WETH", name: "Wrapped Ether", address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242", decimals: 18 },
        { symbol: "XAUt0", name: "XAUt0", address: "0x01bFF41798a0BcF287b996046Ca68b395DbC1071", decimals: 6 },
        { symbol: "sMON", name: "Kintsu Staked Monad", address: "0xA3227C5969757783154C60bF0bC1944180ed81B9", decimals: 18 },
        { symbol: "suBTC", name: "Sumerian BTC", address: "0xe85411C030fB32A9D8b14Bbbc6CB19417391F711", decimals: 18 },
        { symbol: "suETH", name: "Sumerian ETH", address: "0x1c22531AA9747d76fFF8F0A43b37954ca67d28e0", decimals: 18 },
        { symbol: "suUSD", name: "Sumerian USD", address: "0x8BF591Eae535f93a242D5A954d3Cde648b48A5A8", decimals: 18 },
        { symbol: "wstETH", name: "Wrapped liquid staked Ether 2.0", address: "0x10Aeaf63194db8d453d4D85a06E5eFE1dd0b5417", decimals: 18 },
    ],

    // Arbitrum (Chain ID: 42161)
    42161: [
        { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
        { symbol: "USDC.e", name: "USD Coin(Arb1)", address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", decimals: 6 },
        { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", decimals: 8 },
        { symbol: "UNI", name: "Uniswap", address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", decimals: 18 },
        { symbol: "LINK", name: "ChainLink Token", address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", decimals: 18 },
        { symbol: "LDO", name: "Lido DAO Token", address: "0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60", decimals: 18 },
        { symbol: "CRV", name: "Curve DAO Token", address: "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978", decimals: 18 },
        { symbol: "FRAX", name: "Frax", address: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F", decimals: 18 },
        { symbol: "FXS", name: "Frax Share", address: "0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7", decimals: 18 },
        { symbol: "GMX", name: "GMX", address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", decimals: 18 },
        { symbol: "COMP", name: "Compound", address: "0x354A6dA3fcde098F8389cad84b0182725c6C91dE", decimals: 18 },
        { symbol: "TUSD", name: "TrueUSD", address: "0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07", decimals: 18 },
        { symbol: "GRT", name: "Graph Token", address: "0x9623063377AD1B27544C965cCd7342f7EA7e88C7", decimals: 18 },
        { symbol: "LRC", name: "LoopringCoin V2", address: "0x46d0cE7de6247b0A95f67b43B589b4041BaE7fbE", decimals: 18 },
        { symbol: "YFI", name: "yearn.finance", address: "0x82e3A8F066a6989666b031d916c43672085b1582", decimals: 18 },
        { symbol: "GNO", name: "Gnosis Token", address: "0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1", decimals: 18 },
        { symbol: "BAL", name: "Balancer", address: "0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8", decimals: 18 },
        { symbol: "SUSHI", name: "SushiToken", address: "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A", decimals: 18 },
        { symbol: "MAGIC", name: "MAGIC", address: "0x539bdE0d7Dbd336b79148AA742883198BBF60342", decimals: 18 },
    ],

    // Avalanche (Chain ID: 43114)
    43114: [
        { symbol: "USDt", name: "Tether USD", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6 },
        { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
        { symbol: "USDC.e", name: "Briged USD Coin", address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", decimals: 6 },
        { symbol: "WETH.e", name: "Bridged Wrapped ETH", address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", decimals: 18 },
    ],

    // Base (Chain ID: 8453)
    8453: [
        { symbol: "USDbC", name: "USD Base Coin", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
        { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
        { symbol: "YFI", name: "yearn.finance", address: "0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239", decimals: 18 },
        { symbol: "rETH", name: "Rocket Pool ETH", address: "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c", decimals: 18 },
        { symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", decimals: 18 },
        { symbol: "BASED", name: "BASED Token", address: "0x9CBD543f1B1166b2Df36b68Eb6bB1DcE24E6aBDf", decimals: 18 },
        { symbol: "COMP", name: "Compound", address: "0x9e1028F5F1D5eDE59748FFceE5532509976840E0", decimals: 18 },
        { symbol: "BAL", name: "Balancer", address: "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1", decimals: 18 },
        { symbol: "SUSHI", name: "SushiToken", address: "0x7D49a065D17d6d4a55dc13649901fdBB98B2AFBA", decimals: 18 },
        { symbol: "CRV", name: "Curve DAO Token", address: "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415", decimals: 18 },
        { symbol: "F", name: "SynFutures", address: "0x2C24497D4086490e7EaD87CC12597fb50c2E6eD6", decimals: 18 },
    ],

    // BaseSepolia (Chain ID: 84532)
    84532: [
        { symbol: "USDM", name: "USDM", address: "0xBc97004659b51C325a293386F319e66ACA4561C4", decimals: 18 },
    ],

    // Berachain Bartio (Chain ID: 80084)
    80084: [
        { symbol: "USDM", name: "USD Mock", address: "0x82C353484c0a557aff07A74f0cda13eb7e52DB08", decimals: 6 },
    ],

    // Blast (Chain ID: 81457)
    81457: [
        { symbol: "USDB", name: "USDB", address: "0x4300000000000000000000000000000000000003", decimals: 18 },
        { symbol: "BLAST", name: "Blast", address: "0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad", decimals: 18 },
        { symbol: "MIA", name: "Mia", address: "0xa4c7aa67189ec5623121c6c94ec757dfed932d4b", decimals: 18 },
        { symbol: "PAC", name: "PacMoon", address: "0x5ffd9ebd27f2fcab044c0f0a26a45cb62fa29c06", decimals: 18 },
        { symbol: "fwWETH", name: "Few Wrapped Wrapped Ether", address: "0x66714db8f3397c767d0a602458b5b4e3c0fe7dd1", decimals: 18 },
        { symbol: "ezETH", name: "Renzo Restaked ETH", address: "0x2416092f143378750bb29b79ed961ab195cceea5", decimals: 18 },
        { symbol: "weETH", name: "Wrapped eETH", address: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", decimals: 18 },
    ],

    // BSC (Chain ID: 56)
    56: [
        { symbol: "ETH", name: "Binance-Peg Ethereum Token", address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", decimals: 18 },
        { symbol: "USDC.e", name: "Binance-Peg USD Coin", address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18 },
        { symbol: "USDT", name: "  Binance-Peg BSC-USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
        { symbol: "DAI", name: " Binance-Peg Dai Token", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18 },
        { symbol: "BTCB", name: "Binance-Peg BTCB Token", address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", decimals: 18 },
        { symbol: "XRP", name: "XRP Token", address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18 },
        { symbol: "ADA", name: "Cardano Token", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18 },
        { symbol: "DOGE", name: "Dogecoin", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8 },
        { symbol: "MATIC", name: "Matic Token", address: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", decimals: 18 },
        { symbol: "BUSD", name: "BUSD Token", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
        { symbol: "DOT", name: "Polkadot Token", address: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", decimals: 18 },
        { symbol: "LTC", name: "Litecoin Token", address: "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", decimals: 18 },
        { symbol: "TRX", name: "TRON", address: "0xCE7de646e7208a4Ef112cb6ed5038FA6cC6b12e3", decimals: 6 },
        { symbol: "SHIB", name: "SHIBA INU", address: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", decimals: 18 },
        { symbol: "AVAX", name: "Avalanche", address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18 },
        { symbol: "UNI", name: "Uniswap", address: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", decimals: 18 },
        { symbol: "TONCOIN", name: "Wrapped TON Coin", address: "0x76A797A59Ba2C17726896976B7B3747BfD1d220f", decimals: 9 },
        { symbol: "LINK", name: "ChainLink Token", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18 },
        { symbol: "ATOM", name: "Cosmos Token", address: "0x0Eb3a705fc54725037CC9e008bDede697f62F335", decimals: 18 },
        { symbol: "BTT", name: "BitTorrent", address: "0x8595F9dA7b868b1822194fAEd312235E43007b49", decimals: 18 },
        { symbol: "F", name: "SynFutures", address: "0xc9cCbd76c2353e593Cc975F13295e8289d04D3Bb", decimals: 18 },
    ],

    // Conflux (Chain ID: 1030)
    1030: [
        { symbol: "XCFX", name: "X nucleon CFX", address: "0x889138644274a7dc602f25a7e7d53ff40e6d0091", decimals: 18 },
        { symbol: "NUT", name: "Nucleon Governance Token", address: "0xfe197e7968807b311d476915db585831b43a7e3b", decimals: 18 },
        { symbol: "USDT", name: "Tether USD", address: "0xfe97e85d13abd9c1c33384e796f10b73905637ce", decimals: 18 },
        { symbol: "ETH", name: "Ethereum Token", address: "0xa47f43de2f9623acb395ca4905746496d2014d57", decimals: 18 },
        { symbol: "USDC.e", name: "USD Coin", address: "0x6963efed0ab40f6c3d7bda44a05dcf1437c44372", decimals: 18 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x1f545487c62e5acfea45dcadd9c627361d1616d8", decimals: 18 },
        { symbol: "BNB", name: "BNB Token", address: "0x94bd7a37d2ce24cc597e158facaa8d601083ffec", decimals: 18 },
    ],

    // Ethereum (Chain ID: 1)
    1: [
        { symbol: "DAI", name: "Dai Stablecoin", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
        { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
        { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
        { symbol: "BNB", name: "BNB", address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", decimals: 18 },
        { symbol: "FRAX", name: "Frax", address: "0x853d955aCEf822Db058eb8505911ED77F175b99e", decimals: 18 },
        { symbol: "Matic", name: "Matic Token", address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", decimals: 18 },
        { symbol: "UNI", name: "Uniswap", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 },
        { symbol: "SHIB", name: "SHIBA INU", address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", decimals: 18 },
        { symbol: "OKB", name: "OKB", address: "0x75231F58b43240C9718Dd58B4967c5114342a86c", decimals: 18 },
        { symbol: "HEX", name: "HEX", address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39", decimals: 8 },
        { symbol: "stETH", name: "Liquid staked Ether 2.0", address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
        { symbol: "BUSD", name: "Binance USD", address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53", decimals: 18 },
        { symbol: "anyLTC", name: "ANY Litecoin", address: "0x0aBCFbfA8e3Fda8B7FBA18721Caf7d5cf55cF5f5", decimals: 8 },
        { symbol: "THETA", name: "Theta Token", address: "0x3883f5e181fccaF8410FA61e12b59BAd963fb645", decimals: 18 },
        { symbol: "TONCOIN", name: "Wrapped TON Coin", address: "0x582d872A1B094FC48F5DE31D3B73F2D9bE47def1", decimals: 9 },
        { symbol: "LINK", name: "ChainLink Token", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
        { symbol: "LEO", name: "Bitfinex LEO Token", address: "0x2AF5D2aD76741191D15Dfe7bF6aC92d4Bd912Ca3", decimals: 18 },
        { symbol: "LDO", name: "Lido DAO Token", address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", decimals: 18 },
        { symbol: "F", name: "SynFutures", address: "0x6e15A54B5EcAc17e58daDedDbe8506a7560252F9", decimals: 18 },
    ],

    // Gnosis (Chain ID: 100)
    100: [
        { symbol: "USDT", name: "Tether USD on xDai", address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6", decimals: 6 },
        { symbol: "USDC.e", name: "Bridged USDC", address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0", decimals: 6 },
        { symbol: "USDC", name: "USD Coin", address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", decimals: 6 },
        { symbol: "WBTC", name: "Wrapped BTC on xDai", address: "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252", decimals: 8 },
        { symbol: "WETH", name: "Wrapped ETH on xDai", address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", decimals: 18 },
    ],

    // Goerli (Chain ID: 5)
    5: [
        { symbol: "MATIC", name: "Matic Token", address: "0xbf3b5CF32066650Ea0b28277e621Ee3d0b41905A", decimals: 18 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844", decimals: 18 },
        { symbol: "USDM", name: "USD Mock Token", address: "0x82C353484c0a557aff07A74f0cda13eb7e52DB08", decimals: 6 },
    ],

    // Klaytn (Chain ID: 8217)
    8217: [
        { symbol: "oETH", name: "Orbit Bridge Klaytn Ethereum", address: "0x34d21b1e550d73cee41151c77f3c73359527a396", decimals: 18 },
        { symbol: "oUSDT", name: "Orbit Bridge Klaytn USD Tether", address: "0xcee8faf64bb97a73bb51e115aa89c17ffa8dd167", decimals: 6 },
        { symbol: "oBNB", name: "Orbit Bridge Klaytn Binance Coin", address: "0x574e9c26bda8b95d7329505b4657103710eb32ea", decimals: 18 },
        { symbol: "oUSDC", name: "Orbit Bridge Klaytn USD Coin", address: "0x754288077d0ff82af7a5317c7cb8c444d421d103", decimals: 6 },
        { symbol: "oMATIC", name: "Orbit Bridge Klaytn Matic Token", address: "0xa006ba407cfc6584c90bac24ed971261885a0fd6", decimals: 18 },
    ],

    // Linea (Chain ID: 59144)
    59144: [
        { symbol: "USDC.e", name: "USD//C", address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", decimals: 6 },
        { symbol: "USDT", name: "Tether USD", address: "0xA219439258ca9da29E9Cc4cE5596924745e12B93", decimals: 6 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5", decimals: 18 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", decimals: 8 },
        { symbol: "UNI", name: "Uniswap", address: "0x636B22bC471c955A8DB60f28D4795066a8201fa3", decimals: 18 },
        { symbol: "LINK", name: "ChainLink Token", address: "0x5B16228B94b68C7cE33AF2ACc5663eBdE4dCFA2d", decimals: 18 },
        { symbol: "LDO", name: "Lido DAO Token", address: "0x0e076AAFd86a71dCEAC65508DAF975425c9D0cB6", decimals: 18 },
        { symbol: "KNC", name: "Kyber Network Crystal v2", address: "0x3b2F62d42DB19B30588648bf1c184865D4C3B1D6", decimals: 18 },
        { symbol: "MIM", name: "Magic Internet Money", address: "0xDD3B8084AF79B9BaE3D1b668c0De08CCC2C9429A", decimals: 18 },
        { symbol: "METH", name: "Mock ETH Token", address: "0x038AFb2A9102F31e0CE89db51f92B8c8B184AB85", decimals: 18 },
        { symbol: "USDM", name: "USD Mock Token", address: "0x7a61Fd2092a3933831E826c08f0D12913FEfB96C", decimals: 6 },
    ],

    // Local (Chain ID: 31337)
    31337: [
        { symbol: "USDC", name: "USDC Coin", address: "0x911EB93171EDCBBC0ED8CCc838735b67ec1b2580", decimals: 6 },
        { symbol: "USDT", name: "Tether USD", address: "0x208B314810a368F978B612b87E6271Ea5ff1cD95", decimals: 18 },
        { symbol: "DAI", name: "Dai Stable Coin", address: "0x9fdE50e50ffFb0EE02d5398Aa0B0E9d25d64CcAA", decimals: 18 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x15b948eE63563f6AF626a061517e1e531A9D78d0", decimals: 8 },
        { symbol: "MATIC", name: "Matic Token", address: "0x8D44a26983030e390a3cCf135B270B313AEbb181", decimals: 18 },
        { symbol: "BNB", name: "BNB Token", address: "0x0a4674bfdD977d7440A371c5E3333d0E99FF69f2", decimals: 18 },
    ],

    // Manta (Chain ID: 169)
    169: [
        { symbol: "MANTA", name: "Manta", address: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", decimals: 18 },
        { symbol: "USDC", name: "USD Coin", address: "0xb73603C5d87fA094B7314C74ACE2e64D165016fb", decimals: 6 },
    ],

    // Mantle (Chain ID: 5000)
    5000: [
        { symbol: "USDT", name: "Mantle Bridged USDT", address: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", decimals: 6 },
        { symbol: "USDC.e", name: "Mantle Bridged USDC", address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", decimals: 6 },
        { symbol: "WETH", name: "Mantle Bridged ETH", address: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111", decimals: 18 },
        { symbol: "WBTC", name: "Mantle Bridged WBTC", address: "0xCAbAE6f6Ea1ecaB08Ad02fE02ce9A44F09aebfA2", decimals: 8 },
    ],

    // MAPO (Chain ID: 22776)
    22776: [
        { symbol: "USDC.e", name: "Mapped USD Coin", address: "0x9f722b2cb30093f766221fd0d37964949ed66918", decimals: 18 },
        { symbol: "USDT", name: "Mapped Tether USD", address: "0x33daba9618a75a7aff103e53afe530fbacf4a3dd", decimals: 18 },
        { symbol: "DAI", name: "Mapped Dai Stablecoin", address: "0xEdDfAac857cb94aE8A0347e2b1b06f21AA1AAeFA", decimals: 18 },
        { symbol: "ETH", name: "Mapped Wrapped Ether", address: "0x05ab928d446d8ce6761e368c8e7be03c3168a9ec", decimals: 18 },
        { symbol: "IDV", name: "Mapped Idavoll Network", address: "0xeac6cfd6e9e2fa033d85b7abdb6b14fe8aa71f2a", decimals: 18 },
    ],

    // monadTestnet (Chain ID: 10143)
    10143: [
        { symbol: "USDC", name: "USD Coin", address: "0x534b2f3A21130d7a60830c2Df862319e593943A3", decimals: 6 },
        { symbol: "USDM", name: "USD Mock", address: "0x618102779b8564B7EFa49B26D70d941896222B55", decimals: 6 },
    ],

    // optimism (Chain ID: 10)
    10: [
        { symbol: "USDT", name: "Tether USD", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
        { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
        { symbol: "USDC.e", name: "USD Coin (Bridged from Ethereum)", address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", decimals: 6 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8 },
        { symbol: "LINK", name: "ChainLink Token", address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", decimals: 18 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
        { symbol: "LDO", name: "Lido DAO Token", address: "0xFdb794692724153d1488CcdBE0C56c252596735F", decimals: 18 },
        { symbol: "OP", name: "Optimism", address: "0x4200000000000000000000000000000000000042", decimals: 18 },
        { symbol: "FRAX", name: "Frax", address: "0x2E3D870790dC77A83DD1d18184Acc7439A53f475", decimals: 18 },
        { symbol: "SNX", name: "Synthetix Network Token", address: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4", decimals: 18 },
    ],

    // pharosdevnet (Chain ID: 50002)
    50002: [
        { symbol: "USDM", name: "USDM", address: "0x46b1A929Fda6198174c0ba41E87771F16f679a4B", decimals: 18 },
    ],

    // Polygon (Chain ID: 137)
    137: [
        { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6 },
        { symbol: "USDC.e", name: "USD Coin (PoS)", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", decimals: 6 },
        { symbol: "USDT", name: "(PoS) Tether USD", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
        { symbol: "DAI", name: "(PoS) Dai Stablecoin", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
        { symbol: "WBTC", name: "(PoS) Wrapped BTC", address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
        { symbol: "WETH", name: "Wrapped Ether", address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", decimals: 18 },
        { symbol: "AAVE", name: "Aave (PoS)", address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 },
        { symbol: "SHIB", name: "SHIBA INU (PoS)", address: "0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec", decimals: 18 },
        { symbol: "BNB", name: "BNB (PoS)", address: "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3", decimals: 18 },
        { symbol: "BUSD", name: "(PoS) Binance USD", address: "0xdAb529f40E671A1D4bF91361c21bf9f0C9712ab7", decimals: 18 },
        { symbol: "AVAX", name: "Avalanche Token", address: "0x2C89bbc92BD86F8075d1DEcc58C7F4E0107f286b", decimals: 18 },
        { symbol: "UNI", name: "Uniswap (PoS)", address: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", decimals: 18 },
        { symbol: "LINK", name: "ChainLink Token", address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
        { symbol: "LDO", name: "Lido DAO Token (PoS)", address: "0xC3C7d422809852031b44ab29EEC9F1EfF2A58756", decimals: 18 },
        { symbol: "CRO", name: "CRO (PoS)", address: "0xAdA58DF0F643D959C2A47c9D4d4c1a4deFe3F11C", decimals: 8 },
        { symbol: "APE", name: "ApeCoin (PoS)", address: "0xB7b31a6BC18e48888545CE79e83E06003bE70930", decimals: 18 },
        { symbol: "TUSD", name: "TrueUSD (PoS)", address: "0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756", decimals: 18 },
        { symbol: "GRT", name: "Graph Token (PoS)", address: "0x5fe2B58c013d7601147DcdD68C143A77499f5531", decimals: 18 },
        { symbol: "FRAX", name: "Frax", address: "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89", decimals: 18 },
        { symbol: "SAND", name: "SAND", address: "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683", decimals: 18 },
        { symbol: "FTM", name: "Fantom Token (PoS)", address: "0xC9c1c1c20B3658F8787CC2FD702267791f224Ce1", decimals: 18 },
    ],

    // polygonzkevm (Chain ID: 1101)
    1101: [
        { symbol: "USDC.e", name: "USDC Token (Legacy)", address: "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035", decimals: 6 },
        { symbol: "MATIC", name: "Matic Token", address: "0xa2036f0538221a77A3937F1379699f44945018d0", decimals: 18 },
        { symbol: "USDT", name: "Tether USD", address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d", decimals: 6 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4", decimals: 18 },
        { symbol: "AAVE", name: "Aave Token", address: "0x68791CFE079814c46e0E25C19Bcc5BFC71A744f7", decimals: 18 },
        { symbol: "LINK", name: "ChainLink Token", address: "0x4B16e4752711A7ABEc32799C976F3CeFc0111f2B", decimals: 18 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1", decimals: 8 },
    ],

    // Scroll (Chain ID: 534352)
    534352: [
        { symbol: "USDT", name: "Tether USD", address: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df", decimals: 6 },
        { symbol: "USDC.e", name: "USD Coin (Bridged from Ethereum)", address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", decimals: 6 },
        { symbol: "WBTC", name: "Wrapped BTC", address: "0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1", decimals: 8 },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97", decimals: 18 },
        { symbol: "UNI", name: "Uniswap", address: "0x434cdA25E8a2CA5D9c1C449a8Cb6bCbF719233E8", decimals: 18 },
        { symbol: "AAVE", name: "Aave Token", address: "0x79379C0E09a41d7978f883a56246290eE9a8c4d3", decimals: 18 },
        { symbol: "CRV", name: "Curve DAO Token", address: "0xB755039eDc7910C1F1BD985D48322E55A31AC0bF", decimals: 18 },
        { symbol: "CAKE", name: "PancakeSwap Token", address: "0x1b896893dfc86bb67Cf57767298b9073D2c1bA2c", decimals: 18 },
        { symbol: "LUSD", name: "LUSD Stablecoin", address: "0xeDEAbc3A1e7D21fE835FFA6f83a710c70BB1a051", decimals: 18 },
        { symbol: "BAL", name: "Balancer", address: "0x6a28e90582c583fcd3347931c544819C31e9D0e0", decimals: 18 },
        { symbol: "USDM", name: "USD Mock Token", address: "0x82C353484c0a557aff07A74f0cda13eb7e52DB08", decimals: 6 },
        { symbol: "METH", name: "Mock ETH Token", address: "0x772C92e5e11626470c7820B1Fa600219653Ad7Cd", decimals: 18 },
    ],

    // Sepolia (Chain ID: 11155111)
    11155111: [
        { symbol: "USDC", name: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 },
    ],

    // zkSyncEra (Chain ID: 324)
    324: [
        { symbol: "USDC.e", name: "USDC Token (Bridged from Ethereum)", address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", decimals: 6 },
        { symbol: "MUTE", name: "MUTE Token", address: "0x0e97C7a0F8B2C9885C8ac9fC6136e829CbC21d42", decimals: 18 },
        { symbol: "SPACE", name: "SPACE Token", address: "0x47260090cE5e83454d5f05A0AbbB2C953835f777", decimals: 18 },
        { symbol: "USDM", name: "Mock USDC Coin", address: "0xB2578E4D0f94c76Cde665a884b86fb4EE16CBFB8", decimals: 6 },
        { symbol: "METH", name: "Mock ETH", address: "0xa6E5e7DDcd6e7C5959f4AdE9aEd97594346436aF", decimals: 18 },
    ],

};

/**
 * Get common ERC20 tokens for a chain
 */
export function getCommonErc20Tokens(chainId: number): Erc20TokenInfo[] {
    return COMMON_ERC20_TOKENS[chainId] ?? [];
}
