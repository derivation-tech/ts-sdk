---
'@derivation-tech/viem-kit': major
---

Typed, viem-first transaction and parser APIs. Requires Node.js 22 or newer.

Migration:

- Transactions: replace `TxRequest` with `TypedWriteRequest<TAbi, TFunctionName>`. Replace `sendTxWithLog(publicClient, walletClient, kit, request)` with `kit.sendTx(walletClient, request, options)` for a receipt, or `sendContractTransaction(context, request, options)` for the hash, receipt and diagnostics. Put gas, fee and nonce overrides in the request and receipt settings in `options.wait`. Call `assertTransactionSuccess` where a reverted receipt must throw. Move description logging from `onSent` to `onDescription`; CLI callers that need diagnostics await `sent.diagnostics`.
- Errors: submission failures throw `TransactionSubmissionError` with `phase` (`prepare`, `sign`, `send`) and `outcome` (`not-sent`, `unknown`). Treat `unknown` as possibly broadcast and reconcile before retrying. For contract writes, `cause` is viem's `ContractFunctionExecutionError`. A JSON-RPC wallet rejection is `sign` / `not-sent`; a failure after a local account's raw broadcast stays `send` / `unknown`. Receipt waits throw `TransactionReceiptError` or `TransactionReplacementError`. Decode errors with `decodeContractError` and format them with `formatContractError`; the legacy root error extraction export is removed.
- Batches: call `batchSendLocalTransactions(publicClient, [{ walletClient, request: defineWriteRequest(...) }], { hooks, wait })`. Nonces are allocated per call from the pending count; the shared `nonceManager` option is removed.
- Parsers: use `ContractParser<TAbi>` or `createContractParser`. Replace `createParserRegistry()` with `new ParserRegistry(defaultParser)` and `kit.resolveParser(address)` with `kit.getParser(address)`. `RegisteredParser` is removed. Logs from addresses without an event parser are skipped instead of reported as parse errors.
- ChainKit: construct with `new ChainKit(chain, { publicClient, wrappedNativeToken, addressNames })` instead of assigning `kit.publicClient` or mutating `WRAPPED_NATIVE_TOKENS`. `wrappedNativeToken: null` disables wrapped-native metadata; handle a missing `wrappedNativeTokenInfo`.
- Node tooling moves to `@derivation-tech/viem-kit/node`: `getAccount`, `expandSignerIdPattern`, address resolution, `ArtifactHelper`, `deployArtifact` and `deployBytecode`. `FoundryHelper` is removed; use `ArtifactHelper`. Deployment `confirmations` is removed; use `wait.confirmations` (default 2).
- Removed: the ABC testnet (`abctest`, `./chains`), token defaults for Goerli, Berachain bArtio and local chain 31337, and the `waitForParsedReceipt` / `diagnoseReceipt` exports.
- Behavior: balance multicall helpers reject failed calls instead of returning zero. Artifact linking requires exact 20-byte addresses and prefers source-qualified library names. `LoggerFactory.setLogger` overrides a name at every log level. A request `dataSuffix` replaces the wallet client's default suffix, as in viem. Without a request or kit chain, transactions use the wallet client's chain, including its serializers, before the public client's.
