# Migrating from viem-kit 0.2.1

Use this guide to move a consumer to the typed API documented in this source tree.
It covers breaking changes tracked by the pending major changeset. Check the
version and package artifact you are installing; this guide is not a publication
or downstream deployment record.

## Imports and chain ownership

| Previous use                                                                            | Replacement                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Root/utils imports of `getAccount`, address resolution, artifacts or deployment helpers | Import from `@derivation-tech/viem-kit/node`                              |
| Positional ChainKit metadata argument                                                   | `new ChainKit(chain, { publicClient, wrappedNativeToken, addressNames })` |
| Reassign `kit.publicClient`                                                             | Inject the client when constructing a kit                                 |
| Mutate `WRAPPED_NATIVE_TOKENS`                                                          | Supply `wrappedNativeToken` for that instance; use `null` to disable it   |
| Same-chain global registry for distinct RPCs or forks                                   | Create one kit per workflow/environment                                   |
| Assume `wrappedNativeTokenInfo.address` exists                                          | Handle absent metadata or configure it before a WETH operation            |

See [chain instances](docs/chains-and-parsers.md#chain-instances) for ownership and
metadata behavior. Application-specific signers, roles and fork policy remain in
the consumer.

## Replace the send path

Replace `sendTxWithLog(publicClient, walletClient, kit, request)` with
`kit.sendTx(walletClient, request, options)` when only the receipt is needed, or
`sendContractTransaction(context, request, options)` when the caller needs the
submitted hash and separate diagnostic completion.

- Replace `TxRequest` with `TypedWriteRequest<TAbi, TFunctionName>`. Use
  `defineWriteRequest` when assembling heterogeneous local batches.
- Move fee, gas and nonce overrides into the request; move receipt settings into
  `options.wait`. Remove duplicate send wrappers once equivalent behavior is tested.
- Keep receipt-success assertions. Raw send helpers return reverted receipts;
  deployment helpers reject them.
- Move local-account customizations out of `walletClient.sendTransaction` and
  `deployContract` wrappers into preparation, account signing or raw-send actions.
  RPC-wallet accounts still use the supplied wallet's `sendTransaction` action.
- Reconcile `TransactionSubmissionError` and `TransactionReceiptError` using their
  phase, outcome, hash and cause. A timeout or unknown send result is not a safe
  reason to submit again.

The [transaction guide](docs/transactions.md) defines typed requests, replacement
semantics, submission evidence and a complete transfer example. Preserve the
consumer's gas buffering, fee multipliers, dry-run behavior, permission checks and
post-transaction verification during migration.

## Parsers and diagnostic waiting

Use `ContractParser<TAbi>` or `createContractParser({ abi, transactions, events,
errors })`. Keep business formatting in consumer handlers. Narrow
`DecodedContractError` by `kind` before using variant-specific fields such as
`name` and `signature`.

Move transaction-description logging from `onSent` to `onDescription`; `onSent`
reports the hash before asynchronous parsing finishes. For CLI output, handle
`sent.receipt` and await `sent.diagnostics` in a `finally` block. See
[hooks and diagnostics](docs/transactions.md#hooks-and-diagnostics) for budgets,
cancellation and hook delivery semantics.

The draft `./utils` exports `waitForParsedReceipt` and `diagnoseReceipt` are removed.
Use `sent.receipt` and `sent.diagnostics`, or `waitForTransactionOutcome` for an
already-submitted hash without parser diagnostics.

## Batches, artifacts and balance queries

- Share a viem `NonceManager` across concurrent participating local batch calls.
  Without one, serialize calls and retain exclusive sender ownership. Preserve
  progress and reserved nonce evidence on failures; see [local batches](docs/transactions.md#local-batches).
- Use source-qualified `Source.sol:Library` artifact mappings when libraries share
  a name. Mapping to another source file no longer silently satisfies a reference.
  Deployment rejects malformed bytecode before submission; see [artifact links](docs/node-tools.md#artifact-library-links).
- Handle balance-query rejection separately from a zero balance. Multicall balance
  helpers no longer substitute zero on failure, and batch sizes must be positive
  safe integers. See [balance queries](docs/chains-and-parsers.md#balance-queries).

## Retired networks and local metadata

Remove `abctest` imports and ABC entries from consumer chain maps. Both the root
export and the ABC-only `@derivation-tech/viem-kit/chains` subpath are removed;
`ChainKitRegistry.for('abctest')` and chain ID 20250903 no longer resolve.
Import supported chain definitions from `viem/chains` or pass an application-owned
`Chain` object explicitly.

Built-in ERC20 and wrapped-native defaults for Goerli (5), bArtio (80084), ABC
(20250903) and old local deployments (31337) are removed. This does not filter
upstream viem chain definitions. For Anvil, register addresses from the actual
local deployment as described in [local metadata](docs/chains-and-parsers.md#local-deployment-metadata).

## Validate and roll out

1. Verify the SDK artifact, then install its tarball in an isolated consumer checkout.
2. Apply the import, client ownership and transaction/parser changes above.
3. Run consumer type checks and relevant behavior tests. Exercise deployment or
   fork flows when the consumer relies on them; a mocked SDK consumer does not
   establish that those flows work.
4. Record the tested SDK commit or tarball checksum, dependency versions, consumer
   revision and commands. Match release and rollout decisions to that evidence.

The checked-in packed consumer uses an Anchored-shaped administration call as a
fixture. Its scope is package/API compatibility, not every downstream command or
hardware signing path. Keep the prior dependency pin and consumer changes available
for rollback until the migrated consumer passes its acceptance checks.
