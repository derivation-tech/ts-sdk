# SynFutures V3 TypeScript SDK

TypeScript SDK for simulating and interacting with SynFutures V3 Perpetual Contracts.

## Features

- 🚀 **Type-Safe** - Full TypeScript support with type definitions
- 🔧 **Viem Integration** - Built on top of viem for Ethereum interactions
- 📦 **Modular** - Clean, modular architecture
- 🎯 **Contract-First** - Types mirror Solidity contracts exactly
- 💼 **Simulation API** - Class-based input classes for trade, order, and range operations
- 🔄 **Unified Queries** - Single API for fetching data from RPC or API endpoints
- ✅ **Validation Helpers** - Comprehensive helper methods for order placement, position management, and range operations
- 🎬 **Demo Framework** - Built-in demo framework for testing and examples

## Installation

```bash
npm install @synfutures/perpv3-ts
```

## Usage

### Basic Setup

```typescript
import { createPublicClient, http, parseUnits } from 'viem';
import { getPerpInfo } from '@synfutures/perpv3-ts';
import { fetchOnchainContext } from '@synfutures/perpv3-ts/queries';
import { TradeInput, QuotationWithSize } from '@synfutures/perpv3-ts/actions';
import { UserSetting, Side } from '@synfutures/perpv3-ts/types';
import { WAD } from '@synfutures/perpv3-ts/constants';

// Create a public client
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

const userSetting = new UserSetting(
    10, // deadline seconds offset
    10, // slippage tolerance in bps (0.1%)
    3n * WAD, // leverage in WAD (3x)
    1 // limit order margin buffer in bps (optional)
);

// Get perp info for the chain
const perpInfo = getPerpInfo(chainId);

// Fetch onchain context
const onchainContext = await fetchOnchainContext(
    instrumentAddress,
    expiry,
    { chainId, publicClient, observerAddress: perpInfo.observer },
    traderAddress
);

// Fetch quotation first (required for trade simulation)
const onchainContextWithQuotation = await fetchOnchainContext(
    instrumentAddress,
    expiry,
    rpcConfig,
    traderAddress,
    signedSize // e.g., parseUnits('1', 18) for LONG
);

// Create trade input and simulate
const tradeInput = new TradeInput(
    instrumentAddress,
    expiry,
    traderAddress,
    parseUnits('1', 18), // baseQuantity in WAD
    Side.LONG,
    userSetting,
    { margin: parseUnits('100', 18) } // margin in WAD
);

const quotationWithSize = new QuotationWithSize(signedSize, onchainContextWithQuotation.quotation!);

const [tradeParam, simulation] = tradeInput.simulate(onchainContext, quotationWithSize);
```

### Simulation Actions

The SDK provides class-based input classes for various operations. Each input class has a `simulate()` method that returns simulation results.

#### Trading

```typescript
import { parseUnits } from 'viem';
import { TradeInput, AdjustMarginInput, AdjustLeverageInput, QuotationWithSize } from '@synfutures/perpv3-ts/actions';
import { PERP_EXPIRY, Side, UserSetting } from '@synfutures/perpv3-ts/types';
import { WAD } from '@synfutures/perpv3-ts/constants';

const userSetting = new UserSetting(10, 10, 3n * WAD, 1);

// Trade by margin amount
const tradeByMargin = new TradeInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    parseUnits('1', 18), // baseQuantity in WAD
    Side.LONG,
    userSetting,
    { margin: parseUnits('100', 18) } // margin in WAD
);
// First fetch quotation, then simulate
const quotationWithSize = new QuotationWithSize(signedSize, quotation);
const [tradeParam, simulation] = tradeByMargin.simulate(onchainContext, quotationWithSize);

// Trade by target leverage
const leverageUserSetting = new UserSetting(10, 10, 5n * WAD, 1);
const tradeByLeverage = new TradeInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    parseUnits('1', 18), // baseQuantity
    Side.LONG,
    leverageUserSetting
);
const [tradeParam, simulation] = tradeByLeverage.simulate(onchainContext, quotationWithSize);

// Close position
const closeSignedSize = -position.size; // signed trade size (opposite of position size)
const closeSide = closeSignedSize >= 0n ? Side.LONG : Side.SHORT;
const closeTrade = new TradeInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    closeSignedSize >= 0n ? closeSignedSize : -closeSignedSize, // positive quantity
    closeSide,
    userSetting
);
const closeQuotationWithSize = new QuotationWithSize(closeSignedSize, quotation);
const [tradeParam, simulation] = closeTrade.simulate(onchainContext, closeQuotationWithSize);
// Note: `tradeParam.amount` (and `simulation.marginDelta`) can be negative when closing/reducing,
// which indicates a margin withdrawal. Only check balance/allowance when `simulation.marginDelta > 0`.

// Adjust margin
const adjustMargin = new AdjustMarginInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    parseUnits('0.5', 18), // marginDelta in WAD
    true, // transferIn
    userSetting
);
const [adjustParam, simulation] = adjustMargin.simulate(onchainContext);

// Adjust leverage
const targetLeverageUserSetting = new UserSetting(10, 10, 3n * WAD, 1);
const adjustLeverage = new AdjustLeverageInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    targetLeverageUserSetting
);
const [adjustParam, simulation] = adjustLeverage.simulate(onchainContext);

// Reduce position (adjusts to target leverage)
const reducePosition = new TradeInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    parseUnits('-4', 18), // Reduce by 4 units (opposite side)
    Side.SHORT, // Opposite side of existing LONG position
    userSetting // targetLeverage applies to post-trade position
);
const [tradeParam, simulation] = reducePosition.simulate(onchainContext, quotationWithSize);
// tradeParam.amount can be positive (deposit) or negative (withdraw) depending on leverage adjustment
// Post-trade leverage will match the target leverage specified in userSetting
```

