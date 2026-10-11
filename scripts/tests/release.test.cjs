const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, resolve } = require('node:path');
const { test } = require('node:test');

const workspace = resolve(__dirname, '../..');
const core = '@derivation-tech/viem-kit';
const ledger = '@derivation-tech/viem-ledger';
const packageFiles = ['package.json', 'packages/viem-kit/package.json', 'packages/viem-ledger/package.json'];
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 4) + '\n');

function fixture(t) {
    const cwd = mkdtempSync(join(tmpdir(), 'changesets-release-'));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    // Copy only release inputs. Never copy the checkout's Git metadata, credentials or pending changesets.
    for (const file of [...packageFiles, 'pnpm-workspace.yaml', '.changeset/config.json']) {
        mkdirSync(dirname(join(cwd, file)), { recursive: true });
        copyFileSync(join(workspace, file), join(cwd, file));
    }
    symlinkSync(join(workspace, 'node_modules'), join(cwd, 'node_modules'), 'dir');
    // Preserve the real internal dependency graph and release scripts, but omit registry dependencies.
    // This exercises pnpm itself without requiring downloaded packages or registry metadata in its cache.
    for (const file of packageFiles) {
        const manifest = readJson(join(cwd, file));
        // Use the executing CLI; a packageManager pin would resolve pnpm itself from the registry.
        delete manifest.packageManager;
        for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            if (manifest[field]) {
                manifest[field] = Object.fromEntries(
                    Object.entries(manifest[field]).filter(([name]) => [core, ledger].includes(name))
                );
            }
        }
        if (!manifest.private) manifest.version = '1.2.3';
        if (manifest.name === core) manifest.peerDependencies[ledger] = '^1.2.3';
        writeJson(join(cwd, file), manifest);
    }
    const rootManifest = readJson(join(cwd, 'package.json'));
    const env = {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        HOME: cwd,
        CI: 'true',
        // This fixture intentionally changes manifests and shares only the installed CLI.
        pnpm_config_verify_deps_before_run: 'false',
        PNPM_CONFIG_NPMRC_AUTH_FILE: '/dev/null',
        pnpm_config_offline: 'true',
        pnpm_config_ignore_scripts: 'true',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
    };
    function run(command, args, expectedStatus = 0) {
        const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 120_000 });
        assert.ifError(result.error);
        assert.equal(result.status, expectedStatus, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
        return result.stdout + result.stderr;
    }
    run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile', '--offline', '--ignore-scripts']);
    // Make one importer stale so release:version must execute its lock refresh.
    assert.equal(rootManifest.devDependencies[ledger], undefined);
    rootManifest.devDependencies[ledger] = 'workspace:*';
    writeJson(join(cwd, 'package.json'), rootManifest);
    writeFileSync(join(cwd, '.gitignore'), 'node_modules/\n');
    const baseBranch = readJson(join(cwd, '.changeset/config.json')).baseBranch;
    run('git', ['init', '--initial-branch', baseBranch]);
    run('git', ['add', '.']);
    run('git', [
        '-c',
        'user.name=Release fixture',
        '-c',
        'user.email=release@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-m',
        'Release fixture',
    ]);
    return { cwd, run, rootVersion: rootManifest.version };
}

const frozenInstall = ['install', '--lockfile-only', '--frozen-lockfile', '--offline', '--ignore-scripts'];

// Exercises the repository's changeset dependency policy and the composed release:version lock refresh.
test('a Ledger major patch-bumps its peer consumer and refreshes the lockfile', (t) => {
    const { cwd, run, rootVersion } = fixture(t);
    assert.match(run('pnpm', frozenInstall, 1), /ERR_PNPM_OUTDATED_LOCKFILE/);
    run('pnpm', ['changeset', 'add', '--major', ledger, '--message', 'Explain the migration.']);
    run('pnpm', ['run', 'release:version']);

    const consumer = readJson(join(cwd, packageFiles[1]));
    assert.equal(consumer.version, '1.2.4');
    assert.equal(consumer.peerDependencies[ledger], '^2.0.0');
    assert.equal(consumer.devDependencies[ledger], 'workspace:*');
    assert.equal(readJson(join(cwd, packageFiles[2])).version, '2.0.0');
    assert.equal(readJson(join(cwd, packageFiles[0])).version, rootVersion);
    assert.deepEqual(readdirSync(join(cwd, '.changeset')), ['config.json']);
    assert.ok(readFileSync(join(cwd, 'packages/viem-ledger/CHANGELOG.md'), 'utf8').includes('Explain the migration.'));
    run('pnpm', frozenInstall);
});
