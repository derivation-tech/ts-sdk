# viem-kit typed API and execution refactor

Date: 2026-09-09
Baseline: `origin/main` at `3834a96` (viem-kit 0.2.2).

## Objective and consumer evidence

Make viem-kit a small, typed execution and diagnostic library that can replace
Anchored's generic SDK workarounds without moving business policy into this package.
The consumer reference is `anchored-contracts` and the task "盘点依赖与 viem-kit 用法"
(`01a079f6-42fa-7cc0-9032-3459061025f9`). Its installed version is 0.2.1.

Current consumer evidence:

- `script/deploy/lib/util.ts` has a second send path for EIP-1559 fee overrides and
  a 120-second receipt timeout. Gas buffering and fee multiplication are caller policy.
- `script/deploy/lib/chain-kit.ts` mutates `WRAPPED_NATIVE_TOKENS` to construct kits
  for custom chains, even when deployment does not use wrapped native tokens.
- Deployment supplies its own viem clients, parsers, metadata and signer resolver.
  Same-chain forks must be able to own independent clients and registries.
- Artifact loading/deployment and environment signer helpers are Node tooling;
  reading or importing the core package must not load them or require dynamic eval.

The baseline exposes legacy `TxRequest` and parser interfaces. This refactor
replaces those interfaces together so ABI inference, parsing and transaction
execution share one public contract. It also makes package entry points and
declarations explicit and aligns the optional Ledger peer with the published
Ledger package.

## Scope

Only change the derivation-tech viem-kit workspace and its acceptance examples,
tests, package metadata and documentation. Keep PerpV3 paused and leave the live
Anchored checkout unchanged. No publish, push, PR, chain transaction or deployment.
No Safe orchestration, business parsers, roles, fee policy, durable transaction
journal, automatic retry service, or wholesale signer-language redesign.

## Contracts

### Typed parser and transaction APIs

Derive `TypedWriteRequest` from viem's `WriteContractParameters`, preserving
function names, argument tuples, payable values, zero-argument functions, account,
chain and transaction overrides. Use `defineWriteRequest` to retain compile-time
validation when assembling heterogeneous local batches. Remove the untyped
`TxRequest`, `sendTxWithLog` and formatter compatibility surfaces.

Use `ContractParser<TAbi>` and typed transaction/event/error handler maps.
Registry entries carry the parser with its ABI; consumers should not need to
re-narrow a heterogeneous parser after lookup. Decode event logs with the emitting
address's parser and support fallback parsing plus sync or async handlers.

Expose `DecodedContractError` as a discriminated union for custom errors, revert
strings, panics, raw data and unknown failures. Preserve the original error
evidence while keeping business formatting in the consumer. ERC20, WETH,
Multicall and examples use these typed public contracts.

### Explicit chain instances

`new ChainKit(chain, options?)` takes a named `ChainKitOptions` object with
`publicClient`, `wrappedNativeToken`, and `addressNames`. Validate an injected
client's configured chain before using it. A missing wrapped token is valid;
explicit metadata overrides built-ins and `null` disables automatic registration.
`wrappedNativeTokenInfo` is optional. WETH operations fail before sending if no
metadata exists. Wrapped-token identity uses the instance's metadata.

Each instance owns its address book, tokens and parsers. Keep
`ChainKitRegistry.for(...)` as a documented process-wide convenience for default
configuration; explicitly configured/fork clients use independent `ChainKit`s.
Registry lookup, `has` and `clearChain` use consistent case-insensitive names.

### Sending, waiting and transaction facts

Use the existing viem-derived `TypedWriteRequest` for fees, nonce, account and
calldata. `ChainKit.sendTx` forwards the same `SendTransactionOptions` as
`sendContractTransaction`. Add `wait` options for confirmations, timeout, polling
interval and replacement checking, preserving viem's defaults when omitted.

Keep `SentTransaction.hash` as the submitted hash. Receipt-related hooks identify
the actual receipt hash and retain the submitted hash. Repricing of the same
transaction succeeds; cancellation or replacement with another intent produces
a typed error that retains the replacement receipt. Never parse the original
request against a different-intent replacement. Receipt-wait errors retain the
submitted hash and cause so callers can reconcile instead of resubmitting.

Preserve the existing raw reverted-receipt return contract. Add an explicit
`assertTransactionSuccess(receipt)` helper for fail-closed deployment/CLI callers.
For local accounts, observe viem's actual prepare, sign and raw-send boundaries.
Preparation and signing failures are `not-sent`; entering raw send makes a failure
`unknown`. Preserve phase, public request identity, allocated nonce, signed hash
when available, and cause. Reuse viem's preparation, serialization and transport
behavior. Opaque RPC-wallet sends remain `unknown` after entering the wallet action;
do not infer broadcast status from error strings. Contract writes, local batches
and deployments share these submission facts and never retry automatically.

### Diagnostics are observational

Synchronous and asynchronous hook failures, parser resolver failures, and logger
failures cannot turn a broadcast or receipt into a transaction failure. Support
Promise-returning hooks and catch rejected error-reporting hooks too. Hook calls
do not block transaction progress; async consumers own their delivery guarantees.
Transaction descriptions, event/error parsers and revert replay must also remain
independent of sending and receipt completion when their promises never settle.
`onSent` reports the hash immediately; `onDescription` delivers the eventual
transaction description. Receipt diagnostics begin only after the original intent
passes replacement checks. `onReverted` delivers available error detail even if
replay or parsing exceeds its diagnostic budget.

