# Viem Kit

A robust, clean, and efficient `viem`-based utility library for interacting with EVM chains. Provides address book management, contract parsers, transaction helpers, and ERC20/WETH utilities with comprehensive logging and type safety.

## Features

- **Singleton Chain Management**: `ChainKitRegistry` provides per-chain utilities
- **Address Book**: Human-readable address mapping with case-insensitive lookups
- **Token Registry**: ERC20 token information with decimals and formatting
- **Contract Parsers**: Custom parsers for better transaction/event logging
- **Transaction Helpers**: Simplified transaction sending with logging
- **ERC20 Utilities**: Common ERC20 operations with reduced boilerplate
- **WETH Support**: Wrapped native token deposit/withdraw functions
- **Batch Operations**: Efficient batch transaction sending
- **Type Safety**: Full TypeScript support with viem types

## Installation

```bash
npm install @synfutures/viem-kit
```

## Public Entrypoints (Exports)

This package only supports the following import paths:

- `@synfutures/viem-kit`
- `@synfutures/viem-kit/abis`
- `@synfutures/viem-kit/contracts`
- `@synfutures/viem-kit/utils`
- `@synfutures/viem-kit/chains`

Deep imports (for example `@synfutures/viem-kit/dist/...` or `@synfutures/viem-kit/utils/account`) are intentionally unsupported and may fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

Both ESM (`import`) and CJS (`require`) are supported via conditional exports.

## Environment Variables

The CLI supports custom RPC endpoints via environment variables:

```bash
# Network-specific RPC endpoints (optional)
export BASE_RPC=https://bot-rpc.synfutures.com/base/YOUR_API_KEY
export MAINNET_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
export ARBITRUM_RPC=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
export OPTIMISM_RPC=https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY
export POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Mnemonic for address derivation
export NEO_MNEMONIC="your twelve word mnemonic phrase here..."
export ALICE_MNEMONIC="another twelve word mnemonic phrase..."
```

### Default RPC Endpoints

If no environment variable is set, the CLI uses these default endpoints:

- **Base**: `https://mainnet.base.org`
- **Mainnet**: `https://eth.llamarpc.com`
- **Arbitrum**: `https://arb1.arbitrum.io/rpc`
- **Optimism**: `https://mainnet.optimism.io`
- **Polygon**: `https://polygon-rpc.com`

## Quick Start

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { ChainKitRegistry, ERC20, WETH } from '@synfutures/viem-kit';
import { mnemonicToAccount } from 'viem/accounts';

// Setup
const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const walletClient = createWalletClient({
    account: mnemonicToAccount('your mnemonic here'),
    chain: base,
    transport: http(),
});

const kit = ChainKitRegistry.for(base);

// Query ERC20 balance
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const balance = await ERC20.balanceOf(publicClient, usdcAddress, walletClient.account.address);
const formatted = kit.formatErc20Amount(balance, usdcAddress);
console.log(`USDC Balance: ${formatted}`);

// Deposit ETH to WETH
const receipt = await WETH.deposit(publicClient, walletClient, kit, '0.1');
console.log(`Deposited 0.1 ETH to WETH: ${receipt.transactionHash}`);
```

## Core Components

### ChainKitRegistry

Singleton manager for chain-specific utilities:

```typescript
import { ChainKitRegistry } from '@synfutures/viem-kit';

const kit = ChainKitRegistry.for(base);
// Returns the same instance for base chain across your app
```

### ChainKit

Per-chain utilities containing address book, token registry, and parsers:

```typescript
// Address book
kit.addressBook.registerAddressName('0x...', 'MyContract');
const name = kit.addressBook.getAddressName('0x...'); // 'MyContract'

// Token registry
kit.registerErc20Token({
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x...',
    decimals: 6,
});

// Formatting
const formatted = kit.formatErc20Amount(balance, tokenAddress);
const parsed = kit.parseErc20Amount('100.5', tokenAddress);
```

### ERC20 Utilities

Common ERC20 operations with reduced boilerplate:

```typescript
import { ERC20 } from '@synfutures/viem-kit';

