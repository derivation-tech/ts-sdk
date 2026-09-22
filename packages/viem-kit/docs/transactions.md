# Transactions

[Package overview](../README.md)

## Typed writes and receipts

`TypedWriteRequest` derives ABI names, arguments, payable values and transaction
fields from viem. Fees, gas, nonce and `dataSuffix` pass through the same send path.
The SDK encodes calldata once before async transaction parsing.

```ts
import { assertTransactionSuccess, sendContractTransaction } from '@derivation-tech/viem-kit';
import type { TxContext } from '@derivation-tech/viem-kit';
import { erc20Abi } from 'viem';
import type { Address } from 'viem';

export async function transfer(context: TxContext, token: Address, recipient: Address, amount: bigint) {
    const sent = await sendContractTransaction(
        context,
        { address: token, abi: erc20Abi, functionName: 'transfer', args: [recipient, amount] },
        { wait: { confirmations: 2, timeout: 120_000 } }
    );
    try {
        return assertTransactionSuccess(await sent.receipt);
    } finally {
        await sent.diagnostics;
    }
}
```

Calling `transfer` submits a transaction using the supplied wallet. The `finally`
block waits for bounded diagnostics even when receipt handling throws.

`sent.hash` is the submitted hash. Receipt waiting begins after submission; always
handle `sent.receipt`. `ChainKit.sendTx` is a convenience that waits and returns
that receipt without waiting for diagnostics. Both accept the same options. `silent` suppresses built-in send logs,
but does not disable explicitly supplied hooks.

Wait options are viem's `confirmations`, `timeout`, `pollingInterval` and
`checkReplacement`; omitted settings use viem defaults.

| Result                                       | Contract                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Successful original transaction or repricing | Returns the receipt                                                                                                                     |
| Reverted original transaction                | Returns the raw reverted receipt; `assertTransactionSuccess` throws `TransactionRevertedError` retaining it                             |
| Cancellation or different-intent replacement | Throws `TransactionReplacementError` with original hash, reason and replacement receipt                                                 |
| Receipt timeout/RPC failure                  | Throws `TransactionReceiptError` with submitted hash and cause                                                                          |
| Local preparation/signing failure            | Throws `TransactionSubmissionError` with `phase: 'prepare'` or `'sign'` and `outcome: 'not-sent'`                                       |
| Raw-send or opaque RPC-wallet failure        | Throws `TransactionSubmissionError` with `phase: 'send'`, `outcome: 'unknown'`, request identity, cause and signed hash when computable |
| Static validation/encoding failure           | Fails before calling the wallet                                                                                                         |

## Hooks and diagnostics

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

## Submission and reconciliation

The SDK never retries submission automatically. A wait failure or unknown send
result requires reconciliation; it is not evidence that a transaction was never
accepted. Local-account sends observe viem's native prepare/sign/raw-send actions and retain
known nonces plus standard EVM signed hashes, including the body hash for EIP-4844
network payloads with sidecars. For custom chain serializers, the SDK does not
assume a hash algorithm: the hash is available only after a successful RPC response.
Opaque RPC-wallet failures remain unknown even when an error message sounds like a
preflight rejection. All submission errors retain their original cause.

Local-account customization belongs in `prepareTransactionRequest`, the account's
`signTransaction`, or `sendRawTransaction`; the SDK invokes viem's native
`sendTransaction` action to observe these boundaries. RPC-wallet accounts continue
through `walletClient.sendTransaction`. Clients and accounts are never mutated.

## Logging

Use `LoggerFactory.setLogger(name, logger)` to inject output for a name (for
example, `${kit.chain.name}::Tx`). An injected logger takes precedence across log
levels, including after defaults have been cached. Factory level/timestamp settings
configure SDK-created console loggers and do not mutate injected loggers.
`LoggerFactory.clear()` removes both injected and generated instances.

## Local batches

```ts
import { createNonceManager, erc20Abi } from 'viem';
import type { Address, PublicClient, WalletClient } from 'viem';
import { batchSendLocalTransactions, defineWriteRequest } from '@derivation-tech/viem-kit';

export function createBatchSender(publicClient: PublicClient) {
    const nonceManager = createNonceManager({
        source: {
            get: ({ address }) => publicClient.getTransactionCount({ address, blockTag: 'pending' }),
            set: () => undefined,
        },
    });
    return (walletClient: WalletClient, token: Address, recipient: Address) =>
        batchSendLocalTransactions(
            publicClient,
            [walletClient],
            [defineWriteRequest({ address: token, abi: erc20Abi, functionName: 'transfer', args: [recipient, 1n] })],
            { nonceManager, wait: { timeout: 120_000 } }
        );
}
```

Create one sender per RPC/fork environment and reuse it across participating calls.
Calling the returned function broadcasts its batch.

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
RPC response preserves the computable signed hash and reports an unknown result.
Custom chain serializers follow the hash-evidence limit described above.

After a preparation or signing failure, a shared manager may retain a consumed
nonce. Reconcile all active calls before explicit nonce reuse or creating a fresh
manager. Never roll back a reservation just because submission returned an error.
Batch receipts use the same replacement/wait semantics; callers explicitly assert
receipt success when their workflow requires all transactions to succeed.
