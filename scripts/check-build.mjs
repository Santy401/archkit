import { chmod, readFile } from 'node:fs/promises';
const entry = new URL('../dist/cli/main.js', import.meta.url);
if (!(await readFile(entry, 'utf8')).startsWith('#!/usr/bin/env node\n'))
  throw new Error('Missing executable shebang.');
await chmod(entry, 0o755);
for (const asset of [
  'catalog.json',
  'architectures.json',
  'contract.md',
  'adr.md',
  'rfc.md',
])
  await readFile(new URL(`../blueprints/${asset}`, import.meta.url));
