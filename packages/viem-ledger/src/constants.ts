export const LEDGER_PREFIX = 'ledger';
// Default derivation base for BIP44 Ethereum paths
// Full path format: m/44'/60'/{account_index}'/0/0
// This matches the common wallet behavior (MetaMask, Ledger Live, etc.)
// where users create multiple accounts by incrementing the account_index
export const DEFAULT_BASE_PATH = "m/44'/60'";
export const LEDGER_INDEX_ENV = 'LEDGER_INDEX';
export const LEDGER_PATH_ENV = 'LEDGER_PATH';

export enum AddressValidation {
    never = 'never',
    initializationOnly = 'initializationOnly',
    everyTransaction = 'everyTransaction',
    firstTransactionPerAddress = 'firstTransactionPerAddress',
}
