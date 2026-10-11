import type { Account, Address, Chain } from 'viem';
import type { TxContext } from './types';

export type ResolvedTxExecutionContext = {
    account: Account | Address;
    chain: Chain | undefined;
};

function assertMatchingChain(
    transactionChain: Chain | undefined,
    candidate: Chain | null | undefined,
    source: string
): void {
    if (transactionChain && candidate && transactionChain.id !== candidate.id) {
        throw new Error(`Chain mismatch: ${source} uses ${candidate.id} but transaction uses ${transactionChain.id}`);
    }
}

export function resolveTxExecutionContext(
    context: TxContext,
    requestAccount: Account | Address | null | undefined,
    requestChain: Chain | null | undefined
): ResolvedTxExecutionContext {
    const account = requestAccount ?? context.walletClient.account;
    if (!account) {
        throw new Error('Missing account: pass request.account or configure walletClient.account');
    }

    // The wallet chain carries the signer's serializers and formatters, so it outranks the read client's chain.
    const chain = requestChain ?? context.chain ?? context.walletClient.chain ?? context.publicClient.chain;
    assertMatchingChain(chain, context.chain, 'context');
    assertMatchingChain(chain, context.publicClient.chain, 'publicClient');
    assertMatchingChain(chain, context.walletClient.chain, 'walletClient');

    return { account, chain };
}