**Note on Leverage Management:** All trades (opening, increasing, or reducing positions) adjust margin to achieve the target leverage specified in `userSetting`. When reducing a position, margin adjustment depends on whether you're increasing or decreasing leverage. If the required withdrawal exceeds `maxWithdrawableMargin` (based on IMR), the withdrawal is capped and `simulation.exceedMaxLeverage` will be `true`.

#### Orders

```typescript
import { parseUnits } from 'viem';
import {
    PlaceInput,
    CrossMarketOrderInput,
    ScaledLimitOrderInput,
    BatchOrderSizeDistribution,
} from '@synfutures/perpv3-ts/actions';
import { UserSetting, Side } from '@synfutures/perpv3-ts/types';
import { WAD } from '@synfutures/perpv3-ts/constants';

const userSetting = new UserSetting(10, 10, 3n * WAD, 1);

// Place a limit order
const placeOrder = new PlaceInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    200000, // tick
    parseUnits('0.01', 18), // baseQuantity (unsigned)
    Side.SHORT,
    userSetting
);
const [placeParam, simulation] = placeOrder.simulate(onchainContext);

// Cross market order
const crossMarketOrder = new CrossMarketOrderInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    Side.LONG,
    parseUnits('1', 18), // baseQuantity
    199000, // targetTick (must be on the correct side of the AMM tick)
    userSetting
);
const crossSimulation = crossMarketOrder.simulate(onchainContext, swapQuote);

// Scaled limit order
const scaledOrder = new ScaledLimitOrderInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    Side.LONG,
    parseUnits('1', 18), // baseQuantity
    [200000, 199000, 198000], // priceInfo (ticks or WAD prices)
    BatchOrderSizeDistribution.FLAT,
    userSetting
);
const simulation = scaledOrder.simulate(onchainContext);
```

Notes:

- `PlaceInput` validates `baseQuantity` in the constructor (must be positive), so invalid inputs may throw before calling `simulate()`.
- `ScaledLimitOrderSimulation` is flattened: use `totalBase`, `totalQuote`, `totalMargin`, `minBase`, and `orders[].minOrderSize` (instead of nested `totals`/`constraints`).

#### Range Liquidity

```typescript
import { parseUnits } from 'viem';
import { AddInput, RemoveInput } from '@synfutures/perpv3-ts/actions';
import { UserSetting } from '@synfutures/perpv3-ts/types';
import { WAD } from '@synfutures/perpv3-ts/constants';

const userSetting = new UserSetting(10, 10, 3n * WAD, 1);

// Add liquidity to a range
const addLiquidity = new AddInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    parseUnits('10', 18), // marginAmount in WAD
    190000, // tickLower
    210000, // tickUpper
    userSetting
);
const [addParam, simulation] = addLiquidity.simulate(onchainContext);

// Remove liquidity from a range
const removeLiquidity = new RemoveInput(
    instrumentAddress,
    PERP_EXPIRY,
    traderAddress,
    190000, // tickLower
    210000, // tickUpper
    userSetting
);
const [removeParam, simulation] = removeLiquidity.simulate(onchainContext);
```

### Validation Helpers

The SDK provides comprehensive helper methods to validate operations before simulation. These methods return structured results with clear error messages.

#### Quick Reference

