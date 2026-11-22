import { readFile } from 'node:fs/promises';
import type { Config } from '../core/config.js';

export interface DocumentEntry {
  path: string;
  title: string;
  body: string;
}
export interface Architecture {
  summary: string;
  layers: Record<string, string>;
  sources: Record<string, string>;
}
export async function catalog(): Promise<DocumentEntry[]> {
  return JSON.parse(
    await readFile(
      new URL('../../blueprints/catalog.json', import.meta.url),
      'utf8',
    ),
  ) as DocumentEntry[];
}
export async function architecture(
  style: Config['architecture']['style'],
): Promise<Architecture> {
  const data = JSON.parse(
    await readFile(
      new URL('../../blueprints/architectures.json', import.meta.url),
      'utf8',
    ),
  ) as Record<string, Architecture>;
  return data[style]!;
}
export function selectedDocuments(
  entries: DocumentEntry[],
  profile: Config['documentation']['profile'],
): DocumentEntry[] {
  return profile === 'minimal'
    ? entries.filter((entry) =>
        [
          '00-project/vision.md',
          '00-project/scope.md',
          '02-architecture/overview.md',
          '04-quality/acceptance-criteria.md',
        ].includes(entry.path),
      )
    : entries;
}
export function markdownText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_[\]#]/g, '\\$&')
    .replace(/\r?\n/g, ' ');
}
