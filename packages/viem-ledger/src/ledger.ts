import Eth from '@ledgerhq/hw-app-eth';
import ledgerService from '@ledgerhq/hw-app-eth/lib/services/ledger';
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';
import type Transport from '@ledgerhq/hw-transport';
import type { Hex, LocalAccount, TransactionSerializable, TypedDataDefinition } from 'viem';
import { getTypesForEIP712Domain, hashDomain, hashStruct, serializeSignature, serializeTransaction, toHex } from 'viem';
import { toAccount } from 'viem/accounts';
import { AddressValidation, DEFAULT_BASE_PATH } from './constants';
import { parseLedgerPath, type ParsedLedgerPath } from './parse';

export type LedgerAccount = LocalAccount<'ledger'> & {
    source: 'ledger';
    type: 'local'; // viem LocalAccount keeps type 'local'; expose explicitly to avoid misclassification
    publicKey?: Hex;
};

type LedgerError = { id?: string; message?: string };

const accountCache = new Map<string, Promise<LedgerAccount>>();
let transportPromise: Promise<Transport> | null = null;
let ethInstancePromise: Promise<Eth> | null = null;

const ensure0x = (value: string): `0x${string}` => {
    return (value.startsWith('0x') ? value.toLowerCase() : `0x${value.toLowerCase()}`) as `0x${string}`;
};

const normalizeV = (value: string | number): bigint => {
    if (typeof value === 'number') return BigInt(value);
    const hex = value.startsWith('0x') ? value : `0x${value}`;
    return BigInt(hex);
};

const getTransport = async (transport?: Transport): Promise<Transport> => {
    if (transport) return transport;
    if (!transportPromise) {
        transportPromise = TransportNodeHid.create().catch((err) => {
            transportPromise = null;
            throw err;
        });
    }
    return transportPromise;
};

const getEth = async (transport?: Transport): Promise<Eth> => {
    if (transport) return new Eth(transport);
    if (!ethInstancePromise) {
        ethInstancePromise = getTransport().then((t) => new Eth(t)).catch((err) => {
            ethInstancePromise = null;
            throw err;
        });
    }
    return ethInstancePromise;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await fn();
        } catch (err: any) {
            if (err?.id === 'TransportLocked') {
                if (i === maxAttempts - 1) throw wrapLedgerError(err);
                await sleep(100);
                continue;
            }
            throw wrapLedgerError(err);
        }
    }
    throw new Error('Ledger operation timed out (device busy)');
};

const wrapLedgerError = (err: unknown): Error => {
    const error = err as LedgerError;
    if (error?.id === 'TransportLocked') {
        return new Error('Ledger device is busy. Please confirm or unlock the device.');
    }
    if (error?.message === 'NoDevice' || error?.message?.includes('No device')) {
        return new Error('Ledger device not found. Connect and unlock the device, then open the Ethereum app.');
    }
    return error instanceof Error ? error : new Error(String(err));
};

const readAppName = async (eth: Eth): Promise<string> => {
    const response = await eth.transport.send(0xb0, 0x01, 0x00, 0x00);
    const names: string[] = [];
    let i = 1;
    while (i < response.length + 1) {
        const len = response[i];
        i += 1;
        const bufValue = response.subarray(i, i + len);
        i += len;
        names.push(bufValue.toString('ascii').trim());
    }
    return (names[0] || '').toLowerCase();
};

const assertAppReady = async (eth: Eth) => {
    const config = await eth.getAppConfiguration();
    const appName = await readAppName(eth);
    if (appName && appName !== 'ethereum') {
        console.warn(`Ledger app is '${appName}', expected 'ethereum'. Some features may fail.`);
    }
    if (!config.arbitraryDataEnabled) {
        console.warn('Ledger arbitrary data is disabled; contract interactions may fail. Enable it in the app settings.');
    }
};

const shouldValidateNow = (policy: AddressValidation, validated: boolean): boolean => {
    switch (policy) {
        case AddressValidation.never:
            return false;
        case AddressValidation.initializationOnly:
            return false;
        case AddressValidation.firstTransactionPerAddress:
            return !validated;
        case AddressValidation.everyTransaction:
            return true;
        default:
            return false;
    }
};

const resolveValidationPolicy = (policy?: AddressValidation): AddressValidation => {
    if (!policy) return AddressValidation.firstTransactionPerAddress;
    return policy;
};

export interface LedgerToAccountOptions {
    signerId?: string;
    path?: string;
    basePath?: string;
    index?: number;
    transport?: Transport;
    addressValidation?: AddressValidation;
}

export const deriveLedgerPath = (options: LedgerToAccountOptions): ParsedLedgerPath => {
    // Priority 1: Use signerId if provided
    if (options.signerId) return parseLedgerPath(options.signerId);

    // Priority 2: Use explicit path if provided
    if (options.path) {
        return parseLedgerPath(`ledger:${options.path}`);
    }

    // Priority 3: Build path from basePath and index
    // BIP44 pattern: m/44'/60'/{account_index}'/0/0
    const base = options.basePath ?? DEFAULT_BASE_PATH;
    const idx = options.index ?? 0;

    // Only support ethers-ledger style base path; require callers needing other paths to pass `path`/`signerId`
    const normalizedBase = base.startsWith('m/') ? base : `m/${base}`;
    if (normalizedBase !== DEFAULT_BASE_PATH) {
        throw new Error(
            `Custom basePath '${base}' is not supported. Provide a full path via 'path' or signerId (e.g. ledger:m/.../0/0).`
        );
    }

    const fullPath = `${DEFAULT_BASE_PATH}/${idx}'/0/0`;
    return parseLedgerPath(`ledger:${fullPath}`);
};

