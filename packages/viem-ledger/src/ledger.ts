import type {
    Hex,
    LocalAccount,
    SerializeTransactionFn,
    TransactionSerializable,
    TypedData,
    TypedDataDefinition,
    TypedDataDomain,
} from 'viem';
import {
    getTypesForEIP712Domain,
    hexToBytes,
    isAddressEqual,
    serializeSignature,
    serializeTransaction,
    validateTypedData,
} from 'viem';
import { toAccount } from 'viem/accounts';
import { SignerEthBuilder, type TypedData as LedgerTypedData } from '@ledgerhq/device-signer-kit-ethereum';
import { AddressValidation, DEFAULT_BASE_PATH } from './constants';
import { parseLedgerPath, type ParsedLedgerPath } from './parse';
import { getDefaultSession, inSession, runAction, type LedgerSession } from './session';

export type LedgerAccount = LocalAccount<'ledger'> & { source: 'ledger'; type: 'local'; publicKey?: Hex };

export interface LedgerToAccountOptions {
    signerId?: string;
    path?: string;
    basePath?: string;
    index?: number;
    /** Caller-owned DMK connection. Omit to use the shared Node HID connection. */
    session?: LedgerSession;
    /** Caller-owned Ledger origin token used by the default context module. */
    originToken?: string;
    /** Maximum duration of each device action, including on-device confirmation. Default: 120 seconds. */
    timeoutMs?: number;
    addressValidation?: AddressValidation;
}

const ensure0x = (value: string): Hex => (value.startsWith('0x') ? value : `0x${value}`) as Hex;

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
    const parsed = options.path ? deriveLedgerPath({ ...options, signerId: undefined }) : deriveLedgerPath(options);
    const timeoutMs = options.timeoutMs ?? 120_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
        throw new Error('Ledger timeoutMs must be a positive 32-bit integer');
    }
    const policy = options.addressValidation ?? AddressValidation.firstTransactionPerAddress;
    const session = options.session ?? (await getDefaultSession());
    const signer = new SignerEthBuilder({ ...session, originToken: options.originToken }).build();
    const path = parsed.path.replace(/^m\//, '');
    let validated = policy === AddressValidation.never || policy === AddressValidation.initializationOnly;
    const { address, publicKey } = await inSession(session, () =>
        runAction(
            signer.getAddress(path, { checkOnDevice: policy === AddressValidation.initializationOnly }),
            timeoutMs
        )
    );
    const ensureValidated = async () => {
        if (policy === AddressValidation.everyTransaction || !validated) {
            const confirmed = await runAction(signer.getAddress(path, { checkOnDevice: true }), timeoutMs);
            if (!isAddressEqual(confirmed.address, address)) {
                throw new Error('Ledger address changed; reconnect and create a new account before signing.');
            }
            validated = true;
        }
    };
    const account = toAccount({
        address,
        async signTransaction(
            tx: TransactionSerializable,
            options?: { serializer?: SerializeTransactionFn<TransactionSerializable> }
        ) {
            const unsigned = serializeTransaction(tx);
            // The device signs only the standard Ethereum encoding. viem passes the chain's serializer here; when
            // it encodes this transaction differently (e.g. an OP-stack deposit), the signature would not match
            // what the chain accepts, so refuse before any device action.
            if (options?.serializer && (await options.serializer(tx)) !== unsigned) {
                throw new Error(
                    'Ledger cannot sign this transaction: the chain serializer encodes it differently from the standard Ethereum encoding the device signs.'
                );
            }
            return inSession(session, async () => {
                await ensureValidated();
                const signature = await runAction(signer.signTransaction(path, hexToBytes(unsigned)), timeoutMs);
                return serializeTransaction(tx, { ...signature, v: BigInt(signature.v) });
            });
        },
        async signMessage({ message }) {
            const bytes =
                typeof message === 'string'
                    ? new TextEncoder().encode(message)
                    : typeof message.raw === 'string'
                      ? hexToBytes(message.raw)
                      : message.raw;
            return inSession(session, async () => {
                await ensureValidated();
                const signature = await runAction(signer.signMessage(path, bytes), timeoutMs);
                return serializeSignature({ ...signature, v: BigInt(signature.v) });
            });
        },
        async signTypedData<
            const typedData extends TypedData | Record<string, unknown>,
            primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
        >(parameters: TypedDataDefinition<typedData, primaryType>) {
            // Erase viem's generic message schema at the SDK boundary after validation.
            const { types = {}, primaryType, message } = parameters;
            const domain = (parameters.domain ?? {}) as TypedDataDomain;
            validateTypedData(parameters);
            const chainId = domain.chainId === undefined ? undefined : Number(domain.chainId);
            if (chainId !== undefined && (!Number.isSafeInteger(chainId) || chainId < 0)) {
                throw new Error('Ledger typed-data chainId must be a non-negative safe integer');
            }
            const payload: LedgerTypedData = {
                domain: { ...domain, chainId },
                types: Object.fromEntries(
                    Object.entries({
                        EIP712Domain: getTypesForEIP712Domain({ domain }),
                        ...(types as TypedData),
                    }).map(([name, fields]) => [
                        name,
                        fields.map((field: { name: string; type: string }) => ({ ...field })),
                    ])
                ),
                primaryType: String(primaryType),
                message: message ?? {},
            };
            return inSession(session, async () => {
                await ensureValidated();
                const signature = await runAction(signer.signTypedData(path, payload), timeoutMs);
                return serializeSignature({ ...signature, v: BigInt(signature.v) });
            });
        },
    });
    return { ...account, source: 'ledger', publicKey: ensure0x(publicKey) };
}
