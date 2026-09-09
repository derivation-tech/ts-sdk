# Viem Kit

Typed contract execution, receipt diagnostics, address names and token metadata
for viem applications. Clients, signers and application policy remain explicit.

This branch contains the planned breaking API migration from 0.2.1. See
[MIGRATION.md](./MIGRATION.md) before upgrading an existing consumer.

## Installation and entries

```sh
pnpm add @derivation-tech/viem-kit viem
```

| Entry                                 | Contents                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `@derivation-tech/viem-kit`           | ChainKit, parser registries, transaction helpers, ERC20/WETH/Multicall, common viem utilities |
| `@derivation-tech/viem-kit/utils`     | Transactions, errors, address book and logging                                                |
| `@derivation-tech/viem-kit/abis`      | WETH and Multicall ABIs                                                                       |
| `@derivation-tech/viem-kit/contracts` | ERC20, WETH and Multicall helpers                                                             |
| `@derivation-tech/viem-kit/chains`    | Additional chain definitions                                                                  |
| `@derivation-tech/viem-kit/node`      | Environment accounts, signer address resolution, artifacts, Foundry and deployment helpers    |

All entries support ESM and CommonJS. Core entries can be bundled for browsers
and do not import Node tooling. Deep imports into `dist` or internal files are
unsupported. The Node entry loads the optional Ledger package only when requested.

## Chain instances

```ts
import { createPublicClient, createWalletClient, http, erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { ChainKit, assertTransactionSuccess } from '@derivation-tech/viem-kit';

const publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
const walletClient = createWalletClient({ chain: mainnet, account, transport: http(rpcUrl) });
const kit = new ChainKit(mainnet, { publicClient });

kit.registerAddressName(treasury, 'Treasury');
kit.registerErc20Token({ address: token, symbol: 'USDC', name: 'USD Coin', decimals: 6 });

const receipt = assertTransactionSuccess(
    await kit.sendTx(
        walletClient,
        {
            address: token,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [treasury, kit.parseErc20Amount('10', 'USDC')],
            gas: 100_000n,
            maxFeePerGas: 10_000_000_000n,
            maxPriorityFeePerGas: 1_000_000_000n,
        },
        { wait: { confirmations: 2, timeout: 120_000 } }
    )
);
```

Provide the application account, RPC URL and addresses explicitly. ChainKit does
not read environment variables to create clients. Its `publicClient` is readonly;
construct another kit for another RPC or fork. A known client/chain mismatch fails
before a transaction is sent.

`ChainKitOptions` also accepts `addressNames` and `wrappedNativeToken`:

- Omit `wrappedNativeToken` to use built-in metadata when available.
- Supply metadata to override built-ins for this instance.
- Pass `null` to disable automatic wrapped-native registration.

Custom chains do not require wrapped-native metadata. `wrappedNativeTokenInfo` is
optional; WETH operations fail before broadcasting if it is absent. WETH helpers
use instance metadata and the chain's native decimals.

Instances own their tokens, parsers and address names. Useful methods include
`getAddressName`, `getErc20TokenInfo`, `formatErc20Amount`, `parseErc20Amount`,
`registerParser` and `resolveParser`.

`ChainKitRegistry.for(chainOrIdOrName)` remains a process-wide convenience for
**default** kits. It caches by chain ID. Use independent `new ChainKit(...)`
instances for configured clients, forks and concurrent workflows; do not put a
custom RPC into the global registry. `has`, `clearChain` and named lookup are
case-insensitive; `getAll` and `clear` are available for lifecycle management.

## Transactions and receipts

`TypedWriteRequest` derives ABI names, arguments, payable values and transaction
fields from viem. Fees, gas, nonce and `dataSuffix` pass through the same send path.
The SDK encodes calldata once before async transaction parsing.

