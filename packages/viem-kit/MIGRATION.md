# Migrating Anchored consumers from viem-kit 0.2.1

This guide describes the planned major API on the refactor branch. It includes
both the earlier typed parser/transaction migration and the 2026-09-07 execution
and configuration changes. The package has not been published by this work.

The reference consumer is `anchored-contracts` at `f9fd04e` (2026-09-07), using
viem-kit 0.2.1 and viem 2.44.0. Its real checkout and dependency pins remain
unchanged. The packed acceptance fixture mirrors an AncFundController
`setFundMinSubscriptionUsd(uint16,uint32)` call and `FundConfigUpdated` event.

## Replace generic workarounds

| Current consumer pattern                                                    | Migration                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mutate `WRAPPED_NATIVE_TOKENS` before registry construction                 | `new ChainKit(chain, { publicClient, wrappedNativeToken })`; omit WETH metadata when unused                                           |
| Reassign `kit.publicClient`                                                 | Inject the client at construction                                                                                                     |
| Same-chain global registry for different RPCs/forks                         | Own a kit per workflow/RPC environment                                                                                                |
| `sendTxWithLog(publicClient, walletClient, kit, request)`                   | `kit.sendTx(walletClient, request, options)` with the injected public client, or `sendContractTransaction(context, request, options)` |
| Separate `sendTxWithOverrides` path                                         | Put `maxFeePerGas`, `maxPriorityFeePerGas`, `gas` and `nonce` in the typed request; use `options.wait`                                |
| `TxRequest` or `Parameters<typeof sendTxWithLog>[3]`                        | `TypedWriteRequest<TAbi, TFunctionName>`                                                                                              |
| Root/utils `getAccount`, address resolution, artifact or deployment imports | Import from `@derivation-tech/viem-kit/node`                                                                                          |
| Positional ChainKit metadata/address-names arguments                        | Named `ChainKitOptions`                                                                                                               |
| Unconditional `wrappedNativeTokenInfo.address`                              | Handle missing metadata, or fail at the WETH operation                                                                                |

The registry convenience continues to cache default kits by chain ID. It cannot
separate two same-chain RPC environments. Keep instance ownership explicit in
Anchored's deployment context instead of changing a global SDK table.

## One typed send path

```ts
const kit = new ChainKit(chain, { publicClient });
const request = {
    address: controller,
    abi: ancFundControllerAbi,
    functionName: 'setFundMinSubscriptionUsd',
    args: [fundId, targetMinSubscriptionUsd],
    gas: bufferedGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
} satisfies TypedWriteRequest<typeof ancFundControllerAbi, 'setFundMinSubscriptionUsd'>;

const receipt = assertTransactionSuccess(
    await kit.sendTx(walletClient, request, {
        wait: { timeout: 120_000 },
        hooks: {
            onEvent: ({ description }) => logger.info(description),
            onObserverError: ({ phase, error }) => logger.warn(phase, error),
        },
    })
);
```

The caller still owns gas buffering, fee multipliers, role checks, dry-run behavior,
Safe proposals, configuration persistence and post-transaction state verification.
The SDK does not decide these policies. TypeScript preserves uint16/uint32 as
numbers and uint256 as bigint according to viem's ABI mapping.

Preserve explicit success assertions in commands that currently check
`receipt.status`. Raw send APIs still return reverted receipts. Deployment helpers
assert success themselves. Do not catch a timeout and simply call send again:
`TransactionReceiptError.hash` and `TransactionSubmissionError.cause/request`
exist to support reconciliation. Submission errors now also expose `phase`,
`outcome` and optional `hash`: local prepare/sign failures are `not-sent`, while raw
send and opaque RPC-wallet failures remain `unknown`. A known nonce and standard
EVM signed hash survive a lost raw-send response; hashes from custom chain
serializers are retained only when returned by RPC. Batch errors use the same
submission error as their cause and preserve previous progress.

