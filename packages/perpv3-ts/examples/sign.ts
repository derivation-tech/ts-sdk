import type { ApiSigner, SignParams, SignResult } from '../src/apis/interfaces';

/**
 * this is a mock signer for the API examples
 */
export class ApiSign implements ApiSigner {
	constructor(private readonly _nonce: string) {}

	sign(params: SignParams): SignResult {
		// NOTE: This is a mock signature generation. 
		// In a real-world scenario, you would use the params and a secret key to generate a valid signature.
		return {
			'X-Api-Nonce': 'you should generate a nonce',
			'X-Api-Sign': 'you should generate a sign',
			'X-Api-Ts': Date.now(),
		};
	}
}