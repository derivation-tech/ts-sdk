const assert = require('node:assert/strict');
const { execFile, spawnSync } = require('node:child_process');
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
const { createServer } = require('node:http');
const { promisify } = require('node:util');

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
    return { cwd, run, env, rootVersion: rootManifest.version };
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

test('publish auth config routes the scope and sends its token only to the matching registry path', async (t) => {
    const { cwd, env } = fixture(t);
    const requests = [];
    const server = createServer((request, response) => {
        const received = { method: request.method, url: request.url, authorization: request.headers.authorization };
        requests.push(received);
        if (request.method === 'PUT') {
            let body = '';
            request.setEncoding('utf8');
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', () => {
                received.body = JSON.parse(body);
                response.writeHead(201, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ ok: true }));
            });
            return;
        }
        const name = request.url.startsWith('/private/') ? '@derivation-tech/auth-fixture' : 'public-fixture';
        response.setHeader('Content-Type', 'application/json');
        response.end(
            JSON.stringify({
                name,
                'dist-tags': { latest: '1.0.0' },
                time: { '1.0.0': '2020-01-01T00:00:00.000Z' },
                versions: {
                    '1.0.0': { name, version: '1.0.0', dist: { tarball: 'https://example.invalid/fixture.tgz' } },
                },
            })
        );
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const execute = promisify(execFile);
    await execute(process.execPath, [join(workspace, 'scripts/write-publish-config.cjs')], {
        cwd,
        env: { ...env, RUNNER_TEMP: cwd, NPM_REGISTRY_URL: `${origin}/private/` },
    });
    const config = join(cwd, 'publish.npmrc');
    assert.ok(readFileSync(config, 'utf8').includes('${NODE_AUTH_TOKEN}'));
    // Exercise the pnpm 12 selector and the retained npm-compatible selector independently.
    for (const selector of ['PNPM_CONFIG_NPMRC_AUTH_FILE', 'NPM_CONFIG_USERCONFIG']) {
        const authEnv = {
            ...env,
            PNPM_CONFIG_NPMRC_AUTH_FILE: undefined,
            [selector]: config,
            NODE_AUTH_TOKEN: 'local-fixture-token',
            pnpm_config_offline: 'false',
        };
        const { stdout } = await execute('pnpm', ['view', '@derivation-tech/auth-fixture', 'version', '--json'], {
            cwd,
            env: authEnv,
            timeout: 20_000,
        });
        assert.equal(JSON.parse(stdout), '1.0.0');
        await execute('pnpm', ['view', 'public-fixture', 'version', '--json', '--registry', `${origin}/public/`], {
            cwd,
            env: authEnv,
            timeout: 20_000,
        });
    }
    // Publish only an artificial package to this loopback server; no real registry or secrets are used.
    const publishDir = mkdtempSync(join(tmpdir(), 'pnpm-publish-fixture-'));
    t.after(() => rmSync(publishDir, { recursive: true, force: true }));
    writeJson(join(publishDir, 'package.json'), {
        name: '@derivation-tech/auth-fixture',
        version: '1.0.0',
        files: ['index.js'],
    });
    writeFileSync(join(publishDir, 'index.js'), 'module.exports = {};\n');
    await execute('pnpm', ['publish', '--no-git-checks', '--access', 'restricted', '--tag', 'migration-test'], {
        cwd: publishDir,
        env: {
            ...env,
            PNPM_CONFIG_NPMRC_AUTH_FILE: config,
            NPM_CONFIG_USERCONFIG: config,
            NODE_AUTH_TOKEN: 'local-fixture-token',
            pnpm_config_offline: 'false',
        },
        timeout: 20_000,
    });
    const privateRequests = requests.filter(({ url }) => url.startsWith('/private/'));
    const publicRequests = requests.filter(({ url }) => url.startsWith('/public/'));
    assert.equal(privateRequests.length, 3);
    assert.equal(publicRequests.length, 2);
    assert.ok(privateRequests.every(({ authorization }) => authorization === 'Bearer local-fixture-token'));
    assert.ok(publicRequests.every(({ authorization }) => authorization === undefined));
    const publications = privateRequests.filter(({ method }) => method === 'PUT');
    assert.equal(publications.length, 1);
    assert.equal(publications[0].body['dist-tags']['migration-test'], '1.0.0');
    assert.equal(publications[0].body.access, 'restricted');
    assert.ok(Object.keys(publications[0].body._attachments).some((name) => name.endsWith('.tgz')));
});
