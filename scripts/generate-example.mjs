import {
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateProject,
  loadConfig,
  newRecord,
  validateDocumentation,
} from '../dist/index.js';

const repository = fileURLToPath(new URL('../', import.meta.url));
const checking = process.argv.includes('--check');
const temporary = checking
  ? await mkdtemp(
      path.join(await realpath(os.tmpdir()), 'archkit-expensecore-'),
    )
  : undefined;
const destination = checking
  ? path.join(temporary, 'expensecore')
  : path.join(repository, 'examples/expensecore');
try {
  // The unmodified production generator validates its own output before any example-specific content.
  await generateProject(
    await loadConfig(path.join(repository, 'examples/expensecore.yaml')),
    destination,
  );
  const content = JSON.parse(
    await readFile(
      path.join(repository, 'examples/expensecore-content.json'),
      'utf8',
    ),
  );
  // These are explicit conceptual inputs, applied only to the newly generated, owned directory.
  for (const [file, body] of Object.entries(content)) {
    if (!/^\.docs\/[a-z0-9/-]+\.md$/.test(file) || file.includes('..'))
      throw new Error(`Unsafe example input: ${file}`);
    await writeFile(path.join(destination, file), body);
  }
  await newRecord(
    destination,
    'adr',
    'Adoptar arquitectura hexagonal y monolito modular',
  );
  await newRecord(
    destination,
    'rfc',
    'Proponer validación de movimientos y presupuestos',
  );
  const issues = await validateDocumentation(destination);
  if (issues.some((issue) => issue.severity === 'error'))
    throw new Error(JSON.stringify(issues, null, 2));
  if (checking) {
    const snapshot = async (directory, prefix = '') => {
      const files = {};
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory())
          Object.assign(
            files,
            await snapshot(path.join(directory, entry.name), relative),
          );
        else
          files[relative] = await readFile(
            path.join(directory, entry.name),
            'utf8',
          );
      }
      return files;
    };
    const expected = await snapshot(
      path.join(repository, 'examples/expensecore'),
    );
    const actual = await snapshot(destination);
    const names = [
      ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ];
    const changed = names.filter((name) => expected[name] !== actual[name]);
    if (changed.length)
      throw new Error(`ExpenseCore snapshot differs: ${changed.join(', ')}`);
  }
  console.log(
    `ExpenseCore generado y validado con el motor real: ${destination} (${issues.length} incidencias).`,
  );
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
