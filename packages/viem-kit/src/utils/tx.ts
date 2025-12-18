import type { PublicClient, WalletClient, Address, TransactionReceipt, Account } from 'viem';
import { decodeEventLog, encodeFunctionData } from 'viem';
import type { Abi } from 'viem';
import type { ChainKit } from '../chain-kit';
import { LoggerFactory } from './logger';
import { loadArtifact, linkBytecode } from './artifact-helper';
import fs from 'fs';
import path from 'path';

export type TxRequest = {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
    gas?: bigint;
};

export type DeployOptions = {
    artifact: string | any; // path or loaded artifact
    constructorArgs?: any[];
    linkReferenceMap?: Record<string, string>;
    confirmations?: number;
};

import { extractContractError } from './contract-error';
import { ContractParser, ParsedContractError } from '../types';

/**
 * Safe serializer that works in both Node.js and browser environments.
 * Handles BigInt, circular references, and other special types.
 */
function safeStringify(value: unknown, maxDepth = 10): string {
    const seen = new WeakSet();

    const stringify = (val: unknown, depth: number): string => {
        if (depth > maxDepth) return '[Max Depth]';

        // Handle primitives
        if (val === null) return 'null';
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') return `"${val}"`;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return String(val);
        if (typeof val === 'bigint') return `${val}n`;
        if (typeof val === 'symbol') return val.toString();
        if (typeof val === 'function') return '[Function]';

        // Handle objects
        if (typeof val === 'object') {
            // Check for circular references
            if (seen.has(val)) return '[Circular]';
            seen.add(val);

            // Handle arrays
            if (Array.isArray(val)) {
                const items = val.map(item => stringify(item, depth + 1)).join(', ');
                return `[${items}]`;
            }

            // Handle Error objects
            if (val instanceof Error) {
                return `Error: ${val.message}`;
            }

            // Handle plain objects
            try {
                const entries = Object.entries(val)
                    .map(([k, v]) => `${k}: ${stringify(v, depth + 1)}`)
                    .join(', ');
                return `{${entries}}`;
            } catch {
                return '[Object]';
            }
        }

        return String(val);
    };

    return stringify(value, 0);
}

function formatErrorMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    return safeStringify(message);
}

// Normalize error to a message string using unified handling
export async function handleError(err: any, parser: ContractParser, abi: Abi): Promise<string | ParsedContractError> {
    const errStrOrObj = await extractContractError(err, abi);
    if (parser && parser.parseError) {
        try {
            return await parser.parseError(errStrOrObj);
        } catch (e) {
            // Defensive fallback in case parser.parseError throws
            const fallback = e instanceof Error ? e.message : String(e);
            return 'Unknown contract error: ' + fallback;
        }
    }
    return errStrOrObj;
}

