// Auto-generated from Gate.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const CURRENT_GATE_ABI = [
    {
        name: 'BadInstrumentAddress',
        type: 'error',
        inputs: [
            {
                type: 'address',
                name: 'expected',
            },
            {
                type: 'address',
                name: 'actual',
            },
        ],
    },
    {
        name: 'BlacklistedTrader',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InstrumentExists',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InsufficientReserve',
        type: 'error',
        inputs: [
            {
                type: 'uint256',
                name: 'requested',
            },
            {
                type: 'uint256',
                name: 'reserve',
            },
        ],
    },
    {
        name: 'InvalidMsgValue',
        type: 'error',
        inputs: [],
    },
    {
        name: 'MarketTypeNotSupported',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NewInstrumentFailed',
        type: 'error',
        inputs: [
            {
                type: 'bytes',
                name: 'lowLevelData',
            },
        ],
    },
    {
        name: 'NoDirectDeposit',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NotHandler',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NotInstrument',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NotSynFuturesV3Admin',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PendingDurationTooLong',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PendingWithdrawNotMature',
        type: 'error',
        inputs: [],
    },
    {
        name: 'UnsafeToken',
        type: 'error',
        inputs: [
            {
                type: 'address',
                name: 'token',
            },
        ],
    },
    {
        name: 'Blacklist',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'bool',
                name: 'banned',
            },
        ],
    },
    {
        name: 'Deposit',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'quantity',
            },
        ],
    },
    {
        name: 'Gather',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
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
                type: 'uint256',
                name: 'quantity',
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
        name: 'NewInstrument',
        type: 'event',
        inputs: [
            {
                type: 'bytes32',
                name: 'index',
            },
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'address',
                name: 'base',
            },
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'string',
                name: 'symbol',
            },
            {
                type: 'uint256',
                name: 'total',
            },
        ],
    },
    {
        name: 'Scatter',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
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
                type: 'uint256',
                name: 'quantity',
            },
        ],
    },
    {
        name: 'SetPendingDuration',
        type: 'event',
        inputs: [
            {
                type: 'uint256',
                name: 'duration',
            },
        ],
    },
    {
        name: 'SetThreshold',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'threshold',
            },
        ],
    },
    {
        name: 'UpdatePending',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'tuple',
                name: 'pending',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'bool',
                        name: 'native',
                    },
                    {
                        type: 'uint96',
                        name: 'amount',
                    },
                    {
                        type: 'uint120',
                        name: 'exemption',
                    },
                ],
            },
        ],
    },
    {
        name: 'Withdraw',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'quote',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'quantity',
            },
        ],
    },
    {
        name: 'allInstruments',
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
        name: 'allInstrumentsLength',
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
        name: 'deposit',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [],
    },
    {
        name: 'depositFor',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [],
    },
    {
        name: 'fundFlowOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'trader',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'fundFlow',
                components: [
                    {
                        type: 'uint128',
                        name: 'totalIn',
                    },
                    {
                        type: 'uint128',
                        name: 'totalOut',
                    },
                ],
            },
        ],
    },
    {
        name: 'gather',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint256',
                name: 'quantity',
            },
        ],
        outputs: [],
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
        name: 'handler',
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
        name: 'indexOf',
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
                type: 'bytes32',
                name: 'index',
            },
        ],
    },
    {
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'instrumentInitData',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'bytes',
            },
        ],
    },
    {
        name: 'isBlacklisted',
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
        name: 'launch',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'string',
                name: 'mtype',
            },
            {
                type: 'address',
                name: 'instrument',
            },
            {
                type: 'bytes',
                name: 'data',
            },
            {
                type: 'bytes32[2]',
                name: 'addArgs',
            },
        ],
        outputs: [
            {
                type: 'int24',
                name: 'tickLower',
            },
            {
                type: 'int24',
                name: 'tickUpper',
            },
            {
                type: 'tuple',
                name: 'range',
                components: [
                    {
                        type: 'uint128',
                        name: 'liquidity',
                    },
                    {
                        type: 'uint128',
                        name: 'entryFeeIndex',
                    },
                    {
                        type: 'uint96',
                        name: 'balance',
                    },
                    {
                        type: 'uint160',
                        name: 'sqrtEntryPX96',
                    },
                ],
            },
        ],
    },
    {
        name: 'pendingDuration',
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
        name: 'pendingOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'trader',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'pending',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'bool',
                        name: 'native',
                    },
                    {
                        type: 'uint96',
                        name: 'amount',
                    },
                    {
                        type: 'uint120',
                        name: 'exemption',
                    },
                ],
            },
        ],
    },
    {
        name: 'release',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'trader',
            },
        ],
        outputs: [],
    },
    {
        name: 'reserveOf',
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
                type: 'uint256',
                name: 'balance',
            },
        ],
    },
    {
        name: 'scatter',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint256',
                name: 'quantity',
            },
        ],
        outputs: [],
    },
    {
        name: 'setBlacklist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'bool',
                name: 'banned',
            },
        ],
        outputs: [],
    },
    {
        name: 'setPendingDuration',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint256',
                name: 'duration',
            },
        ],
        outputs: [],
    },
    {
        name: 'setThreshold',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'quote',
            },
            {
                type: 'uint256',
                name: 'threshold',
            },
        ],
        outputs: [],
    },
    {
        name: 'thresholdOf',
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
                type: 'uint256',
                name: 'threshold',
            },
        ],
    },
    {
        name: 'weth',
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
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [],
    },
    {
        name: 'withdrawFor',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [],
    },
] as const;
