import type { Address } from 'viem';
import { randomUUID } from 'crypto';
import {
	fetchFuturesInstrument,
	fetchFuturesPairOrderBook,
	fetchMarketPairList,
	fetchTokenPriceMapFromApi,
} from '../src/apis';
import 'dotenv/config';
import { ApiSign } from './sign';
import { PERP_EXPIRY } from '../src';

const CHAIN_ID = 143;
const INSTRUMENT = '0x73ada1ea346cc3908f41cf67a040f0acd7808be0' as Address;
const USER_ADDRESS = '0xB0B81c2c7686c63acAE28F9778ca8Fa80f0C004b' as Address;

async function main(): Promise<void> {
	console.log('=== Market API examples ===');
	const nonce = randomUUID();
	const signer = new ApiSign(nonce);
	try {
		const futuresInstrument = await fetchFuturesInstrument({ chainId: CHAIN_ID, address: INSTRUMENT }, signer);
		console.log('futuresInstrument : ', futuresInstrument);
		const futuresPairOrderBook = await fetchFuturesPairOrderBook({ chainId: CHAIN_ID, address: INSTRUMENT, expiry: PERP_EXPIRY }, signer);
		console.log('futuresPairOrderBook : ', futuresPairOrderBook);

		const marketList = await fetchMarketPairList({ chainId: CHAIN_ID }, signer);
		console.log('marketList : ', marketList);

		const tokenPriceMap = await fetchTokenPriceMapFromApi({ chainId: CHAIN_ID }, signer);
		console.log('tokenPriceMap : ', tokenPriceMap);
	} catch (error) {
		console.error('error : ', error);
	}
}

void main().catch((error) => {
	console.error(error);
	process.exit(1);
});
