// Auto-generated from CexMarket.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const CEX_MARKET_ABI = [
    {
        name: 'CexNoFeeder',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DecimalsExceed',
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
        name: 'InvalidCexPrice',
        type: 'error',
        inputs: [
            {
                type: 'address',
                name: 'aggregator',
            },
        ],
    },
    {
        name: 'LengthMismatch',
        type: 'error',
        inputs: [],
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
                        type: 'uint64',
                        name: 'scaler0',
                    },
                    {
                        type: 'address',
                        name: 'aggregator0',
                    },
                    {
                        type: 'uint24',
                        name: 'heartBeat0',
                    },
                    {
                        type: 'uint64',
                        name: 'scaler1',
                    },
                    {
                        type: 'address',
                        name: 'aggregator1',
                    },
                    {
                        type: 'uint24',
                        name: 'heartBeat1',
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
                name: 'state',
                components: [
                    {
                        type: 'uint32',
                        name: 'time',
                    },
                    {
                        type: 'uint224',
                        name: 'spot',
                    },
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
                        name: 'accumulation',
                    },
                ],
            },
        ],
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
                type: 'uint64',
                name: 'scaler0',
            },
            {
                type: 'address',
                name: 'aggregator0',
            },
            {
                type: 'uint24',
                name: 'heartBeat0',
            },
            {
                type: 'uint64',
                name: 'scaler1',
            },
            {
                type: 'address',
                name: 'aggregator1',
            },
            {
                type: 'uint24',
                name: 'heartBeat1',
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
                        name: 'time',
                    },
                    {
                        type: 'uint224',
                        name: 'spot',
                    },
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
                        name: 'accumulation',
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
        name: 'setFeeder',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address[]',
                name: 'instruments',
            },
            {
                type: 'tuple[]',
                name: 'priceFeeders',
                components: [
                    {
                        type: 'uint8',
                        name: 'ftype',
                    },
                    {
                        type: 'uint64',
                        name: 'scaler0',
                    },
                    {
                        type: 'address',
                        name: 'aggregator0',
                    },
                    {
                        type: 'uint24',
                        name: 'heartBeat0',
                    },
                    {
                        type: 'uint64',
                        name: 'scaler1',
                    },
                    {
                        type: 'address',
                        name: 'aggregator1',
                    },
                    {
                        type: 'uint24',
                        name: 'heartBeat1',
                    },
                ],
            },
        ],
        outputs: [],
    },
] as const;
