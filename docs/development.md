# Development and releases

Run the commands below from the workspace root unless a different directory is shown.

## Prerequisites and installation

Use Node.js 22 for the development workflow used by CI and the pnpm version pinned
in the root `packageManager` field. Workspace development requires Node.js 20.9 or newer. Package runtimes support Node.js 18 or newer; the full
verification toolchain includes `attw`, which requires Node.js 20 or newer.

```sh
pnpm install --frozen-lockfile
pnpm -C packages/viem-ledger run build
pnpm -C packages/viem-kit run verify
```

Build Ledger first in a fresh checkout: viem-kit's type checks exercise the optional
integration. The consumer tests themselves load the core and Node entries without
Ledger installed. `pnpm install` installs dependencies and runs workspace lifecycle
hooks; it is not a validation-only command.

## Validation

| Command                                                                                            | Effect                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -C packages/viem-kit run verify`                                                             | Lint, format check, source/test/example types, Jest, clean build, NodeNext consumer types, packed consumers, publint and attw |
| `pnpm -C packages/viem-kit exec jest --config jest.config.cjs --runInBand tests/chain-kit.test.ts` | One existing behavior suite; replace the path for the code being changed                                                      |
| `pnpm -C packages/viem-kit run verify:types`                                                       | Source, test and example type checks                                                                                          |
| `pnpm run nx`                                                                                      | Build all workspace packages                                                                                                  |
| `pnpm run lint`                                                                                    | Check code with ESLint                                                                                                        |
| `pnpm run format:check`                                                                            | Run the available package format checks                                                                                       |
| `pnpm run format`                                                                                  | Rewrite files with the available package formatters                                                                           |
| `pnpm run clean`                                                                                   | Remove package build outputs                                                                                                  |

The package `verify` command uses mocked transports and synthetic consumer data.
It verifies library and package contracts, not live chain deployments or Ledger
hardware. Network examples are in [viem-kit/examples](../packages/viem-kit/examples/);
check their RPC, account and transaction behavior before running them.

### Package builds and peer compatibility

`build` supports incremental work. `build:clean` removes `dist` before the same
build recipe; both `verify` and the `prepack` lifecycle use it to prevent deleted
source files from leaving stale declarations or bundles. Consumer checks pack with
`--offline --ignore-scripts` after this explicit build.

To check an already-built package against a separately installed viem peer:

```sh
pnpm -C packages/viem-kit run verify:consumer /path/to/viem
```

To check a separate Node runtime against the same build:

```sh
/path/to/node18 packages/viem-kit/scripts/verify-consumer.mjs
/path/to/node18 packages/viem-kit/scripts/verify-consumer.mjs /path/to/viem
```

[CI](../.github/workflows/ci.yml) runs full verification on Node.js 22, then runs
the packed consumer on Node.js 18 and 22 with both the locked viem version and
the exact lower bound of the declared peer range. The consumer checks ESM, CJS,
browser bundling and loading without Ledger.

### Documentation changes

Keep package READMEs as entry points and usage guides as the API behavior reference.
Put breaking changes and their replacement APIs in the relevant changeset so they
become versioned release notes. Preserve dated design and release records as history.
Link to an authoritative explanation instead of copying it.

Check local links and heading anchors, type-check TypeScript examples, and inspect
the packed file list when changing published guides. A guide linked from a package
README must also be present in the package. Record validation results against the
commit tested; package checks and downstream acceptance do not establish publication.

## Adding a package

```sh
bash scripts/init.sh package-name
```

The scaffolder refuses an existing target and creates `src/`, `test/`, a package
manifest, README and TypeScript configuration links. Fill in the README's purpose
and public usage, add source and tests, then install workspace dependencies and run
that package's build and tests. Edit [templates](../templates/) when changing future
scaffolds; existing packages are not regenerated.

## Releases

[Changesets configuration](../.changeset/config.json) controls versioning. Packages
are not a fixed version group. Historical package changelogs record release notes;
pending changesets are release inputs, not evidence of publication.

| Command                                                                                           | Effect                                                          |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `make changeset SUMMARY='Describe the change' PACKAGES='@derivation-tech/viem-kit:patch'`         | Write a changeset; choose the bump for the compatibility impact |
| `make changeset-dry-run SUMMARY='Describe the change' PACKAGES='@derivation-tech/viem-kit:patch'` | Preview the changeset without writing it                        |
| `pnpm run release:dry`                                                                            | Report pending changeset status in this workspace               |
| `make version`                                                                                    | Apply versions and refresh the lockfile                         |
| `make publish` or `pnpm run release`                                                              | Publish versioned packages                                      |
| `make release`                                                                                    | Version and publish                                             |

Without `PACKAGES`, the helper includes every workspace package using `BUMP`
(default `patch`). Versioning changes tracked files; publishing writes to the
registry. The core postpublish hook can notify Slack through `SLACK_WEBHOOK_URL`
and optional `SLACK_MESSAGE_SUFFIX`.