```ts
import { sendContractTransaction, assertTransactionSuccess } from '@derivation-tech/viem-kit';

const sent = await sendContractTransaction(
    {
        publicClient,
        walletClient,
        chain: kit.chain,
        resolveParser: (address) => kit.resolveParser(address),
    },
    request,
    {
        wait: { confirmations: 2, timeout: 120_000, pollingInterval: 1_000 },
        hooks: {
            onSent: ({ hash }) => logger.info(hash),
            onDescription: ({ description }) => logger.info(description),
            onEvent: ({ description }) => logger.info(description),
            onObserverError: ({ phase, error }) => logger.warn(phase, error),
        },
    }
);
const receipt = assertTransactionSuccess(await sent.receipt);
const diagnostics = await sent.diagnostics; // Optional, separate CLI wait.
```

`sent.hash` is the submitted hash. Receipt waiting begins after submission; always
handle `sent.receipt`. `ChainKit.sendTx` is a convenience that waits and returns
that receipt without waiting for diagnostics. Both accept the same options. `silent` suppresses built-in send logs,
but does not disable explicitly supplied hooks.

Wait options are viem's `confirmations`, `timeout`, `pollingInterval` and
`checkReplacement`; omitted settings use viem defaults.

| Result                                       | Contract                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Successful original transaction or repricing | Returns the receipt                                                                                             |
| Reverted original transaction                | Returns the raw reverted receipt; `assertTransactionSuccess` throws `TransactionRevertedError` retaining it     |
| Cancellation or different-intent replacement | Throws `TransactionReplacementError` with original hash, reason and replacement receipt                         |
| Receipt timeout/RPC failure                  | Throws `TransactionReceiptError` with submitted hash and cause                                                  |
| Failure inside wallet submission             | Conservatively throws `TransactionSubmissionError` with `outcome: 'unknown'`, public request identity and cause |
| Static validation/encoding failure           | Fails before calling the wallet                                                                                 |

Receipt hooks carry both `submittedHash` and the actual receipt `hash`.
`onReplaced` includes viem's replacement details. A successful cancellation
receipt is not treated as successful execution of the original request.

Hooks may return promises. Synchronous errors and rejected promises are reported
to `onObserverError` and cannot change transaction outcomes. Hooks are not awaited;
the caller owns delivery guarantees for external logging. Parser failures are
reported through `onParseError`. `onSent` delivers the hash immediately, while
`onDescription` delivers the eventual parsed transaction description. Do not depend
on descriptions or event/error hooks being ready when the receipt resolves.

`sent.diagnostics` resolves to `{ transaction, receipt }` statuses. Each is
`completed`, `timed-out` or `cancelled`; receipt diagnostics are `skipped` when
receipt waiting or replacement validation fails. A completed stage may have reported
parse failures. Diagnostic work has a default 5,000 ms budget per stage, beginning
after submission and after a validated receipt respectively. Set
`diagnostics: { timeout: 1_000, signal: controller.signal }` to override it.
Timeout/cancellation stops SDK waiting and suppresses late descriptions, events and
parse-error delivery. A reverted receipt still produces one `onReverted` notification
with whatever diagnostic detail was available at the cutoff.

This diagnostic budget excludes receipt waiting and does not await consumer hooks.
It cannot interrupt synchronous JavaScript or forcibly cancel parser/replay I/O;
consumer parsers should also bound their own network operations. Revert replay at
the receipt block is best-effort diagnostic evidence,
not an exact replay of intra-block execution state.

The SDK never retries submission automatically. A wait failure or unknown send
result requires reconciliation; it is not evidence that a transaction was never
accepted. For RPC-wallet sends a hash may be unavailable after an error.

## Parsers

```ts
import { createContractParser } from '@derivation-tech/viem-kit';

kit.registerParser(
    token,
    createContractParser({
        abi: erc20Abi,
        transactions: {
            transfer: ({ args }) => `Transfer ${args[1]} to ${kit.getAddressName(args[0])}`,
        },
        events: {
            Transfer: ({ args }) => `Transferred ${args.value} to ${kit.getAddressName(args.to)}`,
        },
        parseErrorFallback: (error) => error.message,
    })
);
```

