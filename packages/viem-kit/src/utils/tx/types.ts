import type {
    Abi,
    Account,
    Address,
    Chain,
    ContractFunctionArgs,
    ContractFunctionName,
    Hash,
    Hex,
    NonceManager,
    PublicClient,
    TransactionRequest,
    TransactionReceipt,
    Transport,
    UnionOmit,
    WalletClient,
    WaitForTransactionReceiptParameters,
    WriteContractParameters,
} from 'viem';
import type { ParserResolver } from '../../parsers/registry';
import type { ContractParser } from '../../parsers/types';
import type { DecodedContractError, MaybePromise } from '../../types';

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

export type TxObserverPhase =
    | 'sent'
    | 'description'
    | 'diagnostics'
    | 'receipt'
    | 'reverted'
    | 'event'
    | 'parseError'
    | 'log'
    | 'replaced';

export type TxObserverErrorEvent = {
    phase: TxObserverPhase;
    hash?: Hash;
    error: unknown;
    transactionAlreadySent: boolean;
};

export type ReceiptWaitOptions = Pick<
    WaitForTransactionReceiptParameters,
    'confirmations' | 'timeout' | 'pollingInterval' | 'checkReplacement'
>;

export type TxReplacementEvent = Parameters<NonNullable<WaitForTransactionReceiptParameters['onReplaced']>>[0] & {
    submittedHash: Hash;
};

export type TxLifecycleHooks = {
    onSent?: (event: { hash: Hash; description?: string }) => MaybePromise<void>;
    onDescription?: (event: { hash: Hash; description: string }) => MaybePromise<void>;
    onReceipt?: (event: { hash: Hash; submittedHash: Hash; receipt: TransactionReceipt }) => MaybePromise<void>;
    onReplaced?: (event: TxReplacementEvent) => MaybePromise<void>;
    onReverted?: (event: {
        hash: Hash;
        submittedHash: Hash;
        receipt: TransactionReceipt;
        error?: DecodedContractError;
        message?: string;
    }) => MaybePromise<void>;
    onEvent?: (event: {
        hash: Hash;
        submittedHash: Hash;
        receipt: TransactionReceipt;
        logIndex: number;
        description: string;
    }) => MaybePromise<void>;
    onParseError?: (event: { phase: 'transaction' | 'event' | 'error'; error: unknown }) => MaybePromise<void>;
    onObserverError?: (event: TxObserverErrorEvent) => MaybePromise<void>;
};

export type SendTransactionOptions = {
    silent?: boolean;
    hooks?: TxLifecycleHooks;
    wait?: ReceiptWaitOptions;
    diagnostics?: {
        /** Milliseconds per diagnostic stage, starting after submission/receipt. Defaults to 5,000. */
        timeout?: number;
        /** Stops diagnostic waiting and late delivery, not the transaction or consumer-owned I/O. */
        signal?: AbortSignal;
    };
};

export type TxDiagnosticStatus = 'completed' | 'timed-out' | 'cancelled';

export type TxDiagnosticsResult = {
    transaction: TxDiagnosticStatus;
    receipt: TxDiagnosticStatus | 'skipped';
};

export type SentTransaction = {
    hash: Hash;
    receipt: Promise<TransactionReceipt>;
    /** Resolves after receipt handling; await separately when CLI diagnostic output is needed. */
    diagnostics: Promise<TxDiagnosticsResult>;
};

export type TransactionSubmissionPhase = 'prepare' | 'sign' | 'send';

export type BatchTransactionPhase = TransactionSubmissionPhase | 'receipt';

export type BatchTransactionOptions = SendTransactionOptions & {
    /** Share one manager across concurrent calls in the same chain/RPC environment. */
    nonceManager?: NonceManager;
};

export type BatchTransactionProgress = {
    index: number;
    nonce?: number;
    submission?: 'not-sent' | 'unknown' | 'submitted';
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
