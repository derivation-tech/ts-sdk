import type { Address } from 'viem';
import { createWalletClient, http } from 'viem';
import { getAccount } from '@synfutures/viem-kit';
import { PERP_EXPIRY } from '../../types/contract';
import { fetchOnchainContext } from '../../queries';
import type { DemoContext } from './types';
import { prepare, findInstrumentBySymbol } from '../utils';

/**
 * Create a demo context with all necessary setup.
 * This centralizes the boilerplate code that was repeated in each demo.
 */
export async function createDemoContext(
    chainName: string,
    signerId: string,
    instrumentSymbol: string
): Promise<DemoContext> {
    const { kit, publicClient, perpInfo, instrumentSettingMap } = await prepare(chainName);
    const { instrumentAddress } = findInstrumentBySymbol(instrumentSymbol, instrumentSettingMap);

    const walletClient = createWalletClient({
        account: getAccount(kit, signerId),
        chain: kit.chain,
        transport: http(kit.chain.rpcUrls.default.http[0]),
    });
    const walletAddress = walletClient.account!.address as Address;

    const rpcConfig = {
        chainId: kit.chain.id,
        publicClient,
        observerAddress: perpInfo.observer,
    };

    const snapshot = await fetchOnchainContext(instrumentAddress, PERP_EXPIRY, rpcConfig, walletAddress);
    const { instrumentSetting } = snapshot;

    return {
        chainName,
        signerId,
        instrumentSymbol,
        kit,
        publicClient,
        walletClient,
        walletAddress,
        rpcConfig,
        instrumentAddress,
        instrumentSetting,
        snapshot,
        perpInfo,
    };
}

/**
 * Refresh the onchain context in a demo context.
 * Useful when state may have changed after a transaction.
 */
export async function refreshDemoContext(context: DemoContext): Promise<DemoContext> {
    const snapshot = await fetchOnchainContext(
        context.instrumentAddress,
        PERP_EXPIRY,
        context.rpcConfig,
        context.walletAddress
    );
    const { instrumentSetting } = snapshot;

    return {
        ...context,
        snapshot,
        instrumentSetting,
    };
}
