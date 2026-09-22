import type { Account } from 'viem';
import { getAddress } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { LedgerToAccountOptions } from '@derivation-tech/viem-ledger';
import type { ChainKit } from '../chain-kit';

type LedgerModule = {
    deriveLedgerPath: (options: LedgerToAccountOptions) => { path: string };
    ledgerToAccount: (options: LedgerToAccountOptions) => Promise<Account>;
};

const LEDGER_MODULE_ID = '@derivation-tech/viem-ledger';

let ledgerModulePromise: Promise<LedgerModule> | null = null;

const loadLedgerModule = async (): Promise<LedgerModule> => {
    if (!ledgerModulePromise) {
        ledgerModulePromise = import('@derivation-tech/viem-ledger')
            .then((mod) => {
                const { deriveLedgerPath, ledgerToAccount } = mod;
                if (typeof deriveLedgerPath !== 'function' || typeof ledgerToAccount !== 'function') {
                    throw new Error(`Invalid ${LEDGER_MODULE_ID} module: missing exports.`);
                }
                return {
                    deriveLedgerPath,
                    ledgerToAccount,
                };
            })
            .catch((error) => {
                ledgerModulePromise = null;
                const err = error instanceof Error ? error : new Error(String(error));
                if (/Cannot find module|Cannot find package|MODULE_NOT_FOUND/.test(err.message)) {
                    throw new Error(
                        `Ledger signer requested but ${LEDGER_MODULE_ID} is not installed. Install it alongside @derivation-tech/viem-kit to enable Ledger support.`
                    );
                }
                throw err;
            });
    }
    return ledgerModulePromise;
};

const isLedgerSignerId = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const colonIndex = trimmed.indexOf(':');
    const prefix = colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex);
    return prefix.toLowerCase() === 'ledger';
};

// Account derivation and address registration share the owning kit's lifetime.
const accountCaches = new WeakMap<ChainKit, Map<string, Promise<Account>>>();
/**
 * Derive account from a signer identifier or named private key.
 * Rules:
 * - "name:index" → uses NAME_MNEMONIC at given index; registers "name:index"
 * - "name" → prefers NAME_MNEMONIC (index 0), else NAME_PRIVATE_KEY; if both exist, throws
 * - Raw addresses like "0x..." are NOT accepted here
 */
export async function getAccount(kit: ChainKit, signerIdOrPrivateKeyName: string): Promise<Account> {
    let accountCache = accountCaches.get(kit);
    if (!accountCache) {
        accountCache = new Map();
        accountCaches.set(kit, accountCache);
    }
    const trimmed = signerIdOrPrivateKeyName.trim();

    if (isLedgerSignerId(trimmed)) {
        const { deriveLedgerPath, ledgerToAccount } = await loadLedgerModule();
        const parsed = deriveLedgerPath({ signerId: trimmed });
        const cacheKey = `ledger:${parsed.path}`;
        const cached = accountCache.get(cacheKey);
        if (cached) return cached;
        const promise = (async () => {
            const acc = await ledgerToAccount({ signerId: trimmed });
            const derivedAddress = getAddress(acc.address);
            // Skip address name registration for ledger accounts if address is already bound
            // This allows ledger accounts to work even if the address is already registered with another name
            if (!kit.addressBook.hasAddress(derivedAddress)) {
                try {
                    kit.registerAddressName(derivedAddress, trimmed);
                } catch {
                    // Ignore registration errors for ledger accounts
                }
            }
            return acc as Account;
        })();
        accountCache.set(cacheKey, promise);
        // Clear cache on failure to allow retry
        promise.catch(() => {
            accountCache.delete(cacheKey);
        });
        return promise;
    }

    if (!trimmed) throw new Error('Signer name cannot be empty');
    if (trimmed.includes(':')) {
        const [name, index, extra] = trimmed.split(':');
        if (!name || extra !== undefined) throw new Error(`Invalid signer ID: ${trimmed}`);
        const indexNum = parseAccountIndex(index);
        const upper = name.toUpperCase();
        const cacheKey = `${upper}:${indexNum}`;

        const cached = accountCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const envMnemonic = `${upper}_MNEMONIC`;
        const mnemonic = process.env[envMnemonic];
        if (!mnemonic) {
            throw new Error(`Mnemonic not found for ${name}. Please set ${envMnemonic} environment variable.`);
        }
        const promise = Promise.resolve(mnemonicToAccount(mnemonic, { addressIndex: indexNum })).then((account) => {
            const derivedAddress = getAddress(account.address);
            kit.registerAddressName(derivedAddress, `${name}:${indexNum}`);
            return account;
        });
        accountCache.set(cacheKey, promise);
        return promise;
    }

    const name = trimmed;
    const upper = name.toUpperCase();

    const cacheKey = `${upper}`;
    const cached = accountCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const envMnemonic = `${upper}_MNEMONIC`;
    const envPrivateKey = `${upper}_PRIVATE_KEY`;
    const mnemonic = process.env[envMnemonic];
    const privateKey = process.env[envPrivateKey] as `0x${string}` | undefined;

    if (mnemonic && privateKey) {
        throw new Error(`Both ${envMnemonic} and ${envPrivateKey} are set. Please provide only one.`);
    }

    if (mnemonic) {
        const promise = Promise.resolve(mnemonicToAccount(mnemonic, { addressIndex: 0 })).then((account) => {
            const derivedAddress = getAddress(account.address);
            kit.registerAddressName(derivedAddress, `${name}:0`);
            return account;
        });
        accountCache.set(cacheKey, promise);
        return promise;
    }

    if (privateKey) {
        const promise = Promise.resolve(privateKeyToAccount(privateKey)).then((account) => {
            const derivedAddress = getAddress(account.address);
            kit.registerAddressName(derivedAddress, name);
            return account;
        });
        accountCache.set(cacheKey, promise);
        return promise;
    }

    throw new Error(`No credentials found. Set ${envMnemonic} or ${envPrivateKey}.`);
}

