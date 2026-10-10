import type { Hex, WalletClient } from 'viem';
import { concatHex, encodeFunctionData } from 'viem';
import type { RuntimeWriteRequest } from './types';

/**
 * Encode the calldata exactly as it will be submitted. Follows viem's suffix rule: the request suffix
 * (including an explicit `0x`) takes precedence over the wallet client's default `dataSuffix`.
 */
export function encodeRuntimeWriteRequestData(
    request: RuntimeWriteRequest,
    walletClient: Pick<WalletClient, 'dataSuffix'>
): Hex {
    const data = encodeFunctionData({
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
    } as Parameters<typeof encodeFunctionData>[0]);

    const clientSuffix =
        typeof walletClient.dataSuffix === 'string' ? walletClient.dataSuffix : walletClient.dataSuffix?.value;
    const suffix = request.dataSuffix ?? clientSuffix;
    return suffix ? concatHex([data, suffix]) : data;
}
