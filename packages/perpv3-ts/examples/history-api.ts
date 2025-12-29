import type { Address } from 'viem';
import { randomUUID } from 'crypto';
import {
	fetchPortfolioListFromApi,
	fetchFundingHistory,
	fetchLiquidityHistory,
	fetchOrdersHistory,
	fetchTradeHistory,
	fetchTransferHistory,
	fetchAccountBalanceHistory,
	HISTORY_RANGE,
} from '@synfutures/perpv3-ts/apis';
import 'dotenv/config';
import { ApiSign } from './sign';
import { PERP_EXPIRY } from '@synfutures/perpv3-ts';

const CHAIN_ID = 143;
const INSTRUMENT = '0x73ada1ea346cc3908f41cf67a040f0acd7808be0' as Address;
const USER_ADDRESS = '0xB0B81c2c7686c63acAE28F9778ca8Fa80f0C004b' as Address;

async function main(): Promise<void> {
	console.log('=== History API examples ===');
	const nonce = randomUUID();
	const signer = new ApiSign(nonce);
	try {
		const portfolioList = await fetchPortfolioListFromApi({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('portfolioList: ', portfolioList);

		const tradingHistory = await fetchTradeHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, instrumentAddress: INSTRUMENT, expiry: PERP_EXPIRY, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('tradingHistory with instrument: ', tradingHistory);

		const tradingHistoryWithoutInstrument = await fetchTradeHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('tradingHistory without instrument: ', tradingHistoryWithoutInstrument);

		const ordersHistory = await fetchOrdersHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, instrumentAddress: INSTRUMENT, expiry: PERP_EXPIRY, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('ordersHistory with instrument: ', ordersHistory);

		const ordersHistoryWithoutInstrument = await fetchOrdersHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('ordersHistory without instrument: ', ordersHistoryWithoutInstrument);

		const fundingHistory = await fetchFundingHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, instrumentAddress: INSTRUMENT, expiry: PERP_EXPIRY, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('fundingHistory with instrument: ', fundingHistory);

		const fundingHistoryWithoutInstrument = await fetchFundingHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('fundingHistory without instrument: ', fundingHistoryWithoutInstrument);

		const liquidityHistory = await fetchLiquidityHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, instrumentAddress: INSTRUMENT, expiry: PERP_EXPIRY, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('liquidityHistory with instrument: ', liquidityHistory);

		const liquidityHistoryWithoutInstrument = await fetchLiquidityHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('liquidityHistory without instrument: ', liquidityHistoryWithoutInstrument);

		const transferHistory = await fetchTransferHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, instrumentAddress: INSTRUMENT, expiry: PERP_EXPIRY, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('transferHistory with instrument: ', transferHistory);
		const transferHistoryWithoutInstrument = await fetchTransferHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS }, signer);
		console.log('transferHistory without instrument: ', transferHistoryWithoutInstrument);

		const accountBalanceHistory = await fetchAccountBalanceHistory({ chainId: CHAIN_ID, userAddress: USER_ADDRESS, timeRange: HISTORY_RANGE.ALL }, signer);
		console.log('accountBalanceHistory: ', accountBalanceHistory);

	} catch (error) {
		console.error('error : ', error);
	}
}

void main().catch((error) => {
	console.error(error);
	process.exit(1);
});
