/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/{unit,anvil}/**/*.test.ts'],
    restoreMocks: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
    moduleFileExtensions: ['ts', 'js'],
    moduleNameMapper: {
        '^@derivation-tech/viem-ledger$': '<rootDir>/../viem-ledger/dist',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
    },
};
