# Development and releases

Run the commands below from the workspace root unless a different directory is shown.

## Prerequisites and installation

Use `nvm install && nvm use` to select the Node.js 24 LTS version pinned in `.nvmrc`.
CI and release builds read the same file. Use the pnpm version pinned in the root
`packageManager` field (pnpm 12.5.1). Workspace tooling requires Node.js 22.18+, 24.11+, or 26+; use the pinned Node.js 24 version.
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

pnpm 12 reads general options from `pnpm-workspace.yaml` and `pnpm_config_*`
environment variables. Commands fail on stale dependencies (`verifyDepsBeforeRun: error`);
run `pnpm install --frozen-lockfile` explicitly before verification. Dependency install
hooks for @parcel/watcher, esbuild, node-hid, unrs-resolver and usb remain disabled: the supported
platforms use their shipped binaries. New dependency build scripts require review
under the default `strictDepBuilds` policy. The default release-age protection stays enabled.

## Tooling responsibilities

Keep one tool responsible for each job:

| Tool                       | Responsibility                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------- |
| pnpm                       | Install the locked dependency graph and run workspace scripts in dependency order   |
| TypeScript (`tsc`)         | Check source, examples, test fixtures and consumer declaration compatibility        |
| ESLint + typescript-eslint | Catch code-quality problems, including unhandled and misused Promises in SDK source |
| Prettier                   | Format files; `eslint-config-prettier` disables conflicting lint rules              |
| Jest 30                    | Run unit and anvil behavior tests                                                   |
| tsdown                     | Produce the ESM and CJS bundles                                                     |
| Changesets                 | Describe release changes and apply package versions                                 |

There are currently two packages. Native pnpm recursion handles their build order,
so the workspace does not need Nx configuration or its task/plugin dependency graph.
tsdown shares code between public entries within each module format. Packed tests check
error-class identity and logger state, while a separate esbuild consumer checks browser
compatibility. TypeScript continues to generate declarations using the existing verified recipe.

This removes Nx task caching and affected-project selection. Reconsider an orchestrator
if measured build costs or a larger dependency graph make those features useful.

TypeScript 6 is pinned through the workspace catalog. The bundled core uses
`moduleResolution: bundler`; the directly emitted Ledger package uses `NodeNext`.
Source roots and Node ambient types are explicit, and package configs do not use the
removed-in-TypeScript-7 `baseUrl` option. Keep source, test, example, declaration and
packed-consumer checks together when upgrading the compiler.

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
runs lint and formatting once, checks release behavior, builds each package once, then runs `verify:checks` on those
builds. Package-level `verify` remains standalone; `verify:checks` requires a current build.

