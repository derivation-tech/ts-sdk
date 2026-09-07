import fs from 'fs';
import path from 'path';
import type { Abi, Chain, Hex, PublicClient, WalletClient } from 'viem';
import { loadArtifact, linkBytecode, type Artifact } from './artifact-helper';
import { LoggerFactory } from './logger';

export type DeployOptions = {
    artifact: string | Artifact;
    constructorArgs?: readonly unknown[];
    linkReferenceMap?: Record<string, string>;
    confirmations?: number;
};

export type DeployBytecodeOptions = {
    abi: Abi;
    bytecode: string;
    constructorArgs?: readonly unknown[];
    linkReferenceMap?: Record<string, string>;
    confirmations?: number;
};

type DeployRequest = {
    abi: Abi;
    bytecode: Hex;
    args: readonly unknown[];
    chain?: Chain;
};

function resolveClientChain(publicClient: PublicClient, walletClient: WalletClient): Chain | undefined {
    return walletClient.chain ?? publicClient.chain;
}

function resolveArtifact(
    artifactPathOrObject: string | Artifact,
    linkReferenceMap: Record<string, string>
): Artifact {
    if (typeof artifactPathOrObject !== 'string') return artifactPathOrObject;

    try {
        const possiblePath = path.isAbsolute(artifactPathOrObject)
            ? artifactPathOrObject
            : path.resolve(process.cwd(), artifactPathOrObject);
        if (fs.existsSync(possiblePath)) {
            return loadArtifact(possiblePath, linkReferenceMap);
        }
        return loadArtifact(artifactPathOrObject, linkReferenceMap);
    } catch {
        return loadArtifact(artifactPathOrObject, linkReferenceMap);
    }
}

async function deploy(
    publicClient: PublicClient,
    walletClient: WalletClient,
    request: DeployRequest,
    confirmations: number,
    label: string
): Promise<string> {
    const chain = request.chain ?? resolveClientChain(publicClient, walletClient);
    const logger = LoggerFactory.getLogger(`${chain?.name ?? 'unknown'}::Tx`);
    const deployRequest = chain ? { ...request, chain } : request;

    const txHash = await walletClient.deployContract(
        deployRequest as Parameters<WalletClient['deployContract']>[0]
    );
    logger.info(`Deploying ${label}: ${txHash} ...`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });
    if (receipt.status === 'reverted') {
        logger.info(`Deployment reverted: ${txHash} ${receipt.blockNumber}`);
        throw new Error(`Contract deployment reverted: ${txHash}`);
    }

    const address = receipt.contractAddress;
    if (!address) {
        throw new Error(`Contract address not found in receipt for tx: ${txHash}`);
    }

    logger.info(`${label} deployed at: ${address}`);
    return address;
}

export async function deployArtifact(
    publicClient: PublicClient,
    walletClient: WalletClient,
    opts: DeployOptions
): Promise<string> {
    const { artifact: artifactPathOrObject, constructorArgs = [], linkReferenceMap = {}, confirmations = 2 } = opts;
    const artifact = resolveArtifact(artifactPathOrObject, linkReferenceMap);

    return deploy(
        publicClient,
        walletClient,
        {
            abi: artifact.abi as Abi,
            bytecode: artifact.bytecode as Hex,
            args: constructorArgs,
        },
        confirmations,
        artifact.contractName ?? 'Artifact'
    );
}

export async function deployBytecode(
    publicClient: PublicClient,
    walletClient: WalletClient,
    opts: DeployBytecodeOptions
): Promise<string> {
    const { abi, bytecode, linkReferenceMap = {}, constructorArgs = [], confirmations = 2 } = opts;
    const linkedBytecode =
        Object.keys(linkReferenceMap).length > 0 ? linkBytecode(bytecode, linkReferenceMap) : bytecode;

    return deploy(
        publicClient,
        walletClient,
        {
            abi,
            bytecode: linkedBytecode as Hex,
            args: constructorArgs,
        },
        confirmations,
        'bytecode'
    );
}
