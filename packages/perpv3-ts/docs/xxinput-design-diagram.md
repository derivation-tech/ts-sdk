# xxInput Design Diagram

## Current Design (Before PerpClient)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Code                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Creates & Configures
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UserSetting (per operation)                   │
│  - deadlineSeconds                                              │
│  - slippage                                                      │
│  - leverage                                                      │
│  - markPriceBufferInBps                                          │
│  - strictMode                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Passed to each Input
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      xxInput Classes                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ TradeInput   │  │ PlaceInput    │  │ AdjustInput  │          │
│  │              │  │              │  │              │          │
│  │ +instrument  │  │ +instrument  │  │ +instrument  │          │
│  │ +expiry      │  │ +expiry      │  │ +expiry      │          │
│  │ +trader      │  │ +trader      │  │ +trader      │          │
│  │ +baseQty     │  │ +tick        │  │ +amount?     │          │
│  │ +side        │  │ +baseQty     │  │ +transferIn? │          │
│  │ +userSetting │  │ +side        │  │ +userSetting │          │
│  │ +margin?     │  │ +userSetting │  │              │          │
│  │              │  │              │  │              │          │
│  │ simulate()   │  │ simulate()   │  │ simulate()   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │CrossLimit    │  │ScaledLimit   │  │ AddInput     │          │
│  │OrderInput    │  │OrderInput    │  │              │          │
│  │              │  │              │  │ +instrument  │          │
│  │ +instrument  │  │ +instrument  │  │ +expiry      │          │
│  │ +expiry      │  │ +expiry      │  │ +trader      │          │
│  │ +trader      │  │ +trader      │  │ +marginAmt   │          │
│  │ +side        │  │ +side        │  │ +tickLower   │          │
│  │ +baseQty     │  │ +baseQty     │  │ +tickUpper   │          │
│  │ +targetTick  │  │ +priceInfo[] │  │ +userSetting │          │
│  │ +userSetting │  │ +distribution │  │              │          │
│  │              │  │ +userSetting │  │ simulate()   │          │
│  │ simulate()   │  │ simulate()   │  └──────────────┘          │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ RemoveInput  │                                                │
│  │              │                                                │
│  │ +instrument  │                                                │
│  │ +expiry      │                                                │
│  │ +trader      │                                                │
│  │ +tickLower   │                                                │
│  │ +tickUpper   │                                                │
│  │ +userSetting │                                                │
│  │              │                                                │
│  │ simulate()   │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Requires
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PairSnapshot (from queries)                   │
│  - instrumentSetting                                             │
│  - amm                                                           │
│  - priceData                                                     │
│  - portfolio                                                     │
│  - quotation?                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Fetched via
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Query Functions                               │
│  - fetchOnchainContext(config, ...)                              │
│  - inquireByTick(config, ...)                                   │
│  - fetchOrderBook(config, ...)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Proposed Design (With PerpClient)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Code                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Creates once
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PerpClient                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Configuration (immutable)                               │   │
│  │  - config: ApiConfig | RpcConfig                        │   │
│  │  - userSetting: UserSetting                             │   │
│  │  - instrumentAddress: Address                           │   │
│  │  - expiry: number                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Query Methods                                            │   │
│  │  + getSnapshot(trader?, signedSize?)                     │   │
│  │  + getQuotation(tick)                                    │   │
│  │  + getOrderBook(length?)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Factory Methods (inject userSetting + instrument/expiry) │   │
│  │  + createTradeInput(trader, baseQty, side, options?)    │   │
│  │  + createPlaceInput(trader, tick, baseQty, side)        │   │
│  │  + createAdjustInput(trader, amount?, transferIn?)      │   │
│  │  + createCrossLimitOrderInput(...)                       │   │
│  │  + createScaledLimitOrderInput(...)                      │   │
│  │  + createAddInput(trader, marginAmt, tickLower, ...)    │   │
│  │  + createRemoveInput(trader, tickLower, tickUpper)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ High-level Workflow Methods                             │   │
│  │  + simulateTrade(trader, baseQty, side, options?)       │   │
│  │  + simulatePlaceOrder(trader, tick, baseQty, side)      │   │
│  │  + simulateAdjust(trader, amount?, transferIn?)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ WebSocket Subscriptions                                  │   │
│  │  + subscribeOrderBook(handler)                            │   │
│  │  + subscribePortfolio(user, handler)                     │   │
│  │  + subscribeInstrument(handler)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Creates (internal)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      xxInput Classes                             │
│                    (Simplified - no userSetting in constructor) │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ TradeInput   │  │ PlaceInput    │  │ AdjustInput  │          │
│  │              │  │              │  │              │          │
│  │ +instrument  │  │ +instrument  │  │ +instrument  │          │
│  │ +expiry      │  │ +expiry      │  │ +expiry      │          │
│  │ +trader      │  │ +trader      │  │ +trader      │          │
│  │ +baseQty     │  │ +tick        │  │ +amount?     │          │
│  │ +side        │  │ +baseQty     │  │ +transferIn? │          │
│  │ +userSetting │  │ +side        │  │ +userSetting │          │
│  │ +margin?     │  │ +userSetting │  │              │          │
│  │              │  │              │  │              │          │
│  │ simulate()   │  │ simulate()   │  │ simulate()   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │CrossLimit    │  │ScaledLimit   │  │ AddInput     │          │
│  │OrderInput    │  │OrderInput    │  │              │          │
│  │              │  │              │  │ +instrument  │          │
│  │ +instrument  │  │ +instrument  │  │ +expiry      │          │
│  │ +expiry      │  │ +expiry      │  │ +trader      │          │
│  │ +trader      │  │ +trader      │  │ +marginAmt   │          │
│  │ +side        │  │ +side        │  │ +tickLower   │          │
│  │ +baseQty     │  │ +baseQty     │  │ +tickUpper   │          │
│  │ +targetTick  │  │ +priceInfo[] │  │ +userSetting │          │
│  │ +userSetting │  │ +distribution │  │              │          │
│  │              │  │ +userSetting │  │ simulate()   │          │
│  │ simulate()   │  │ simulate()   │  └──────────────┘          │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ RemoveInput  │                                                │
│  │              │                                                │
│  │ +instrument  │                                                │
│  │ +expiry      │                                                │
│  │ +trader      │                                                │
│  │ +tickLower   │                                                │
│  │ +tickUpper   │                                                │
│  │ +userSetting │                                                │
│  │              │                                                │
│  │ simulate()   │                                                │
│  └──────────────┘                                                │
│                                                                   │
│  Note: userSetting still needed internally, but injected by      │
│        PerpClient factory methods, not by user                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PairSnapshot                                  │
│  (Fetched via PerpClient.getSnapshot())                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Comparison

