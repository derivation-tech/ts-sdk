import { erc20Abi } from 'viem';
import type { TransactionParserMap, EventParserMap } from '../../src/parsers/types';

const transactionParsers = {
    transfer({ args }) {
        const [to, amount] = args;
        return `${to}:${amount}`;
    },
    approve({ args }) {
        const [spender, amount] = args;
        return `${spender}:${amount}`;
    },
} satisfies TransactionParserMap<typeof erc20Abi>;

const eventParsers = {
    Transfer({ args }) {
        return `${args.from}:${args.to}:${args.value}`;
    },
    Approval({ args }) {
        return `${args.owner}:${args.spender}:${args.value}`;
    },
} satisfies EventParserMap<typeof erc20Abi>;

void transactionParsers;
void eventParsers;

const invalidTransactionParsers = {
    // @ts-expect-error "notAFunction" is not part of erc20Abi write functions.
    notAFunction() {
        return 'bad';
    },
} satisfies TransactionParserMap<typeof erc20Abi>;

const invalidEventParsers = {
    Transfer({ args }) {
        // @ts-expect-error Transfer event args do not include owner.
        return args.owner;
    },
} satisfies EventParserMap<typeof erc20Abi>;

void invalidTransactionParsers;
void invalidEventParsers;
