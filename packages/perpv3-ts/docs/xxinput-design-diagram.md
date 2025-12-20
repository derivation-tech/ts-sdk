# xxInput Design Diagram

## Current Design (Before PerpClient)

### Architecture Overview

```mermaid
classDiagram
    class UserSetting {
        +deadlineSeconds: number
        +slippage: number
        +leverage: bigint
        +markPriceBufferInBps: number
        +strictMode: boolean
    }
    
    class TradeInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +baseQuantity: bigint
        +side: Side
        +userSetting: UserSetting
        +margin?: bigint
        +simulate(snapshot, quotationWithSize)
    }
    
    class PlaceInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +tick: number
        +baseQuantity: bigint
        +side: Side
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class AdjustInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +amount?: bigint
        +transferIn?: boolean
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class CrossLimitOrderInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +side: Side
        +baseQuantity: bigint
        +targetTick: number
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class ScaledLimitOrderInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +side: Side
        +baseQuantity: bigint
        +priceInfo: Array
        +distribution: BatchOrderSizeDistribution
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class AddInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +marginAmount: bigint
        +tickLower: number
        +tickUpper: number
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class RemoveInput {
        +instrument: Address
        +expiry: number
        +traderAddress: Address
        +tickLower: number
        +tickUpper: number
        +userSetting: UserSetting
        +simulate(snapshot, userSetting)
    }
    
    class PairSnapshot {
        +instrumentSetting: InstrumentSetting
        +amm: AMM
        +priceData: PriceData
        +portfolio?: Portfolio
        +quotation?: Quotation
    }
    
    UserSetting --> TradeInput : passed to constructor
    UserSetting --> PlaceInput : passed to constructor
    UserSetting --> AdjustInput : passed to constructor
    UserSetting --> CrossLimitOrderInput : passed to constructor
    UserSetting --> ScaledLimitOrderInput : passed to constructor
    UserSetting --> AddInput : passed to constructor
    UserSetting --> RemoveInput : passed to constructor
    
    TradeInput --> PairSnapshot : requires for simulate()
    PlaceInput --> PairSnapshot : requires for simulate()
    AdjustInput --> PairSnapshot : requires for simulate()
    CrossLimitOrderInput --> PairSnapshot : requires for simulate()
    ScaledLimitOrderInput --> PairSnapshot : requires for simulate()
    AddInput --> PairSnapshot : requires for simulate()
    RemoveInput --> PairSnapshot : requires for simulate()
```

## Proposed Design (With PerpClient)

### Architecture Overview