/**
 * Expand comma-separated signer IDs and inclusive index ranges (at most 1,000 IDs).
 * Bare names stay bare so getAccount can resolve either mnemonic or private-key credentials.
 * Ledger full paths and direct addresses are validated when the account/address is resolved.
 */
export function expandSignerIdPattern(signerIdPattern: string): string[] {
    const result: string[] = [];
    for (const raw of signerIdPattern.split(',')) {
        const part = raw.trim();
        if (!part) continue;
        const colon = part.indexOf(':');
        if (part.startsWith('0x') || colon === -1) {
            appendSigner(result, part);
            continue;
        }
        const name = part.slice(0, colon).trim();
        const suffix = part.slice(colon + 1);
        if (!name || suffix.includes(':')) throw new Error(`Invalid signer ID: ${part}`);
        const ledger = isLedgerSignerId(part);
        const pathEnd = ledger ? suffix.lastIndexOf('/') + 1 : 0;
        const prefix = suffix.slice(0, pathEnd);
        const indexOrRange = suffix.slice(pathEnd);
        if (indexOrRange.includes('-')) {
            const bounds = indexOrRange.split('-');
            if (bounds.length !== 2) throw new Error(`Invalid signer range: ${part}`);
            const start = parseAccountIndex(bounds[0]);
            const end = parseAccountIndex(bounds[1]);
            const low = Math.min(start, end);
            const high = Math.max(start, end);
            if (high - low + 1 > MAX_EXPANDED_SIGNERS - result.length) {
                throw new Error(`Signer patterns may expand to at most ${MAX_EXPANDED_SIGNERS} accounts`);
            }
            for (let index = low; index <= high; index++) appendSigner(result, `${name}:${prefix}${index}`);
        } else if (ledger && (prefix || !suffix)) {
            appendSigner(result, part);
        } else {
            appendSigner(result, `${name}:${parseAccountIndex(suffix)}`);
        }
    }
    return result;
}

const MAX_EXPANDED_SIGNERS = 1_000;

function appendSigner(result: string[], signer: string): void {
    if (result.length >= MAX_EXPANDED_SIGNERS) {
        throw new Error(`Signer patterns may expand to at most ${MAX_EXPANDED_SIGNERS} accounts`);
    }
    result.push(signer);
}

function parseAccountIndex(input: string): number {
    const index = Number(input);
    if (!/^\d+$/.test(input) || !Number.isSafeInteger(index) || index > 0x7fffffff) {
        throw new Error(`Invalid account index: ${input}`);
    }
    return index;
}
