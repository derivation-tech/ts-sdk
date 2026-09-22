# Viem Kit

Typed contract transactions, receipt diagnostics, address names and token metadata
for viem applications. Applications provide clients and signers and own fee policy,
permissions and recovery after uncertain transaction outcomes.

## Installation

```sh
pnpm add @derivation-tech/viem-kit viem
```

Use the documentation shipped with the version you install; consult its release
notes for breaking changes when upgrading.

## Quick start

Create a kit for a chain and register application-owned metadata. This example
formats an amount locally; it does not send a transaction or contact an RPC.

```ts
import { ChainKit } from '@derivation-tech/viem-kit';
import { mainnet } from 'viem/chains';

const kit = new ChainKit(mainnet);
kit.registerErc20Token({
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'USD',
    name: 'Example USD Token',
    decimals: 6,
});
const amount = kit.parseErc20Amount('10', 'USD'); // 10_000_000n
```

For an RPC-backed workflow, inject a `publicClient` into `new ChainKit(chain,
{ publicClient })`. Use separate kit instances for different RPCs or forks, even
when they share a chain ID.

## Package entries

| Entry                                 | Contents                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `@derivation-tech/viem-kit`           | ChainKit, parsers, transactions, ERC20/WETH/Multicall and common viem utilities   |
| `@derivation-tech/viem-kit/utils`     | Transactions, errors, address book and logging                                    |
| `@derivation-tech/viem-kit/abis`      | WETH and Multicall ABIs                                                           |
| `@derivation-tech/viem-kit/contracts` | ERC20, WETH and Multicall helpers                                                 |
| `@derivation-tech/viem-kit/node`      | Environment accounts, address resolution, artifacts, Foundry and deployment tools |

Entries support ESM and CommonJS on Node.js 18 or newer. Core entries can be
bundled for browsers without Node tooling. Deep imports into `dist` or internal
files are unsupported. The Node entry loads the optional Ledger peer when a
Ledger signer is requested.

## Guides

- [Chains, tokens and parsers](docs/chains-and-parsers.md): instance ownership, wrapped-native metadata, registries and balance queries.
- [Transactions](docs/transactions.md): typed writes, receipts, replacements, diagnostics, errors, logging and local batches.
- [Node tools](docs/node-tools.md): environment signers, artifacts and deployment.
