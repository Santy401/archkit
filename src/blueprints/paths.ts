import path from 'node:path';
import { lstat } from 'node:fs/promises';

export function safePath(root: string, relative: string): string {
  if (
    !relative ||
    relative.includes('\\') ||
    relative.includes('\0') ||
    path.posix.isAbsolute(relative) ||
    path.win32.isAbsolute(relative) ||
    relative
      .split('/')
      .some(
        (part) =>
          part === '..' ||
          part === '.' ||
          !part ||
          /[:<>"|?*]/.test(part) ||
          /[. ]$/.test(part) ||
          /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part),
      )
  ) {
    throw new Error(`Ruta de plantilla insegura: ${relative}`);
  }
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`))
    throw new Error(`Ruta fuera del destino: ${relative}`);
  return target;
}
export async function exists(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
export async function rejectSymlinks(file: string): Promise<void> {
  let current = path.resolve(file);
  while (true) {
    if ((await exists(current)) && (await lstat(current)).isSymbolicLink())
      throw new Error(`No se admiten enlaces simbólicos: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}
