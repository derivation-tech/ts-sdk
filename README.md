# Viem Kit

A comprehensive viem-based web3 toolkit providing chain utilities, contract interactions, and developer tools for EVM-compatible blockchains.

## 🚀 Features

- **Viem Context**: Robust utilities for EVM chain interactions with singleton management
- **Chain Kit Registry**: Per-chain utilities with address books and token registries
- **ERC20 & WETH Utilities**: Simplified token operations with comprehensive logging
- **Transaction Helpers**: Batch operations and transaction management
- **Type Safety**: Full TypeScript support with viem types
- **CLI Tools**: Command-line interface for asset management
- **Custom Chain Support**: Easy integration with custom EVM chains

## 📦 Packages

### `@synfutures/viem-kit`

The core package providing:
- Singleton chain management with `ChainKitRegistry`
- Address book and token registry
- ERC20/WETH utilities with reduced boilerplate
- Transaction helpers with logging
- Contract parsers for better debugging
- Batch operations support

## 🛠️ Development

### Install Dependencies

```shell
pnpm deps
```

### Build All Packages

```shell
pnpm run build
```

### Lint & Format

```shell
pnpm run lint
pnpm run format
```

### Clean Build Artifacts

```shell
pnpm run clean
```

### Release Workflow

- `make changeset SUMMARY='Describe the change' [BUMP=patch]` writes a non-interactive changeset. With our fixed-version setup, omitting `PACKAGES` automatically includes every workspace package at the specified bump type (default is `patch`). Supply `PACKAGES='pkg:major,...'` only when you need different bumps per package. Use `SUMMARY_FILE=path/to/message.md` if you prefer writing the summary in a file.
- `make changeset-dry-run …` previews the generated markdown without touching the `.changeset` directory.
- `make version` runs `pnpm changeset version` and refreshes the lockfile via `pnpm install`.
- `make publish` calls `pnpm changeset publish`.
- `make release` performs `make version` followed by `make publish`.
- Export `SLACK_WEBHOOK_URL` (and optionally `SLACK_MESSAGE_SUFFIX`) so the postpublish hook can notify Slack after each package is published.

## 📖 Quick Start

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { ChainKitRegistry, ERC20, WETH } from '@synfutures/viem-kit';

// Setup clients
const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const walletClient = createWalletClient({
    account: mnemonicToAccount('your mnemonic here'),
    chain: base,
    transport: http(),
});

// Get chain kit instance
const kit = ChainKitRegistry.for(base);

// Query ERC20 balance
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const balance = await ERC20.balanceOf(publicClient, usdcAddress, walletClient.account.address);
const formatted = kit.formatErc20Amount(balance, usdcAddress);
console.log(`USDC Balance: ${formatted}`);
```

## 🔧 CLI Usage

The toolkit ships a standalone CLI under `packages/cli`, run with tsx:

```bash
# Query balances
pnpm tsx packages/cli/src/asset.ts balance usdc -n base --id neo:0-10

# Transfer tokens
pnpm tsx packages/cli/src/asset.ts transfer usdc -n base --from neo:0 --to neo:1 --amount 100

# Batch transfers
pnpm tsx packages/cli/src/asset.ts transfer usdc -n base --from neo:0-5 --to neo:6-11 --amount 10 --batch
```

## 📚 Examples

Explore the examples in `packages/viem-kit/examples/`:

- `abc-testnet.ts` - Custom chain setup and usage
- `abc-transfer.ts` - ERC20 transfers on custom chains
- `batch-transfer.ts` - Batch ERC20 operations
- `erc20-transfer.ts` - Standard ERC20 interactions
- `singleton.ts` - Singleton pattern demonstration
- `weth-deposit-withdraw.ts` - WETH operations

Run examples:

```shell
cd packages/viem-kit
npx tsx examples/abc-testnet.ts
```

## 🏗️ Project Structure

```
viem-kit/
├── packages/
│   ├── viem-kit/             # Core toolkit package
│   ├── cli/                  # Asset/admin CLI (asset, spot-admin, aggregator-admin, perp-admin)
│   └── viem-ledger/          # Ledger account helpers
├── package.json             # Workspace configuration
└── README.md               # This file
```

## 🔧 Adding New Packages

To add a new package to the workspace:

```shell
./scripts/init.sh packageName
```

## 📦 Publishing

To publish a package:

1. Navigate to the package directory:
   ```shell
   cd packages/your-package
   ```

2. Run the publish command:
   ```shell
   pnpm run publish
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure code quality with `pnpm run lint` and `pnpm run format`
5. Add tests if applicable
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Viem Documentation](https://viem.sh/)
- [Package Documentation](./packages/viem-kit/README.md)
- [Examples](./packages/viem-kit/examples/)
