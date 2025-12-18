// Auto-generated from Guardian.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const CURRENT_GUARDIAN_ABI = [
    {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'GetErc20DecimalsFailed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'GetErc20SymbolFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LengthMismatch',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotAdmin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotAdminOrVaultFactory',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotOperator',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SameAdminAddress',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'instrument',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bytes',
                name: 'lowLevelData',
                type: 'bytes',
            },
        ],
        name: 'FreezeInstrumentFailed',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint8',
                name: 'version',
                type: 'uint8',
            },
        ],
        name: 'Initialized',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'previousAdminRole',
                type: 'bytes32',
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'newAdminRole',
                type: 'bytes32',
            },
        ],
        name: 'RoleAdminChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'RoleGranted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'RoleRevoked',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
        ],
        name: 'SetToAddress',
        type: 'event',
    },
    {
        inputs: [],
        name: 'DEFAULT_ADMIN_ROLE',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'OPERATOR_ROLE',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'VAULT_FACTORY_ROLE',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'dexV2Factory',
                type: 'address',
            },
        ],
        name: 'addDexV2Factory',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'uint32[]',
                name: 'expiries',
                type: 'uint32[]',
            },
        ],
        name: 'claimProtocolFee',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'config',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'disableLiquidatorWhitelist',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'emergingFeederFactory',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'quote',
                type: 'address',
            },
            {
                internalType: 'bool',
                name: 'enable',
                type: 'bool',
            },
        ],
        name: 'enableLpWhitelistForQuote',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
        ],
        name: 'freeze',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'gate',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
        ],
        name: 'getRoleAdmin',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'grantEmergingFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'grantPythFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'grantRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'grantStorkFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'hasRole',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_admin',
                type: 'address',
            },
            {
                internalType: 'address[]',
                name: '_operator',
                type: 'address[]',
            },
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
        ],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes[]',
                name: 'data',
                type: 'bytes[]',
            },
        ],
        name: 'multicall',
        outputs: [
            {
                internalType: 'bytes[]',
                name: 'results',
                type: 'bytes[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
        ],
        name: 'normalize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pythFeederFactory',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'uint32[]',
                name: 'expiries',
                type: 'uint32[]',
            },
        ],
        name: 'recycleInsuranceFund',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'quotes',
                type: 'address[]',
            },
            {
                internalType: 'address[]',
                name: 'traders',
                type: 'address[]',
            },
        ],
        name: 'release',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'renounceRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'uint128[]',
                name: 'settlementPrices',
                type: 'uint128[]',
            },
        ],
        name: 'resolve',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'revokeEmergingFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'revokePythFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'role',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'revokeRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'operators',
                type: 'address[]',
            },
        ],
        name: 'revokeStorkFeederFactoryOperator',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'traders',
                type: 'address[]',
            },
            {
                internalType: 'bool[]',
                name: 'banned',
                type: 'bool[]',
            },
        ],
        name: 'setBlacklist',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'marketType',
                type: 'string',
            },
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'enum FeederType',
                        name: 'ftype',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint64',
                        name: 'scaler0',
                        type: 'uint64',
                    },
                    {
                        internalType: 'address',
                        name: 'aggregator0',
                        type: 'address',
                    },
                    {
                        internalType: 'uint24',
                        name: 'heartBeat0',
                        type: 'uint24',
                    },
                    {
                        internalType: 'uint64',
                        name: 'scaler1',
                        type: 'uint64',
                    },
                    {
                        internalType: 'address',
                        name: 'aggregator1',
                        type: 'address',
                    },
                    {
                        internalType: 'uint24',
                        name: 'heartBeat1',
                        type: 'uint24',
                    },
                ],
                internalType: 'struct PriceFeeder[]',
                name: 'priceFeeders',
                type: 'tuple[]',
            },
        ],
        name: 'setCexMarketPriceFeeder',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_config',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '_gate',
                type: 'address',
            },
        ],
        name: 'setConfigAndGateAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'coins',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'uint128',
                        name: 'minMarginAmount',
                        type: 'uint128',
                    },
                    {
                        internalType: 'uint16',
                        name: 'tradingFeeRatio',
                        type: 'uint16',
                    },
                    {
                        internalType: 'uint16',
                        name: 'protocolFeeRatio',
                        type: 'uint16',
                    },
                    {
                        internalType: 'enum QuoteType',
                        name: 'qtype',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint128',
                        name: 'tip',
                        type: 'uint128',
                    },
                ],
                internalType: 'struct QuoteParam[]',
                name: 'params',
                type: 'tuple[]',
            },
        ],
        name: 'setConfigQuoteParam',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'bool[]',
                name: 'params',
                type: 'bool[]',
            },
        ],
        name: 'setDisableOrderRebate',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_emergingFeederFactory',
                type: 'address',
            },
        ],
        name: 'setEmergingFeederFactoryAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'uint8[]',
                name: 'params',
                type: 'uint8[]',
            },
        ],
        name: 'setFundingHour',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'uint16[]',
                name: 'imrs',
                type: 'uint16[]',
            },
            {
                internalType: 'uint16[]',
                name: 'mmrs',
                type: 'uint16[]',
            },
        ],
        name: 'setInstrumentLeverage',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'uint128',
                        name: 'minMarginAmount',
                        type: 'uint128',
                    },
                    {
                        internalType: 'uint16',
                        name: 'tradingFeeRatio',
                        type: 'uint16',
                    },
                    {
                        internalType: 'uint16',
                        name: 'protocolFeeRatio',
                        type: 'uint16',
                    },
                    {
                        internalType: 'enum QuoteType',
                        name: 'qtype',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint128',
                        name: 'tip',
                        type: 'uint128',
                    },
                ],
                internalType: 'struct QuoteParam[]',
                name: 'params',
                type: 'tuple[]',
            },
        ],
        name: 'setInstrumentQuoteParam',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'users',
                type: 'address[]',
            },
            {
                internalType: 'bool[]',
                name: 'flags',
                type: 'bool[]',
            },
        ],
        name: 'setLiquidatorWhitelist',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'quotes',
                type: 'address[]',
            },
            {
                internalType: 'address[]',
                name: 'users',
                type: 'address[]',
            },
            {
                internalType: 'bool[]',
                name: 'flags',
                type: 'bool[]',
            },
        ],
        name: 'setLpWhiteList',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'mtype',
                type: 'string',
            },
            {
                internalType: 'address',
                name: 'market',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'beacon',
                type: 'address',
            },
        ],
        name: 'setMarketInfo',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'duration',
                type: 'uint256',
            },
        ],
        name: 'setPendingDuration',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'instruments',
                type: 'address[]',
            },
            {
                internalType: 'bool[]',
                name: 'params',
                type: 'bool[]',
            },
        ],
        name: 'setPlacePaused',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_pythFeederFactory',
                type: 'address',
            },
        ],
        name: 'setPythFeederFactoryAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'baseIndex',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: '_id',
                type: 'bytes32',
            },
        ],
        name: 'setPythFeederId',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_storkFeederFactory',
                type: 'address',
            },
        ],
        name: 'setStorkFeederFactoryAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'baseIndex',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: 'feederId',
                type: 'bytes32',
            },
        ],
        name: 'setStorkFeederId',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newAdmin',
                type: 'address',
            },
        ],
        name: 'setSynFuturesV3Admin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'quotes',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'thresholds',
                type: 'uint256[]',
            },
        ],
        name: 'setThreshold',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
        ],
        name: 'setToAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'storkFeederFactory',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: 'interfaceId',
                type: 'bytes4',
            },
        ],
        name: 'supportsInterface',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'to',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newAdmin',
                type: 'address',
            },
        ],
        name: 'transferEmergingFeederFactoryAdmin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newAdmin',
                type: 'address',
            },
        ],
        name: 'transferPythFeederFactoryAdmin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newAdmin',
                type: 'address',
            },
        ],
        name: 'transferStorkFeederFactoryAdmin',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'quotes',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amounts',
                type: 'uint256[]',
            },
        ],
        name: 'withdrawFromGate',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'tokens',
                type: 'address[]',
            },
        ],
        name: 'withdrawFromGuardian',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;