export async function sendTxWithLog(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    req: TxRequest
): Promise<TransactionReceipt> {
    const logger = LoggerFactory.getLogger(`${kit.chain.name}::Tx`);
    try {
        logger.setTimestamp?.(true);
    } catch {}

    if (!walletClient.account) {
        throw new Error('WalletClient must have an account configured');
    }
    const account = walletClient.account;

    const parser = kit.getParser(req.address as Address);
    let txDesc: string | undefined;
    try {
        if (parser && (parser as any).parseTransaction) {
            const desc = await (parser as any).parseTransaction({
                functionName: req.functionName,
                args: req.args || [],
            });
            if (desc) txDesc = String(desc);
        }
    } catch {}

    let hash: `0x${string}`;
    try {
        hash = await walletClient.writeContract({
            account,
            chain: kit.chain,
            address: req.address,
            abi: req.abi,
            functionName: req.functionName as any,
            args: (req.args || []) as any,
            value: req.value,
            gas: req.gas,
        });
    } catch (err: any) {
        const message = await handleError(err, parser as ContractParser, req.abi);
        logger.info(`❌ Tx failed to send: ${formatErrorMessage(message)}`);
        throw err;
    }
    logger.info(`📤 Sent tx: ${hash}${txDesc ? ` ${txDesc}` : ''}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Check transaction status - viem uses 'success' | 'reverted' for status
    if (receipt.status === 'reverted') {
        logger.info(`❌ Tx reverted: ${hash} ${receipt.blockNumber}`);
        if (parser && (parser as any).parseError) {
            try {
                const callData = encodeFunctionData({
                    abi: req.abi,
                    functionName: req.functionName as any,
                    args: (req.args || []) as any,
                });
                await publicClient.call({
                    account: account?.address as Address,
                    to: req.address,
                    data: callData,
                    value: req.value,
                    blockNumber: receipt.blockNumber,
                });
            } catch (simulateErr: any) {
                // Decode and print custom error (allow parser to format message)
                const message = await handleError(simulateErr, parser, req.abi);
                logger.info(`❌ Tx failed to send: ${formatErrorMessage(message)}`);
            }
        }
        return receipt;
    }

    // Transaction succeeded - parse and log events
    try {
        if (!receipt.logs || receipt.logs.length === 0) {
            logger.info(`ℹ️  Tx confirmed: ${hash} ${receipt.blockNumber} (no events)`);
            return receipt;
        }

        for (let idx = 0; idx < receipt.logs.length; idx++) {
            const log = receipt.logs[idx] as any;
            const p = kit.getParser(log.address as Address);
            if (!p) continue;
            if (p.parseEvent && p.abi && log.topics && log.data !== undefined) {
                try {
                    const decoded = decodeEventLog({
                        abi: p.abi,
                        data: log.data as `0x${string}`,
                        topics: (log.topics?.slice() as unknown as [`0x${string}`, ...`0x${string}`[]]) || [],
                        strict: false,
                    });
                    const parsed = await p.parseEvent({
                        eventName: decoded.eventName,
                        args: decoded.args,
                    } as any);
                    if (parsed) {
                        const logIndex = (log.logIndex ?? idx) as number;
                        logger.info(`✅ Mint tx: ${hash} ${receipt.blockNumber} ${logIndex} ${parsed}`);
                    }
                } catch (err: any) {
                    // Log parsing errors for debugging if DEBUG env var is set
                    if (process.env.DEBUG) {
                        logger.info(`⚠️  Failed to parse event at index ${idx}: ${err.message || err}`);
                    }
                }
            }
        }
    } catch (err: any) {
        logger.info(`⚠️  Failed to process events for tx ${hash}: ${err.message || err}`);
    }
    return receipt;
}

export async function sendTxSilent(
    publicClient: PublicClient,
    walletClient: WalletClient,
    req: TxRequest
): Promise<TransactionReceipt> {
    if (!walletClient.account) {
        throw new Error('WalletClient must have an account configured');
    }
    const account = walletClient.account;
    const hash = await walletClient.writeContract({
        account,
        chain: undefined,
        address: req.address,
        abi: req.abi,
        functionName: req.functionName as any,
        args: (req.args || []) as any,
        value: req.value,
        gas: req.gas,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Check transaction status - throw if reverted for silent variant
    if (receipt.status === 'reverted') {
        throw new Error(`Transaction reverted: ${hash}`);
    }

    return receipt;
}

export async function batchSendTxWithLog(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    kit: ChainKit,
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    const logger = LoggerFactory.getLogger(`${kit.chain.name}::BatchTx`);
    try {
        logger.setTimestamp?.(true);
    } catch {}
    if (walletClients.length !== txs.length) {
        throw new Error('walletClients length must equal txs length');
    }

    const groups = new Map<
        string,
        { client: WalletClient; items: Array<{ index: number; req: TxRequest; desc?: string }> }
    >();
    for (let i = 0; i < txs.length; i++) {
        const req = txs[i];
        const client = walletClients[i];
        if (!client.account) {
            throw new Error(`WalletClient at index ${i} must have an account configured`);
        }
        const addr = client.account.address;
        const parser = kit.getParser(req.address as Address);
        let desc: string | undefined;
        try {
            if (parser && typeof (parser as any).parseTransaction === 'function') {
                const d = await (parser as any).parseTransaction({
                    functionName: req.functionName,
                    args: req.args || [],
                });
                if (d) desc = String(d);
            }
        } catch {}
        const bucket = groups.get(addr) || { client, items: [] };
        bucket.items.push({ index: i, req, desc });
        groups.set(addr, bucket);
    }

    const groupList = Array.from(groups.values());
    const baseNonces = await Promise.all(
        groupList.map((g) => {
            if (!g.client.account) {
                throw new Error('WalletClient must have an account configured');
            }
            return publicClient.getTransactionCount({ address: g.client.account.address as Address });
        })
    );

    const signedByIndex: Array<{ index: number; raw: string; desc?: string }> = [];
    for (let gi = 0; gi < groupList.length; gi++) {
        const g = groupList[gi];
        if (!g.client.account) {
            throw new Error('WalletClient must have an account configured');
        }
        const startNonce = BigInt(baseNonces[gi]);
        const preparedSigned = await Promise.all(
            g.items.map(async (item, localIdx) => {
                try {
                    const data = encodeFunctionData({
                        abi: item.req.abi,
                        functionName: item.req.functionName as any,
                        args: (item.req.args || []) as any,
                    });
                    const prepared = await g.client.prepareTransactionRequest({
                        account: g.client.account as Account,
                        chain: kit.chain,
                        to: item.req.address,
                        data,
                        value: item.req.value,
                        gas: item.req.gas,
                        nonce: startNonce + BigInt(localIdx),
                    } as any);
                    const raw = await g.client.signTransaction(prepared as any);
                    return { index: item.index, raw, desc: item.desc };
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `Failed to prepare/sign transaction at index ${item.index}` +
                        `${item.desc ? ` (${item.desc})` : ''}: ${errMsg}`
                    );
                }
            })
        );
        signedByIndex.push(...preparedSigned);
    }

    const hashesByIndex: Array<`0x${string}`> = new Array(txs.length) as any;
    await Promise.all(
        signedByIndex.map(async (s) => {
            try {
                const h = await publicClient.sendRawTransaction({ serializedTransaction: s.raw as `0x${string}` });
                hashesByIndex[s.index] = h;
                logger.info(`📤 Sent tx: ${h}${s.desc ? ` ${s.desc}` : ''}`);
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                throw new Error(
                    `Failed to broadcast transaction at index ${s.index}` +
                    `${s.desc ? ` (${s.desc})` : ''}: ${errMsg}`
                );
            }
        })
    );

    const receipts = await Promise.all(hashesByIndex.map((hash) => publicClient.waitForTransactionReceipt({ hash })));

    for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i] as any;
        const txHash = hashesByIndex[i];

        // Check transaction status - viem uses 'success' | 'reverted' for status
        if (receipt.status === 'reverted') {
            logger.info(`  ❌ Tx reverted: ${txHash} ${receipt.blockNumber}`);
            continue; // Skip event parsing for reverted transactions
        }

        // Transaction succeeded - parse and log events
        try {
            if (!receipt.logs || receipt.logs.length === 0) {
                logger.info(`  ℹ️  Tx confirmed: ${txHash} ${receipt.blockNumber} (no events)`);
                continue;
            }

            for (let idx = 0; idx < receipt.logs.length; idx++) {
                const log = receipt.logs[idx] as any;
                const p = kit.getParser(log.address as Address);
                if (!p) continue;
                if (p.parseEvent && p.abi && log.topics && log.data !== undefined) {
                    try {
                        const decoded = decodeEventLog({
                            abi: p.abi,
                            data: log.data as `0x${string}`,
                            topics: (log.topics?.slice() as unknown as [`0x${string}`, ...`0x${string}`[]]) || [],
                            strict: false,
                        });
                        const parsed = await p.parseEvent({
                            eventName: decoded.eventName,
                            args: decoded.args,
                        } as any);
                        if (parsed) {
                            const logIndex = (log.logIndex ?? idx) as number;
                            logger.info(`  ✅ Mint tx: ${txHash} ${receipt.blockNumber} ${logIndex} ${parsed}`);
                        }
                    } catch (err: any) {
                        // Log parsing errors for debugging if DEBUG env var is set
                        if (process.env.DEBUG) {
                            logger.info(
                                `  ⚠️  Failed to parse event at index ${idx} for tx ${txHash}: ${err.message || err}`
                            );
                        }
                    }
                }
            }
        } catch (err: any) {
            logger.info(`  ⚠️  Failed to process events for tx ${txHash}: ${err.message || err}`);
        }
    }
    return receipts as TransactionReceipt[];
}

export async function batchSendTxSilent(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    if (walletClients.length !== txs.length) {
        throw new Error('walletClients length must equal txs length');
    }

    const groups = new Map<string, { client: WalletClient; items: Array<{ index: number; req: TxRequest }> }>();
    for (let i = 0; i < txs.length; i++) {
        const req = txs[i];
        const client = walletClients[i];
        if (!client.account) {
            throw new Error(`WalletClient at index ${i} must have an account configured`);
        }
        const addr = client.account.address;
        const bucket = groups.get(addr) || { client, items: [] };
        bucket.items.push({ index: i, req });
        groups.set(addr, bucket);
    }

    const groupList = Array.from(groups.values());
    const baseNonces = await Promise.all(
        groupList.map((g) => {
            if (!g.client.account) {
                throw new Error('WalletClient must have an account configured');
            }
            return publicClient.getTransactionCount({ address: g.client.account.address as Address });
        })
    );

    const signedByIndex: Array<{ index: number; raw: string }> = [];
    for (let gi = 0; gi < groupList.length; gi++) {
        const g = groupList[gi];
        if (!g.client.account) {
            throw new Error('WalletClient must have an account configured');
        }
        const startNonce = BigInt(baseNonces[gi]);
        const preparedSigned = await Promise.all(
            g.items.map(async (item, localIdx) => {
                try {
                    const data = encodeFunctionData({
                        abi: item.req.abi,
                        functionName: item.req.functionName as any,
                        args: (item.req.args || []) as any,
                    });
                    const prepared = await g.client.prepareTransactionRequest({
                        account: g.client.account as Account,
                        chain: undefined,
                        to: item.req.address,
                        data,
                        value: item.req.value,
                        gas: item.req.gas,
                        nonce: startNonce + BigInt(localIdx),
                    } as any);
                    const raw = await g.client.signTransaction(prepared as any);
                    return { index: item.index, raw };
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    throw new Error(
                        `Failed to prepare/sign transaction at index ${item.index}` +
                        ` (to: ${item.req.address}): ${errMsg}`
                    );
                }
            })
        );
        signedByIndex.push(...preparedSigned);
    }

    const hashesByIndex: Array<`0x${string}`> = new Array(txs.length) as any;
    await Promise.all(
        signedByIndex.map(async (s) => {
            try {
                const h = await publicClient.sendRawTransaction({ serializedTransaction: s.raw as `0x${string}` });
                hashesByIndex[s.index] = h;
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to broadcast transaction at index ${s.index}: ${errMsg}`);
            }
        })
    );

    const receipts = await Promise.all(hashesByIndex.map((hash) => publicClient.waitForTransactionReceipt({ hash })));

    // Check transaction status for each receipt - throw if any reverted
    for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        if (receipt.status === 'reverted') {
            throw new Error(`Transaction reverted: ${hashesByIndex[i]}`);
        }
    }

    return receipts as TransactionReceipt[];
}

