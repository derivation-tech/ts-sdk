const eslint = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const typescript = require('typescript-eslint');

module.exports = [
    {
        ignores: [
            '**/dist/**',
            '**/coverage/**',
            '.nx/**',
            '.worktrees/**',
            '**/jest.config.*',
            '**/eslint.config.*',
            'templates',
            '**/*.d.ts',
        ],
    },
    eslint.configs.recommended,
    ...typescript.configs.recommended,
    {
        rules: {
            'no-empty': 'off',
            'no-console': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        files: ['packages/viem-kit/src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    {
        files: ['scripts/**/*.{js,cjs,mjs}'],
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly',
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
            },
        },
    },
    // prettier should be the last config because it disables all formatting rules
    prettier,
];
