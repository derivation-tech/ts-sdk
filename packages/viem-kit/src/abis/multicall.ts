import { parseAbi } from 'viem';
import type { Abi } from 'viem';

/**
 * Complete Multicall3 ABI including helper getters.
 */
export const MULTICALL3_ABI = parseAbi([
    'struct Call { address target; bytes callData; }',
    'struct Call3 { address target; bool allowFailure; bytes callData; }',
    'struct Call3Value { address target; bool allowFailure; uint256 value; bytes callData; }',
    'struct Result { bool success; bytes returnData; }',
    'function aggregate(Call[] calls) payable returns (uint256 blockNumber, bytes[] returnData)',
    'function aggregate3(Call3[] calls) payable returns (Result[] returnData)',
    'function aggregate3Value(Call3Value[] calls) payable returns (Result[] returnData)',
    'function blockAndAggregate(Call[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, Result[] returnData)',
    'function getBasefee() view returns (uint256 basefee)',
    'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
    'function getBlockNumber() view returns (uint256 blockNumber)',
    'function getChainId() view returns (uint256 chainid)',
    'function getCurrentBlockCoinbase() view returns (address coinbase)',
    'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
    'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
    'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
    'function getEthBalance(address addr) view returns (uint256 balance)',
    'function getLastBlockHash() view returns (bytes32 blockHash)',
    'function tryAggregate(bool requireSuccess, Call[] calls) payable returns (Result[] returnData)',
    'function tryBlockAndAggregate(bool requireSuccess, Call[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, Result[] returnData)',
]) as Abi;
