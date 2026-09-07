import type { Abi, Hex } from 'viem';
import { concatHex, encodeFunctionData } from 'viem';
import type { RuntimeWriteRequest, TypedWriteRequest, WriteFunctionName } from './types';

export function encodeRuntimeWriteRequestData(request: RuntimeWriteRequest): Hex {
    const data = encodeFunctionData({
        abi: request.abi,
        functionName: request.functionName,
        ...(request.args !== undefined ? { args: request.args } : {}),
    } as Parameters<typeof encodeFunctionData>[0]);

    return request.dataSuffix ? concatHex([data, request.dataSuffix]) : data;
}

export function encodeWriteRequestData<TAbi extends Abi, TFunctionName extends WriteFunctionName<TAbi>>(
    request: TypedWriteRequest<TAbi, TFunctionName>
): Hex {
    return encodeRuntimeWriteRequestData(request as unknown as RuntimeWriteRequest);
}
