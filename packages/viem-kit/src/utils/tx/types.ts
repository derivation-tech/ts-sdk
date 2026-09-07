import type {
    Abi,
    Account,
    Address,
    Chain,
    ContractFunctionArgs,
    ContractFunctionName,
    Hash,
    Hex,
    PublicClient,
    TransactionRequest,
    TransactionReceipt,
    Transport,
    UnionOmit,
    WalletClient,
    WriteContractParameters,
} from 'viem';
import type { ParserResolver } from '../../parsers/registry';
import type { ContractParser } from '../../parsers/types';
import type { DecodedContractError } from '../../types';

export type WriteFunctionName<TAbi extends Abi> = ContractFunctionName<TAbi, 'payable' | 'nonpayable'>;

export type WriteArgs<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>> = ContractFunctionArgs<
    TAbi,
    'payable' | 'nonpayable',
    TFunctionName
>;

type ViemWriteRequest<
    TAbi extends Abi,
    TFunctionName extends WriteFunctionName<TAbi>,
    TArgs extends WriteArgs<TAbi, TFunctionName> = WriteArgs<TAbi, TFunctionName>,
> = WriteContractParameters<TAbi, TFunctionName, TArgs, Chain | undefined, Account | undefined, Chain | undefined>;

export type TypedWriteRequest<
    TAbi extends Abi,
    TFunctionName extends WriteFunctionName<TAbi>,
    TArgs extends WriteArgs<TAbi, TFunctionName> = WriteArgs<TAbi, TFunctionName>,
> = UnionOmit<ViemWriteRequest<TAbi, TFunctionName, TArgs>, 'account' | 'chain'> & {
    account?: Account | Address | null;
    chain?: Chain | null;
    parser?: ContractParser<TAbi>;
};

declare const definedWriteRequest: unique symbol;

type BatchTransactionOverrides = UnionOmit<TransactionRequest, 'to' | 'data' | 'from' | 'nonce'>;

export type RuntimeWriteRequest = BatchTransactionOverrides & {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    account?: Account | Address | null;
    chain?: Chain | null;
    dataSuffix?: Hex;
    parser?: unknown;
};

export type DefinedWriteRequest = RuntimeWriteRequest & {
    readonly [definedWriteRequest]: true;
};

type BatchTypedWriteRequest<
    TAbi extends Abi,
    TFunctionName extends WriteFunctionName<TAbi>,
    TArgs extends WriteArgs<TAbi, TFunctionName>,
> = TypedWriteRequest<TAbi, TFunctionName, TArgs> & {
    nonce?: never;
    chainId?: never;
};

export function defineWriteRequest<
    const TAbi extends Abi,
    TFunctionName extends WriteFunctionName<TAbi>,
    TArgs extends WriteArgs<TAbi, TFunctionName>,
>(
    request: BatchTypedWriteRequest<TAbi, TFunctionName, TArgs>
): TypedWriteRequest<TAbi, TFunctionName, TArgs> & DefinedWriteRequest {
    return request as TypedWriteRequest<TAbi, TFunctionName, TArgs> & DefinedWriteRequest;
}

export type TxContext = {
    publicClient: PublicClient;
    walletClient: WalletClient<Transport, Chain | undefined, Account | undefined>;
    chain?: Chain;
    resolveParser?: ParserResolver;
};

export type TxObserverPhase = 'sent' | 'receipt' | 'reverted' | 'event' | 'parseError';

export type TxObserverErrorEvent = {
    phase: TxObserverPhase;
    hash: Hash;
    error: unknown;
    transactionAlreadySent: true;
};

export type TxLifecycleHooks = {
    onSent?: (event: { hash: Hash; description?: string }) => void;
    onReceipt?: (event: { hash: Hash; receipt: TransactionReceipt }) => void;
    onReverted?: (event: {
        hash: Hash;
        receipt: TransactionReceipt;
        error?: DecodedContractError;
        message?: string;
    }) => void;
    onEvent?: (event: { hash: Hash; receipt: TransactionReceipt; logIndex: number; description: string }) => void;
    onParseError?: (event: { phase: 'transaction' | 'event' | 'error'; error: unknown }) => void;
    onObserverError?: (event: TxObserverErrorEvent) => void;
};

export type SendTransactionOptions = {
    silent?: boolean;
    hooks?: TxLifecycleHooks;
};

export type SentTransaction = {
    hash: Hash;
    receipt: Promise<TransactionReceipt>;
};

export type BatchTransactionPhase = 'prepare' | 'sign' | 'send' | 'receipt';

export type BatchTransactionProgress = {
    index: number;
    hash?: Hash;
    receipt?: TransactionReceipt;
};

export type BatchTransactionResult = {
    index: number;
    hash: Hash;
    receipt: TransactionReceipt;
};

export class BatchTransactionError extends Error {
    constructor(
        message: string,
        public readonly phase: BatchTransactionPhase,
        public readonly index: number,
        public readonly progress: readonly BatchTransactionProgress[],
        options: { cause: unknown }
    ) {
        super(message, options);
        this.name = 'BatchTransactionError';
    }
}
