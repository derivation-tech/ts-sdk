import type { Address, Abi, Hex } from 'viem';

// ==========================================
// CORE TYPES
// ==========================================

export interface Erc20TokenInfo {
    symbol: string;
    name: string;
    address: Address;
    decimals: number;
}

export type MaybePromise<T> = T | Promise<T>;
export type ContractErrorAbiItem = Extract<Abi[number], { type: 'error' }>;

export type DecodedContractError =
    | {
          kind: 'custom';
          name: string;
          args: readonly unknown[];
          abiItem?: ContractErrorAbiItem;
          data?: Hex;
          message: string;
      }
    | {
          kind: 'revertString';
          reason: string;
          data?: Hex;
          message: string;
      }
    | {
          kind: 'panic';
          code?: bigint;
          data?: Hex;
          message: string;
      }
    | {
          kind: 'raw';
          data: Hex;
          message: string;
      }
    | {
          kind: 'unknown';
          message: string;
      };

export type {
    ContractParser,
    ContractWriteFunctionName,
    ErrorParser,
    ErrorParserMap,
    EventParser,
    EventParserMap,
    ParseEventInput,
    ParseTransactionInput,
    TransactionParser,
    TransactionParserMap,
} from './parsers/types';
export type { ParserResolver, ParserRegistry, RegisteredParser } from './parsers/registry';
export type {
    BatchTransactionError,
    BatchTransactionPhase,
    BatchTransactionOptions,
    BatchTransactionProgress,
    BatchTransactionResult,
    DefinedWriteRequest,
    RuntimeWriteRequest,
    SendTransactionOptions,
    SentTransaction,
    TxDiagnosticsResult,
    TxDiagnosticStatus,
    TxContext,
    TxLifecycleHooks,
    TxObserverErrorEvent,
    TxObserverPhase,
    ReceiptWaitOptions,
    TxReplacementEvent,
    TypedWriteRequest,
    WriteArgs,
    WriteFunctionName,
} from './utils/tx/types';