export async function ledgerToAccount(options: LedgerToAccountOptions): Promise<LedgerAccount> {
    const parsed = options.path ? deriveLedgerPath({ ...options, signerId: undefined, path: options.path }) : deriveLedgerPath(options);
    const policy = resolveValidationPolicy(options.addressValidation);
    const useCache = !options.transport;
    const cacheKey = useCache ? `${parsed.path}|${policy}` : undefined;

    if (useCache && cacheKey) {
        const cached = accountCache.get(cacheKey);
        if (cached) return cached;
    }

    const ledgerPromise: Promise<LedgerAccount> = (async () => {
        try {
            const eth = await getEth(options.transport);
            await assertAppReady(eth);
            let alreadyValidated = policy === AddressValidation.never ? true : false;

            const { address, publicKey } = await withRetry(() =>
                eth.getAddress(parsed.path, policy === AddressValidation.initializationOnly)
            );
            if (policy === AddressValidation.initializationOnly) {
                alreadyValidated = true;
            }

            const ensureValidated = async () => {
                if (shouldValidateNow(policy, alreadyValidated)) {
                    await withRetry(() => eth.getAddress(parsed.path, true));
                    alreadyValidated = true;
                }
            };

            const ledgerAccount = toAccount({
                address: ensure0x(address),
                publicKey: ensure0x(publicKey) as Hex,
                async signTransaction(tx: TransactionSerializable) {
                    await ensureValidated();
                    const unsigned = serializeTransaction(tx).slice(2);
                    // Try to resolve transaction for clear signing; fall back to null for unsupported chains
                    let resolution: Awaited<ReturnType<typeof ledgerService.resolveTransaction>> | null = null;
                    try {
                        resolution = await ledgerService.resolveTransaction(unsigned, {}, { externalPlugins: true, erc20: true });
                    } catch (err: any) {
                        // Only fall back to blind signing for unsupported chains
                        // Re-throw network, auth, and other errors so users are aware
                        const errorMessage = err?.message?.toLowerCase() || '';
                        const isUnsupportedChain =
                            errorMessage.includes('not found') ||
                            errorMessage.includes('unsupported') ||
                            errorMessage.includes('not supported') ||
                            err?.statusCode === 404 ||
                            err?.status === 404;
                        if (!isUnsupportedChain) {
                            throw err;
                        }
                        // Chain not supported by Ledger backend - use blind signing
                    }
                    // Try signing with resolution; if INCORRECT_DATA error, retry without resolution (blind signing)
                    let sig: { r: string; s: string; v: string | number };
                    try {
                        sig = await withRetry(() => eth.signTransaction(parsed.path, unsigned, resolution));
                    } catch (err: any) {
                        const statusCode = err?.statusCode ?? err?.cause?.statusCode;
                        if (statusCode === 0x6a80 && resolution !== null) {
                            // INCORRECT_DATA - resolution incompatible with chain, retry with blind signing
                            sig = await withRetry(() => eth.signTransaction(parsed.path, unsigned, null));
                        } else {
                            throw err;
                        }
                    }
                    return serializeTransaction(tx, {
                        r: ensure0x(sig.r),
                        s: ensure0x(sig.s),
                        v: normalizeV(sig.v),
                    });
                },
                async signMessage({ message }) {
                    await ensureValidated();
                    const hex =
                        typeof message === 'object' && message !== null && 'raw' in message
                            ? toHex((message as { raw: Hex | Uint8Array }).raw)
                            : toHex(message);
                    const sig = await withRetry(() => eth.signPersonalMessage(parsed.path, hex.slice(2)));
                    return serializeSignature({
                        r: ensure0x(sig.r),
                        s: ensure0x(sig.s),
                        v: normalizeV(sig.v),
                    });
                },
                async signTypedData<
                    const typedData extends TypedDataDefinition | Record<string, unknown>,
                    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData
                >(parameters: TypedDataDefinition<typedData, primaryType>) {
                    await ensureValidated();
                    const { domain, types, primaryType, message } = parameters;

                    // Runtime validation
                    if (!types) {
                        throw new Error('TypedData types are required');
                    }
                    if (!message) {
                        throw new Error('TypedData message is required');
                    }

                    // Type assertions are necessary here due to complex viem generic types
                    // The runtime checks above ensure type safety
                    type MessageTypeProperty = { name: string; type: string };
                    const allTypes = {
                        EIP712Domain: getTypesForEIP712Domain({ domain: domain || {} }),
                        ...(types as Record<string, MessageTypeProperty[]>),
                    };

                    const domainSep = hashDomain({
                        domain: domain || {},
                        types: allTypes as Record<string, MessageTypeProperty[]>,
                    });
                    const messageHash = hashStruct({
                        data: message as Record<string, unknown>,
                        primaryType: primaryType as string,
                        types: allTypes as Record<string, MessageTypeProperty[]>,
                    });
                    const sig = await withRetry(() =>
                        eth.signEIP712HashedMessage(parsed.path, domainSep, messageHash)
                    );
                    return serializeSignature({
                        r: ensure0x(sig.r),
                        s: ensure0x(sig.s),
                        v: normalizeV(sig.v),
                    });
                },
            }) as LedgerAccount;

            const result: LedgerAccount = {
                ...ledgerAccount,
                type: 'local',
                source: 'ledger' as const,
                publicKey: ensure0x(publicKey) as Hex,
            };
            return result;
        } catch (err) {
            throw wrapLedgerError(err);
        }
    })();

    if (useCache && cacheKey) {
        accountCache.set(cacheKey, ledgerPromise);
        ledgerPromise.catch(() => {
            accountCache.delete(cacheKey);
        });
    }
    return ledgerPromise;
}
