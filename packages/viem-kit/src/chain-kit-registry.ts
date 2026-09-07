import type { Chain } from 'viem';
import * as chains from 'viem/chains';
import type { Chain as ViemChain } from 'viem';
import { abctest } from './chains/abctest';
import { ChainKit } from './chain-kit';

const localChains: Record<string, ViemChain> = {
    abctest,
};

function resolveChain(input: number | string | Chain): Chain | undefined {
    if (typeof input === 'object') return input;
    const entries = Object.entries({ ...chains, ...localChains }) as Array<[string, ViemChain]>;
    return entries.find(([name, chain]) =>
        typeof input === 'number' ? chain?.id === input : name.toLowerCase() === input.toLowerCase()
    )?.[1];
}

/**
 * Process-wide default kits. Use new ChainKit(chain, options) for configured clients or forks.
 */
export class ChainKitRegistry {
    private static instances = new Map<number, ChainKit>();

    /**
     * Get ChainKit for a chain (creates singleton if doesn't exist)
     * @param chainIdOrName - Chain ID (8453), name ('base'), or Chain object
     * @returns ChainKit singleton for the chain
     *
     * @example
     * const base = ChainKitRegistry.for('base');
     * const optimism = ChainKitRegistry.for(10);
     * const custom = ChainKitRegistry.for(myCustomChain);
     */
    static for(chainIdOrNameOrChain: number | string | Chain): ChainKit {
        const chain = resolveChain(chainIdOrNameOrChain);
        if (!chain) throw new Error(`Unknown chain: ${String(chainIdOrNameOrChain)}. Pass a custom Chain object.`);
        const chainId = chain.id;
        if (!this.instances.has(chainId)) {
            this.instances.set(chainId, new ChainKit(chain));
        }

        return this.instances.get(chainId)!;
    }

    /**
     * Check if chain is already initialized
     */
    static has(chainIdOrName: number | string): boolean {
        if (typeof chainIdOrName === 'number') {
            return this.instances.has(chainIdOrName);
        }
        const chain = resolveChain(chainIdOrName);
        return chain ? this.instances.has(chain.id) : false;
    }

    /**
     * Get all initialized chains
     */
    static getAll(): ChainKit[] {
        return Array.from(this.instances.values());
    }

    /**
     * Clear all registries (for testing)
     */
    static clear(): void {
        this.instances.clear();
    }

    /**
     * Clear specific chain
     */
    static clearChain(chainIdOrName: number | string): void {
        if (typeof chainIdOrName === 'number') {
            this.instances.delete(chainIdOrName);
        } else {
            const chain = resolveChain(chainIdOrName);
            if (chain) this.instances.delete(chain.id);
        }
    }
}
