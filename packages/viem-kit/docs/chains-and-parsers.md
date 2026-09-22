# Chains, tokens and parsers

[Package overview](../README.md)

## Chain instances

```ts
import { ChainKit } from '@derivation-tech/viem-kit';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export function createMainnetKit(rpcUrl: string) {
    const publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
    return new ChainKit(mainnet, { publicClient });
}
```

Provide the RPC URL and application addresses explicitly. ChainKit does
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

## Local deployment metadata

Chain ID 31337 has no built-in wrapped-native or ERC20 defaults. Register tokens
from the local deployment with `registerErc20Token` and
`registerWrappedNativeToken`, or supply `wrappedNativeToken` in the constructor.
A fresh local kit contains its native token only.

## Parsers

```ts
import { ChainKit, createContractParser } from '@derivation-tech/viem-kit';
import { erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';

const kit = new ChainKit(mainnet);
const token = '0x0000000000000000000000000000000000000001';

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
`DecodedContractError` is a discriminated union; narrow by `kind` before reading
variant-specific fields such as `name` and `signature`.

## Balance queries

`Multicall.getNativeBalances`, `getErc20Balances`, `getMultipleErc20Balances` and
`getAllBalances` reject RPC errors and failed individual calls. Successful results
retain input order and genuine zero balances. Treat failure separately from zero
or an empty address list. Batch sizes must be positive safe integers. Native
balance queries require `chain.contracts.multicall3.address`.

The metadata helper `getErc20TokenInfos` has a different contract: an unsuccessful
token lookup produces `null` at that token's index.
