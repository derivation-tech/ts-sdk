# @derivation-tech/viem-ledger

Minimal Ledger helpers for viem, following ethers-ledger conventions:

- `ledgerToAccount({ signerId | path | index })` → `Account<'ledger'>`
- Built-in path parsing using standard BIP44 format: `m/44'/60'/{account_index}'/0/0`
- Env overrides: `LEDGER_PATH` (full path) or `LEDGER_INDEX` (account index, default `0`)
- Address validation modes: `never | initializationOnly | firstTransactionPerAddress (default) | everyTransaction`

Features:
- Transport/Eth singleton with retry on `TransportLocked`
- Transaction resolution (`externalPlugins` + `erc20`) for proper on-device prompts
- EIP-712 signing support
- Basic app checks (warn if not on Ethereum app, or arbitrary data disabled)

Usage:

```ts
import { ledgerToAccount } from '@derivation-tech/viem-ledger';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const account = await ledgerToAccount({ signerId: 'ledger:0' });
const walletClient = createWalletClient({ account, chain: base, transport: http() });
```

Notes:
- Node 18+ and `@ledgerhq/hw-transport-node-hid` require USB/HID access.
- Keep your Ledger on and open the Ethereum app. Contract data should be enabled for DeFi/ERC20.

## Path Format (BIP44)

The derivation path follows the BIP44 standard for Ethereum, using **account-based indexing**:

```
m / 44' / 60' / {account_index}' / 0 / 0
│   │     │     │                  │   └─ Address index (always 0)
│   │     │     │                  └───── Change (always 0 for Ethereum)
│   │     │     └────────────────────── Account index (incremented for multiple accounts)
│   │     └──────────────────────────── Coin type (60 = Ethereum)
│   └────────────────────────────────── Purpose (44 = BIP44)
└────────────────────────────────────── Master key
```

**This matches the behavior of MetaMask, Ledger Live, and web3-context's LedgerSignerModule**, where creating multiple accounts increments the `account_index`, not the `address_index`.

### Why account-based indexing?

Most wallets (MetaMask, Ledger Live) use the account level for creating multiple wallets:
- Account 0: `m/44'/60'/0'/0/0` (default)
- Account 1: `m/44'/60'/1'/0/0` (second account)
- Account 2: `m/44'/60'/2'/0/0` (third account)

This ensures backward compatibility with existing configurations.

## Usage Examples

### Using account index (recommended)
```ts
// m/44'/60'/0'/0/0 (Account 0)
await ledgerToAccount({ signerId: 'ledger:0' });
await ledgerToAccount({ index: 0 });

// m/44'/60'/5'/0/0 (Account 5)
await ledgerToAccount({ signerId: 'ledger:5' });
await ledgerToAccount({ index: 5 });
```

### Using explicit full path
```ts
// Custom full path (account 3)
await ledgerToAccount({ signerId: 'ledger:m/44\'/60\'/3\'/0/0' });
await ledgerToAccount({ path: 'm/44\'/60\'/3\'/0/0' });

// Custom full path with different address_index
await ledgerToAccount({ path: 'm/44\'/60\'/0\'/0/5' });
```

### Custom derivations
- Base path is fixed to `m/44'/60'` (ethers-ledger style). If you need a non-standard path (different coin/account/change), pass the full path via `path` or `signerId: 'ledger:m/.../0/0'`.

## Environment Variables

### LEDGER_INDEX (account index)

Sets the default account index:

```bash
# Use account 3 by default
LEDGER_INDEX=3  # → m/44'/60'/3'/0/0
```

### LEDGER_PATH (full path)

Sets the complete derivation path:

```bash
# Use specific full path
LEDGER_PATH="m/44'/60'/5'/0/0"  # → m/44'/60'/5'/0/0
```

### Precedence

- `LEDGER_INDEX` takes precedence over `LEDGER_PATH`
- Only `LEDGER_INDEX=5` set → uses `m/44'/60'/5'/0/0`
- Only `LEDGER_PATH=m/44'/60'/10'/0/0` set → uses that path as-is
- Both set → `LEDGER_INDEX` wins

## Pattern examples (for batch operations)

- `ledger:0-2` → `["ledger:0", "ledger:1", "ledger:2"]` → accounts 0, 1, 2
- `ledger:m/44'/60'/5'/0/0` → treated as explicit path, not expanded

## Migration Notes

If migrating from ethers-ledger or web3-context:
- ✅ `ledger:0` still maps to the same address (`m/44'/60'/0'/0/0`)
- ✅ `ledger:1` still maps to the same address (`m/44'/60'/1'/0/0`)
- ✅ `LEDGER_INDEX=N` behavior is preserved
- ✅ No breaking changes for existing configurations
