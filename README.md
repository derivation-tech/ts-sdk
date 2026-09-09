# Derivation Tech TypeScript SDK

A pnpm workspace containing two packages:

- [`@derivation-tech/viem-kit`](./packages/viem-kit/README.md): chain utilities, address books, contract parsers, transaction handling, and Node deployment helpers.
- [`@derivation-tech/viem-ledger`](./packages/viem-ledger/README.md): optional Ledger account helpers.

## Development

Use Node.js 20 or newer for the full verification toolchain (`attw` requires Node 20). Published packages support Node.js 18 or newer. Use pnpm 9.5 or newer for workspace catalog support.

```sh
pnpm install
pnpm run nx                         # Build all packages
pnpm run lint
pnpm run format                     # Run available package formatters
pnpm run format:check
pnpm -C packages/viem-kit run verify # Full core validation
pnpm run clean
```

Build `viem-ledger` before verifying `viem-kit` in a fresh checkout, since core tests and type checks exercise the optional integration. Core examples are in [`packages/viem-kit/examples`](./packages/viem-kit/examples/); `verify` type-checks them. Review credentials and transaction behavior before running an example against a network.

See the [core coding practices](./packages/viem-kit/CODING_PRACTICES.md) and [migration guide](./packages/viem-kit/MIGRATION.md).

## Adding a package

From the workspace root:

```sh
bash scripts/init.sh package-name
```

The scaffolder refuses an existing target. Add source and tests to the generated `src/` and `test/` directories, then install workspace dependencies and run the package build and tests.

## Releases

- `make changeset SUMMARY='Describe the change' PACKAGES='@derivation-tech/viem-kit:patch'` writes a changeset. Choose the bump for the actual compatibility impact. Without `PACKAGES`, the helper includes all workspace packages at `BUMP` (default `patch`); packages are not configured as a fixed version group.
- `make changeset-dry-run ...` previews the changeset. `pnpm run release:dry` reports pending changeset status.
- `make version` applies versions and refreshes the lockfile.
- `make publish` or `pnpm run release` publishes versioned packages. `make release` versions and publishes.
- The core postpublish hook can notify Slack through `SLACK_WEBHOOK_URL`, with optional `SLACK_MESSAGE_SUFFIX`.

## License

The packages declare the MIT license.
