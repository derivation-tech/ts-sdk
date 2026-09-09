// Main exports
export { ChainKit, type ChainKitOptions } from './chain-kit';
export { ChainKitRegistry } from './chain-kit-registry';
export { AddressBook } from './utils/address-book';
export { WRAPPED_NATIVE_TOKENS, getWrappedNativeToken } from './tokens/wrapped';
export { COMMON_ERC20_TOKENS, getCommonErc20Tokens } from './tokens/erc20';
export { createDefaultParser } from './parsers/default';
export { createContractParser } from './parsers/types';
export { ParserRegistry, createParserRegistry } from './parsers/registry';
export { LoggerFactory, ConsoleLogger, LogLevel, type BaseLogger } from './utils/logger';
export { createERC20Parser } from './parsers/erc20';
export { createWETHParser } from './parsers/weth';
export {
    BatchTransactionError,
    TransactionSubmissionError,
    TransactionReceiptError,
    TransactionReplacementError,
    TransactionRevertedError,
    assertTransactionSuccess,
    waitForTransactionOutcome,
    batchSendLocalTransactions,
    defineWriteRequest,
    sendContractTransaction,
    type BatchTransactionPhase,
    type BatchTransactionOptions,
    type BatchTransactionProgress,
    type BatchTransactionResult,
    type DefinedWriteRequest,
    type RuntimeWriteRequest,
    type TypedWriteRequest,
    type WriteFunctionName,
    type WriteArgs,
} from './utils/tx';
export { decodeContractError } from './utils/contract-error';
export { abctest } from './chains/abctest';
export * as ERC20 from './contracts/erc20';
export * as WETH from './contracts/weth';
export * as Multicall from './contracts/multicall';
export { WETH_ABI, MULTICALL3_ABI } from './abis';

// Type exports
export type {
    ContractParser,
    DecodedContractError,
    Erc20TokenInfo,
    ParserResolver,
    ParseEventInput,
    ParseTransactionInput,
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
} from './types';
export type {
    ContractWriteFunctionName,
    ErrorParser,
    ErrorParserMap,
    EventParser,
    EventParserMap,
    RegisteredParser,
    TransactionParser,
    TransactionParserMap,
} from './types';

// Re-export commonly used viem types
export type { Address, Hash, Hex, Account, PublicClient, WalletClient, TransactionReceipt } from 'viem';

// Re-export commonly used viem functions
export {
    parseAbi,
    parseUnits,
    formatUnits,
    parseEther,
    formatEther,
    parseGwei,
    formatGwei,
    isAddress,
    getAddress,
    isAddressEqual,
    keccak256,
    toHex,
    toBytes,
    encodeFunctionData,
    decodeFunctionResult,
    decodeEventLog,
} from 'viem';

export { privateKeyToAccount, mnemonicToAccount, hdKeyToAccount } from 'viem/accounts';