Local-account execution now observes viem's native send action. Move custom
`walletClient.sendTransaction` wrappers into `prepareTransactionRequest`, local
account signing or `sendRawTransaction` if they must affect local sends. Node
deployment helpers encode constructor calldata and use this same path; custom
`deployContract` overrides no longer intercept them. RPC-wallet sends continue
using the supplied client's `sendTransaction` action.

## Parser migration

Transaction descriptions now arrive through `onDescription`, independently of
`onSent` and receipt completion. Move any description logging out of `onSent`.
For CLI commands that need event/error output before exiting, use
`sendContractTransaction`, handle `sent.receipt`, then await `sent.diagnostics`
separately (including in a `finally` block when success assertions can throw).
`ChainKit.sendTx` returns the receipt without waiting for diagnostics. Configure
`options.diagnostics.timeout` or `signal` for the separate diagnostic wait; async
hook delivery remains the caller's responsibility.

Use typed `ContractParser<TAbi>` or `createContractParser({ abi, transactions,
events, errors })`. Existing business formatters can be wired to those handlers;
keep Anchored's token/role metadata and formatting in Anchored.

The decoded-error contract is a discriminated union. Replace unchecked
`error.name`, `error.signature` or string tests with `error.kind`:

```ts
parseError(error) {
    if (error.kind === 'custom') {
        return formatCustomError(error.name, error.args);
    }
    return error.message;
}
```

Request/event parsers may be async and parser failures are reported separately.
Lifecycle hooks also accept async functions, but are deliberately not awaited.
Keep external logging delivery outside the transaction-success decision.

Receipt-related hooks expose the actual `hash` and `submittedHash`. Repricing
continues the original intent; cancellation or a different transaction raises
`TransactionReplacementError` with the replacement receipt. Review any command
that previously assumed every successful receipt belonged to its original call.

## Node and signer boundary

```ts
import { getAccount, ArtifactHelper, deployArtifact } from '@derivation-tech/viem-kit/node';
```

Do not load environment or Ledger helpers from browser code. Importing the Node
entry does not require Ledger to be installed; requesting Ledger does. Anchored's
existing signer resolver and fork restrictions are not replaced by this release.
Environment-account caches now belong to individual kits so each kit registers
its own derived-account names.

## Batch boundary

Anchored currently does not directly use the SDK batch helper. Other consumers
should share a native viem `NonceManager` for concurrent batch calls and retain
exclusive control of the sender. Without it, nonce allocation remains per-call.
Failures expose reserved nonces and distinguish `not-sent`, `unknown` and
`submitted`. A shared manager may still reserve a nonce after preparation or
signing fails; reconcile in-flight work before reuse. SDK code does not provide
cross-process coordination, persistent intent storage or automatic resubmission.

## Consumer rollout

1. Build this SDK and run `pnpm -C packages/viem-kit run verify`.
2. Install its local tarball in an isolated Anchored checkout and apply the import,
   parser and context changes above. Remove the fee-override/global-token patches
   only after equivalent behavior passes the consumer's tests.
3. Run Anchored's script tests and typecheck, then its relevant fork/deployment
   rehearsals under that repository's execution rules.
4. Publish and update dependency pins only through the separately authorized
   release workflow. Keep consumers on 0.2.1 until their migration is ready.

The SDK fixture validates the common API contract, package boundaries and native
viem request formatting. It is not a migration or end-to-end validation of all
Anchored deployment commands, Safe workflows or hardware signing.

## Artifact library mapping

For structured compiler references, use `Source.sol:Library` keys. Exact source-qualified
keys take precedence over explicit `Library` fallbacks. A key for another source file
is no longer accepted merely because its library name matches.

Deployment helpers now reject empty, odd-length or non-hexadecimal bytecode before
submission. Raw bytecode may include compiler `//` mapping comments; they are removed
from the linked output. SHA3-256 is not used as a fallback for Solidity library hashes.
Name-style raw placeholders reject multiple source-qualified matches unless an
explicit short-name mapping selects the intended library.
