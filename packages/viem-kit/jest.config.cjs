/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js'],
    moduleNameMapper: {
        '^@synfutures/viem-ledger$': '<rootDir>/../viem-ledger/dist',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
    },
};
