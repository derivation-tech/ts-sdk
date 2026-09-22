# Derivation Tech TypeScript SDK

A pnpm workspace for viem application and signer utilities.

| Package                                                        | Purpose                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [@derivation-tech/viem-kit](packages/viem-kit/README.md)       | Typed contract transactions, receipt diagnostics, token metadata, parsers and Node deployment tools |
| [@derivation-tech/viem-ledger](packages/viem-ledger/README.md) | Ledger-backed viem accounts for Node applications                                                   |

## Working in this repository

The [development guide](docs/development.md) covers prerequisites, installation,
validation, package scaffolding and releases. Package manifests and
[pnpm-workspace.yaml](pnpm-workspace.yaml) define scripts and dependency ranges;
[pnpm-lock.yaml](pnpm-lock.yaml) records the resolved dependency versions.

Existing viem-kit consumers should use the [migration guide](packages/viem-kit/MIGRATION.md).
The [refactor design record](docs/specs/viem-kit-anchored-refactor.md) retains the
historical design separately from the maintained usage documentation.

## License

The packages declare the MIT license.
