import { DEFAULT_BASE_PATH, LEDGER_INDEX_ENV, LEDGER_PATH_ENV, LEDGER_PREFIX } from './constants';

export interface ParsedLedgerPath {
    path: string;
    basePath: string;
    index: number;
    raw: string;
}

const normalizeFullPath = (path: string): string => {
    const trimmed = path.trim();
    if (!trimmed) {
        throw new Error('Ledger path cannot be empty');
    }
    const normalized = trimmed.startsWith('m/') ? trimmed : `m/${trimmed.replace(/^\/+/, '')}`;
    return normalized.replace(/\/+$/, '');
};

const parseFullPath = (path: string): ParsedLedgerPath => {
    const normalized = normalizeFullPath(path);
    const parts = normalized.split('/');
    // BIP44 path format: m / 44' / 60' / {account_index}' / 0 / 0
    // Extract the account index (4th part, index 3)
    let index = 0;
    if (parts.length >= 4) {
        const accountPart = parts[3] || "0'";
        const accountIndex = Number(accountPart.replace(/'/g, ''));
        if (Number.isFinite(accountIndex) && accountIndex >= 0) {
            index = accountIndex;
        }
    }
    return {
        path: normalized,
        basePath: parts.slice(0, 3).join('/'),
        index,
        raw: normalized,
    };
};

export function parseLedgerPath(input: string, env: NodeJS.ProcessEnv = process.env): ParsedLedgerPath {
    const lowered = input.toLowerCase();
    if (!lowered.startsWith(LEDGER_PREFIX)) {
        throw new Error(`Invalid ledger signerId: ${input}`);
    }
    const raw = input.slice(LEDGER_PREFIX.length);
    const suffix = raw.startsWith(':') ? raw.slice(1) : raw;

    const envBase = env[LEDGER_PATH_ENV];
    const envIndexRaw = env[LEDGER_INDEX_ENV];
    const envIndex = envIndexRaw !== undefined && envIndexRaw !== '' ? Number(envIndexRaw) : 0;
    const resolvedEnvIndex = Number.isFinite(envIndex) && envIndex >= 0 ? envIndex : 0;

    // No suffix provided: use env variables or default
    if (!suffix) {
        // LEDGER_INDEX takes precedence over LEDGER_PATH
        if (envIndexRaw !== undefined && envIndexRaw !== '') {
            const path = `${DEFAULT_BASE_PATH}/${resolvedEnvIndex}'/0/0`;
            return { path, basePath: DEFAULT_BASE_PATH, index: resolvedEnvIndex, raw: path };
        }
        if (envBase && envBase.trim().length > 0) {
            return parseFullPath(envBase);
        }
        const path = `${DEFAULT_BASE_PATH}/0'/0/0`;
        return { path, basePath: DEFAULT_BASE_PATH, index: 0, raw: path };
    }

    // Explicit derivation path (full path like m/44'/60'/5'/0/0)
    if (suffix.includes('/')) {
        return parseFullPath(suffix);
    }

    // Numeric index (account_index)
    const parsed = Number(suffix);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid ledger index in signerId '${input}'`);
    }
    const path = `${DEFAULT_BASE_PATH}/${parsed}'/0/0`;
    return { path, basePath: DEFAULT_BASE_PATH, index: parsed, raw: path };
}
