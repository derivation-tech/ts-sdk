import type { Hex } from 'viem';
import { concatHex, encodeFunctionData } from 'viem';
import type { RuntimeWriteRequest } from './types';

export function encodeRuntimeWriteRequestData(request: RuntimeWriteRequest): Hex {
    const data = encodeFunctionData({
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
    } as Parameters<typeof encodeFunctionData>[0]);

    return request.dataSuffix ? concatHex([data, request.dataSuffix]) : data;
}