`createERC20Parser`, `createWETHParser`, `createDefaultParser` and
`createParserRegistry` are available for composition. A request can also supply a
typed `parser` directly. Business-specific decoding and formatting belong in the
consumer. Logs are decoded against the emitting address's parser.

## Local batches

```ts
import { createNonceManager } from 'viem';
import { batchSendLocalTransactions, defineWriteRequest } from '@derivation-tech/viem-kit';

// Own one manager per RPC/fork environment, and share it across concurrent calls.
const nonceManager = createNonceManager({
    source: {
        get: ({ address }) => publicClient.getTransactionCount({ address, blockTag: 'pending' }),
        set: () => undefined,
    },
});
const results = await batchSendLocalTransactions(
    publicClient,
    walletClients,
    [defineWriteRequest({ address: token, abi: erc20Abi, functionName: 'transfer', args: [treasury, 1n] })],
    { nonceManager, wait: { timeout: 120_000 } }
);
```

Wallets must use local accounts and match their request accounts. Each request
needs a corresponding wallet. Static account, chain and calldata validation runs
for the entire batch before any broadcast. Explicit request `nonce` and `chainId`
are prohibited because the batch owns allocation and chain selection.

Without a shared manager, allocation is per-call and is suitable only for
serialized calls with exclusive sender ownership. A shared manager coordinates
participating calls in one process; it does not coordinate other processes,
external senders or unrelated wallets. Single local-wallet sends can use viem's
account nonce manager when they need the same coordination policy.

Successful entries remain `{ index, hash, receipt }`. `BatchTransactionError`
retains `phase`, `index`, `cause` and `progress`; entries include reserved nonces,
signed hashes, known receipts and `submission` states (`not-sent`, `unknown`,
`submitted`). Raw hashes are calculated before RPC submission. An inconsistent
RPC response preserves the signed hash and reports an unknown result.

After a preparation or signing failure, a shared manager may retain a consumed
nonce. Reconcile all active calls before explicit nonce reuse or creating a fresh
manager. Never roll back a reservation just because submission returned an error.
Batch receipts use the same replacement/wait semantics; callers explicitly assert
receipt success when their workflow requires all transactions to succeed.

## Node tools

```ts
import { ArtifactHelper, deployArtifact, getAccount } from '@derivation-tech/viem-kit/node';

const account = await getAccount(kit, 'deployer');
const artifact = ArtifactHelper.loadArtifact('out/Example.sol/Example.json');
const address = await deployArtifact(publicClient, walletClient, {
    artifact,
    constructorArgs: [],
    transaction: { gas: 1_000_000n, maxFeePerGas: 10_000_000_000n },
    wait: { confirmations: 2, timeout: 120_000 },
});
```

`getAccount` reads named environment credentials: `DEPLOYER_MNEMONIC` or
`DEPLOYER_PRIVATE_KEY` for `deployer`, and `DEPLOYER_MNEMONIC` for `deployer:0`.
Setting both forms for a bare name is an error. Account caches belong to the kit.
`expandSignerIdPattern` expands ranges before individual account resolution.

Ledger signers require the optional `@derivation-tech/viem-ledger` peer. Hardware
access occurs only when Ledger is requested. Existing consumer signer policy,
permissions and fork restrictions should remain in the consumer.

`deployArtifact` and `deployBytecode` validate chains, retain submission/wait
errors, reject reverted receipts and require a deployment address. Legacy
`confirmations` defaults to 2; `wait.confirmations` takes precedence.
`ArtifactHelper` and `FoundryHelper` perform local file operations from this entry.

## Validation

```sh
pnpm -C packages/viem-ledger run build
pnpm -C packages/viem-kit run verify
```

Verification includes lint, source/test/example types, Jest, build, NodeNext ESM
and CJS types, a packed Anchored-shaped consumer, browser bundling, publint and
attw. Consumer tests use a custom RPC transport, synthetic addresses and no
Ledger installation. They do not broadcast or prove production/fork behavior.

To test an already-built package against another installed viem peer:

```sh
pnpm -C packages/viem-kit run verify:consumer /path/to/viem
```
