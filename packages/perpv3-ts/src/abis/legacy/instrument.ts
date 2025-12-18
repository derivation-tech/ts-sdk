// Auto-generated from Instrument.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const LEGACY_INSTRUMENT_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [],
    },
    {
        name: 'AddTraderIneligible',
        type: 'error',
        inputs: [],
    },
    {
        name: 'AlreadyInitialized',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadAmmStatus',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadInstrumentCondition',
        type: 'error',
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
        name: 'ExpiryNotAligned',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InitTrivial',
        type: 'error',
        inputs: [
            {
                type: 'uint256',
                name: 'margin',
            },
            {
                type: 'uint256',
                name: 'minMargin',
            },
        ],
    },
    {
        name: 'LiquidatorIneligible',
        type: 'error',
        inputs: [],
    },
    {
        name: 'Locked',
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
        name: 'NotTradeable',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PairNotCleared',
        type: 'error',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
        ],
    },
    {
        name: 'SelfLiquidation',
        type: 'error',
        inputs: [],
    },
    {
        name: 'Timeout',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ZeroAddress',
        type: 'error',
        inputs: [],
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
        name: 'add',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32[2]',
                name: 'args',
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
        name: 'cancel',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [
            {
                type: 'bool[8]',
                name: 'succees',
            },
            {
                type: 'tuple[8]',
                name: 'pics',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'claimProtocolFee',
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
        name: 'claimYield',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'to',
            },
        ],
        outputs: [],
    },
    {
        name: 'condition',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'uint8',
            },
        ],
    },
    {
        name: 'configureYieldMode',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint8',
                name: 'yieldMode',
            },
        ],
        outputs: [],
    },
    {
        name: 'donateInsuranceFund',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint256',
                name: 'amount',
            },
        ],
        outputs: [],
    },
    {
        name: 'fill',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32',
                name: 'arg',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
            {
                type: 'uint256',
                name: 'tip',
            },
        ],
    },
    {
        name: 'freeze',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'getExpiries',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'uint32[]',
            },
        ],
    },
    {
        name: 'init',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'bytes32[2]',
                name: 'args',
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
        name: 'initialize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes',
                name: 'data',
            },
        ],
        outputs: [],
    },
    {
        name: 'inquire',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'int256',
                name: 'size',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint256',
                        name: 'benchmark',
                    },
                    {
                        type: 'uint160',
                        name: 'sqrtFairPX96',
                    },
                    {
                        type: 'int24',
                        name: 'tick',
                    },
                    {
                        type: 'uint256',
                        name: 'mark',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'fee',
                    },
                    {
                        type: 'uint256',
                        name: 'minAmount',
                    },
                    {
                        type: 'uint160',
                        name: 'sqrtPostFairPX96',
                    },
                    {
                        type: 'int24',
                        name: 'postTick',
                    },
                ],
            },
        ],
    },
    {
        name: 'liquidate',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'int256',
                name: 'size',
            },
            {
                type: 'uint256',
                name: 'amount',
            },
        ],
        outputs: [],
    },
    {
        name: 'multicall',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes[]',
                name: 'data',
            },
        ],
        outputs: [
            {
                type: 'bytes[]',
                name: 'results',
            },
        ],
    },
    {
        name: 'normalize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'place',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32[2]',
                name: 'args',
            },
        ],
        outputs: [
            {
                type: 'uint24',
                name: 'nonce',
            },
            {
                type: 'tuple',
                name: 'order',
                components: [
                    {
                        type: 'uint128',
                        name: 'balance',
                    },
                    {
                        type: 'int128',
                        name: 'size',
                    },
                ],
            },
        ],
    },
    {
        name: 'queryAccount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'uint8',
                name: 'query',
            },
            {
                type: 'bytes',
                name: 'inputs',
            },
        ],
        outputs: [
            {
                type: 'bytes',
                name: 'result',
            },
        ],
    },
    {
        name: 'queryContext',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'uint8',
                name: 'query',
            },
            {
                type: 'uint256[]',
                name: 'offsets',
            },
            {
                type: 'bytes',
                name: 'inputs',
            },
        ],
        outputs: [
            {
                type: 'uint256[]',
            },
        ],
    },
    {
        name: 'querySetting',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'uint256[]',
                name: 'offsets',
            },
        ],
        outputs: [
            {
                type: 'uint256[]',
            },
        ],
    },
    {
        name: 'recycleInsuranceFund',
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
        name: 'remove',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32[2]',
                name: 'args',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
            {
                type: 'uint256',
                name: 'fee',
            },
            {
                type: 'uint256',
                name: 'tip',
            },
        ],
    },
    {
        name: 'resolve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint128',
                name: 'settlementPrice',
            },
        ],
        outputs: [],
    },
    {
        name: 'setLeverage',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint8',
                name: 'leverage',
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
        outputs: [],
    },
    {
        name: 'settle',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [],
    },
    {
        name: 'sweep',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
            },
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'int256',
                name: 'size',
            },
        ],
        outputs: [],
    },
    {
        name: 'syncPointsOperator',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'trade',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'bytes32[2]',
                name: 'args',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'update',
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
        name: 'Add',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
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
        name: 'Adjust',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int256',
                name: 'net',
            },
        ],
    },
    {
        name: 'Cancel',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int24',
                name: 'tick',
            },
            {
                type: 'uint32',
                name: 'nonce',
            },
            {
                type: 'uint256',
                name: 'fee',
            },
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'ClaimProtocolFee',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'amount',
            },
        ],
    },
    {
        name: 'DeleteContext',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
        ],
    },
    {
        name: 'DonateInsuranceFund',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'donator',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'amount',
            },
        ],
    },
    {
        name: 'Fill',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int24',
                name: 'tick',
            },
            {
                type: 'uint32',
                name: 'nonce',
            },
            {
                type: 'uint256',
                name: 'fee',
            },
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
            {
                type: 'address',
                name: 'operator',
            },
            {
                type: 'uint256',
                name: 'tip',
            },
        ],
    },
    {
        name: 'FundingFee',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int256',
                name: 'funding',
            },
        ],
    },
    {
        name: 'Liquidate',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'amount',
            },
            {
                type: 'uint256',
                name: 'mark',
            },
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'int256',
                name: 'size',
            },
        ],
    },
    {
        name: 'Place',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int24',
                name: 'tick',
            },
            {
                type: 'uint32',
                name: 'nonce',
            },
            {
                type: 'tuple',
                name: 'order',
                components: [
                    {
                        type: 'uint128',
                        name: 'balance',
                    },
                    {
                        type: 'int128',
                        name: 'size',
                    },
                ],
            },
        ],
    },
    {
        name: 'RecycleInsuranceFund',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'amount',
            },
        ],
    },
    {
        name: 'Remove',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int24',
                name: 'tickLower',
            },
            {
                type: 'int24',
                name: 'tickUpper',
            },
            {
                type: 'uint256',
                name: 'fee',
            },
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
            {
                type: 'address',
                name: 'operator',
            },
            {
                type: 'uint256',
                name: 'tip',
            },
        ],
    },
    {
        name: 'Settle',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'uint256',
                name: 'settlement',
            },
            {
                type: 'uint256',
                name: 'balance',
            },
            {
                type: 'address',
                name: 'operator',
            },
        ],
    },
    {
        name: 'Sweep',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int256',
                name: 'size',
            },
            {
                type: 'int256',
                name: 'takenSize',
            },
            {
                type: 'uint256',
                name: 'takenValue',
            },
            {
                type: 'uint256',
                name: 'entryNotional',
            },
            {
                type: 'uint16',
                name: 'feeRatio',
            },
            {
                type: 'uint160',
                name: 'sqrtPX96',
            },
            {
                type: 'uint256',
                name: 'mark',
            },
            {
                type: 'address',
                name: 'operator',
            },
        ],
    },
    {
        name: 'Trade',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'int256',
                name: 'size',
            },
            {
                type: 'uint256',
                name: 'amount',
            },
            {
                type: 'int256',
                name: 'takenSize',
            },
            {
                type: 'uint256',
                name: 'takenValue',
            },
            {
                type: 'uint256',
                name: 'entryNotional',
            },
            {
                type: 'uint16',
                name: 'feeRatio',
            },
            {
                type: 'uint160',
                name: 'sqrtPX96',
            },
            {
                type: 'uint256',
                name: 'mark',
            },
        ],
    },
    {
        name: 'UpdateAmmStatus',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'uint8',
                name: 'status',
            },
            {
                type: 'uint160',
                name: 'sqrtPX96',
            },
            {
                type: 'uint256',
                name: 'mark',
            },
        ],
    },
    {
        name: 'UpdateCondition',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'timestamp',
            },
            {
                type: 'uint8',
                name: 'condition',
            },
        ],
    },
    {
        name: 'UpdateFeeState',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'uint128',
                name: 'feeIndex',
            },
            {
                type: 'uint128',
                name: 'protocolFee',
            },
        ],
    },
    {
        name: 'UpdateFundingIndex',
        type: 'event',
        inputs: [
            {
                type: 'uint256',
                name: 'fundingIndex',
            },
        ],
    },
    {
        name: 'UpdateMarginRatio',
        type: 'event',
        inputs: [
            {
                type: 'uint16',
                name: 'initialMarginRatio',
            },
            {
                type: 'uint16',
                name: 'maintenanceMarginRatio',
            },
        ],
    },
    {
        name: 'UpdateParam',
        type: 'event',
        inputs: [
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
        name: 'UpdatePosition',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'address',
                name: 'trader',
                indexed: true,
            },
            {
                type: 'tuple',
                name: 'pic',
                components: [
                    {
                        type: 'int256',
                        name: 'balance',
                    },
                    {
                        type: 'int256',
                        name: 'size',
                    },
                    {
                        type: 'uint256',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint256',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int256',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'UpdateSocialLossInsuranceFund',
        type: 'event',
        inputs: [
            {
                type: 'uint32',
                name: 'expiry',
                indexed: true,
            },
            {
                type: 'uint128',
                name: 'longSocialLossIndex',
            },
            {
                type: 'uint128',
                name: 'shortSocialLossIndex',
            },
            {
                type: 'uint128',
                name: 'insuranceFund',
            },
        ],
    },
    {
        name: 'AdminChanged',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'previousAdmin',
            },
            {
                type: 'address',
                name: 'newAdmin',
            },
        ],
    },
    {
        name: 'BeaconUpgraded',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'beacon',
                indexed: true,
            },
        ],
    },
    {
        name: 'Upgraded',
        type: 'event',
        inputs: [
            {
                type: 'address',
                name: 'implementation',
                indexed: true,
            },
        ],
    },
    {
        name: 'AddLiquidityExceedMax',
        type: 'error',
        inputs: [],
    },
    {
        name: 'AddOverflow',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadAmmTiming',
        type: 'error',
        inputs: [],
    },
    {
        name: 'BadTargetSize',
        type: 'error',
        inputs: [
            {
                type: 'int256',
                name: 'totalSize',
            },
            {
                type: 'int256',
                name: 'requestedSize',
            },
        ],
    },
    {
        name: 'DivByZero',
        type: 'error',
        inputs: [],
    },
    {
        name: 'InvariantBroken',
        type: 'error',
        inputs: [],
    },
    {
        name: 'LiquidatePostImrUnsafe',
        type: 'error',
        inputs: [],
    },
    {
        name: 'NoCounterparty',
        type: 'error',
        inputs: [
            {
                type: 'bool',
                name: 'noShortParty',
            },
            {
                type: 'uint256',
                name: 'socialLoss',
            },
        ],
    },
    {
        name: 'OrderFull',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderImrUnsafe',
        type: 'error',
        inputs: [
            {
                type: 'uint256',
                name: 'amount',
            },
            {
                type: 'uint256',
                name: 'minAmount',
            },
        ],
    },
    {
        name: 'OrderNotExist',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderNotFullyTaken',
        type: 'error',
        inputs: [
            {
                type: 'int256',
                name: 'requested',
            },
            {
                type: 'int256',
                name: 'taken',
            },
        ],
    },
    {
        name: 'OrderOccupied',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderTickUnaligned',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderTooFar',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderTrivial',
        type: 'error',
        inputs: [],
    },
    {
        name: 'OrderWrongSide',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PositionBankrupt',
        type: 'error',
        inputs: [],
    },
    {
        name: 'PositionNotExist',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RangeNotExist',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ReuseNonEmptyRecord',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RoundHalfUpBadParam',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TargetSafe',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TickOutOfBound',
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
        name: 'GetErc20NameFailed',
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
        name: 'AddInvalidTickDelta',
        type: 'error',
        inputs: [],
    },
    {
        name: 'AddSlippage',
        type: 'error',
        inputs: [],
    },
    {
        name: 'AddTrivial',
        type: 'error',
        inputs: [
            {
                type: 'uint256',
                name: 'liquidity',
            },
            {
                type: 'uint256',
                name: 'minLiquidity',
            },
        ],
    },
    {
        name: 'CrazySpot',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ExpiryBelowSettlingDuration',
        type: 'error',
        inputs: [],
    },
    {
        name: 'ExpiryExceedMaxExpiryPeriod',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RangeFull',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RangeOccupied',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RemoveActiveRange',
        type: 'error',
        inputs: [],
    },
    {
        name: 'RemoveSlippage',
        type: 'error',
        inputs: [],
    },
    {
        name: 'SqrtPX96OutOfBound',
        type: 'error',
        inputs: [],
    },
    {
        name: 'CrazyDeviation',
        type: 'error',
        inputs: [],
    },
    {
        name: 'DivUnderflow',
        type: 'error',
        inputs: [],
    },
    {
        name: 'MulOverflow',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TradeImrUnsafe',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TradeMmrUnsafe',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TradeOutOfLiquidity',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TradeSlippage',
        type: 'error',
        inputs: [],
    },
    {
        name: 'TradeStabilityFeeLimit',
        type: 'error',
        inputs: [
            {
                type: 'uint16',
                name: 'stabilityFeeRatio',
            },
            {
                type: 'uint16',
                name: 'limitStabilityFeeRatio',
            },
        ],
    },
    {
        name: 'TradeTrivial',
        type: 'error',
        inputs: [],
    },
] as const;
