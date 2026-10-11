import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { spawn, type ChildProcess } from 'node:child_process';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import type { Address, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { deployBytecode } from '../../src/node';
import { createContractParser } from '../../src/parsers/types';
import { decodeContractError } from '../../src/utils/contract-error';
import { batchSendLocalTransactions, defineWriteRequest, sendContractTransaction } from '../../src/utils/tx';

// Compiled from tests/anvil/Guarded.sol with solc 0.8.30, optimizer 200 runs.
const bytecode =
    '0x60a0604052348015600e575f5ffd5b503360805260805161018a6100305f395f81816078015260bd015261018a5ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c80633fa4f24514610043578063552410771461005e5780638da5cb5b14610073575b5f5ffd5b61004b5f5481565b6040519081526020015b60405180910390f35b61007161006c36600461013d565b6100b2565b005b61009a7f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b039091168152602001610055565b336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146101015760405163472511eb60e11b815233600482015260240160405180910390fd5b5f81905560405181815233907ff3f57717dff9f5f10af315efdbfadc60c42152c11fc0c3c413bbfbdc661f143c9060200160405180910390a250565b5f6020828403121561014d575f5ffd5b503591905056fea264697066735822122028f7443b39911c8401567e12bbcdae90a410de6ce2b954d2e6e8691ec7bb4b7964736f6c634300081e0033';
const abi = parseAbi([
    'constructor()',
    'error Unauthorized(address caller)',
    'event ValueSet(address indexed caller, uint256 value)',
    'function owner() view returns (address)',
    'function value() view returns (uint256)',
    'function setValue(uint256 next)',
]);
// anvil's default development accounts; they only hold funds on the local test node.
const owner = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const stranger = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

let anvil: ChildProcess;
let publicClient: PublicClient;
let ownerWallet: WalletClient;
let strangerWallet: WalletClient;
let guarded: Address;

async function startAnvil(): Promise<string> {
    anvil = spawn('anvil', ['--port', '0'], { stdio: ['ignore', 'pipe', 'inherit'] });
    return new Promise((resolve, reject) => {
        anvil.once('error', reject);
        anvil.once('exit', (code) => reject(new Error(`anvil exited with code ${code}`)));
        let output = '';
        anvil.stdout!.on('data', (chunk: Buffer) => {
            output += chunk.toString();
            const listening = /Listening on (\S+)/.exec(output);
            if (listening) resolve(`http://${listening[1]}`);
        });
    });
}

beforeAll(async () => {
    const transport = http(await startAnvil());
    publicClient = createPublicClient({ chain: foundry, transport, pollingInterval: 50 });
    ownerWallet = createWalletClient({ chain: foundry, account: owner, transport });
    strangerWallet = createWalletClient({ chain: foundry, account: stranger, transport });
    guarded = await deployBytecode(publicClient, ownerWallet, {
        abi,
        bytecode,
        silent: true,
        wait: { confirmations: 1 },
    });
});

afterAll(() => {
    anvil?.kill();
});

describe('transactions against anvil', () => {
    test('sends a write and reports parsed events', async () => {
        const events: string[] = [];
        const parser = createContractParser({
            abi,
            events: { ValueSet: ({ args }) => `ValueSet(${args.caller}, ${args.value})` },
        });
        const sent = await sendContractTransaction(
            { publicClient, walletClient: ownerWallet },
            { address: guarded, abi, functionName: 'setValue', args: [7n], parser },
            { silent: true, hooks: { onEvent: ({ description }) => void events.push(description) } }
        );

        expect((await sent.receipt).status).toBe('success');
        await expect(sent.diagnostics).resolves.toEqual({ transaction: 'completed', receipt: 'completed' });
        expect(events).toEqual([`ValueSet(${owner.address}, 7)`]);
        await expect(publicClient.readContract({ address: guarded, abi, functionName: 'value' })).resolves.toBe(7n);
    });

    test('rejects a reverting write before broadcast with the decoded custom error', async () => {
        const thrown = await sendContractTransaction(
            { publicClient, walletClient: strangerWallet },
            { address: guarded, abi, functionName: 'setValue', args: [1n] },
            { silent: true }
        ).catch((error: unknown) => error);

        expect(thrown).toMatchObject({ phase: 'prepare', outcome: 'not-sent' });
        expect(decodeContractError(thrown, abi)).toMatchObject({
            kind: 'custom',
            name: 'Unauthorized',
            args: [stranger.address],
        });
    });

    test('diagnoses a mined revert from its receipt', async () => {
        let reverted: unknown;
        const sent = await sendContractTransaction(
            { publicClient, walletClient: strangerWallet },
            // An explicit gas limit skips estimation, so the revert happens on chain.
            { address: guarded, abi, functionName: 'setValue', args: [1n], gas: 100_000n },
            { silent: true, hooks: { onReverted: (event) => void (reverted = event) } }
        );

        expect((await sent.receipt).status).toBe('reverted');
        await sent.diagnostics;
        expect(reverted).toMatchObject({ error: { kind: 'custom', name: 'Unauthorized' } });
    });

    test('allocates consecutive nonces in a local batch', async () => {
        const nonce = await publicClient.getTransactionCount({ address: owner.address, blockTag: 'pending' });
        const request = (next: bigint) =>
            defineWriteRequest({ address: guarded, abi, functionName: 'setValue', args: [next] });
        const results = await batchSendLocalTransactions(publicClient, [
            { walletClient: ownerWallet, request: request(10n) },
            { walletClient: ownerWallet, request: request(11n) },
        ]);

        expect(results.map(({ receipt }) => receipt.status)).toEqual(['success', 'success']);
        const transactions = await Promise.all(results.map(({ hash }) => publicClient.getTransaction({ hash })));
        expect(transactions.map((transaction) => transaction.nonce)).toEqual([nonce, nonce + 1]);
        await expect(publicClient.readContract({ address: guarded, abi, functionName: 'value' })).resolves.toBe(11n);
    });
});
