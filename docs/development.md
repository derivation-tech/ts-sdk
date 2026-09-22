# Development and releases

Run the commands below from the workspace root unless a different directory is shown.

## Prerequisites and installation

Use `nvm install && nvm use` to select the Node.js 24 LTS version pinned in `.nvmrc`.
CI and release builds read the same file. Use the pnpm version pinned in the root
`packageManager` field. Workspace tooling requires Node.js 22.18+, 24.11+, or 26+; use the pinned Node.js 24 version.
Both SDK packages require Node.js 22 or newer. Node.js 22 and 24 are the supported
LTS versions covered by the consumer tests. Node type definitions track 22.x so
compilation does not assume APIs specific to Node.js 24.

```sh
pnpm install --frozen-lockfile
pnpm run verify
```

The root `build`, `test` and `verify` commands build workspace dependencies in order.
When running viem-kit checks directly in a fresh checkout, build Ledger first:
viem-kit's type checks exercise the optional integration. The consumer tests themselves load the core and Node entries without
Ledger installed. `pnpm install` installs dependencies and runs workspace lifecycle
hooks; it is not a validation-only command.

## Tooling responsibilities

Keep one tool responsible for each job:

| Tool                       | Responsibility                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------- |
| pnpm                       | Install the locked dependency graph and run workspace scripts in dependency order   |
| TypeScript (`tsc`)         | Check source, examples, test fixtures and consumer declaration compatibility        |
| ESLint + typescript-eslint | Catch code-quality problems, including unhandled and misused Promises in SDK source |
| Prettier                   | Format files; `eslint-config-prettier` disables conflicting lint rules              |
| Jest 30                    | Run unit and integration behavior tests                                             |
| tsdown                     | Produce the ESM and CJS bundles                                                     |
| Changesets                 | Describe release changes and apply package versions                                 |

There are currently two packages. Native pnpm recursion handles their build order,
so the workspace does not need Nx configuration or its task/plugin dependency graph.
tsdown shares code between public entries within each module format. Packed tests check
error-class identity and logger state, while a separate esbuild consumer checks browser
compatibility. TypeScript continues to generate declarations using the existing verified recipe.

This removes Nx task caching and affected-project selection. Reconsider an orchestrator
if measured build costs or a larger dependency graph make those features useful.

The ESLint flat config scopes Node globals to scripts and configuration, applies
recommended TypeScript rules to TypeScript files, and uses `projectService` only for
SDK source to enable type-aware Promise checks. Compile-time negative fixtures may
intentionally contain unused aliases. The core's no-`any` rule also covers its examples,
so copied examples do not silently bypass type checking.

ESLint and tsdown require newer Node patches than the SDK runtime does. The root engine
range describes development tooling; each published package declares its own runtime
requirement. Developing on the pinned Node 24 version does not require consumers to
upgrade to 24. Keep consumer tests on both supported LTS lines before changing that
compatibility promise.

## Validation

Use `pnpm run verify` for the complete workspace gate, `pnpm run build` to build
all packages, and `pnpm test` to build prerequisites and run package tests.
These commands use pnpm workspace dependency ordering and stop on failure. Root verification
runs lint and formatting once, builds each package once, then runs `verify:checks` on those
builds. Package-level `verify` remains standalone; `verify:checks` requires a current build.

| Command                                                                                                 | Effect                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -C packages/viem-kit run verify`                                                                  | Lint, format check, source/test/example types, Jest, clean build, NodeNext consumer types, packed consumers, publint and attw |
| `pnpm -C packages/viem-kit exec jest --config jest.config.cjs --runInBand tests/unit/chain-kit.test.ts` | One existing behavior suite; replace the path for the code being changed                                                      |
| `pnpm -C packages/viem-kit run verify:types`                                                            | Source, all unit/integration tests, type fixtures and example type checks                                                     |
| `pnpm run build`                                                                                        | Build all workspace packages                                                                                                  |
| `pnpm run lint`                                                                                         | Check code with ESLint                                                                                                        |
| `pnpm run format:check`                                                                                 | Run the available package format checks                                                                                       |
| `pnpm run format`                                                                                       | Rewrite files with the available package formatters                                                                           |
| `pnpm run clean`                                                                                        | Remove package build outputs                                                                                                  |

Jest APIs and types are imported explicitly from `@jest/globals`; avoid a second set of ambient Jest types. Mock signatures use the API under test, so argument assertions are checked by TypeScript.

The tests are organized by the contract they verify:

- `tests/unit`: registries, token metadata, parser behavior, artifact linking and signer/path parsing.
  Run with `pnpm -C packages/viem-kit run test:unit`.
- `tests/integration`: SDK helpers composed with viem clients, local signing, mocked RPC,
  transaction lifecycle, deployment, multicall and account registration.
  Run with `pnpm -C packages/viem-kit run test:integration`.
- `packages/viem-ledger/tests`: Node.js native tests against the built Ledger adapter, including
  path selection, message signatures, confirmation policies and retry behavior. Device methods
  use an injected transport; no hardware is required. Ledger also runs publint and attw.
- `tests/typecheck` and `tests/consumer-node-next`: compile-time ABI constraints and public ESM/CJS declarations.
- `tests/consumer-package`: a generic contract exercised through the packed package, including
  ESM, CJS, browser bundling and the absence of optional Ledger dependencies.
  Run `build` before `verify:consumer`.

`verify` runs both runtime suites, type checks and packed consumers. Integration tests
use synthetic data and mocked transports: they do not require RPC credentials, a running
chain, retired network files or Ledger hardware. Mainnet and other supported-chain metadata
assertions cover the built-in registry. Network examples are in
[viem-kit/examples](../packages/viem-kit/examples/); check their RPC, account and transaction
behavior before running them.

### Package builds and peer compatibility

`build` removes `dist` before producing shared ESM/CJS chunks and declarations,
so deleted sources cannot leave stale artifacts. `build:clean` is an explicit clean-build alias.
The `prepack` lifecycle also builds and type-checks before packaging. Consumer checks pack with
`--offline --ignore-scripts` after this explicit build. publint and attw also skip lifecycle hooks,
so package validation does not repeat builds. A normal `npm pack` still runs `prepack`.

To check an already-built package against a separately installed viem peer:

```sh
pnpm -C packages/viem-kit run verify:consumer /path/to/viem
```

To check a separate Node runtime against the same build:

```sh
/path/to/node22 packages/viem-kit/scripts/verify-consumer.mjs
/path/to/node22 packages/viem-kit/scripts/verify-consumer.mjs /path/to/viem
```

[CI](../.github/workflows/ci.yml) runs full verification on the pinned Node.js 24 version, then runs
the packed consumer on Node.js 22 and 24 with both the locked viem version and
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
