import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { log } from 'node:console';

const require = createRequire(import.meta.url);
const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(join(tmpdir(), 'viem-kit-consumer-'));
const consumer = join(temporary, 'consumer');
const env = {
    PATH: process.env.PATH,
    TMPDIR: process.env.TMPDIR,
    npm_config_cache: join(temporary, 'npm-cache'),
    npm_config_userconfig: '/dev/null',
};
const viemDir = process.argv[2] ? resolve(process.argv[2]) : dirname(require.resolve('viem/package.json'));
const viemPackage = JSON.parse(readFileSync(join(viemDir, 'package.json'), 'utf8'));
if (viemPackage.name !== 'viem') throw new Error('Consumer peer path must point to the viem package');

function run(command, args, cwd = consumer) {
    execFileSync(command, args, { cwd, env, stdio: 'inherit' });
}

try {
    // Build is an explicit prerequisite. Packing never runs release or package lifecycle hooks.
    const packed = JSON.parse(
        execFileSync('npm', ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', temporary], {
            cwd: packageDir,
            env,
            encoding: 'utf8',
        })
    );
    const artifact = Object.values(packed).find((entry) => entry.name === '@derivation-tech/viem-kit');
    if (!artifact || typeof artifact.filename !== 'string')
        throw new Error('npm pack did not return the viem-kit artifact');
    const packageInstall = join(consumer, 'node_modules', '@derivation-tech', 'viem-kit');
    mkdirSync(packageInstall, { recursive: true });
    run('tar', ['-xzf', join(temporary, artifact.filename), '-C', packageInstall, '--strip-components=1'], temporary);
    symlinkSync(viemDir, join(consumer, 'node_modules', 'viem'), 'dir');
    mkdirSync(join(consumer, 'node_modules', '@types'), { recursive: true });
    symlinkSync(
        dirname(require.resolve('@types/node/package.json')),
        join(consumer, 'node_modules', '@types', 'node'),
        'dir'
    );
    cpSync(join(packageDir, 'tests', 'consumer-package'), consumer, { recursive: true });
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));

    run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json']);
    run(process.execPath, ['--disallow-code-generation-from-strings', 'dist/index.mjs']);
    run(process.execPath, ['--disallow-code-generation-from-strings', 'index.cjs']);

    // Reuse the esbuild installation already owned by the pinned tsup toolchain.
    const tsupRequire = createRequire(require.resolve('tsup/package.json'));
    const { build } = tsupRequire('esbuild');
    const output = join(temporary, 'browser.cjs');
    const result = await build({
        entryPoints: [join(consumer, 'browser.mjs')],
        outfile: output,
        platform: 'browser',
        format: 'iife',
        bundle: true,
        metafile: true,
        target: 'es2022',
        logLevel: 'silent',
    });
    if (
        Object.keys(result.metafile.inputs).some(
            (input) => input.includes('viem-ledger') || input.includes('/dist/node/')
        )
    ) {
        throw new Error('Node tooling was included in the browser bundle');
    }
    run(process.execPath, ['--disallow-code-generation-from-strings', output]);
    log(
        `Packed consumer verification passed on Node ${process.versions.node} with viem ${viemPackage.version}: ESM, CJS, browser bundle, no Ledger installed`
    );
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
