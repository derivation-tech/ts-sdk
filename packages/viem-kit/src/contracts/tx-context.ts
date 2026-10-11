import type { PublicClient, WalletClient } from 'viem';
import type { ChainKit } from '../chain-kit';
import type { TxContext } from '../utils/tx';

export function kitTxContext(publicClient: PublicClient, walletClient: WalletClient, kit: ChainKit): TxContext {
    return { publicClient, walletClient, chain: kit.chain, resolveParser: (address) => kit.getParser(address) };
}
