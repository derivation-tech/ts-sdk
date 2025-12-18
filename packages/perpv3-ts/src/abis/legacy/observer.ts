// Auto-generated from Observer.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const LEGACY_OBSERVER_ABI = [
    {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [
            {
                type: 'address',
                name: '_gate',
            },
        ],
    },
    {
        name: 'TickOutOfBound',
        type: 'error',
        inputs: [],
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
        name: 'getAcc',
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
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'portfolio',
                components: [
                    {
                        type: 'uint48[]',
                        name: 'oids',
                    },
                    {
                        type: 'uint48[]',
                        name: 'rids',
                    },
                    {
                        type: 'tuple',
                        name: 'position',
                        components: [
                            {
                                type: 'int128',
                                name: 'balance',
                            },
                            {
                                type: 'int128',
                                name: 'size',
                            },
                            {
                                type: 'uint128',
                                name: 'entryNotional',
                            },
                            {
                                type: 'uint128',
                                name: 'entrySocialLossIndex',
                            },
                            {
                                type: 'int128',
                                name: 'entryFundingIndex',
                            },
                        ],
                    },
                    {
                        type: 'tuple[]',
                        name: 'orders',
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
                    {
                        type: 'tuple[]',
                        name: 'ranges',
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
                    {
                        type: 'int256[]',
                        name: 'ordersTaken',
                    },
                ],
            },
            {
                type: 'tuple',
                name: 'blockInfo',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getAccMeta',
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
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [
            {
                type: 'uint256',
                name: 'onumber',
            },
            {
                type: 'uint256',
                name: 'rnumber',
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
                type: 'tuple[]',
                components: [
                    {
                        type: 'address',
                        name: 'instrumentAddr',
                    },
                    {
                        type: 'string',
                        name: 'symbol',
                    },
                    {
                        type: 'address',
                        name: 'market',
                    },
                    {
                        type: 'tuple',
                        name: 'dexV2Feeder',
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
                    {
                        type: 'tuple',
                        name: 'priceFeeder',
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
                    {
                        type: 'uint16',
                        name: 'initialMarginRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'maintenanceMarginRatio',
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
                    {
                        type: 'uint256',
                        name: 'spotPrice',
                    },
                    {
                        type: 'uint8',
                        name: 'condition',
                    },
                    {
                        type: 'tuple[]',
                        name: 'amms',
                        components: [
                            {
                                type: 'uint32',
                                name: 'expiry',
                            },
                            {
                                type: 'uint32',
                                name: 'timestamp',
                            },
                            {
                                type: 'uint8',
                                name: 'status',
                            },
                            {
                                type: 'int24',
                                name: 'tick',
                            },
                            {
                                type: 'uint160',
                                name: 'sqrtPX96',
                            },
                            {
                                type: 'uint128',
                                name: 'liquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLiquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalShort',
                            },
                            {
                                type: 'uint128',
                                name: 'openInterests',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLong',
                            },
                            {
                                type: 'uint128',
                                name: 'involvedFund',
                            },
                            {
                                type: 'uint128',
                                name: 'feeIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'protocolFee',
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
                                type: 'int128',
                                name: 'longFundingIndex',
                            },
                            {
                                type: 'int128',
                                name: 'shortFundingIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'insuranceFund',
                            },
                            {
                                type: 'uint128',
                                name: 'settlementPrice',
                            },
                        ],
                    },
                    {
                        type: 'uint256[]',
                        name: 'markPrices',
                    },
                ],
            },
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getAmm',
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
                        name: 'expiry',
                    },
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint8',
                        name: 'status',
                    },
                    {
                        type: 'int24',
                        name: 'tick',
                    },
                    {
                        type: 'uint160',
                        name: 'sqrtPX96',
                    },
                    {
                        type: 'uint128',
                        name: 'liquidity',
                    },
                    {
                        type: 'uint128',
                        name: 'totalLiquidity',
                    },
                    {
                        type: 'uint128',
                        name: 'totalShort',
                    },
                    {
                        type: 'uint128',
                        name: 'openInterests',
                    },
                    {
                        type: 'uint128',
                        name: 'totalLong',
                    },
                    {
                        type: 'uint128',
                        name: 'involvedFund',
                    },
                    {
                        type: 'uint128',
                        name: 'feeIndex',
                    },
                    {
                        type: 'uint128',
                        name: 'protocolFee',
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
                        type: 'int128',
                        name: 'longFundingIndex',
                    },
                    {
                        type: 'int128',
                        name: 'shortFundingIndex',
                    },
                    {
                        type: 'uint128',
                        name: 'insuranceFund',
                    },
                    {
                        type: 'uint128',
                        name: 'settlementPrice',
                    },
                ],
            },
        ],
    },
    {
        name: 'getInstrumentBatch',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'tuple[]',
                name: 'params',
                components: [
                    {
                        type: 'address',
                        name: 'instrument',
                    },
                    {
                        type: 'uint32[]',
                        name: 'expiries',
                    },
                ],
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                components: [
                    {
                        type: 'address',
                        name: 'instrumentAddr',
                    },
                    {
                        type: 'string',
                        name: 'symbol',
                    },
                    {
                        type: 'address',
                        name: 'market',
                    },
                    {
                        type: 'tuple',
                        name: 'dexV2Feeder',
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
                    {
                        type: 'tuple',
                        name: 'priceFeeder',
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
                    {
                        type: 'uint16',
                        name: 'initialMarginRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'maintenanceMarginRatio',
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
                    {
                        type: 'uint256',
                        name: 'spotPrice',
                    },
                    {
                        type: 'uint8',
                        name: 'condition',
                    },
                    {
                        type: 'tuple[]',
                        name: 'amms',
                        components: [
                            {
                                type: 'uint32',
                                name: 'expiry',
                            },
                            {
                                type: 'uint32',
                                name: 'timestamp',
                            },
                            {
                                type: 'uint8',
                                name: 'status',
                            },
                            {
                                type: 'int24',
                                name: 'tick',
                            },
                            {
                                type: 'uint160',
                                name: 'sqrtPX96',
                            },
                            {
                                type: 'uint128',
                                name: 'liquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLiquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalShort',
                            },
                            {
                                type: 'uint128',
                                name: 'openInterests',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLong',
                            },
                            {
                                type: 'uint128',
                                name: 'involvedFund',
                            },
                            {
                                type: 'uint128',
                                name: 'feeIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'protocolFee',
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
                                type: 'int128',
                                name: 'longFundingIndex',
                            },
                            {
                                type: 'int128',
                                name: 'shortFundingIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'insuranceFund',
                            },
                            {
                                type: 'uint128',
                                name: 'settlementPrice',
                            },
                        ],
                    },
                    {
                        type: 'uint256[]',
                        name: 'markPrices',
                    },
                ],
            },
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getInstrumentByAddressList',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address[]',
                name: 'instrumentList',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                components: [
                    {
                        type: 'address',
                        name: 'instrumentAddr',
                    },
                    {
                        type: 'string',
                        name: 'symbol',
                    },
                    {
                        type: 'address',
                        name: 'market',
                    },
                    {
                        type: 'tuple',
                        name: 'dexV2Feeder',
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
                    {
                        type: 'tuple',
                        name: 'priceFeeder',
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
                    {
                        type: 'uint16',
                        name: 'initialMarginRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'maintenanceMarginRatio',
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
                    {
                        type: 'uint256',
                        name: 'spotPrice',
                    },
                    {
                        type: 'uint8',
                        name: 'condition',
                    },
                    {
                        type: 'tuple[]',
                        name: 'amms',
                        components: [
                            {
                                type: 'uint32',
                                name: 'expiry',
                            },
                            {
                                type: 'uint32',
                                name: 'timestamp',
                            },
                            {
                                type: 'uint8',
                                name: 'status',
                            },
                            {
                                type: 'int24',
                                name: 'tick',
                            },
                            {
                                type: 'uint160',
                                name: 'sqrtPX96',
                            },
                            {
                                type: 'uint128',
                                name: 'liquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLiquidity',
                            },
                            {
                                type: 'uint128',
                                name: 'totalShort',
                            },
                            {
                                type: 'uint128',
                                name: 'openInterests',
                            },
                            {
                                type: 'uint128',
                                name: 'totalLong',
                            },
                            {
                                type: 'uint128',
                                name: 'involvedFund',
                            },
                            {
                                type: 'uint128',
                                name: 'feeIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'protocolFee',
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
                                type: 'int128',
                                name: 'longFundingIndex',
                            },
                            {
                                type: 'int128',
                                name: 'shortFundingIndex',
                            },
                            {
                                type: 'uint128',
                                name: 'insuranceFund',
                            },
                            {
                                type: 'uint128',
                                name: 'settlementPrice',
                            },
                        ],
                    },
                    {
                        type: 'uint256[]',
                        name: 'markPrices',
                    },
                ],
            },
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getNextInitializedTickOutside',
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
                type: 'int24',
                name: 'tick',
            },
            {
                type: 'bool',
                name: 'right',
            },
        ],
        outputs: [
            {
                type: 'int24',
            },
        ],
    },
    {
        name: 'getOrderIndexes',
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
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [
            {
                type: 'uint48[]',
            },
        ],
    },
    {
        name: 'getOrders',
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
                type: 'address',
                name: 'target',
            },
            {
                type: 'uint48[]',
                name: 'oids',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
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
        name: 'getPearls',
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
                type: 'int24[]',
                name: 'tids',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                components: [
                    {
                        type: 'uint128',
                        name: 'liquidityGross',
                    },
                    {
                        type: 'int128',
                        name: 'liquidityNet',
                    },
                    {
                        type: 'uint24',
                        name: 'nonce',
                    },
                    {
                        type: 'int96',
                        name: 'left',
                    },
                    {
                        type: 'int96',
                        name: 'taken',
                    },
                    {
                        type: 'uint128',
                        name: 'fee',
                    },
                    {
                        type: 'uint128',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int128',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'getPendings',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address[]',
                name: 'quotes',
            },
            {
                type: 'address',
                name: 'trader',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                name: 'pendings',
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
            {
                type: 'tuple',
                name: 'blockInfo',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getPortfolios',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'address',
                name: 'instrument',
            },
        ],
        outputs: [
            {
                type: 'uint32[]',
                name: 'expiries',
            },
            {
                type: 'tuple[]',
                name: 'portfolios',
                components: [
                    {
                        type: 'uint48[]',
                        name: 'oids',
                    },
                    {
                        type: 'uint48[]',
                        name: 'rids',
                    },
                    {
                        type: 'tuple',
                        name: 'position',
                        components: [
                            {
                                type: 'int128',
                                name: 'balance',
                            },
                            {
                                type: 'int128',
                                name: 'size',
                            },
                            {
                                type: 'uint128',
                                name: 'entryNotional',
                            },
                            {
                                type: 'uint128',
                                name: 'entrySocialLossIndex',
                            },
                            {
                                type: 'int128',
                                name: 'entryFundingIndex',
                            },
                        ],
                    },
                    {
                        type: 'tuple[]',
                        name: 'orders',
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
                    {
                        type: 'tuple[]',
                        name: 'ranges',
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
                    {
                        type: 'int256[]',
                        name: 'ordersTaken',
                    },
                ],
            },
            {
                type: 'tuple',
                name: 'blockInfo',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'getPosition',
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
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                components: [
                    {
                        type: 'int128',
                        name: 'balance',
                    },
                    {
                        type: 'int128',
                        name: 'size',
                    },
                    {
                        type: 'uint128',
                        name: 'entryNotional',
                    },
                    {
                        type: 'uint128',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int128',
                        name: 'entryFundingIndex',
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
                name: 'instrument',
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
        name: 'getRangeIndexes',
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
                type: 'address',
                name: 'target',
            },
        ],
        outputs: [
            {
                type: 'uint48[]',
            },
        ],
    },
    {
        name: 'getRanges',
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
                type: 'address',
                name: 'target',
            },
            {
                type: 'uint48[]',
                name: 'rids',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
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
        name: 'getRecords',
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
                type: 'int24[]',
                name: 'tids',
            },
            {
                type: 'uint24[]',
                name: 'nonces',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                components: [
                    {
                        type: 'int128',
                        name: 'taken',
                    },
                    {
                        type: 'uint128',
                        name: 'fee',
                    },
                    {
                        type: 'uint128',
                        name: 'entrySocialLossIndex',
                    },
                    {
                        type: 'int128',
                        name: 'entryFundingIndex',
                    },
                ],
            },
        ],
    },
    {
        name: 'getSetting',
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
                type: 'tuple',
                components: [
                    {
                        type: 'string',
                        name: 'symbol',
                    },
                    {
                        type: 'address',
                        name: 'config',
                    },
                    {
                        type: 'address',
                        name: 'gate',
                    },
                    {
                        type: 'address',
                        name: 'market',
                    },
                    {
                        type: 'address',
                        name: 'quote',
                    },
                    {
                        type: 'uint8',
                        name: 'decimals',
                    },
                    {
                        type: 'uint16',
                        name: 'initialMarginRatio',
                    },
                    {
                        type: 'uint16',
                        name: 'maintenanceMarginRatio',
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
        ],
    },
    {
        name: 'getTickBitmaps',
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
                type: 'int16[]',
                name: 'tbids',
            },
        ],
        outputs: [
            {
                type: 'uint256[]',
            },
        ],
    },
    {
        name: 'getVaultBalances',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'target',
            },
            {
                type: 'address[]',
                name: 'quotes',
            },
        ],
        outputs: [
            {
                type: 'uint256[]',
            },
            {
                type: 'tuple',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'inquireByNotional',
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
                type: 'uint256',
                name: 'notional',
            },
            {
                type: 'bool',
                name: 'long',
            },
        ],
        outputs: [
            {
                type: 'int256',
                name: 'size',
            },
            {
                type: 'tuple',
                name: 'quotation',
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
        name: 'inspectMaxReserveDexV2Pair',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'base',
            },
            {
                type: 'address',
                name: 'quote',
            },
        ],
        outputs: [
            {
                type: 'address',
                name: 'maxReservePair',
            },
            {
                type: 'uint112',
                name: 'reserve0',
            },
            {
                type: 'uint112',
                name: 'reserve1',
            },
        ],
    },
    {
        name: 'liquidityDetails',
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
                type: 'uint24',
                name: 'tickDelta',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'amm',
                components: [
                    {
                        type: 'uint160',
                        name: 'sqrtPX96',
                    },
                    {
                        type: 'int24',
                        name: 'tick',
                    },
                    {
                        type: 'uint256',
                        name: 'liquidity',
                    },
                ],
            },
            {
                type: 'int24[]',
                name: 'tids',
            },
            {
                type: 'tuple[]',
                name: 'pearls',
                components: [
                    {
                        type: 'int128',
                        name: 'liquidityNet',
                    },
                    {
                        type: 'int96',
                        name: 'left',
                    },
                ],
            },
            {
                type: 'tuple',
                name: 'blockInfo',
                components: [
                    {
                        type: 'uint32',
                        name: 'timestamp',
                    },
                    {
                        type: 'uint32',
                        name: 'height',
                    },
                ],
            },
        ],
    },
    {
        name: 'sizeByNotional',
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
                type: 'uint256',
                name: 'notional',
            },
            {
                type: 'bool',
                name: 'long',
            },
        ],
        outputs: [
            {
                type: 'int256',
            },
        ],
    },
] as const;
