const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const registry = new URL(process.env.NPM_REGISTRY_URL);
if (
    !['http:', 'https:'].includes(registry.protocol) ||
    registry.username ||
    registry.password ||
    registry.search ||
    registry.hash
) {
    throw new Error('Expected a registry URL without credentials, query or fragment');
}
registry.pathname = registry.pathname.replace(/\/?$/, '/');
const content = `@derivation-tech:registry=${registry.href}\n//${registry.host}${registry.pathname}:_authToken=\${NODE_AUTH_TOKEN}\n`;
writeFileSync(join(process.env.RUNNER_TEMP, 'publish.npmrc'), content, { mode: 0o600 });
