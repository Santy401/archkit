import { parse } from 'yaml';

export function prose(content: string): string {
  const mask = (value: string) => value.replace(/[^\r\n]/g, ' ');
  return content
    .replace(/^---\r?\n[\s\S]*?\r?\n---\s*\r?\n/, mask)
    .replace(/^\s*(`{3,}|~{3,}).*\r?\n[\s\S]*?^\s*\1\s*$/gm, mask)
    .replace(/(`+)[^`]*?\1/g, mask);
}
export function metadata(content: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) throw new Error('Falta frontmatter YAML.');
  const result: unknown = parse(match[1]!, { maxAliasCount: 0 });
  if (!result || typeof result !== 'object' || Array.isArray(result))
    throw new Error('Frontmatter debe ser un objeto.');
  return result as Record<string, unknown>;
}
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .replace(/\s/g, '-');
}
export function anchors(content: string): Set<string> {
  const result = new Set<string>();
  for (const heading of prose(content).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(heading[1]!);
    let value = base;
    let suffix = 0;
    while (result.has(value)) value = `${base}-${++suffix}`;
    result.add(value);
  }
  return result;
}
export function links(content: string): { href: string; index: number }[] {
  const body = prose(content);
  const result: { href: string; index: number }[] = [];
  const definitions = new Map<string, string>();
  for (const match of body.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm))
    definitions.set(match[1]!.toLowerCase(), match[2]!);
  for (const match of body.matchAll(
    /(?<!\\)!?\[[^\]\n]*\]\(<?([^\s)>]+)>?(?:\s+"[^"\n]*")?\)/g,
  ))
    result.push({ href: match[1]!, index: match.index });
  for (const match of body.matchAll(/(?<!\\)!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g))
    result.push({
      href:
        definitions.get((match[2] || match[1])!.toLowerCase()) ??
        `missing-reference:${match[2] || match[1]}`,
      index: match.index,
    });
  for (const match of body.matchAll(/(?<![!\\])\[([^\]\n]+)\](?![[()\]:])/g)) {
    const href = definitions.get(match[1]!.toLowerCase());
    if (href) result.push({ href, index: match.index });
  }
  return result;
}
