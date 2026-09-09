import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/abis/index.ts', 'src/contracts/index.ts', 'src/utils/index.ts', 'src/node/index.ts'],
    outDir: 'dist',
    format: ['cjs', 'esm'],
    target: 'es2022',
    platform: 'neutral',
    external: ['node:*'],
    bundle: true,
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    outExtension({ format }) {
        return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
    esbuildOptions(options) {
        options.sourcesContent = false;
    },
});
