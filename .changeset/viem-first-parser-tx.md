---
'@derivation-tech/viem-kit': major
---

Refactor parser and transaction APIs around viem-first typed requests.

Removes the formatter compatibility surface, the legacy root error extraction export, and the untyped TxRequest transaction helper API. Contract writes now use viem-compatible typed write requests, parser registries resolve typed parser envelopes, and local batch signing is explicit through batchSendLocalTransactions.

`TypedWriteRequest` now follows viem's payable and zero-argument conditions. Heterogeneous local batches use `defineWriteRequest`, return `{ index, hash, receipt }` entries, allocate pending nonces per account, and retain submitted hashes on partial failure. Lifecycle observer failures no longer turn an already-submitted transaction into a send failure.

ESM declaration wrappers now use NodeNext-compatible implementation specifiers and are covered by ESM and CommonJS consumer type fixtures.

ChainKit now takes named options for client injection, address names and wrapped-native metadata. Wrapped-native metadata is optional; explicit overrides take precedence and null disables automatic registration. Same-chain instances keep their own metadata and clients.

Transaction options now expose receipt wait configuration. Async observers, logger failures and parser resolver failures are isolated. Receipt hooks include submittedHash and the actual receipt hash; cancellation and changed-intent replacement throw TransactionReplacementError. Submission and wait errors retain reconciliation evidence, and assertTransactionSuccess provides explicit reverted-receipt enforcement.

Local batches preflight all static inputs before broadcasting, support an explicitly shared viem NonceManager and common wait options, and retain reserved nonces and signed hashes with submitted/unknown/not-sent progress on failures. RPC-returned hashes must match the signed payload.

Environment accounts, signer-aware address resolution, artifact/Foundry helpers and deployments now live under @derivation-tech/viem-kit/node. Core entries no longer load Node tooling or dynamic eval. Ledger loads lazily through native import(), and environment account caches belong to individual kits. Deployment helpers share chain, fee, wait and outcome handling with contract writes.

WETH helpers use the kit's explicit wrapped-native metadata and the chain's native decimals, and fail before broadcast when wrapped-native metadata is disabled.

Package verification now includes an isolated tarball consumer modeled on Anchored's typed FundController administration flow, CJS/ESM loading without Ledger, and a browser bundle. A migration guide covers the consumer's fee, metadata, parser, import and transaction-outcome changes.

Never-settling transaction/event/error parsers and revert replay no longer block submission or receipt completion. Transaction descriptions use onDescription; SentTransaction.diagnostics offers a separate bounded, cancellable wait for CLI output, with late diagnostic delivery suppressed after cutoff.

Submission errors now retain their observed prepare/sign/send phase. Local preparation and signing failures are not-sent; raw-send and opaque RPC-wallet failures remain unknown, with known nonce and signed hash evidence retained. Contract writes, batches and deployment helpers share this path. Local sends observe viem native actions, so custom sendTransaction/deployContract overrides should move to preparation, signing or raw-send customization.

LoggerFactory.setLogger now consistently overrides a name across all log levels, including cached defaults. Injected loggers retain their own settings, and clear removes both injected and generated instances.

Structured artifact links now prefer exact source-qualified library names over explicit short-name fallbacks. Mappings for other source files no longer silently link the first same-named library.

Deployment bytecode is validated before submission, including preloaded artifacts and calls without library mappings. Raw compiler mapping comments are stripped from linked output; Solidity library hashes use keccak256 exclusively.

Balance multicall helpers now reject failed RPC or contract calls instead of substituting zero balances. Batch sizes must be positive safe integers; successful bigint arrays retain their ordering.

The draft `./utils` receipt helpers `waitForParsedReceipt` and `diagnoseReceipt` are no longer public exports. Consumers use `SentTransaction.receipt` and `SentTransaction.diagnostics`, or `waitForTransactionOutcome` when only a submitted hash is available. Other transaction exports are preserved through an explicit public list.
