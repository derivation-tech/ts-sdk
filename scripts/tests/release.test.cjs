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
        npm_config_userconfig: '/dev/null',
        npm_config_offline: 'true',
        npm_config_ignore_scripts: 'true',
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

for (const explicitMajor of [false, true]) {
    test(
        explicitMajor
            ? 'explicit breaking changes major-bump both packages'
            : 'Ledger major automatically patch-bumps its peer consumer',
        (t) => {
            const { cwd, run, rootVersion } = fixture(t);
            assert.match(run('pnpm', frozenInstall, 1), /ERR_PNPM_OUTDATED_LOCKFILE/);
            const summary = 'Release fixture: preserve "quotes", `code`, $values and 中文.\n\nExplain the migration.';
            const add = ['changeset', 'add', '--major', ledger, '--message', summary];
            if (explicitMajor) add.push('--major', core);
            run('pnpm', add);
            const changesets = readdirSync(join(cwd, '.changeset')).filter((file) => file.endsWith('.md'));
            assert.equal(changesets.length, 1);
            assert.ok(readFileSync(join(cwd, '.changeset', changesets[0]), 'utf8').includes(summary));
            run('pnpm', ['changeset', 'status', '--output', 'plan.json']);
            const releases = readJson(join(cwd, 'plan.json'))
                .releases.map(({ name, type, newVersion }) => ({ name, type, newVersion }))
                .sort((a, b) => a.name.localeCompare(b.name));
            assert.deepEqual(releases, [
                { name: core, type: explicitMajor ? 'major' : 'patch', newVersion: explicitMajor ? '2.0.0' : '1.2.4' },
                { name: ledger, type: 'major', newVersion: '2.0.0' },
            ]);

            // Exercise the same composed command used by the release workflow, including the real pnpm lock refresh.
            run('pnpm', ['run', 'release:version']);
            const consumer = readJson(join(cwd, packageFiles[1]));
            assert.equal(consumer.version, explicitMajor ? '2.0.0' : '1.2.4');
            assert.equal(consumer.peerDependencies[ledger], '^2.0.0');
            assert.equal(consumer.devDependencies[ledger], 'workspace:*');
            assert.equal(readJson(join(cwd, packageFiles[2])).version, '2.0.0');
            assert.equal(readJson(join(cwd, packageFiles[0])).version, rootVersion);
            assert.deepEqual(readdirSync(join(cwd, '.changeset')), ['config.json']);
            const changelogs = ['packages/viem-kit/CHANGELOG.md', 'packages/viem-ledger/CHANGELOG.md'];
            assert.ok(readFileSync(join(cwd, changelogs[1]), 'utf8').includes('Explain the migration.'));
            assert.ok(readFileSync(join(cwd, changelogs[0]), 'utf8').includes(explicitMajor ? '2.0.0' : '1.2.4'));
            run('pnpm', frozenInstall);

            // Make the lock stale again: an empty release must fail before the install step can repair it.
            const manifest = readJson(join(cwd, 'package.json'));
            delete manifest.devDependencies[ledger];
            writeJson(join(cwd, 'package.json'), manifest);
            const snapshot = () =>
                [...packageFiles, 'pnpm-lock.yaml', ...changelogs].map((file) => readFileSync(join(cwd, file), 'utf8'));
            const before = snapshot();
            assert.match(run('pnpm', ['run', 'release:version'], 1), /No unreleased changesets found/);
            assert.deepEqual(snapshot(), before, 'Empty version command must not mutate release files');
            assert.match(run('pnpm', frozenInstall, 1), /ERR_PNPM_OUTDATED_LOCKFILE/);
        }
    );
}
