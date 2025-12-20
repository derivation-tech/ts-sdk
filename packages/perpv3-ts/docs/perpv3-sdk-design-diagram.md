# PerpV3 SDK Design Diagram

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

### Proposed Architecture Overview

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

    PerpClient --> PairSnapshot : fetches via getSnapshot()

    TradeInput --> PairSnapshot : requires for simulate()
    PlaceInput --> PairSnapshot : requires for simulate()
    AdjustInput --> PairSnapshot : requires for simulate()
    CrossLimitOrderInput --> PairSnapshot : requires for simulate()
    ScaledLimitOrderInput --> PairSnapshot : requires for simulate()
    AddInput --> PairSnapshot : requires for simulate()
    RemoveInput --> PairSnapshot : requires for simulate()

    note for PerpClient "Centralizes configuration:\n- instrumentAddress\n- expiry\n- userSetting\n- config\n\nProvides query methods (getSnapshot, etc.)\nUsers create input classes directly"
    note for TradeInput "Simplified: no instrument/expiry/userSetting\nin constructor. Instantiate directly with new"
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
    B --> C[client.getSnapshot trader]
    B --> D[client.getSnapshot trader, signedSize]
    
    C --> E[PairSnapshot]
    D --> F[PairSnapshot with Quotation]
    F --> G[Create QuotationWithSize]
    
    A --> H[new TradeInput<br/>trader, baseQty, side, options?]
    E --> I[tradeInput.simulate<br/>snapshot, quotationWithSize, userSetting]
    G --> I
    H --> I
    I --> J[Returns tradeParam, simulation]
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style I fill:#e8f5e9
    style J fill:#f3e5f5
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

// Fetch snapshot and quotation
const snapshot = await client.getSnapshot(traderAddress);
const side = Side.LONG;
const baseQuantity = parseUnits('1', 18);
const signedSize = side === Side.LONG ? baseQuantity : -baseQuantity;
const snapshotWithQuotation = await client.getSnapshot(traderAddress, signedSize);
const quotation = snapshotWithQuotation.quotation!;
const quotationWithSize = new QuotationWithSize(signedSize, quotation);

// Create input and simulate
const tradeInput = new TradeInput(traderAddress, baseQuantity, side);
const [param, sim] = tradeInput.simulate(snapshot, quotationWithSize, client.userSetting);
```
