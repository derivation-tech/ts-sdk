import { encodeDeployData } from 'viem';
import type { Abi, Address, Hash, Hex, PublicClient, TransactionRequest, WalletClient } from 'viem';
import { loadArtifact, linkBytecode, type Artifact } from './artifact-helper';
import { LoggerFactory } from '../utils/logger';
import { resolveTxExecutionContext } from '../utils/tx/context';
import { safeNotifyLifecycleHook } from '../utils/tx/hooks';
import { assertTransactionSuccess, waitForTransactionOutcome } from '../utils/tx/outcome';
import { submitTransaction } from '../utils/tx/submission';
import type { SendTransactionOptions } from '../utils/tx/types';

export type DeploymentTransactionOverrides = Pick<
    TransactionRequest,
    'gas' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'nonce' | 'value'
>;

type DeploymentExecutionOptions = SendTransactionOptions & {
    transaction?: DeploymentTransactionOverrides;
    /** Defaults to 2. wait.confirmations takes precedence when supplied. */
    confirmations?: number;
};

export type DeployOptions = DeploymentExecutionOptions & {
    artifact: string | Artifact;
    constructorArgs?: readonly unknown[];
    linkReferenceMap?: Record<string, string>;
};

export type DeployBytecodeOptions = DeploymentExecutionOptions & {
    abi: Abi;
    bytecode: string;
    constructorArgs?: readonly unknown[];
    linkReferenceMap?: Record<string, string>;
};

type DeployRequest = { abi: Abi; bytecode: Hex; args: readonly unknown[] };

async function deploy(
    publicClient: PublicClient,
    walletClient: WalletClient,
    request: DeployRequest,
    options: DeploymentExecutionOptions,
    label: string
): Promise<Address> {
    const { account, chain } = resolveTxExecutionContext({ publicClient, walletClient }, undefined, undefined);
    const data = encodeDeployData(request);
    const transaction = { ...options.transaction };
    const log = (hash: Hash, message: string) => {
        if (options.silent) return;
        safeNotifyLifecycleHook(options.hooks, 'log', hash, () =>
            LoggerFactory.getLogger(`${chain?.name ?? 'unknown'}::Tx`).info(message)
        );
    };

    const hash = await submitTransaction(walletClient, {
        ...transaction,
        account,
        chain,
        to: null,
        data,
    } as Parameters<typeof submitTransaction>[1]);
    log(hash, `Deploying ${label}: ${hash} ...`);
    safeNotifyLifecycleHook(options.hooks, 'sent', hash, () =>
        options.hooks?.onSent?.({ hash, description: `Deploy ${label}` })
    );

    const receipt = await waitForTransactionOutcome(publicClient, hash, {
        ...options,
        wait: { confirmations: options.confirmations ?? 2, ...options.wait },
    });
    if (receipt.status === 'reverted') {
        safeNotifyLifecycleHook(options.hooks, 'reverted', receipt.transactionHash, () =>
            options.hooks?.onReverted?.({ hash: receipt.transactionHash, submittedHash: hash, receipt })
        );
    }
    assertTransactionSuccess(receipt);
    if (!receipt.contractAddress) {
        throw new Error(`Contract address not found in receipt for tx: ${receipt.transactionHash}`, { cause: receipt });
    }
    log(receipt.transactionHash, `${label} deployed at: ${receipt.contractAddress}`);
    return receipt.contractAddress;
}

export async function deployArtifact(
    publicClient: PublicClient,
    walletClient: WalletClient,
    options: DeployOptions
): Promise<Address> {
    const { artifact: input, constructorArgs = [], linkReferenceMap = {} } = options;
    const artifact = typeof input === 'string' ? loadArtifact(input, linkReferenceMap) : input;
    return deploy(
        publicClient,
        walletClient,
        {
            abi: artifact.abi,
            bytecode: linkBytecode(artifact.bytecode, linkReferenceMap) as Hex,
            args: constructorArgs,
        },
        options,
        artifact.contractName ?? 'Artifact'
    );
}

export async function deployBytecode(
    publicClient: PublicClient,
    walletClient: WalletClient,
    options: DeployBytecodeOptions
): Promise<Address> {
    const { abi, bytecode, constructorArgs = [], linkReferenceMap = {} } = options;
    const linkedBytecode = linkBytecode(bytecode, linkReferenceMap);
    return deploy(
        publicClient,
        walletClient,
        { abi, bytecode: linkedBytecode as Hex, args: constructorArgs },
        options,
        'bytecode'
    );
}
