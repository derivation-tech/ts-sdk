# Node tools

[Package overview](../README.md)

Import these APIs from `@derivation-tech/viem-kit/node`. The example below reads a
local artifact and broadcasts only when `deployExample` is called; the wallet must
have an account and chain configured, and the artifact must exist.

```ts
import { deployArtifact } from '@derivation-tech/viem-kit/node';
import type { PublicClient, WalletClient } from 'viem';

export async function deployExample(publicClient: PublicClient, walletClient: WalletClient) {
    return deployArtifact(publicClient, walletClient, {
        artifact: 'out/Example.sol/Example.json',
        constructorArgs: [],
        transaction: { gas: 1_000_000n, maxFeePerGas: 10_000_000_000n },
        wait: { confirmations: 2, timeout: 120_000 },
    });
}
```

## Environment accounts

`getAccount` reads named environment credentials: `DEPLOYER_MNEMONIC` or
`DEPLOYER_PRIVATE_KEY` for `deployer`, and `DEPLOYER_MNEMONIC` for `deployer:0`.
Setting both forms for a bare name is an error. Account caches belong to the kit.
`expandSignerIdPattern` expands inclusive ranges before individual account resolution, with a limit of 1,000 results per call. Indices must be decimal integers between 0 and 2147483647; malformed values throw. Bare names stay bare so either mnemonic or private-key credentials can be resolved.

Ledger signers require the optional `@derivation-tech/viem-ledger` peer. Hardware
access occurs only when Ledger is requested. Existing consumer signer policy,
permissions and fork restrictions should remain in the consumer.

## Deployment outcomes

`deployArtifact` and `deployBytecode` validate chains, retain submission/wait
errors, reject reverted receipts and require a deployment address.
`wait.confirmations` defaults to 2.
`ArtifactHelper` performs local file operations from this entry.

## Artifact library links

For structured compiler references, `Source.sol:Library` keys take precedence over
explicit `Library` fallbacks. A key for another source file does not satisfy the
reference. Raw name-style placeholders require an unambiguous mapping or an
explicit short-name entry.

Deployment rejects empty, odd-length and non-hexadecimal bytecode before submission,
including preloaded artifacts. Compiler `//` mapping comments are removed from raw
linked output. Solidity hashed placeholders use keccak256, not SHA3-256.

Submission and receipt errors retain the evidence described in the
[transaction guide](transactions.md#submission-and-reconciliation). Gas buffering,
fee policy and permission checks belong to the caller.

Library addresses must contain exactly 20 hexadecimal bytes; short values are not padded and oversized values are not truncated.
