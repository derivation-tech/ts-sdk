import type { Address } from 'viem';
import { getAddress } from 'viem';
import { ChainKit } from '../chain-kit';
import { getAccount } from './account';

/**
 * Result of address resolution
 */
export interface ResolvedAddress {
    address: Address;
    source: 'direct' | 'addressBook' | 'signer';
    identifier: string;
}

/**
 * Options for address resolution
 */
export interface ResolveAddressOptions {
    /**
     * If true, allow resolving signer IDs (requires credentials)
     * Default: true
     */
    allowSignerResolution?: boolean;
}

/**
 * Resolves an identifier to an Ethereum address.
 * Supports three formats:
 * 1. Direct address: "0x123..."
 * 2. Named address: "DEPLOYER" (from address book)
 * 3. Signer ID: "DEPLOYER:0" or "DEPLOYER" (derives from credentials)
 */
export async function resolveAddress(
    identifier: string,
    kit: ChainKit,
    options: ResolveAddressOptions = {}
): Promise<ResolvedAddress> {
    const { allowSignerResolution = true } = options;

    if (!identifier || identifier.trim().length === 0) {
        throw new Error('Address identifier cannot be empty');
    }

    const trimmed = identifier.trim();

    // 1. Direct address
    if (trimmed.startsWith('0x')) {
        try {
            const address = getAddress(trimmed as Address);
            return { address, source: 'direct', identifier: trimmed };
        } catch (err) {
            throw new Error(`Invalid Ethereum address format: ${trimmed}. Expected a valid checksummed address.`);
        }
    }

    // 2. Address book lookup
    const namedAddress = kit.addressBook.getNamedAddress(trimmed);
    if (namedAddress) {
        try {
            const address = getAddress(namedAddress as Address);
            return { address, source: 'addressBook', identifier: trimmed };
        } catch {
            throw new Error(`Address book entry for "${trimmed}" contains invalid address: ${namedAddress}`);
        }
    }

    // 3. Signer ID resolution (optional)
    if (!allowSignerResolution) {
        throw new Error(
            `Address identifier "${trimmed}" not found. Expected direct address (0x...) or named address in address book.`
        );
    }

    try {
        const account = await getAccount(kit, trimmed);
        const address = getAddress(account.address as Address);
        return { address, source: 'signer', identifier: trimmed };
    } catch {
        if (trimmed.toLowerCase().startsWith('ledger')) {
            throw new Error(`Failed to resolve address for "${trimmed}": Ledger account could not be derived.`);
        }

        const base = trimmed.split(':')[0] || trimmed;
        const upper = base.toUpperCase();
        throw new Error(
            `Failed to resolve address for "${trimmed}": not in address book and no ${upper}_MNEMONIC or ${upper}_PRIVATE_KEY set. ` +
                `Add a mapping in ADDRESS_PATH or set credentials.`
        );
    }
}

/**
 * Convenience function to resolve an address and return just the address string.
 */
export async function resolveAddressSimple(
    identifier: string,
    kit: ChainKit,
    options?: ResolveAddressOptions
): Promise<Address> {
    const result = await resolveAddress(identifier, kit, options);
    return result.address;
}

/**
 * Format resolved address info for logging
 */
export function formatResolvedAddress(resolved: ResolvedAddress): string {
    switch (resolved.source) {
        case 'direct':
            return `${resolved.address} (direct address)`;
        case 'addressBook':
            return `${resolved.address} (from address book: ${resolved.identifier})`;
        case 'signer':
            return `${resolved.address} (derived from signer: ${resolved.identifier})`;
    }
}
