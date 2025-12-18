import type { Address, PublicClient, WalletClient } from 'viem';
import { ChainKit } from '@derivation-tech/viem-kit';
import type { RpcConfig } from '../../queries/config';
import type { InstrumentSetting, PairSnapshot } from '../../types';
import type { PerpInfo } from '../../info';

/**
 * Demo context containing all necessary setup for running demos.
 * Eliminates boilerplate code in individual demos.
 */
export interface DemoContext {
    chainName: string;
    signerId: string;
    instrumentSymbol: string;
    kit: ChainKit;
    publicClient: PublicClient;
    walletClient: WalletClient;
    walletAddress: Address;
    rpcConfig: RpcConfig;
    instrumentAddress: Address;
    instrumentSetting: InstrumentSetting;
    snapshot: PairSnapshot;
    perpInfo: PerpInfo;
}

/**
 * Demo metadata and execution function.
 */
export interface Demo {
    name: string;
    description: string;
    category: 'trade' | 'order' | 'range';
    prerequisites?: string[]; // Other demo names that should run first
    run: (context: DemoContext) => Promise<void>;
}