```typescript
import { Side } from '@synfutures/perpv3-ts/types';

// ✅ Recommended: Full feasibility check for order placement
const result = snapshot.isTickFeasibleForLimitOrder(1000, Side.LONG);
if (!result.feasible) {
    console.error(`Cannot place order: ${result.reason}`);
}

// Check if instrument is tradable
const tradability = snapshot.isTradable();
if (!tradability.tradable) {
    console.error(`Cannot trade: ${tradability.reason}`);
}

// Get feasible tick range for limit orders
const range = snapshot.getFeasibleLimitOrderTickRange(Side.LONG);
if (range) {
    console.log(`Can place LONG orders from tick ${range.minTick} to ${range.maxTick}`);
}

// Check if margin can be withdrawn
const withdrawalCheck = snapshot.isWithdrawalAllowed();
const maxWithdrawable = snapshot.getMaxWithdrawableMargin();

// Check if leverage is valid
if (!snapshot.instrumentSetting.isLeverageValid(5n * WAD)) {
    console.error('Leverage too high');
}

// Get available orders (not fully taken)
const availableOrders = snapshot.getAvailableOrders();
```

#### Key Methods Comparison

**`PairSnapshot.isTickFeasibleForLimitOrder(tick, side)`** - Use for actual order placement

- ✅ Checks instrument tradability (condition, status, pause state)
- ✅ Validates tick (bounds, spacing, side, price deviation)
- ✅ Checks if tick is already occupied by existing order

**`InstrumentSetting.isTickValidForLimitOrder(tick, side, ammTick, markPrice)`** - Use for theoretical calculations

- ✅ Validates tick properties only
- ❌ Does NOT check market state or order slots

**Example - Finding available tick:**

```typescript
const range = snapshot.getFeasibleLimitOrderTickRange(Side.LONG);
if (range) {
    const spacing = snapshot.instrumentSetting.orderSpacing;
    // Iterate from best price to find first available tick
    for (let tick = range.maxTick; tick >= range.minTick; tick -= spacing) {
        const result = snapshot.isTickFeasibleForLimitOrder(tick, Side.LONG);
        if (result.feasible) {
            console.log(`Available tick: ${tick}`);
            break;
        }
    }
}
```

**Available Helper Methods:**

_PairSnapshot (context-aware):_

- `isTradable()` - Basic tradability check
- `isOrderPlacementTradable()` - Order placement check (includes pause state)
- `isTickFeasibleForLimitOrder(tick, side)` - Comprehensive tick validation
- `getFeasibleLimitOrderTickRange(side)` - Get feasible tick range
- `getOccupiedLimitOrderTicks()` - Get occupied tick list
- `getAvailableOrders()` - Get orders not fully taken
- `isWithdrawalAllowed()` - Check if withdrawal is allowed
- `getMaxWithdrawableMargin()` - Get max withdrawable amount
- `isRemoveLiquidityFeasible(tickLower, tickUpper)` - Check range removal

_InstrumentSetting (pure validation):_

- `isLeverageValid(leverage)` - Check leverage validity
- `minOrderSizeAtTick(tick)` - Calculate min order size at tick
- `getFeasibleLimitOrderTickRange(side, ammTick, markPrice)` - Get theoretical range
- `isTickValidForLimitOrder(tick, side, ammTick, markPrice)` - Validate tick properties
- `isRangeTickPairValid(tickLower, tickUpper, ammTick)` - Validate range ticks

_Position:_

- `canAdjustToLeverage(targetLeverage, amm, markPrice, imr)` - Check leverage adjustment

See method JSDoc comments in source code for detailed documentation.

### Data Fetching

The SDK provides unified functions that work with both API and RPC configurations:

```typescript
import { fetchOnchainContext, inquireByTick, fetchOrderBook } from '@synfutures/perpv3-ts/queries';

// Using RPC config
const rpcConfig = {
    chainId: 8453,
    publicClient,
    observerAddress: perpInfo.observer,
};

const onchainContext = await fetchOnchainContext(
    instrumentAddress,
    expiry,
    rpcConfig,
    traderAddress, // optional
    signedSize, // optional
    { blockNumber: 12345678 } // optional
);

// Using API config
const apiConfig = {
    baseURL: 'https://api.synfutures.com',
    apiKey: 'your-api-key', // optional
};

const onchainContext = await fetchOnchainContext(instrumentAddress, expiry, apiConfig, traderAddress, signedSize);

// Inquire by tick
const quotation = await inquireByTick(instrumentAddress, expiry, tick, rpcConfig);

// Fetch order book
const orderBook = await fetchOrderBook(
    instrumentAddress,
    expiry,
    rpcConfig,
    20 // length
);
```

### Order Book & Portfolio (API + WebSocket)

Use the API helpers for snapshots and the lightweight `PublicWebsocketClient` for pushes.