export async function deployArtifact(
    publicClient: PublicClient,
    walletClient: WalletClient,
    opts: DeployOptions
): Promise<string> {
    const { artifact: artifactPathOrObject, constructorArgs = [], linkReferenceMap = {}, confirmations = 2 } = opts;

    let artifact: any;
    if (typeof artifactPathOrObject === 'string') {
        // If the string is a filesystem path to a file, prefer loading from file.
        // If it's not an existing file, pass the string through to loadArtifact
        // which will accept JSON string or artifact path too.
        try {
            const possiblePath = path.isAbsolute(artifactPathOrObject)
                ? artifactPathOrObject
                : path.resolve(process.cwd(), artifactPathOrObject);
            if (fs.existsSync(possiblePath)) {
                artifact = loadArtifact(possiblePath, linkReferenceMap || {});
            } else {
                // Not an existing file path; delegate to loadArtifact which can
                // accept JSON string or artifact object string.
                artifact = loadArtifact(artifactPathOrObject, linkReferenceMap || {});
            }
        } catch (e) {
            // Fallback to calling loadArtifact directly on the string
            artifact = loadArtifact(artifactPathOrObject, linkReferenceMap || {});
        }
    } else {
        artifact = artifactPathOrObject;
    }

    // extract chain from walletClient or publicClient if available
    const chain = (walletClient as any).chain ?? (publicClient as any).chain;
    const logger = LoggerFactory.getLogger(`${chain.name}::Tx`);

    const deployArgs: any = {
        abi: artifact.abi,
        bytecode: artifact.bytecode as `0x${string}`,
        args: constructorArgs,
    };
    if (chain) deployArgs.chain = chain;

    const txHash = await walletClient.deployContract(deployArgs);
    logger.info(`📤 Deploying ${(artifact && artifact.contractName) || 'Artifact'}: ${txHash} ...`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

    // Check transaction status - viem uses 'success' | 'reverted' for status
    if (receipt.status === 'reverted') {
        logger.info(`❌ Deployment reverted: ${txHash} ${receipt.blockNumber}`);
        throw new Error(`Contract deployment reverted: ${txHash}`);
    }

    const addr = receipt.contractAddress;
    if (!addr) {
        throw new Error(`Contract address not found in receipt for tx: ${txHash}`);
    }

    logger.info(`${(artifact && artifact.contractName) || 'Artifact'} deployed at: ${addr}`);
    return addr as string;
}

export type DeployBytecodeOptions = {
    abi: Abi;
    bytecode: string; // 0x prefixed
    constructorArgs?: any[];
    linkReferenceMap?: Record<string, string>;
    confirmations?: number;
};

export async function deployBytecode(
    publicClient: PublicClient,
    walletClient: WalletClient,
    opts: DeployBytecodeOptions
): Promise<string> {
    const { abi, bytecode, linkReferenceMap = {}, constructorArgs = [], confirmations = 2 } = opts;

    // extract chain from walletClient or publicClient if available
    const chain = (walletClient as any).chain ?? (publicClient as any).chain;
    const logger = LoggerFactory.getLogger(`${chain?.name || 'unknown'}::Tx`);

    // link bytecode if a linkReferenceMap was provided
    let linkedBytecode = bytecode;
    if (linkReferenceMap && Object.keys(linkReferenceMap).length > 0) {
        linkedBytecode = linkBytecode(bytecode as string, linkReferenceMap);
    }

    const deployArgs: any = {
        abi,
        bytecode: linkedBytecode as `0x${string}`,
        args: constructorArgs,
    };
    if (chain) deployArgs.chain = chain;

    const txHash = await walletClient.deployContract(deployArgs);
    logger.info(`📤 Deploying bytecode: ${txHash} ...`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

    // Check transaction status - viem uses 'success' | 'reverted' for status
    if (receipt.status === 'reverted') {
        logger.info(`❌ Deployment reverted: ${txHash} ${receipt.blockNumber}`);
        throw new Error(`Contract deployment reverted: ${txHash}`);
    }

    const addr = receipt.contractAddress;
    if (!addr) {
        throw new Error(`Contract address not found in receipt for tx: ${txHash}`);
    }

    logger.info(`Bytecode deployed at: ${addr}`);
    return addr as string;
}
