// Auto-generated from DexV2Market.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const DEX_V2_MARKET_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: '_config',
            },
            {
                type: 'address',
                name: '_gate',
            },
        ],
    },
    {
        name: 'CastUint256ToUint224Overflow',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DecimalsExceed',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DexV2NoFeeder',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DexV2PairLiquidity',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DexV2RepeatedFactory',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DivByZero',
        type: 'error',
        inputs: [],
    },
    {
        name: 'GetErc20DecimalsFailed',
        type: 'error',
        inputs: [
            {
                type: 'address',
                name: 'token',
            },
        ],
    },
    {
        name: 'GetErc20SymbolFailed',
        type: 'error',
        inputs: [
            {
                type: 'address',
                name: 'token',
            },
        ],
    },
    {
        name: 'NotGate',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NotSynFuturesV3Admin',
        type: 'error',
        inputs: [],
    },
    {
        name: 'QuoteNotSupported',
        type: 'error',
        inputs: [],
    },
    {
        name: 'WrongStatusToFetchMarkPrice',
        type: 'error',
        inputs: [],
    },
    {
        name: 'AddDexV2Factory',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'factory',
            },
            {
                type: 'uint256',
                name: 'number',
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
        name: 'SetFeeder',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
                indexed: true,
            },
            {
                type: 'tuple',
                name: 'feeder',
                components: [
                    {
                        type: 'uint8',
                        name: 'ftype',
                    },
                    {
                        type: 'bool',
                        name: 'isToken0Quote',
                    },
                    {
                        type: 'address',
                        name: 'pair',
                    },
                    {
                        type: 'uint64',
                        name: 'scaler0',
                    },
                    {
                        type: 'uint64',
                        name: 'scaler1',
                    },
                ],
            },
        ],
    },
    {
        name: 'UpdateAccState',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
                indexed: true,
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'tuple',
                name: 'accState',
                components: [
                    {
                        type: 'uint32',
                        name: 'initTime',
                    },
                    {
                        type: 'uint224',
                        name: 'initMark',
                    },
                    {
                        type: 'uint256',
                        name: 'initAccumulation',
                    },
                ],
            },
        ],
    },
    {
        name: 'addDexV2Factory',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'dexV2Factory',
            },
        ],
        outputs: [],
    },
    {
        name: 'clearStates',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
        ],
        outputs: [],
    },
    {
        name: 'config',
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
        name: 'feeders',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
        ],
        outputs: [
            {
                type: 'uint8',
                name: 'ftype',
            },
            {
                type: 'bool',
                name: 'isToken0Quote',
            },
            {
                type: 'address',
                name: 'pair',
            },
            {
                type: 'uint64',
                name: 'scaler0',
            },
            {
                type: 'uint64',
                name: 'scaler1',
            },
        ],
    },
    {
        name: 'gate',
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
        name: 'getAccState',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint32',
                        name: 'initTime',
                    },
                    {
                        type: 'uint224',
                        name: 'initMark',
                    },
                    {
                        type: 'uint256',
                        name: 'initAccumulation',
                    },
                ],
            },
        ],
    },
    {
        name: 'getAllInstruments',
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
        name: 'getBenchmarkPrice',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
        ],
        outputs: [
            {
                type: 'uint256',
                name: 'benchmark',
            },
        ],
    },
    {
        name: 'getDexV2Factories',
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
        name: 'getMarkPrice',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint8',
                name: 'status',
            },
        ],
        outputs: [
            {
                type: 'uint256',
                name: 'mark',
            },
        ],
    },
    {
        name: 'getMarketType',
        type: 'function',
        stateMutability: 'pure',
        inputs: [],
        outputs: [
            {
                type: 'string',
            },
        ],
    },
    {
        name: 'getSpotPrice',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
        ],
        outputs: [
            {
                type: 'uint256',
                name: 'spot',
            },
        ],
    },
    {
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address[]',
                name: '_factories',
            },
        ],
        outputs: [],
    },
    {
        name: 'instruments',
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
        name: 'instrumentsLength',
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
        name: 'markPrice',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint8',
                name: 'status',
            },
        ],
        outputs: [
            {
                type: 'uint256',
                name: 'mark',
            },
        ],
    },
    {
        name: 'prepareInstrument',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'bytes',
                name: 'data',
            },
        ],
        outputs: [
            {
                type: 'bytes32',
                name: 'index',
            },
            {
                type: 'address',
                name: 'base',
            },
            {
                type: 'bytes',
                name: 'initData',
            },
        ],
    },
    {
        name: 'updateFeeder',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'instrument',
            },
        ],
        outputs: [],
    },
] as const;
