import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(
  path.join(await realpath(os.tmpdir()), 'archkit-package-'),
);
const run = (command, args, cwd = repository) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    // Windows package-manager launchers are .cmd files. All arguments are local, controlled paths.
    shell: process.platform === 'win32',
    env: { ...process.env, CI: 'true' },
  });
try {
  const output = JSON.parse(
    run('npm', [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      temp,
    ]),
  );
  const packed = Array.isArray(output) ? output[0] : Object.values(output)[0];
  assert.ok(packed, 'npm pack did not return a package');
  const names = packed.files.map((entry) => entry.path);
  for (const name of [
    'dist/cli/main.js',
    'dist/index.js',
    'blueprints/catalog.json',
    'blueprints/adr.md',
    'blueprints/rfc.md',
    'LICENSE',
  ])
    assert.ok(names.includes(name), `Missing ${name}`);
  assert.ok(
    names.every((name) =>
      /^(dist\/|blueprints\/|package.json$|README.md$|CHANGELOG.md$|LICENSE$)/.test(
        name,
      ),
    ),
    'Unexpected distributed files',
  );
  const tarball = path.join(temp, packed.filename);
  await writeFile(
    path.join(temp, 'package.json'),
    JSON.stringify({
      private: true,
      dependencies: { 'create-archkit': `file:${tarball}` },
    }),
  );
  run(
    'pnpm',
    ['install', '--offline', '--ignore-scripts', '--no-frozen-lockfile'],
    temp,
  );
  const installed = path.join(
    temp,
    'node_modules/create-archkit/dist/cli/main.js',
  );
  assert.ok(
    (await readFile(installed, 'utf8')).startsWith('#!/usr/bin/env node\n'),
  );
  assert.equal(
    run(process.execPath, [installed, '--version'], temp).trim(),
    '0.1.0',
  );
  const destination = path.join(temp, 'generated project');
  run(
    process.execPath,
    [
      installed,
      'init',
      'packed-project',
      '--description',
      'Paquete instalado fuera del repositorio',
      '--non-interactive',
      '--yes',
      '--output',
      destination,
    ],
    temp,
  );
  run(
    process.execPath,
    [installed, 'adr', 'new', 'Desde el paquete', '--project', destination],
    temp,
  );
  run(
    process.execPath,
    [installed, 'rfc', 'new', 'Desde el paquete', '--project', destination],
    temp,
  );
  assert.equal(
    JSON.parse(
      run(
        process.execPath,
        [installed, 'validate', '--project', destination, '--format', 'json'],
        temp,
      ),
    ).valid,
    true,
  );
  // Exercise the installed executable shim, rather than only calling the JS file directly.
  assert.match(run('pnpm', ['exec', 'archkit', '--help'], temp), /init/);
  assert.equal(
    run(
      'npx',
      ['--offline', '--no-install', 'archkit', '--version'],
      temp,
    ).trim(),
    '0.1.0',
  );
  console.log(
    `Paquete verificado: ${packed.filename}; ${names.length} archivos; instalación offline, ejecutable, generación, ADR/RFC y validación fuera del repositorio.`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
