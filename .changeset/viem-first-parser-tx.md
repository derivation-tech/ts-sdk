---
'@derivation-tech/viem-kit': major
---

Refactor parser and transaction APIs around viem-first typed requests.

Remove the formatter compatibility surface, the legacy root error extraction export, and the untyped transaction API:

- Replace `TxRequest` with `TypedWriteRequest<TAbi, TFunctionName>`.
- Replace `sendTxWithLog(publicClient, walletClient, kit, request)` with `kit.sendTx(walletClient, request, options)` for a receipt, or `sendContractTransaction(context, request, options)` for separate hash, receipt and diagnostics access.
- Put gas, fee and nonce overrides in the request and receipt settings in `options.wait`. Preserve application fee policy and receipt-success assertions when removing duplicate send wrappers.
- Use `ContractParser<TAbi>` or `createContractParser` handlers. Narrow decoded errors by `kind` before accessing variant-specific fields.
- Use `batchSendLocalTransactions` for local batch signing.

`TypedWriteRequest` now follows viem's payable and zero-argument conditions. Heterogeneous local batches use `defineWriteRequest`, return `{ index, hash, receipt }` entries, allocate pending nonces per account, and retain submitted hashes on partial failure. Lifecycle observer failures no longer turn an already-submitted transaction into a send failure.

ESM declaration wrappers now use NodeNext-compatible implementation specifiers and are covered by ESM and CommonJS consumer type fixtures.

Replace the positional ChainKit metadata argument with `new ChainKit(chain, { publicClient, wrappedNativeToken, addressNames })`. Inject the client at construction instead of assigning `kit.publicClient`, and supply instance metadata instead of mutating `WRAPPED_NATIVE_TOKENS`. Wrapped-native metadata is optional; explicit overrides take precedence and `null` disables automatic registration. Handle missing `wrappedNativeTokenInfo` before accessing its address. Use separate kit instances for distinct RPCs or forks, even when they share a chain ID.

Transaction options now expose receipt wait configuration. Async observers, logger failures and parser resolver failures are isolated. Receipt hooks include submittedHash and the actual receipt hash; cancellation and changed-intent replacement throw TransactionReplacementError. Submission and wait errors retain reconciliation evidence, and assertTransactionSuccess provides explicit reverted-receipt enforcement.

Local batches preflight all static inputs before broadcasting, support an explicitly shared viem NonceManager and common wait options, and retain reserved nonces and signed hashes with submitted/unknown/not-sent progress on failures. RPC-returned hashes must match the signed payload.

Environment accounts, signer-aware address resolution, artifact/Foundry helpers and deployments now live under @derivation-tech/viem-kit/node. Core entries no longer load Node tooling or dynamic eval. Ledger loads lazily through native import(), and environment account caches belong to individual kits. Deployment helpers share chain, fee, wait and outcome handling with contract writes.

WETH helpers use the kit's explicit wrapped-native metadata and the chain's native decimals, and fail before broadcast when wrapped-native metadata is disabled.

Package verification now includes an isolated tarball consumer modeled on Anchored's typed FundController administration flow, CJS/ESM loading without Ledger, and a browser bundle. Usage guides describe the supported APIs; consumers must validate their own administration and deployment flows before changing dependency pins.

Never-settling transaction/event/error parsers and revert replay no longer block submission or receipt completion. Move transaction-description logging from `onSent` to `onDescription`. `SentTransaction.diagnostics` offers a separate bounded, cancellable wait for CLI output, with late diagnostic delivery suppressed after cutoff. CLI callers that require diagnostics should handle `sent.receipt` and await `sent.diagnostics` in a `finally` block, including when receipt-success assertions throw.

Submission errors now retain their observed prepare/sign/send phase. Local preparation and signing failures are not-sent; raw-send and opaque RPC-wallet failures remain unknown, with known nonce and signed hash evidence retained. Contract writes, batches and deployment helpers share this path. Local sends observe viem native actions, so custom sendTransaction/deployContract overrides should move to preparation, signing or raw-send customization.

LoggerFactory.setLogger now consistently overrides a name across all log levels, including cached defaults. Injected loggers retain their own settings, and clear removes both injected and generated instances.

Structured artifact links now prefer exact source-qualified library names over explicit short-name fallbacks. Mappings for other source files no longer silently link the first same-named library.

Deployment bytecode is validated before submission, including preloaded artifacts and calls without library mappings. Raw compiler mapping comments are stripped from linked output; Solidity library hashes use keccak256 exclusively.

Balance multicall helpers now reject failed RPC or contract calls instead of substituting zero balances. Batch sizes must be positive safe integers; successful bigint arrays retain their ordering.

The draft `./utils` receipt helpers `waitForParsedReceipt` and `diagnoseReceipt` are no longer public exports. Consumers use `SentTransaction.receipt` and `SentTransaction.diagnostics`, or `waitForTransactionOutcome` when only a submitted hash is available. Other transaction exports are preserved through an explicit public list.

Remove the retired ABC testnet, its token defaults and examples, the `abctest` root export, and the ABC-only `./chains` entry. Consumers must remove ABC imports and configuration entries; explicit caller-owned Chain objects remain supported.

Remove built-in ERC20 and wrapped-native token defaults for retired Goerli and Berachain bArtio networks. Explicit caller-owned metadata remains supported.

Remove deployment-specific WETH and ERC20 defaults for local chain 31337. Anvil remains supported; consumers register metadata from their own deployment instead of inheriting stale addresses.