### Current Flow (Verbose)

```
User Code
  │
  ├─> Create UserSetting
  ├─> Create TradeInput(instrument, expiry, trader, qty, side, userSetting)
  ├─> fetchOnchainContext(config, instrument, expiry, trader)
  ├─> fetchOnchainContext(config, instrument, expiry, trader, signedSize)
  ├─> tradeInput.simulate(snapshot, quotationWithSize)
  └─> encodeTradeParam(tradeParam)
```

### Proposed Flow (Clean)

```
User Code
  │
  ├─> Create PerpClient(config, userSetting, instrument, expiry)
  │
  └─> client.simulateTrade(trader, baseQty, side)
        │
        ├─> getSnapshot(trader) [internal]
        ├─> getSnapshot(trader, signedSize) [internal]
        ├─> createTradeInput(...) [internal - injects userSetting]
        ├─> tradeInput.simulate(snapshot, quotationWithSize) [internal]
        └─> Returns [tradeParam, simulation]
```

## Key Benefits

1. **Single Source of Truth**: `userSetting`, `instrumentAddress`, `expiry` set once in `PerpClient`
2. **Less Repetition**: No need to pass same parameters repeatedly
3. **Type Safety**: Can't accidentally mix different instruments/expiries
4. **Cleaner API**: Methods only need operation-specific parameters
5. **Better Caching**: Can cache snapshots/quotation per pair
6. **WebSocket Integration**: Subscriptions naturally scoped to pair

## Usage Example Comparison

### Before (Current)

```typescript
const userSetting = new UserSetting(10, 10, 3n * WAD, 1);
const snapshot = await fetchOnchainContext(instrumentAddress, PERP_EXPIRY, rpcConfig, traderAddress);
const snapshotWithQuotation = await fetchOnchainContext(
    instrumentAddress,
    PERP_EXPIRY,
    rpcConfig,
    traderAddress,
    signedSize
);
const quotation = snapshotWithQuotation.quotation!;
const quotationWithSize = new QuotationWithSize(signedSize, quotation);

const tradeInput = new TradeInput(instrumentAddress, PERP_EXPIRY, traderAddress, baseQuantity, Side.LONG, userSetting);
const [param, sim] = tradeInput.simulate(snapshot, quotationWithSize);
```

### After (With PerpClient)

```typescript
const client = new PerpClient(rpcConfig, new UserSetting(10, 10, 3n * WAD, 1), instrumentAddress, PERP_EXPIRY);

const [param, sim] = await client.simulateTrade(traderAddress, baseQuantity, Side.LONG);
```