| Command                                                                                                 | Effect                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -C packages/viem-kit run verify`                                                                  | Lint, format check, source/test/example types, Jest, clean build, NodeNext consumer types, packed consumers, publint and attw |
| `pnpm -C packages/viem-kit exec jest --config jest.config.cjs --runInBand tests/unit/chain-kit.test.ts` | One existing behavior suite; replace the path for the code being changed                                                      |
| `pnpm -C packages/viem-kit run verify:types`                                                            | Source, all test files, type fixtures and example type checks                                                                 |
| `pnpm run build`                                                                                        | Build all workspace packages                                                                                                  |
| `pnpm run lint`                                                                                         | Check code with ESLint                                                                                                        |
| `pnpm run format:check`                                                                                 | Run the available package format checks                                                                                       |
| `pnpm run format`                                                                                       | Rewrite files with the available package formatters                                                                           |
| `pnpm run clean`                                                                                        | Remove package build outputs                                                                                                  |

Jest APIs and types are imported explicitly from `@jest/globals`; avoid a second set of ambient Jest types. Mock signatures use the API under test, so argument assertions are checked by TypeScript.

The tests are organized by the contract they verify:

- `tests/unit`: registries, parsers, artifact linking, signer parsing, and SDK helpers composed with
  viem clients over custom (mocked) RPC transports: transaction lifecycle, deployment, multicall and
  account registration. Run with `pnpm -C packages/viem-kit run test`.
- `tests/anvil`: deployment, writes, custom-error decoding, mined-revert diagnostics and batch nonces
  against a local anvil node (`Guarded.sol` holds the test contract source). Requires Foundry's
  `anvil` on `PATH`. Run with `pnpm -C packages/viem-kit run test:anvil`.
- `packages/viem-ledger/tests`: Node.js native tests against the built Ledger adapter, including
  path selection, message/EIP-712/transaction signatures, confirmation policies, cancellation,
  serialized session access and connection cleanup. Tests inject a DMK session and mock SDK
  actions; no hardware or network is required. Ledger also runs publint and attw. Real-device
  signing prompts and reconnect behavior require separate hardware acceptance.
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
so deleted sources cannot leave stale artifacts.
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
browser bundling and loading without Ledger. The same Node/viem matrix also runs the
Ledger adapter's existing tests through `verify:compatibility`. This copies the built adapter
and tests into a temporary directory with the selected peer, without changing the workspace
installation. Each package's minimum viem version comes from its own peer range.

```sh
pnpm -C packages/viem-ledger run verify:compatibility
/path/to/node22 packages/viem-ledger/scripts/verify-compatibility.cjs /path/to/viem
```

Build Ledger first. These checks do not access a device or broadcast transactions;
real-device acceptance remains separate.

### Documentation changes

Keep package READMEs as entry points and usage guides as the API behavior reference.
Put breaking changes and their replacement APIs in the relevant changeset so they
become versioned release notes. Preserve dated design and release records as history.
Link to an authoritative explanation instead of copying it.

Check local links and heading anchors, type-check TypeScript examples, and inspect
the packed file list when changing published guides. A guide linked from a package
README must also be present in the package. Record validation results against the
commit tested; package checks and downstream acceptance do not establish publication.

### Release regression checks

`pnpm run test:release` exercises the installed Changesets CLI and the same
`release:version` command used by CI. It is part of `pnpm run verify`, so pull requests
and the release workflow both run it before building or publishing.

The tests use disposable Git workspaces with the repository's release configuration,
commands and internal dependency relationships. Registry dependencies are omitted and
fixture versions are fixed, making the checks independent of external network access, package
caches and the current pending changesets. They verify:

- Native non-interactive changeset creation, including repeated package flags and multiline summaries.
- A Ledger major release automatically patch-bumps its peer consumer; an explicit major overrides that policy.
- Peer ranges and changelogs update, while the private root version stays unchanged.
- An intentionally stale lockfile is repaired, then passes an offline frozen-lockfile check.
- An empty release fails without changing manifests, changelogs or the lockfile, and skips lockfile refresh.

A local HTTP registry fixture also verifies scope routing, token interpolation through
both authentication-file selectors, and that a token is not sent to another registry path.
It accepts one native `pnpm publish` of an artificial package to check the upload path.
No real registry, credentials or checkout release files are changed. These checks do not
validate production registry permissions, GitHub release PR creation or hardware behavior.

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

[Changesets configuration](../.changeset/config.json) controls versioning. The workspace
uses Changesets 3 with `changesets/action@v2`. Packages are not a fixed version group. Historical package changelogs record release notes;
pending changesets are release inputs, not evidence of publication.

Use the native Changesets CLI to choose affected packages and their release types:

```sh
# Interactive package, bump and summary selection.
pnpm changeset

# Non-interactive: repeat a bump flag for multiple packages, or combine different bumps.
pnpm changeset add --patch @derivation-tech/viem-kit --message 'Describe the change'
pnpm changeset add --major @derivation-tech/viem-kit --major @derivation-tech/viem-ledger --message 'Describe the breaking change and migration'

# Read a longer summary from a local file (POSIX shell).
pnpm changeset add --patch @derivation-tech/viem-kit --message "$(cat /path/to/summary.md)"
```

This replaces the custom changeset generator and Makefile. Packages must be selected
explicitly; there is no implicit patch bump for every package. To review a changeset,
read the generated `.changeset/*.md` file and inspect the release plan below. Creation
writes only the changeset; it does not apply versions or publish. The native `add`
command has no equivalent of the removed helper's `--dry-run`.

| Command                    | Effect                                            |
| -------------------------- | ------------------------------------------------- |
| `pnpm run release:dry`      | Report the pending release plan without versioning |
| `pnpm run release:version`  | Apply versions and refresh the lockfile            |
| `pnpm run release`          | Publish already-versioned packages                |

Versioning changes tracked files; publishing writes to the registry. Review and verify
version changes before publishing. The core postpublish hook can notify Slack through
`SLACK_WEBHOOK_URL` and optional `SLACK_MESSAGE_SUFFIX`.

`pnpm run release:version` applies pending changesets and refreshes only the lockfile
with lifecycle scripts disabled. The release workflow uses the same command so its PR
includes a matching lockfile. With no pending changesets, Changesets 3 returns exit code 1
and the command stops before lockfile refresh. It never invokes publish.
Use `pnpm run release:dry` to inspect the plan first.

Changesets 3 gives peer-dependent packages a patch bump by default. Add an explicit major
changeset when the consumer API is incompatible; the current core/Ledger migration already
marks both packages as major. Private workspace packages are not versioned by default.

Registry selection comes from npm configuration. In the release workflow, `actions/setup-node`
writes a temporary `.npmrc` that maps `@derivation-tech` to `NPM_REGISTRY_URL` and reads
`NODE_AUTH_TOKEN`; it exports `NPM_CONFIG_USERCONFIG`, and the publish step selects the same file
for pnpm with `PNPM_CONFIG_NPMRC_AUTH_FILE`. The GitHub token is passed through
the Action's `github-token` input. Local versioning and
packing can be rehearsed in a disposable checkout without registry credentials; actual
publication and GitHub release/PR creation require the configured CI credentials.