- Browsers: uses the built-in `WebSocket`.
- Node.js: pass `wsFactory` (e.g. from `ws`) if `globalThis.WebSocket` is unavailable or you need custom headers.

```typescript
import { PERP_EXPIRY } from '@synfutures/perpv3-ts';
import { fetchOrderBook } from '@synfutures/perpv3-ts/queries';
import { fetchPortfolioListFromApi, PublicWebsocketClient } from '@synfutures/perpv3-ts';

// API snapshots
const apiConfig = { chainId: 143 };
const orderBook = await fetchOrderBook(instrumentAddress, PERP_EXPIRY, apiConfig);
const portfolio = await fetchPortfolioListFromApi({
    chainId: 143,
    userAddress,
    instrumentAddress,
    expiry: PERP_EXPIRY,
});

// Real-time updates
const ws = new PublicWebsocketClient();
const orderBookSub = ws.subscribeOrderBook(
    { chainId: 143, instrument: instrumentAddress, expiry: PERP_EXPIRY, type: 'orderBook' },
    (data) => {
        console.log('top of book', data.bids?.[0]?.price, data.asks?.[0]?.price);
    }
);
const portfolioSub = ws.subscribePortfolio({ chainId: 143, userAddress, type: 'portfolio' }, (payload) => {
    // WebSocket notifies that something changed; fetch the latest details from the API.
    console.log('portfolio changed', payload.type, payload.instrument, payload.expiry);
});

// Later, clean up
orderBookSub.unsubscribe();
portfolioSub.unsubscribe();
ws.close();
```

> WebSocket client defaults: auto-reconnect with exponential backoff (base 1s, capped at 30s), stops after 10 attempts unless you set `maxReconnectAttempts` or supply your own `reconnectDelayMs` (which keeps retrying). Use `pingIntervalMs` to tune heartbeat (default 30s).
> Order book streams forward the server payload as-is (with chainId/instrument/expiry merged); current feeds are ratio-keyed multi-depth maps (e.g. `"1"`, `"10"`...). Use `depths`/ratio keys from the payload.
> REST requests are sent to `https://mainnet-api.monday.trade` (fixed, no API_DOMAIN env needed); set `chainId` to 143 for mainnet.

Other public streams:

```typescript
// Kline
const klineSub = ws.subscribeKline(
    { chainId: 143, instrument: instrumentAddress, expiry: PERP_EXPIRY, interval: '1m', type: 'kline' },
    (data) => console.log('kline close', data.close)
);

// Instrument updates (also receives marketPairInfoChanged)
const instrumentSub = ws.subscribeInstrument(
    { chainId: 143, instrument: instrumentAddress, expiry: PERP_EXPIRY, type: 'instrument' },
    (data) => console.log('instrument update', data.symbol, data.fairPrice)
);

// Common chain events (blockNumChanged, marketListChanged)
const commonSub = ws.subscribeCommon({ chainId: 143, type: 'common' }, (data) => console.log('common', data));

// Generic catch-all for new/unknown streams (list expected stream names)
const rawSub = ws.subscribeRaw(
    { chainId: 143, instrument: instrumentAddress, expiry: PERP_EXPIRY, type: 'instrument' },
    (data) => console.log('raw stream payload', data),
    ['instrument', 'marketPairInfoChanged']
);
```

### Running Demos

The SDK includes a demo framework for testing and examples:

```bash
# List all available demos
npm run demo -- --list

# Run a specific demo
npm run demo trade-by-margin

# Run all demos in a category
npm run demo -- --category trade

# Run with custom chain/signer/instrument
npm run demo -- --chain abctest --signer neo --instrument ETH-USDM-EMG

# Skip cleanup after demos
npm run demo -- --skip-cleanup
```

## Architecture

### Directory Structure

```
src/
├── abis/           # Contract ABIs (latest and legacy)
├── actions/        # Simulation action classes
│   ├── trade.ts    # Trade simulation (TradeInput, etc.)
│   ├── order.ts    # Order simulation (PlaceInput, CrossMarketOrderInput, etc.)
│   ├── range.ts    # Range liquidity simulation (AddInput, RemoveInput)
│   └── validation.ts # Common validation utilities
├── apis/           # API-specific implementations
├── constants.ts    # Shared constants
├── demos/          # Demo framework and examples
│   ├── framework/  # Demo framework (runner, registry, context)
│   ├── trade.ts    # Trade demos
│   ├── order.ts    # Order demos
│   └── range.ts    # Range demos
├── frontend/       # Frontend utilities (calldata encoding, parsers)
├── info.ts         # Chain configuration (PerpInfo)
├── math.ts         # Math utilities
├── parsers/        # Contract event/log parsers
├── queries/        # Unified data fetching (API/RPC)
│   ├── api.ts      # API implementation
│   ├── rpc.ts      # RPC implementation
│   └── index.ts    # Unified entry point
├── tests/          # Test files and fixtures
├── types/          # Type definitions
│   ├── contract.ts  # Core domain types (1:1 Solidity mirror)
│   ├── position.ts # Position class
│   ├── order.ts    # Order class
│   ├── range.ts    # Range class
│   ├── quotation.ts # QuotationWithSize class
│   └── setting.ts  # UserSetting and InstrumentSetting classes
└── utils/          # Utility functions
```

