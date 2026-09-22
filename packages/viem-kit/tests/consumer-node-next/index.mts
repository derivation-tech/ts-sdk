import { sendContractTransaction } from '@derivation-tech/viem-kit';
import { WETH_ABI } from '@derivation-tech/viem-kit/abis';
import * as contracts from '@derivation-tech/viem-kit/contracts';
import { decodeContractError } from '@derivation-tech/viem-kit/utils';

void sendContractTransaction;
void WETH_ABI;
void contracts;
void decodeContractError;

import { getAccount, ArtifactHelper } from '@derivation-tech/viem-kit/node';
void getAccount;
void ArtifactHelper;

// @ts-expect-error Internal implementation paths are not public package exports.
type InternalDiagnostics = typeof import('@derivation-tech/viem-kit/utils/tx/diagnostics');
