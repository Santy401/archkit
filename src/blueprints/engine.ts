import path from 'node:path';
import {
  mkdir,
  mkdtemp,
  writeFile,
  rename,
  rm,
  readdir,
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists, rejectSymlinks, safePath } from './paths.js';

export interface PlannedFile {
  path: string;
  content: string;
}
export interface GenerationPlan {
  files: PlannedFile[];
  operations: 'git-init'[];
}
export function checkPlan(plan: GenerationPlan): void {
  const names = new Set<string>();
  for (const file of plan.files) {
    safePath(path.resolve('plan'), file.path);
    const key = file.path.toLowerCase();
    if (names.has(key))
      throw new Error(`Archivo duplicado en el plan: ${file.path}`);
    names.add(key);
  }
  for (const name of names)
    for (const other of names) {
      if (name !== other && other.startsWith(`${name}/`))
        throw new Error(`Conflicto archivo/directorio: ${name}`);
    }
}
export async function executePlan(
  plan: GenerationPlan,
  destination: string,
  options: {
    signal?: AbortSignal;
    verify?: (root: string) => Promise<void>;
  } = {},
): Promise<string[]> {
  checkPlan(plan);
  options.signal?.throwIfAborted();
  const target = path.resolve(destination);
  await rejectSymlinks(target);
  if (await exists(target))
    throw new Error(
      `El destino ya existe: ${target}. Elige un directorio nuevo; no se sobrescribe.`,
    );
  const parent = path.dirname(target);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(path.join(parent, '.archkit-'));
  let reserved = false;
  try {
    for (const file of plan.files) {
      options.signal?.throwIfAborted();
      const output = safePath(stage, file.path);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, file.content, { flag: 'wx', encoding: 'utf8' });
    }
    await options.verify?.(stage);
    if (plan.operations.includes('git-init'))
      await promisify(execFile)(
        'git',
        ['-c', `core.hooksPath=${path.join(stage, '.no-hooks')}`, 'init'],
        { cwd: stage },
      );
    options.signal?.throwIfAborted();
    // Reserve destination exclusively. A concurrent creator cannot be replaced by rename.
    await mkdir(target);
    reserved = true;
    for (const entry of await readdir(stage)) {
      options.signal?.throwIfAborted();
      await rename(path.join(stage, entry), path.join(target, entry));
    }
    return plan.files.map((file) => file.path);
  } catch (error) {
    if (reserved) await rm(target, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
// Literal substitution only: templates never execute JavaScript or shell code.
export function render(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_, key: string) => {
    if (!(key in variables))
      throw new Error(`Variable de plantilla ausente: ${key}`);
    return variables[key]!;
  });
}
