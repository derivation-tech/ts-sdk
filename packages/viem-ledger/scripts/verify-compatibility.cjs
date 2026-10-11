const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } = require('node:fs');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { dirname, join, resolve } = require('node:path');

const packageDir = resolve(__dirname, '..');
const manifest = require('../package.json');
const viemDir = process.argv[2] ? resolve(process.argv[2]) : dirname(require.resolve('viem/package.json'));
const viem = JSON.parse(readFileSync(join(viemDir, 'package.json'), 'utf8'));
assert.equal(viem.name, 'viem', 'Compatibility peer path must point to the viem package');
const temporary = mkdtempSync(join(tmpdir(), 'viem-ledger-compatibility-'));

try {
    // Copy the adapter and tests so both resolve the selected peer without changing the workspace install.
    for (const entry of ['dist', 'tests', 'package.json']) {
        cpSync(join(packageDir, entry), join(temporary, entry), { recursive: true });
    }
    for (const dependency of Object.keys(manifest.dependencies)) {
        const target = join(temporary, 'node_modules', dependency);
        mkdirSync(dirname(target), { recursive: true });
        symlinkSync(join(packageDir, 'node_modules', dependency), target, 'dir');
    }
    symlinkSync(viemDir, join(temporary, 'node_modules', 'viem'), 'dir');
    const consumerRequire = createRequire(join(temporary, 'package.json'));
    assert.equal(consumerRequire('viem/package.json').version, viem.version);
    const tests = readdirSync(join(temporary, 'tests'))
        .filter((file) => file.endsWith('.test.cjs'))
        .sort()
        .map((file) => join('tests', file));
    assert.ok(tests.length > 0, 'Expected Ledger compatibility tests');
    execFileSync(process.execPath, ['--test', ...tests], {
        cwd: temporary,
        env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
        stdio: 'inherit',
        timeout: 120_000,
    });
    console.log(`Ledger compatibility passed on Node ${process.versions.node} with viem ${viem.version}`);
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