```mermaid
classDiagram
    class PerpClient {
        -config: ApiConfig | RpcConfig
        -userSetting: UserSetting
        -instrumentAddress: Address
        -expiry: number
        +getSnapshot(trader?, signedSize?)
        +getQuotation(tick)
        +getOrderBook(length?)
        +createTradeInput(trader, baseQty, side, options?)
        +createPlaceInput(trader, tick, baseQty, side)
        +createAdjustInput(trader, amount?, transferIn?)
        +createCrossLimitOrderInput(...)
        +createScaledLimitOrderInput(...)
        +createAddInput(trader, marginAmt, tickLower, tickUpper)
        +createRemoveInput(trader, tickLower, tickUpper)
        +simulateTrade(trader, baseQty, side, options?)
        +simulatePlaceOrder(trader, tick, baseQty, side)
        +simulateAdjust(trader, amount?, transferIn?)
        +subscribeOrderBook(handler)
        +subscribePortfolio(user, handler)
        +subscribeInstrument(handler)
    }
    
    class TradeInput {
        +traderAddress: Address
        +baseQuantity: bigint
        +side: Side
        +margin?: bigint
        +simulate(snapshot, quotationWithSize, userSetting)
    }
    
    class PlaceInput {
        +traderAddress: Address
        +tick: number
        +baseQuantity: bigint
        +side: Side
        +simulate(snapshot, userSetting)
    }
    
    class AdjustInput {
        +traderAddress: Address
        +amount?: bigint
        +transferIn?: boolean
        +simulate(snapshot, userSetting)
    }
    
    class CrossLimitOrderInput {
        +traderAddress: Address
        +side: Side
        +baseQuantity: bigint
        +targetTick: number
        +simulate(snapshot, userSetting)
    }
    
    class ScaledLimitOrderInput {
        +traderAddress: Address
        +side: Side
        +baseQuantity: bigint
        +priceInfo: Array
        +distribution: BatchOrderSizeDistribution
        +simulate(snapshot, userSetting)
    }
    
    class AddInput {
        +traderAddress: Address
        +marginAmount: bigint
        +tickLower: number
        +tickUpper: number
        +simulate(snapshot, userSetting)
    }
    
    class RemoveInput {
        +traderAddress: Address
        +tickLower: number
        +tickUpper: number
        +simulate(snapshot, userSetting)
    }
    
    class PairSnapshot {
        +instrumentAddress: Address
        +expiry: number
        +instrumentSetting: InstrumentSetting
        +amm: AMM
        +priceData: PriceData
        +portfolio?: Portfolio
        +quotation?: Quotation
    }
    
    PerpClient --> TradeInput : creates internally
    PerpClient --> PlaceInput : creates internally
    PerpClient --> AdjustInput : creates internally
    PerpClient --> CrossLimitOrderInput : creates internally
    PerpClient --> ScaledLimitOrderInput : creates internally
    PerpClient --> AddInput : creates internally
    PerpClient --> RemoveInput : creates internally
    PerpClient --> PairSnapshot : fetches via getSnapshot()
    
    TradeInput --> PairSnapshot : requires for simulate()
    PlaceInput --> PairSnapshot : requires for simulate()
    AdjustInput --> PairSnapshot : requires for simulate()
    CrossLimitOrderInput --> PairSnapshot : requires for simulate()
    ScaledLimitOrderInput --> PairSnapshot : requires for simulate()
    AddInput --> PairSnapshot : requires for simulate()
    RemoveInput --> PairSnapshot : requires for simulate()
    
    note for PerpClient "Centralizes configuration:\n- instrumentAddress\n- expiry\n- userSetting\n- config"
    note for TradeInput "Simplified: no instrument/expiry/userSetting\nin constructor"
    note for PairSnapshot "Contains instrumentAddress and expiry\nas direct properties"
```

## Data Flow Comparison

### Current Flow (Verbose)

```mermaid
flowchart TD
    A[User Code] --> B[Create UserSetting]
    A --> C[Create TradeInput<br/>instrument, expiry, trader, qty, side, userSetting]
    A --> D[fetchOnchainContext<br/>config, instrument, expiry, trader]
    A --> E[fetchOnchainContext<br/>config, instrument, expiry, trader, signedSize]
    D --> F[PairSnapshot]
    E --> G[PairSnapshot with Quotation]
    G --> H[Create QuotationWithSize]
    C --> I[tradeInput.simulate<br/>snapshot, quotationWithSize]
    F --> I
    H --> I
    I --> J[encodeTradeParam]
    
    style A fill:#e1f5ff
    style C fill:#fff4e6
    style I fill:#e8f5e9
    style J fill:#f3e5f5
```

### Proposed Flow (Clean)

```mermaid
flowchart TD
    A[User Code] --> B[Create PerpClient<br/>config, userSetting, instrument, expiry]
    B --> C[client.simulateTrade<br/>trader, baseQty, side]
    
    C --> D[getSnapshot trader<br/>internal]
    C --> E[getSnapshot trader, signedSize<br/>internal]
    C --> F[createTradeInput<br/>internal - injects userSetting]
    C --> G[tradeInput.simulate<br/>snapshot, quotationWithSize, userSetting<br/>internal]
    
    D --> H[PairSnapshot]
    E --> I[PairSnapshot with Quotation]
    I --> J[QuotationWithSize]
    F --> K[TradeInput]
    H --> G
    J --> G
    K --> G
    G --> L[Returns tradeParam, simulation]
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style C fill:#e8f5e9
    style L fill:#f3e5f5
    style D fill:#f0f0f0
    style E fill:#f0f0f0
    style F fill:#f0f0f0
    style G fill:#f0f0f0
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
