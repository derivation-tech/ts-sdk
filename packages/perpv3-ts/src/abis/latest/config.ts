// Auto-generated from Config.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const CURRENT_CONFIG_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [],
    },
    {
        name: 'BadMinMarginAmount',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadProtocolFeeRatio',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadTip',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadTradingFeeRatio',
        type: 'error',
        inputs: [],
    },
    {
        name: 'LengthMismatch',
        type: 'error',
        inputs: [],
    },
    {
        name: 'LiquidatorWhitelistAlreadyDisabled',
        type: 'error',
        inputs: [],
    },
    {
        name: 'LpWhitelistAlreadyDisabled',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ResetMarketInfo',
        type: 'error',
        inputs: [
            {
                type: 'string',
                name: 'mtype',
            },
        ],
    },
    {
        name: 'SetMarketZeroAddress',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DisableLiquidatorWhitelist',
        type: 'event',
        inputs: [],
    },
    {
        name: 'EnableLpWhitelistForQuote',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'bool',
                name: 'restricted',
            },
        ],
    },
    {
        name: 'Initialized',
        type: 'event',
        inputs: [
            {
                type: 'uint8',
                name: 'version',
            },
        ],
    },
    {
        name: 'OwnershipTransferred',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'previousOwner',
                indexed: true,
            },
            {
                type: 'address',
                name: 'newOwner',
                indexed: true,
            },
        ],
    },
    {
        name: 'SetLiquidatorWhitelist',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
            {
                type: 'bool',
                name: 'authorized',
            },
        ],
    },
    {
        name: 'SetLpWhitelistForQuote',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'user',
            },
            {
                type: 'bool',
                name: 'authorized',
            },
        ],
    },
    {
        name: 'SetMarketInfo',
        type: 'event',
        inputs: [
            {
                type: 'string',
                name: 'mtype',
            },
            {
                type: 'address',
                name: 'market',
            },
            {
                type: 'address',
                name: 'beacon',
            },
        ],
    },
    {
        name: 'SetQuoteParam',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'tuple',
                name: 'param',
                components: [
                    {
                        type: 'uint128',
                        name: 'minMarginAmount',
                    },
                    {
                        type: 'uint16',
                        name: 'tradingFeeRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'protocolFeeRatio',
                    },
                    {
                        type: 'uint8',
                        name: 'qtype',
                    },
                    {
                        type: 'uint128',
                        name: 'tip',
                    },
                ],
            },
        ],
    },
    {
        name: 'disableLiquidatorWhitelist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'enableLpWhitelistForQuote',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'bool',
                name: 'enable',
            },
        ],
        outputs: [],
    },
    {
        name: 'getAllMarkets',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'address[]',
            },
        ],
    },
    {
        name: 'getMarketInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'string',
                name: 'mtype',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'string',
                        name: 'mtype',
                    },
                    {
                        type: 'address',
                        name: 'market',
                    },
                    {
                        type: 'address',
                        name: 'beacon',
                    },
                ],
            },
        ],
    },
    {
        name: 'getQuoteParam',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint128',
                        name: 'minMarginAmount',
                    },
                    {
                        type: 'uint16',
                        name: 'tradingFeeRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'protocolFeeRatio',
                    },
                    {
                        type: 'uint8',
                        name: 'qtype',
                    },
                    {
                        type: 'uint128',
                        name: 'tip',
                    },
                ],
            },
        ],
    },
    {
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'admin',
            },
        ],
        outputs: [],
    },
    {
        name: 'isAuthorizedLiquidator',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
    {
        name: 'isAuthorizedLp',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
    {
        name: 'liquidatorWhitelist',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'bool',
                name: 'authorized',
            },
        ],
    },
    {
        name: 'lpWhitelist',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'user',
            },
        ],
        outputs: [
            {
                type: 'bool',
                name: 'authorized',
            },
        ],
    },
    {
        name: 'markets',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'uint256',
            },
        ],
        outputs: [
            {
                type: 'address',
            },
        ],
    },
    {
        name: 'marketsLength',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'uint256',
            },
        ],
    },
    {
        name: 'openLiquidator',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'bool',
            },
        ],
    },
    {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'address',
            },
        ],
    },
    {
        name: 'renounceOwnership',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'restrictLp',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
        ],
        outputs: [
            {
                type: 'bool',
                name: 'restricted',
            },
        ],
    },
    {
        name: 'setLiquidatorWhitelist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address[]',
                name: 'users',
            },
            {
                type: 'bool[]',
                name: 'flags',
            },
        ],
        outputs: [],
    },
    {
        name: 'setLpWhiteList',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address[]',
                name: 'quotes',
            },
            {
                type: 'address[]',
                name: 'users',
            },
            {
                type: 'bool[]',
                name: 'flags',
            },
        ],
        outputs: [],
    },
    {
        name: 'setMarketInfo',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'string',
                name: 'mtype',
            },
            {
                type: 'address',
                name: 'market',
            },
            {
                type: 'address',
                name: 'beacon',
            },
        ],
        outputs: [],
    },
    {
        name: 'setQuoteParam',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address[]',
                name: 'coins',
            },
            {
                type: 'tuple[]',
                name: 'params',
                components: [
                    {
                        type: 'uint128',
                        name: 'minMarginAmount',
                    },
                    {
                        type: 'uint16',
                        name: 'tradingFeeRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'protocolFeeRatio',
                    },
                    {
                        type: 'uint8',
                        name: 'qtype',
                    },
                    {
                        type: 'uint128',
                        name: 'tip',
                    },
                ],
            },
        ],
        outputs: [],
    },
    {
        name: 'transferOwnership',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'newOwner',
            },
        ],
        outputs: [],
    },
] as const;
