import path from 'node:path';
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
  rename,
} from 'node:fs/promises';
import { exists, rejectSymlinks, safePath } from '../blueprints/paths.js';
import { loadConfig } from '../core/config.js';
import { markdownText } from '../blueprints/catalog.js';
import { render } from '../blueprints/engine.js';
import { metadata } from '../validation/markdown.js';
import { recordDirectories } from './model.js';
import type { RecordType } from './model.js';

export async function findProject(start: string): Promise<string> {
  let current = path.resolve(start);
  while (true) {
    if (await exists(path.join(current, '.docs/blueprint.yaml')))
      return current;
    const parent = path.dirname(current);
    if (current === parent)
      throw new Error(
        'No se encontró proyecto ArchKit (.docs/blueprint.yaml).',
      );
    current = parent;
  }
}
export async function newRecord(
  start: string,
  type: RecordType,
  title: string,
): Promise<string> {
  if (
    !title.trim() ||
    title.length > 160 ||
    [...title].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      'El título debe tener entre 1 y 160 caracteres, en una línea.',
    );
  const root = await findProject(start);
  await rejectSymlinks(path.join(root, '.docs/blueprint.yaml'));
  const config = await loadConfig(path.join(root, '.docs/blueprint.yaml'));
  if (!config.documentation[type])
    throw new Error(`La extensión ${type.toUpperCase()} no está habilitada.`);
  const directory = safePath(root, recordDirectories[type]);
  await rejectSymlinks(directory);
  const lock = path.join(root, '.docs/.records-lock');
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error(
        'Hay otra operación ADR/RFC o un bloqueo pendiente en .docs/.records-lock. Verifica que no haya procesos activos antes de retirarlo.',
        { cause: error },
      );
    throw error;
  }
  let created: string | undefined;
  let committed = false;
  const temporaryIndex = path.join(lock, 'README.md');
  try {
    const indexPath = path.join(directory, 'README.md');
    await rejectSymlinks(indexPath);
    const index = await readFile(indexPath, 'utf8');
    const startMarker = '<!-- archkit:index:start -->';
    const endMarker = '<!-- archkit:index:end -->';
    if (
      index.split(startMarker).length !== 2 ||
      index.split(endMarker).length !== 2 ||
      index.indexOf(startMarker) >= index.indexOf(endMarker)
    )
      throw new Error(
        'Índice sin marcadores únicos archkit:index:start/end. Restaura los marcadores antes de crear registros.',
      );
    const used = new Set<number>();
    const entries: { id: string; file: string; title: string }[] = [];
    let maximum = 0;
    for (const file of (await readdir(directory))
      .filter((file) => file.endsWith('.md') && file !== 'README.md')
      .sort()) {
      const full = path.join(directory, file);
      await rejectSymlinks(full);
      const content = await readFile(full, 'utf8');
      const meta = metadata(content);
      const match = new RegExp(`^${type.toUpperCase()}-([0-9]{4,})$`).exec(
        String(meta.id),
      );
      if (!match || meta.type !== type)
        throw new Error(
          `Metadatos inválidos en ${file}; corrígelos antes de numerar.`,
        );
      const number = Number(match[1]);
      if (!Number.isSafeInteger(number) || number < 1 || used.has(number))
        throw new Error(
          `Identificador inválido o duplicado: ${String(meta.id)}.`,
        );
      if (!file.startsWith(`${match[1]}-`))
        throw new Error(`Nombre e ID incoherentes: ${file}.`);
      used.add(number);
      maximum = Math.max(maximum, number);
      entries.push({
        id: String(meta.id),
        file,
        title: /^# (.+)$/m.exec(content)?.[1] ?? String(meta.id),
      });
    }
    if (maximum >= Number.MAX_SAFE_INTEGER - 1)
      throw new Error('Se agotó la numeración segura.');
    const number = String(maximum + 1).padStart(4, '0');
    const id = `${type.toUpperCase()}-${number}`;
    const slug =
      title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'documento';
    const filename = `${number}-${slug}.md`;
    const output = path.join(directory, filename);
    const template = await readFile(
      new URL(`../../blueprints/${type}.md`, import.meta.url),
      'utf8',
    );
    await writeFile(
      output,
      render(template, { id, title: markdownText(title.trim()) }),
      { flag: 'wx' },
    );
    created = output;
    entries.push({
      id,
      file: filename,
      title: `${id}: ${markdownText(title.trim())}`,
    });
    const generatedIndex = entries
      .map((entry) => `- [${entry.title}](${entry.file})`)
      .join('\n');
    const nextIndex = `${index.slice(0, index.indexOf(startMarker) + startMarker.length)}\n${generatedIndex}\n${index.slice(index.indexOf(endMarker))}`;
    await writeFile(temporaryIndex, nextIndex, { flag: 'wx' });
    await rename(temporaryIndex, indexPath);
    committed = true;
    return path.relative(root, output).split(path.sep).join('/');
  } finally {
    if (created && !committed) await rm(created, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
