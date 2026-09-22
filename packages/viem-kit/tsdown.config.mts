import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts', 'src/abis/index.ts', 'src/contracts/index.ts', 'src/utils/index.ts', 'src/node/index.ts'],
    outDir: 'dist',
    format: ['cjs', 'esm'],
    target: 'es2022',
    platform: 'neutral',
    deps: { neverBundle: [/^node:/, /^viem(?:\/|$)/, '@derivation-tech/viem-ledger'] },
    dts: false,
    clean: true,
    sourcemap: true,
    outputOptions: { sourcemapExcludeSources: true },
    outExtensions({ format }) {
        return { js: format === 'es' ? '.mjs' : '.cjs' };
    },
});
