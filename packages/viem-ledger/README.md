# @derivation-tech/viem-ledger

Ledger-backed viem local accounts for Node.js applications. The account supports
transaction, personal-message and EIP-712 signing through Ledger's Device Management
Kit, Ethereum Signer Kit and Node HID transport.

## Installation and account creation

```sh
pnpm add @derivation-tech/viem-ledger viem
```

Use Node.js 22 or newer with USB/HID access. Unlock the device and open the Ethereum
app. Calling `ledgerToAccount` opens the device connection and reads the account;
creating a wallet client alone does not broadcast a transaction.

```ts
import { ledgerToAccount, disconnectLedger } from '@derivation-tech/viem-ledger';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

export async function readLedgerAddress(rpcUrl: string) {
    try {
        const account = await ledgerToAccount({ signerId: 'ledger:0' });
        const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl) });
        return await wallet.getAddresses();
    } finally {
        await disconnectLedger();
    }
}
```

## Derivation paths

The default path is `m/44'/60'/{index}'/0/0`. An index selects the hardened account
component: index 0 is `m/44'/60'/0'/0/0`; index 5 is `m/44'/60'/5'/0/0`.

| Input to `ledgerToAccount`                   | Selection                                                 |
| -------------------------------------------- | --------------------------------------------------------- |
| `{ index: 5 }` or `{ signerId: 'ledger:5' }` | Default base path with account index 5                    |
| `{ path: "m/44'/60'/3'/0/0" }`               | Explicit full path                                        |
| `{ signerId: "ledger:m/44'/60'/3'/0/0" }`    | Full path carried in the signer ID                        |
| `{ signerId: 'ledger' }`                     | Environment selection described below                     |
| `{}`                                         | Default account 0; does not consult environment variables |

For non-default derivations, pass a full `path` or full-path `signerId`.
`basePath` accepts only the default Ethereum base (`m/44'/60'`). Supply one
selection form per call: `ledgerToAccount` prioritizes an explicit `path`, whereas
the standalone `deriveLedgerPath` utility prioritizes `signerId` if both are given.
`parseLedgerPath` parses a signer ID without opening a device.

### Environment selection

`LEDGER_INDEX` and `LEDGER_PATH` apply to a bare `ledger` or `ledger:` signer ID.
Explicit indices and full paths take precedence over the environment.

1. A non-empty `LEDGER_INDEX` selects the default base path and that account index.
   Invalid values throw instead of selecting another account. Indices and full-path
   components must be decimal integers between 0 and 2147483647.
2. Otherwise, a non-empty `LEDGER_PATH` supplies the full path.
3. Otherwise, the account index is 0.

```sh
export LEDGER_INDEX=3
# Or, with LEDGER_INDEX unset:
export LEDGER_PATH="m/44'/60'/5'/0/0"
```

## Address confirmation and signing

Pass an `AddressValidation` enum value as `addressValidation`:

| Policy                                 | Address confirmation                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `never`                                | No additional address-display confirmation                 |
| `initializationOnly`                   | Confirm the address when creating the account              |
| `firstTransactionPerAddress` (default) | Confirm before the first signing operation on this account |
| `everyTransaction`                     | Confirm before every signing operation                     |

The signing-operation policies also apply to personal-message and typed-data
signing. They control address display; they do not remove the device's signing
confirmation. Reuse the returned account to retain its validation state; account
objects are no longer cached globally. The default HID session is shared. Signing
operations on the same session are serialized, including address confirmation.
A changed address fails before signing.

Each SDK action has a 120-second deadline, configurable with `timeoutMs`. Pending
status updates do not extend it. A timeout, stop, rejection or incomplete stream
rejects the call and cancels the action; the adapter never retries a signature or
retries with reduced signing metadata. Transaction context resolution and device
prompts are managed by Ledger's SDK. Review the actual device prompt before approving.

EIP-712 signing now sends the full domain, types and message to the device SDK;
hash-only signing is removed. Message bigint values are preserved. The SDK's domain
API requires a numeric chain ID, so chain IDs beyond JavaScript's safe integer range
are rejected instead of rounded. An optional caller-owned `originToken` is forwarded
to Ledger's default context module. Clear-signing features depend on Ledger services,
the token, device firmware and Ethereum app support.

## Connection ownership and migration

This release replaces the legacy `@ledgerhq/hw-app-eth` and `hw-transport-*` packages.
The old `transport` option is removed. Existing `signerId`, `path`, `index` and address
validation options remain supported. The returned object remains a viem local account.

Without `session`, discovery selects the first available USB Ledger and has a
10-second discovery deadline (unavailable devices may fail sooner). Call and await `disconnectLedger()` when finished, before
opening another default connection. It waits for queued work and closes only the
helper-owned connection. After unplugging or switching devices, disconnect and create
a new account; old accounts do not silently switch devices.

Applications that already manage device selection can supply a connected DMK session:

```ts
const account = await ledgerToAccount({
    session: { dmk, sessionId },
    signerId: 'ledger:0',
    originToken,
});
```

Here `dmk`, `sessionId` and `originToken` belong to the application. The application
must disconnect its session and close its DMK instance; `disconnectLedger()` does
not close injected sessions. Compile consumers with a modern module resolution mode
such as `NodeNext` or `bundler` to resolve the SDK's package exports.

Automated tests mock SDK/device actions and independently verify signatures with
viem. Real-device acceptance remains necessary for address confirmation, message and
EIP-712 prompts, transaction signing, rejection and unplug/reconnect behavior. Tests
do not broadcast transactions or prove hardware compatibility.

## Multiple accounts

`ledgerToAccount` resolves one account per call. Expand ranges in the application,
or import `expandSignerIdPattern` from `@derivation-tech/viem-kit/node` when using
viem-kit. Range expansion does not coordinate nonces or device access across
independent applications.
