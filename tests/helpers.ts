import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../src/core/config.js';
export const fixture = () =>
  resolveConfig({
    project: {
      name: 'test-project',
      description: 'Un proyecto de prueba',
      purpose: 'Comprobar generación reproducible.',
    },
  });
export async function temporary() {
  const root = await mkdtemp(
    path.join(await realpath(os.tmpdir()), 'archkit-test-'),
  );
  return {
    root,
    target: path.join(root, 'project'),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
