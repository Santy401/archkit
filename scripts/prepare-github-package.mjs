import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2]) throw new Error('Provide a new output directory.');
const destination = path.resolve(process.argv[2]);
const manifest = JSON.parse(
  await readFile(path.join(repository, 'package.json'), 'utf8'),
);
if (manifest.name !== 'create-archkit')
  throw new Error('Unexpected source package name.');
await mkdir(destination); // Exclusive: never modify an existing directory.
for (const file of manifest.files)
  await cp(path.join(repository, file), path.join(destination, file), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
manifest.name = '@santy401/create-archkit';
manifest.publishConfig = {
  registry: 'https://npm.pkg.github.com',
  access: 'public',
  provenance: false,
};
delete manifest.scripts;
delete manifest.devDependencies;
await writeFile(
  path.join(destination, 'package.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  { flag: 'wx' },
);
console.log(destination);