### Type Organization

**Core Domain Types** (`types/contract.ts`):

- Types that are 1:1 mirrors of Solidity structs/enums
- Used across multiple modules
- Fundamental business entities (Amm, Portfolio, Setting, etc.)

**Class-Based Types** (`types/*.ts`):

- `Position` - Position class with encapsulated behavior
- `Order` - Order class with static factory methods
- `Range` - Range class with static key packing/unpacking
- `QuotationWithSize` - Quotation with size calculations
- `UserSetting` - User settings with helper methods
- `InstrumentSetting` - Instrument settings factory

**Action Classes** (`actions/*.ts`):

- Input classes for simulations (TradeInput, PlaceInput, etc.)
- Each class has a `simulate()` method that returns simulation results
- Validation and encoding utilities

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- trade.test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Simulation API/RPC Parity Test (ABC)

Use `src/tests/apiRpcParity.test.ts` on the SynFutures ABC testnet to verify that the simulation module yields matching results in API mode and RPC mode. Prepare the following environment settings before running:

1. Provision an ABC network RPC endpoint and export it as the `ABC_RPC` environment variable.
2. If you need to access protected endpoints, store the API key in `SYNF_PARITY_API_KEY` (optional).
3. Point `SIMULATE_PARITY_FIXTURE` to the scenario file. The repository bundles `src/tests/fixtures/simulate-parity.abc.json`, which covers sample limit orders, margin/leverage opens, closes, and margin adjustments.

Example:

```bash
SIMULATE_PARITY_FIXTURE=src/tests/fixtures/simulate-parity.abc.json \
ABC_RPC=https://rpc.synfutures-abc-testnet.raas.gelato.cloud/your-key \
npm test -- apiRpcParity
```

For debugging, enable verbose logging:

```bash
DEBUG_PARITY_TEST=1 \
SIMULATE_PARITY_FIXTURE=src/tests/fixtures/simulate-parity.abc.json \
ABC_RPC=https://rpc.synfutures-abc-testnet.raas.gelato.cloud/your-key \
npm test -- apiRpcParity
```

> ⚠️ Note: The parity test does not invoke helpers such as `simulateMarketTrade*FromApi`. Those wrappers fetch a fresh snapshot on each call, which prevents pinning the block height and hides `blockInfo.height`. The test instead pulls the instrument, portfolio, and quotation payloads required by the API, records the associated `blockInfo`, computes the "API result" with the core `simulate*` functions, and then reruns the RPC wrapper at the same height for comparison. Any divergence between the two implementations surfaces as an assertion failure.

### ABC Fixture Capture

Tests such as `range.test.ts` now rely on real ABC on-chain snapshots stored in `src/tests/fixtures/onchain-context.abc.json`. Regenerate the fixture whenever you need updated market data:

```bash
ABC_RPC=https://rpc.synfutures-abc-testnet.raas.gelato.cloud/your-key \
npm run fixtures:capture:abc
```

The script attempts to pull the snapshot via the observer contract first and falls back to the public API if the RPC response is too large. Optional overrides:

- `ABC_FIXTURE_INSTRUMENT`, `ABC_FIXTURE_TRADER`, `ABC_FIXTURE_EXPIRY` – point to a different market or user.
- `ABC_FIXTURE_SIGNED_SIZE` – request a quotation in addition to the context.
- `ABC_FIXTURE_BLOCK` – pin an explicit block height.

A freshly generated file keeps BigInt fields as decimal strings and can be parsed into `OnchainContext` in tests.

For trade-specific simulations (`trade.test.ts`), use the dedicated command to refresh `src/tests/fixtures/trade-scenarios.abc.json`:

```bash
ABC_RPC=https://rpc.synfutures-abc-testnet.raas.gelato.cloud/your-key \
npm run fixtures:capture:trade
```

The trade fixture combines the observer snapshot, synthesized user portfolios, and pre-computed simulation outputs so the unit tests can run deterministically without live RPC access.

## License

MIT
