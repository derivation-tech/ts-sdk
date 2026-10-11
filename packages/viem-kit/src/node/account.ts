import type { Account } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { ChainKit } from '../chain-kit';

const LEDGER_MODULE_ID = '@derivation-tech/viem-ledger';

let ledgerModulePromise: Promise<typeof import('@derivation-tech/viem-ledger')> | null = null;

function loadLedgerModule(): Promise<typeof import('@derivation-tech/viem-ledger')> {
    ledgerModulePromise ??= import('@derivation-tech/viem-ledger').catch((error: unknown) => {
        ledgerModulePromise = null;
        const code = (error as { code?: unknown } | null)?.code;
        if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
            throw new Error(
                `Ledger signer requested but ${LEDGER_MODULE_ID} is not installed. Install it alongside @derivation-tech/viem-kit to enable Ledger support.`,
                { cause: error }
            );
        }
        throw error;
    });
    return ledgerModulePromise;
}

export function isLedgerSignerId(value: string): boolean {
    return /^ledger(?::|$)/i.test(value.trim());
}

// Account derivation and address registration share the owning kit's lifetime.
const accountCaches = new WeakMap<ChainKit, Map<string, Promise<Account>>>();

function cachedAccount(
    kit: ChainKit,
    cacheKey: string,
    derive: () => Account | Promise<Account>,
    register: (account: Account) => void
): Promise<Account> {
    let cache = accountCaches.get(kit);
    if (!cache) {
        cache = new Map();
        accountCaches.set(kit, cache);
    }
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const promise = Promise.resolve()
        .then(derive)
        .then((account) => {
            register(account);
            return account;
        });
    cache.set(cacheKey, promise);
    // A failed derivation must not poison later attempts.
    promise.catch(() => cache.delete(cacheKey));
    return promise;
}

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
        const { path } = deriveLedgerPath({ signerId: trimmed });
        return cachedAccount(
            kit,
            `ledger:${path}`,
            () => ledgerToAccount({ signerId: trimmed }),
            (account) => {
                // A Ledger address or signer ID may already be bound elsewhere; keep the existing binding.
                const { addressBook } = kit;
                if (!addressBook.hasAddress(account.address) && !addressBook.hasName(trimmed)) {
                    kit.registerAddressName(account.address, trimmed);
                }
            }
        );
    }

    if (!trimmed) throw new Error('Signer name cannot be empty');
    if (trimmed.includes(':')) {
        const [name, index, extra] = trimmed.split(':');
        if (!name || extra !== undefined) throw new Error(`Invalid signer ID: ${trimmed}`);
        const indexNum = parseAccountIndex(index);
        const upper = name.toUpperCase();
        const envMnemonic = `${upper}_MNEMONIC`;
        return cachedAccount(
            kit,
            `${upper}:${indexNum}`,
            () => {
                const mnemonic = process.env[envMnemonic];
                if (!mnemonic) {
                    throw new Error(`Mnemonic not found for ${name}. Please set ${envMnemonic} environment variable.`);
                }
                return mnemonicToAccount(mnemonic, { addressIndex: indexNum });
            },
            (account) => kit.registerAddressName(account.address, `${name}:${indexNum}`)
        );
    }

    const name = trimmed;
    const upper = name.toUpperCase();
    const envMnemonic = `${upper}_MNEMONIC`;
    const envPrivateKey = `${upper}_PRIVATE_KEY`;
    const mnemonic = process.env[envMnemonic];
    const privateKey = process.env[envPrivateKey] as `0x${string}` | undefined;

    if (mnemonic && privateKey) {
        throw new Error(`Both ${envMnemonic} and ${envPrivateKey} are set. Please provide only one.`);
    }
    if (mnemonic) {
        return cachedAccount(
            kit,
            upper,
            () => mnemonicToAccount(mnemonic, { addressIndex: 0 }),
            (account) => kit.registerAddressName(account.address, `${name}:0`)
        );
    }
    if (privateKey) {
        return cachedAccount(
            kit,
            upper,
            () => privateKeyToAccount(privateKey),
            (account) => kit.registerAddressName(account.address, name)
        );
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
