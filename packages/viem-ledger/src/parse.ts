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
    if (parts.length < 2) throw new Error(`Invalid Ledger path: ${path}`);
    for (const part of parts.slice(1)) {
        parseIndex(part.endsWith("'") ? part.slice(0, -1) : part);
    }
    const index = parts[3] ? parseIndex(parts[3].replace(/'$/, '')) : 0;
    return {
        path: normalized,
        basePath: parts.slice(0, 3).join('/'),
        index,
        raw: normalized,
    };
};

export function parseLedgerPath(input: string, env: NodeJS.ProcessEnv = process.env): ParsedLedgerPath {
    input = input.trim();
    const lowered = input.toLowerCase();
    if (lowered !== LEDGER_PREFIX && !lowered.startsWith(`${LEDGER_PREFIX}:`)) {
        throw new Error(`Invalid ledger signerId: ${input}`);
    }
    const raw = input.slice(LEDGER_PREFIX.length);
    const suffix = raw.startsWith(':') ? raw.slice(1) : raw;

    const envBase = env[LEDGER_PATH_ENV];
    const envIndexRaw = env[LEDGER_INDEX_ENV];

    // No suffix provided: use env variables or default
    if (!suffix) {
        // LEDGER_INDEX takes precedence over LEDGER_PATH
        if (envIndexRaw !== undefined && envIndexRaw !== '') {
            const resolvedEnvIndex = parseIndex(envIndexRaw);
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
    const parsed = parseIndex(suffix);
    const path = `${DEFAULT_BASE_PATH}/${parsed}'/0/0`;
    return { path, basePath: DEFAULT_BASE_PATH, index: parsed, raw: path };
}

function parseIndex(input: string): number {
    const index = Number(input);
    if (!/^\d+$/.test(input) || !Number.isSafeInteger(index) || index > 0x7fffffff) {
        throw new Error(`Invalid Ledger index: ${input}`);
    }
    return index;
}