Expose `SentTransaction.diagnostics` for CLI callers to await separately from the
receipt. Bound transaction-description and receipt-diagnostic work independently
with `options.diagnostics.timeout` (default 5 seconds per stage) and an optional
AbortSignal. Timeout or cancellation stops SDK waiting and suppresses late
diagnostic hooks, without changing transaction outcomes or cancelling a broadcast.
The diagnostics promise resolves after receipt handling with a completion status;
it never converts a receipt failure into a second unhandled rejection. The deadline
does not interrupt synchronous JavaScript or forcibly abort consumer-owned I/O.
Hooks remain unawaited, so external log delivery is still the caller's responsibility.
Revert replay is best-effort evidence at the receipt block, not proof of the
historical intra-block execution state.

`LoggerFactory.setLogger(name, logger)` overrides lookup for that name at every
level, including after a default logger was cached. Default level/timestamp options
configure SDK-created console loggers; they do not mutate injected loggers.
`clear()` removes both injected and generated loggers.

### Local batch boundary

Validate all static accounts, chains and calldata before the first broadcast.
All preparation/sign/send/wait failures include batch progress. Before raw send,
compute and retain the signed transaction hash; an RPC error may mean acceptance
is unknown and must not erase that hash or trigger an automatic retry.

Allow an explicitly shared viem `NonceManager` for concurrent batch calls;
retain per-call pending-nonce allocation when omitted and document that it is
only safe for serialized calls with exclusive sender ownership. SDK-managed
coordination does not cover other processes, browser wallets or external senders.
Batch receipt waiting uses the common replacement and wait semantics.

### Package boundaries

The root and `./utils` entries are browser-compatible and load without dynamic
string execution. Move environment accounts, signer-aware address resolution,
Foundry artifacts/helpers and deployment exports to `./node`. Use native lazy
`import()` for the optional Ledger package; importing `./node` without Ledger
must work until Ledger is actually requested. Retain viem accounts re-exports,
which do not read environment credentials.

Deployment helpers share chain validation, wait configuration and receipt success
assertion. Allow transaction gas/fee/nonce overrides; reject mismatched chains
before broadcasting. They still return the created address and fail on missing
contract addresses. No implicit broadcasts in examples or acceptance tests.

## Incremental commits

1. Define this complete spec against `origin/main`.
2. Replace the legacy parser and transaction APIs together, migrate helpers and
   examples, and establish the package/typechecking foundation and regression tests.
3. Add explicit ChainKit configuration, optional wrapped-native metadata,
   instance isolation and registry consistency, including WETH consumers.
4. Define receipt and submission outcomes, isolate diagnostics, and harden local
   batch preflight, signed-hash progress and shared nonce coordination.
5. Node package boundary and deployment alignment.
6. Anchored-shaped consumer acceptance, migration documentation, changeset and
   CI/release quality gates.

Each implementation commit includes its relevant regression tests. Validate
intermediate source, tests and examples, and run the complete package gate for the
finished branch. History consolidation preserves the final implementation; this
spec records the complete scope rather than a later phase's starting point.

## Acceptance criteria

- Typed parsers, function names, argument tuples, payable and zero-argument
  requests have positive and negative type fixtures. Structured error decoding
  and address-specific event parsing have runtime regressions.
- A custom chain without WETH metadata constructs and can send a mocked typed
  admin call. Explicit metadata wins over built-ins without mutating global tables.
- Same-chain kit instances retain different clients, names and parsers.
- Fee/nonce overrides and wait settings reach viem unchanged; invalid ABI names
  or args fail typechecking. Known chain mismatches fail before sending.
- Async and throwing observers/resolvers/loggers preserve sent hashes/receipts;
  actual and submitted hashes remain distinguishable after replacement.
- Never-settling transaction/event/error parsers and revert replay cannot hide the
  hash or receipt. Explicit diagnostic waiting times out or cancels, clears its
  resources, and suppresses late diagnostic delivery. Replacement receipts never
  enter the original request's event/error parsers.
- Real viem local-account execution proves estimate-gas failure and signing refusal
  send no raw transaction. A lost raw-send response remains unknown with its signed
  hash and nonce. Batch and deployment failures expose the same evidence.
- Injected loggers are honored before/after default caching, across levels and
  names, and cleared without mutating consumer-owned logger settings.
- Reverted receipts, cancellation, wait timeout and unknown submission have
  explicit, tested semantics with reconciliation evidence.
- Invalid later batch entries broadcast nothing; later dynamic failures preserve
  prior progress and uncertain signed hashes. A shared manager allocates unique
  nonces across concurrent calls in a deterministic mock test.
- CJS and ESM package consumers typecheck and load. A browser bundle of the core
  has no Node built-in dependency; root loading works with string eval disabled.
- An isolated packed-package consumer mirrors Anchored's metadata, typed parser,
  fee override and wait usage without the global table patch or second send path.
- Package lint, source/example/consumer type checks, Jest, build, publint and attw
  pass. All validation is offline/mocked; no live deployment or Ledger signing.

## Migration and rollback

This is a breaking API migration with a major changeset. Replace the positional
ChainKit metadata argument with named options, handle optional WETH metadata,
move Node imports to `@derivation-tech/viem-kit/node`, and migrate
`sendTxWithLog`/legacy parsers to the typed API. Anchored dependency rollout remains
a separate change after this library and its fixture pass.
Keep each commit independently reviewable; roll back by reverting the relevant
commits or keeping the consumer pinned to its current published version.
