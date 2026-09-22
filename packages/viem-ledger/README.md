# @derivation-tech/viem-ledger

Ledger-backed viem local accounts for Node.js applications. The account supports
transaction, personal-message and EIP-712 signing through a connected Ledger.

## Installation and account creation

```sh
pnpm add @derivation-tech/viem-ledger viem
```

Use Node.js 22 or newer with USB/HID access. Unlock the device and open the Ethereum
app. Calling `ledgerToAccount` opens the device connection and reads the account;
creating a wallet client alone does not broadcast a transaction.

```ts
import { ledgerToAccount } from '@derivation-tech/viem-ledger';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

export async function createLedgerWallet(rpcUrl: string) {
    const account = await ledgerToAccount({ signerId: 'ledger:0' });
    return createWalletClient({ account, chain: base, transport: http(rpcUrl) });
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

| Policy                                 | Address confirmation                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `never`                                | No additional address-display confirmation                       |
| `initializationOnly`                   | Confirm the address when creating the account                    |
| `firstTransactionPerAddress` (default) | Confirm before the first signing operation on the cached account |
| `everyTransaction`                     | Confirm before every signing operation                           |

The signing-operation policies also apply to personal-message and typed-data
signing. They control address display; they do not remove the device's signing
confirmation. Without an injected `transport`, accounts are cached by resolved
path and validation policy, and the transport is shared. Supplying a transport
bypasses the account cache.

The helper retries `TransportLocked` failures and warns when the Ethereum app or
arbitrary-data setting is unsuitable. Transaction resolution requests ERC20/plugin
metadata and can fall back to signing without resolution. Inspect the device
prompt before approving; successful account creation does not validate later
contract-signing behavior.

## Multiple accounts

`ledgerToAccount` resolves one account per call. Expand ranges in the application,
or import `expandSignerIdPattern` from `@derivation-tech/viem-kit/node` when using
viem-kit. Range expansion does not coordinate nonces or device access across
independent applications.
