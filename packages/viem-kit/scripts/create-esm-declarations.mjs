import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const entries = ['index', 'abis/index', 'contracts/index', 'utils/index', 'node/index'];

for (const entry of entries) {
    const outputPath = join('dist', `${entry}.d.mts`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `export * from './${basename(entry)}.js';\n`);
}
