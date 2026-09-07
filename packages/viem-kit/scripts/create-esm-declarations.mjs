import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const entries = ['index', 'abis/index', 'chains/index', 'contracts/index', 'utils/index'];

for (const entry of entries) {
    const outputPath = join('dist', `${entry}.d.mts`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `export * from './${basename(entry)}.js';\n`);
}