// Read operations
const balance = await ERC20.balanceOf(publicClient, token, account);
const allowance = await ERC20.allowanceOf(publicClient, token, owner, spender);
const totalSupply = await ERC20.totalSupply(publicClient, token);

// Write operations (with logging)
const receipt = await ERC20.transfer(publicClient, walletClient, kit, token, to, amount);
const receipt = await ERC20.approve(publicClient, walletClient, kit, token, spender, amount);

// Batch operations
const balances = await ERC20.batchBalanceOf(publicClient, token, accounts);
```

### WETH Utilities

Wrapped native token operations:

```typescript
import { WETH } from '@synfutures/viem-kit';

// Deposit native token to wrapped token
const receipt = await WETH.deposit(publicClient, walletClient, kit, '0.1');

// Withdraw wrapped token to native token
const receipt = await WETH.withdraw(publicClient, walletClient, kit, '0.05');
```

### Transaction Helpers

Simplified transaction sending with comprehensive logging:

```typescript
import { sendTxWithLog, sendTxSilent, batchSendTxWithLog } from '@synfutures/viem-kit';

// Single transaction with logging (recommended)
// Uses kit.publicClient internally (you can replace kit.publicClient if you need a custom RPC/transport)
const receiptWithLog = await kit.sendTx(walletClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount],
});

// If you want to use a custom public client, call the helper directly:
// const receiptWithLog = await sendTxWithLog(publicClient, walletClient, kit, { ... });

// Silent transaction (no logging)
const receiptSilent = await sendTxSilent(kit.publicClient, walletClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount],
});

// Batch transactions
const batchReceipts = await batchSendTxWithLog(kit.publicClient, walletClients, kit, txs);
```

### Contract Parsers

Custom parsers for better transaction and event logging:

```typescript
import { createERC20Parser, createWETHParser } from '@synfutures/viem-kit';

// ERC20 parser
const erc20Parser = createERC20Parser(tokenInfo, kit.addressBook.getAddressName);
kit.registerParser(tokenAddress, erc20Parser);

// WETH parser (includes deposit/withdraw)
const wethParser = createWETHParser(wethInfo, kit.addressBook.getAddressName);
kit.registerParser(wethAddress, wethParser);
```

## Token Registry

### Wrapped Native Tokens

Pre-configured wrapped native tokens for 30+ chains:

```typescript
import { WRAPPED_NATIVE_TOKENS, getWrappedNativeToken } from '@synfutures/viem-kit';

// Get wrapped token info for a chain
const wrappedToken = getWrappedNativeToken(8453); // Base
console.log(wrappedToken); // { symbol: 'WETH', address: '0x...', decimals: 18 }
```

### Common ERC20 Tokens

Pre-configured common ERC20 tokens:

```typescript
import { COMMON_ERC20_TOKENS, getCommonErc20Tokens } from '@synfutures/viem-kit';

// Get common tokens for a chain
const commonTokens = getCommonErc20Tokens(8453); // Base
console.log(commonTokens); // Array of Erc20TokenInfo
```

## CLI Usage

The CLI lives in workspace `packages/cli` and can be run directly with tsx:

```bash
# Set up environment variables
export BASE_RPC=https://bot-rpc.synfutures.com/base/YOUR_API_KEY
export NEO_MNEMONIC="your twelve word mnemonic phrase here..."

# Query balances
pnpm tsx packages/cli/src/asset.ts balance usdc -n base --id neo:0-10

# Transfer tokens
pnpm tsx packages/cli/src/asset.ts transfer usdc -n base --from neo:0 --to neo:1 --amount 100

