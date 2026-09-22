const { defineConfig, globalIgnores } = require('eslint/config');
const eslint = require('@eslint/js');
const typescript = require('typescript-eslint');
const prettier = require('eslint-config-prettier/flat');
const globals = require('globals');

module.exports = defineConfig(
    globalIgnores(['**/dist/**', '**/coverage/**', '.worktrees/**', 'templates/**', '**/*.d.{ts,cts,mts}']),
    {
        files: ['**/*.{js,cjs,mjs}'],
        extends: [eslint.configs.recommended],
    },
    {
        files: ['**/*.cjs', '**/*.config.js', 'scripts/**/*.{js,cjs,mjs}', 'packages/*/scripts/**/*.{js,cjs,mjs}'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['**/*.{ts,cts,mts}'],
        extends: [eslint.configs.recommended, typescript.configs.recommended],
        rules: {
            'no-empty': ['error', { allowEmptyCatch: true }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['packages/*/src/**/*.ts'],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: __dirname },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
        },
    },
    {
        // Keep the core's existing boundary and apply it to the examples users copy.
        files: ['packages/viem-kit/src/**/*.ts', 'packages/viem-kit/examples/**/*.ts'],
        rules: { '@typescript-eslint/no-explicit-any': 'error' },
    },
    {
        files: ['packages/*/tests/typecheck/**/*.ts', 'packages/*/tests/consumer-node-next/*.{cts,mts}'],
        rules: { '@typescript-eslint/no-unused-vars': 'off' },
    },
    // Formatting belongs to Prettier; disable conflicting lint rules last.
    prettier
);
