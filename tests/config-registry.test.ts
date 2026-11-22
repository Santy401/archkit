import { describe, expect, it } from 'vitest';
import {
  projectName,
  recommendations,
  resolveConfig,
} from '../src/core/config.js';
import { ExtensionRegistry } from '../src/core/registry.js';
import type { Extension } from '../src/core/registry.js';
import { fixture } from './helpers.js';

describe('versioned configuration', () => {
  it('validates and provides defaults', () => {
    const config = fixture();
    expect(config.schemaVersion).toBe(1);
    expect(config.documentation.profile).toBe('standard');
    expect(resolveConfig(config)).toEqual(config);
  });
  it.each([
    {},
    { project: {} },
    { project: { name: 'good' } },
    { schemaVersion: 2, project: { name: 'good', description: 'Test' } },
    { ...fixture(), extra: true },
  ])('rejects missing or unknown fields: %j', (value) =>
    expect(() => resolveConfig(value)).toThrow('Configuración inválida'),
  );
  it.each([
    '../outside',
    '..',
    '.',
    '/absolute',
    'bad name',
    'bad/name',
    'bad\\name',
    'C:drive',
    'hello.',
    'CON',
    'nul',
    'com1',
    'LPT9',
    '-bad',
    '',
    'a'.repeat(65),
  ])('rejects unsafe or reserved name %j', (name) =>
    expect(projectName.safeParse(name).success).toBe(false),
  );
  it.each(['ExpenseCore', 'expense-core', 'v1_app', '123', 'hello_World-2'])(
    'accepts portable name %j',
    (name) => expect(projectName.safeParse(name).success).toBe(true),
  );
  it.each([
    { organization: 'monorepo', deployment: 'monolith' },
    { organization: 'single', deployment: 'services' },
  ])('rejects unsupported organization %j', (workspace) =>
    expect(() => resolveConfig({ ...fixture(), workspace })).toThrow('no está'),
  );
  it('allows independent repository and deployment decisions', () =>
    expect(
      resolveConfig({
        ...fixture(),
        workspace: { organization: 'single', deployment: 'modular-monolith' },
      }).workspace.deployment,
    ).toBe('modular-monolith'));
  it('rejects controls in text', () =>
    expect(() =>
      resolveConfig({ project: { name: 'safe', description: '\u001b[31m' } }),
    ).toThrow());
  it('uses size as guidance without imposing architecture', () => {
    expect(recommendations('small').profile).toBe('minimal');
    expect(recommendations('large').profile).toBe('extended');
    expect(
      resolveConfig({
        ...fixture(),
        project: { ...fixture().project, size: 'large' },
        architecture: { style: 'minimal' },
      }).architecture.style,
    ).toBe('minimal');
  });
});
function extension(
  id: string,
  requires: string[] = [],
  conflicts: string[] = [],
): Extension {
  return {
    id,
    requires,
    conflicts,
    capabilities: [id],
    compatible: () => undefined,
    generate: () => [],
  };
}
describe('extension resolution', () => {
  it('sorts dependencies and deduplicates', () => {
    const registry = new ExtensionRegistry()
      .register(extension('base'))
      .register(extension('a', ['base']));
    expect(
      registry.resolve(['a', 'base'], fixture()).map((item) => item.id),
    ).toEqual(['base', 'a']);
  });
  it('rejects duplicates', () =>
    expect(() =>
      new ExtensionRegistry().register(extension('a')).register(extension('a')),
    ).toThrow('duplicada'));
  it('rejects unknown dependencies', () =>
    expect(() =>
      new ExtensionRegistry()
        .register(extension('a', ['b']))
        .resolve(['a'], fixture()),
    ).toThrow('desconocida'));
  it('detects cycles', () =>
    expect(() =>
      new ExtensionRegistry()
        .register(extension('a', ['b']))
        .register(extension('b', ['a']))
        .resolve(['a'], fixture()),
    ).toThrow('circular'));
  it('detects conflicts', () =>
    expect(() =>
      new ExtensionRegistry()
        .register(extension('a', [], ['b']))
        .register(extension('b'))
        .resolve(['a', 'b'], fixture()),
    ).toThrow('incompatibles'));
  it('enforces compatibility', () =>
    expect(() =>
      new ExtensionRegistry()
        .register({ ...extension('a'), compatible: () => 'unsupported' })
        .resolve(['a'], fixture()),
    ).toThrow('unsupported'));
});
