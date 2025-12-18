// Auto-generated from Observer.json.
// Do not edit manually. Regenerate via scripts when source ABI changes.

export const CURRENT_OBSERVER_ABI = [
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
        name: 'fetchOnChainContext',
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
                name: 'trader',
            },
            {
                type: 'int256',
                name: 'signedSize',
            },
        ],
        outputs: [
            {
                type: 'tuple',
                name: 'context',
                components: [
                    {
                        type: 'tuple',
                        name: 'setting',
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
                                type: 'bool',
                                name: 'placePaused',
                            },
                            {
                                type: 'uint8',
                                name: 'fundingHour',
                            },
                            {
                                type: 'bool',
                                name: 'disableOrderRebate',
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
                        type: 'uint8',
                        name: 'condition',
                    },
                    {
                        type: 'tuple',
                        name: 'amm',
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
                        type: 'tuple',
                        name: 'priceData',
                        components: [
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
                                name: 'markPrice',
                            },
                            {
                                type: 'uint256',
                                name: 'spotPrice',
                            },
                            {
                                type: 'uint256',
                                name: 'benchmarkPrice',
                            },
                            {
                                type: 'address',
                                name: 'feeder0',
                            },
                            {
                                type: 'address',
                                name: 'feeder1',
                            },
                            {
                                type: 'uint256',
                                name: 'feeder0UpdatedAt',
                            },
                            {
                                type: 'uint256',
                                name: 'feeder1UpdatedAt',
                            },
                        ],
                    },
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
                    {
                        type: 'tuple',
                        name: 'quoteState',
                        components: [
                            {
                                type: 'address',
                                name: 'quote',
                            },
                            {
                                type: 'uint8',
                                name: 'decimals',
                            },
                            {
                                type: 'string',
                                name: 'symbol',
                            },
                            {
                                type: 'uint256',
                                name: 'threshold',
                            },
                            {
                                type: 'uint256',
                                name: 'reserve',
                            },
                            {
                                type: 'uint256',
                                name: 'balance',
                            },
                            {
                                type: 'uint256',
                                name: 'allowance',
                            },
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
                        type: 'tuple',
                        name: 'spacing',
                        components: [
                            {
                                type: 'int24',
                                name: 'pearl',
                            },
                            {
                                type: 'int24',
                                name: 'order',
                            },
                            {
                                type: 'int24',
                                name: 'range',
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
        ],
    },
    {
        name: 'getAllInstrumentList',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            {
                type: 'address[]',
                name: 'instrumentList',
            },
        ],
    },
    {
        name: 'getBaseSizeByQuote',
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
    {
        name: 'getBaseSizeByTick',
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
                name: 'destTick',
            },
        ],
        outputs: [
            {
                type: 'int256',
            },
        ],
    },
    {
        name: 'getInstrument',
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
                name: 'setting',
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
                        type: 'bool',
                        name: 'placePaused',
                    },
                    {
                        type: 'uint8',
                        name: 'fundingHour',
                    },
                    {
                        type: 'bool',
                        name: 'disableOrderRebate',
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
                type: 'tuple',
                name: 'amm',
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
                type: 'tuple',
                name: 'priceData',
                components: [
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
                        name: 'markPrice',
                    },
                    {
                        type: 'uint256',
                        name: 'spotPrice',
                    },
                    {
                        type: 'uint256',
                        name: 'benchmarkPrice',
                    },
                    {
                        type: 'address',
                        name: 'feeder0',
                    },
                    {
                        type: 'address',
                        name: 'feeder1',
                    },
                    {
                        type: 'uint256',
                        name: 'feeder0UpdatedAt',
                    },
                    {
                        type: 'uint256',
                        name: 'feeder1UpdatedAt',
                    },
                ],
            },
            {
                type: 'tuple',
                name: 'spacing',
                components: [
                    {
                        type: 'int24',
                        name: 'pearl',
                    },
                    {
                        type: 'int24',
                        name: 'order',
                    },
                    {
                        type: 'int24',
                        name: 'range',
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
        name: 'getPortfolio',
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
                name: 'trader',
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
        name: 'getPriceData',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address[]',
                name: 'instruments',
            },
            {
                type: 'uint32[]',
                name: 'expiries',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                name: 'prices',
                components: [
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
                        name: 'markPrice',
                    },
                    {
                        type: 'uint256',
                        name: 'spotPrice',
                    },
                    {
                        type: 'uint256',
                        name: 'benchmarkPrice',
                    },
                    {
                        type: 'address',
                        name: 'feeder0',
                    },
                    {
                        type: 'address',
                        name: 'feeder1',
                    },
                    {
                        type: 'uint256',
                        name: 'feeder0UpdatedAt',
                    },
                    {
                        type: 'uint256',
                        name: 'feeder1UpdatedAt',
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
        name: 'getQuoteStates',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                type: 'address',
                name: 'trader',
            },
            {
                type: 'address[]',
                name: 'quotes',
            },
        ],
        outputs: [
            {
                type: 'tuple[]',
                name: 'states',
                components: [
                    {
                        type: 'address',
                        name: 'quote',
                    },
                    {
                        type: 'uint8',
                        name: 'decimals',
                    },
                    {
                        type: 'string',
                        name: 'symbol',
                    },
                    {
                        type: 'uint256',
                        name: 'threshold',
                    },
                    {
                        type: 'uint256',
                        name: 'reserve',
                    },
                    {
                        type: 'uint256',
                        name: 'balance',
                    },
                    {
                        type: 'uint256',
                        name: 'allowance',
                    },
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
        name: 'inquireByBase',
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
                type: 'int256',
                name: 'signedSize',
            },
        ],
        outputs: [
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
        name: 'inquireByQuote',
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
        name: 'inquireByTick',
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
] as const;
