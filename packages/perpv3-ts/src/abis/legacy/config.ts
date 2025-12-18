// Auto-generated from Config.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const LEGACY_CONFIG_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'admin',
            },
        ],
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
        name: 'DisableLpWhitelist',
        type: 'event',
        inputs: [],
    },
    {
        name: 'OwnershipTransferred',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'user',
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
        name: 'SetBlastPointsAddress',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'blastPointsAddress',
            },
        ],
    },
    {
        name: 'SetBlastPointsOperator',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'blastPointsOperator',
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
        name: 'SetLpWhitelist',
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
                        type: 'uint64',
                        name: 'stabilityFeeRatioParam',
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
        name: 'blastPointsAddress',
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
        name: 'blastPointsOperator',
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
        name: 'disableLiquidatorWhitelist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'disableLpWhitelist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
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
                        type: 'uint64',
                        name: 'stabilityFeeRatioParam',
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
        name: 'openLp',
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
        name: 'setBlastPointsAddress',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: '_blastPointsAddress',
            },
        ],
        outputs: [],
    },
    {
        name: 'setBlastPointsOperator',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: '_blastPointsOperator',
            },
        ],
        outputs: [],
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
                        type: 'uint64',
                        name: 'stabilityFeeRatioParam',
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
