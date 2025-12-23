import type { Account } from 'viem';
import { getAddress } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { LedgerToAccountOptions } from '@synfutures/viem-ledger';
import type { ChainKit } from '../chain-kit';

type LedgerModule = {
    deriveLedgerPath: (options: LedgerToAccountOptions) => { path: string };
    ledgerToAccount: (options: LedgerToAccountOptions) => Promise<Account>;
};

const LEDGER_MODULE_ID = '@synfutures/viem-ledger';

// SECURITY NOTE: Using new Function() for dynamic import to support various bundlers and build tools.
// The module specifier is HARDCODED (LEDGER_MODULE_ID constant) and never comes from user input,
// so there is no code injection risk. This pattern is necessary because some bundlers don't
// support dynamic import() at the top level or have issues with conditional imports.
const dynamicImportLedgerModule = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<unknown>;
let ledgerModulePromise: Promise<LedgerModule> | null = null;

const loadLedgerModule = async (): Promise<LedgerModule> => {
    if (!ledgerModulePromise) {
        ledgerModulePromise = dynamicImportLedgerModule(LEDGER_MODULE_ID)
            .then((mod) => {
                const deriveLedgerPath = (mod as any).deriveLedgerPath;
                const ledgerToAccount = (mod as any).ledgerToAccount;
                if (typeof deriveLedgerPath !== 'function' || typeof ledgerToAccount !== 'function') {
                    throw new Error(`Invalid ${LEDGER_MODULE_ID} module: missing exports.`);
                }
                return { deriveLedgerPath, ledgerToAccount } as LedgerModule;
            })
            .catch((error) => {
                ledgerModulePromise = null;
                const err = error instanceof Error ? error : new Error(String(error));
                if (/Cannot find module|MODULE_NOT_FOUND/.test(err.message)) {
                    throw new Error(
                        `Ledger signer requested but ${LEDGER_MODULE_ID} is not installed. Install it alongside @synfutures/viem-kit to enable Ledger support.`
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

// In-memory cache of derived accounts for the current process
const accountCache = new Map<string, Promise<Account>>();
/**
 * Derive account from a signer identifier or named private key.
 * Rules:
 * - "name:index" → uses NAME_MNEMONIC at given index; registers "name:index"
 * - "name" → prefers NAME_MNEMONIC (index 0), else NAME_PRIVATE_KEY; if both exist, throws
 * - Raw addresses like "0x..." are NOT accepted here
 */
export async function getAccount(kit: ChainKit, signerIdOrPrivateKeyName: string): Promise<Account> {
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

    if (trimmed.includes(':')) {
        const [name, index] = trimmed.split(':');
        const indexNum = parseInt(index) || 0;
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
        const promise = Promise.resolve(
            mnemonicToAccount(mnemonic, { addressIndex: indexNum })
        ).then((account) => {
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
        const promise = Promise.resolve(
            mnemonicToAccount(mnemonic, { addressIndex: 0 })
        ).then((account) => {
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
 * Expand a signerIdPattern into a list of signerIds.
 * Examples:
 *  - "alice:0-10,bob:0,charlie" → ["alice:0".."alice:10","bob:0","charlie:0"]
 *  - "ledger:0" → ["ledger:0"]
 *  - "ledger:m/44'/60'/0'/0/0" → ["ledger:m/44'/60'/0'/0/0"]
 *  - "ledger" → ["ledger"]
 *  - Supports whitespace and direct 0x addresses (kept as-is)
 */
export function expandSignerIdPattern(signerIdPattern: string): string[] {
    if (!signerIdPattern) return [];

    const result: string[] = [];
    const parts = signerIdPattern.split(',');

    for (const raw of parts) {
        const part = raw.trim();
        if (!part) continue;

        // Keep raw addresses as-is
        if (part.startsWith('0x')) {
            result.push(part);
            continue;
        }

        // Check if this is a ledger signer ID before processing
        if (isLedgerSignerId(part)) {
            // Handle ledger signer IDs
            if (part.includes(':')) {
                const colonIndex = part.indexOf(':');
                const name = part.slice(0, colonIndex);
                const suffix = part.slice(colonIndex + 1);
                const trimmedName = name.trim();

                if (suffix.includes('-')) {
                    // Handle ledger path ranges (e.g., ledger:m/.../5-7 or ledger:0-2)
                    const dashIndex = suffix.indexOf('-');
                    const hasPath = suffix.includes('/');
                    const basePathPart = hasPath ? suffix.slice(0, suffix.lastIndexOf('/') + 1) : '';
                    const startToken = hasPath
                        ? suffix.slice(suffix.lastIndexOf('/') + 1, dashIndex)
                        : suffix.slice(0, dashIndex);
                    const endToken = suffix.slice(dashIndex + 1);
                    const startNum = parseInt(startToken);
                    const endNum = parseInt(endToken);
                    let start = Number.isNaN(startNum) ? 0 : startNum;
                    let end = Number.isNaN(endNum) ? start : endNum;
                    if (end < start) [start, end] = [end, start];
                    for (let i = start; i <= end; i++) {
                        result.push(`${trimmedName}:${hasPath ? `${basePathPart}${i}` : i}`);
                    }
                } else {
                    // ledger:0, ledger:m/44'/60'/0'/0/0, etc. - keep as-is
                    result.push(part);
                }
            } else {
                // Plain "ledger" - keep as-is to allow env overrides
                result.push(part);
            }
            continue;
        }

        // Handle non-ledger signer IDs
        if (part.includes(':')) {
            const colonIndex = part.lastIndexOf(':');
            const name = part.slice(0, colonIndex);
            const range = part.slice(colonIndex + 1);
            const trimmedName = name.trim();

            if (range.includes('-')) {
                // Handle ranges (e.g., alice:m/.../0-2 or alice:0-10)
                const dashIndex = range.indexOf('-');
                const hasPath = range.includes('/');
                const basePathPart = hasPath ? range.slice(0, range.lastIndexOf('/') + 1) : '';
                const startToken = hasPath
                    ? range.slice(range.lastIndexOf('/') + 1, dashIndex)
                    : range.slice(0, dashIndex);
                const endToken = range.slice(dashIndex + 1);
                const startNum = parseInt(startToken);
                const endNum = parseInt(endToken);
                let start = Number.isNaN(startNum) ? 0 : startNum;
                let end = Number.isNaN(endNum) ? start : endNum;
                if (end < start) [start, end] = [end, start];
                for (let i = start; i <= end; i++) {
                    result.push(`${trimmedName}:${hasPath ? `${basePathPart}${i}` : i}`);
                }
            } else if (range.includes('/')) {
                // Explicit path, keep as-is
                result.push(`${trimmedName}:${range}`);
            } else {
                const index = parseInt(range);
                result.push(`${trimmedName}:${Number.isNaN(index) ? 0 : index}`);
            }
        } else {
            // Plain name → default index 0
            result.push(`${part}:0`);
        }
    }

    return result;
}