# Batch transfers
pnpm tsx packages/cli/src/asset.ts transfer usdc -n base --from neo:0-5 --to neo:6-11 --amount 10 --batch
```

### CLI Commands

- `balance <token>` - Query token balances for specified addresses
- `transfer <token>` - Transfer tokens between addresses
- `--network, -n` - Network name (base, mainnet, arbitrum, etc.)
- `--id` - Address specification (neo:0-100, alice:0, 0x...)
- `--from` - Sender addresses
- `--to` - Recipient addresses
- `--amount` - Transfer amount
- `--batch` - Enable batch mode for multiple transfers

## Examples

See the `examples/` directory for complete examples:

- `abc-testnet.ts` - Custom chain setup
- `abc-transfer.ts` - ERC20 transfer on custom chain
- `batch-transfer.ts` - Batch ERC20 transfers
- `erc20-transfer.ts` - Standard ERC20 operations
- `singleton.ts` - Singleton pattern usage
- `weth-deposit-withdraw.ts` - WETH operations

## API Reference

### ChainKitRegistry

- `for(chain: Chain): ChainKit` - Get or create ChainKit for chain

### ChainKit

- `addressBook: AddressBook` - Address-to-name mappings
- `tokens: Map<Address, Erc20TokenInfo>` - Token registry
- `parsers: Map<Address, ContractParser>` - Contract parsers
- `registerErc20Token(tokenInfo: Erc20TokenInfo): void` - Register token
- `getErc20TokenInfo(address: Address): Erc20TokenInfo | undefined` - Get token info
- `formatErc20Amount(amount: bigint, address: Address): string` - Format amount
- `parseErc20Amount(amount: string, address: Address): bigint` - Parse amount
- `isNativeToken(address: Address): boolean` - Check if native token
- `isWrappedNativeToken(address: Address): boolean` - Check if wrapped native token

### ERC20

- `balanceOf(publicClient, token, account): Promise<bigint>` - Get balance
- `allowanceOf(publicClient, token, owner, spender): Promise<bigint>` - Get allowance
- `transfer(publicClient, walletClient, kit, token, to, amount): Promise<TransactionReceipt>` - Transfer
- `approve(publicClient, walletClient, kit, token, spender, amount): Promise<TransactionReceipt>` - Approve
- `batchBalanceOf(publicClient, token, accounts): Promise<bigint[]>` - Batch balances

### WETH

- `deposit(publicClient, walletClient, kit, amount): Promise<TransactionReceipt>` - Deposit
- `withdraw(publicClient, walletClient, kit, amount): Promise<TransactionReceipt>` - Withdraw

## Type Safety

The library provides full TypeScript support with viem types:

```typescript
import type { Address, PublicClient, WalletClient, TransactionReceipt } from '@synfutures/viem-kit';
import type { Erc20TokenInfo, ContractParser } from '@synfutures/viem-kit';
```

## Error Handling

All functions include proper error handling and logging:

```typescript
try {
    const receipt = await ERC20.transfer(publicClient, walletClient, kit, token, to, amount);
    console.log('Transfer successful:', receipt.transactionHash);
} catch (error) {
    console.error('Transfer failed:', error);
}
```

## Coding Practices

### No Trailing Spaces Rule

**All code must not contain trailing spaces.** This is enforced as a coding practice rule:

- **ESLint**: `no-trailing-spaces: 'error'` rule is enabled
- **Prettier**: Automatically removes trailing spaces during formatting
- **Pre-commit Hook**: `.pre-commit-hook.sh` prevents commits with trailing spaces

#### Enforcement Tools

1. **Automatic Removal**: Run `find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) -exec sed -i '' -e 's/[[:space:]]*$//' {} \;`
2. **IDE Setup**: Configure your editor to show trailing spaces and remove them on save
3. **Pre-commit**: Copy `.pre-commit-hook.sh` to `.git/hooks/pre-commit` to enforce this rule

#### Why This Matters

- **Clean diffs**: Trailing spaces create unnecessary changes in version control
- **Consistency**: Ensures uniform code formatting across the team
- **Readability**: Prevents invisible characters that can cause confusion
- **Best practice**: Industry standard for clean, maintainable code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure no trailing spaces (run the removal command if needed)
5. Add tests
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
