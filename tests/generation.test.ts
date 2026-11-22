import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { buildPlan, generateProject } from '../src/core/project.js';
import { checkPlan, executePlan, render } from '../src/blueprints/engine.js';
import { exists, safePath } from '../src/blueprints/paths.js';
import { validateDocumentation } from '../src/validation/validator.js';
import { fixture, temporary } from './helpers.js';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});
async function setup() {
  const temp = await temporary();
  cleanups.push(temp.cleanup);
  return temp;
}
describe('project generation', () => {
  it.each(['small', 'medium', 'large'] as const)(
    'generates a valid %s project',
    async (size) => {
      const { target } = await setup();
      await generateProject(
        { ...fixture(), project: { ...fixture().project, size } },
        target,
      );
      expect(await validateDocumentation(target)).toEqual([]);
      expect(await readFile(path.join(target, 'README.md'), 'utf8')).toContain(
        'test-project',
      );
    },
  );
  it.each(['minimal', 'standard', 'extended'] as const)(
    'validates profile %s',
    async (profile) => {
      const { target } = await setup();
      await generateProject(
        {
          ...fixture(),
          documentation: { ...fixture().documentation, profile },
        },
        target,
      );
      expect(await validateDocumentation(target)).toEqual([]);
      expect(
        await exists(path.join(target, '.docs/security/threat-model.md')),
      ).toBe(profile === 'extended');
    },
  );
  it.each(['hexagonal', 'clean', 'layered', 'minimal'] as const)(
    'generates architecture %s with its contracts',
    async (style) => {
      const config = { ...fixture(), architecture: { style } };
      const plan = await buildPlan(config);
      const sources = plan.files.filter((file) => file.path.endsWith('.ts'));
      expect(sources.length).toBeGreaterThan(0);
      if (style === 'hexagonal')
        expect(
          sources.some((file) => file.path.includes('ports/outbound')),
        ).toBe(true);
      if (style === 'clean')
        expect(
          sources.some((file) => file.content.includes('EntityOutput')),
        ).toBe(true);
      if (style === 'layered')
        expect(sources.some((file) => file.content.includes('new Map'))).toBe(
          true,
        );
      const { target } = await setup();
      await generateProject(config, target);
      expect(await validateDocumentation(target)).toEqual([]);
    },
  );
  it('does not create module folders for a monolith', async () => {
    const plan = await buildPlan({
      ...fixture(),
      workspace: { organization: 'single', deployment: 'monolith' },
    });
    expect(
      plan.files.some((file) => file.path === 'src/domain/entity.ts'),
    ).toBe(true);
    expect(plan.files.some((file) => file.path.includes('src/modules'))).toBe(
      false,
    );
  });
  it('is deterministic and preserves configuration', async () => {
    expect(await buildPlan(fixture())).toEqual(await buildPlan(fixture()));
    const { target } = await setup();
    await generateProject(fixture(), target);
    const original = await readFile(path.join(target, 'README.md'), 'utf8');
    await expect(generateProject(fixture(), target)).rejects.toThrow(
      'ya existe',
    );
    expect(await readFile(path.join(target, 'README.md'), 'utf8')).toBe(
      original,
    );
  });
  it('rejects empty and populated existing directories', async () => {
    const { target } = await setup();
    await mkdir(target);
    await expect(generateProject(fixture(), target)).rejects.toThrow(
      'ya existe',
    );
    await writeFile(path.join(target, 'precious.txt'), 'keep');
    await expect(generateProject(fixture(), target)).rejects.toThrow(
      'ya existe',
    );
    expect(await readFile(path.join(target, 'precious.txt'), 'utf8')).toBe(
      'keep',
    );
  });
  it('cancels before writing', async () => {
    const { target, root } = await setup();
    await expect(
      generateProject(fixture(), target, { signal: AbortSignal.abort() }),
    ).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
  });
  it('rolls back verification failure and cancellation during staging', async () => {
    const { target, root } = await setup();
    await expect(
      executePlan(await buildPlan(fixture()), target, {
        verify: async () => {
          throw new Error('invalid');
        },
      }),
    ).rejects.toThrow('invalid');
    expect(await readdir(root)).toEqual([]);
    const controller = new AbortController();
    await expect(
      executePlan(await buildPlan(fixture()), target, {
        signal: controller.signal,
        verify: async () => {
          controller.abort();
        },
      }),
    ).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
  });
  it('rejects destination symlinks and parent symlinks', async () => {
    const { root, target } = await setup();
    const real = path.join(root, 'real');
    await mkdir(real);
    const link = path.join(root, 'link');
    await symlink(real, link, 'junction');
    await expect(generateProject(fixture(), link)).rejects.toThrow(
      'simbólicos',
    );
    await expect(
      generateProject(fixture(), path.join(link, 'child')),
    ).rejects.toThrow('simbólicos');
    expect(await exists(target)).toBe(false);
  });
  it('escapes user Markdown instead of introducing links or HTML', async () => {
    const input = {
      project: {
        name: 'safe',
        description: '<script>[evil](../outside)</script>',
      },
    };
    const plan = await buildPlan(input);
    const { target } = await setup();
    await generateProject(input, target);
    expect(await validateDocumentation(target)).toEqual([]);
    expect(
      plan.files.find((file) => file.path === 'README.md')!.content,
    ).toContain('&lt;script&gt;');
  });
  it('turns every optional component off', async () => {
    const { target } = await setup();
    await generateProject(
      {
        ...fixture(),
        documentation: {
          profile: 'minimal',
          adr: false,
          rfc: false,
          validator: false,
        },
        agents: { enabled: false },
        tooling: { quality: false, git: false },
      },
      target,
    );
    expect(await validateDocumentation(target)).toEqual([]);
    expect(await exists(path.join(target, 'AGENTS.md'))).toBe(false);
  });
});
describe('safe blueprint engine', () => {
  it.each([
    '../escape',
    'a/../../escape',
    '/absolute',
    'C:\\escape',
    'C:/escape',
    'a\\b',
    'a//b',
    './file',
    'file\0.md',
    'file:stream',
    'CON.md',
    'folder/NUL.txt',
    'folder/file.',
  ])('rejects %j', (value) => expect(() => safePath('/safe', value)).toThrow());
  it('handles host separators at destination', () =>
    expect(safePath(path.resolve('folder with spaces'), 'a/b.md')).toBe(
      path.resolve('folder with spaces', 'a', 'b.md'),
    ));
  it('rejects case collisions and file/directory collisions', () => {
    expect(() =>
      checkPlan({
        files: [
          { path: 'A.md', content: '' },
          { path: 'a.md', content: '' },
        ],
        operations: [],
      }),
    ).toThrow('duplicado');
    expect(() =>
      checkPlan({
        files: [
          { path: 'a', content: '' },
          { path: 'a/b', content: '' },
        ],
        operations: [],
      }),
    ).toThrow('Conflicto');
  });
  it('substitutes literally and never executes template content', () => {
    expect(render('{{title}} $(echo danger) {{title}}', { title: '$&' })).toBe(
      '$& $(echo danger) $&',
    );
    expect(() => render('{{missing}}', {})).toThrow('ausente');
  });
});

// Compile the generated contracts using the same strict TypeScript toolchain, without a network or framework.
it('compiles all four architecture blueprints as strict TypeScript', async () => {
  const { promisify } = await import('node:util');
  const { execFile } = await import('node:child_process');
  for (const style of ['hexagonal', 'clean', 'layered', 'minimal'] as const) {
    const { target } = await setup();
    await generateProject({ ...fixture(), architecture: { style } }, target);
    await writeFile(
      path.join(target, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: 'ES2023',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          types: [],
        },
        include: ['src/**/*.ts'],
      }),
    );
    await promisify(execFile)(process.execPath, [
      path.resolve('node_modules/typescript/bin/tsc'),
      '-p',
      path.join(target, 'tsconfig.json'),
    ]);
  }
}, 30000);

it('initializes an opted-in local Git repository without installing dependencies', async () => {
  const { target } = await setup();
  await generateProject(
    { ...fixture(), tooling: { quality: true, git: true } },
    target,
  );
  expect(await exists(path.join(target, '.git/HEAD'))).toBe(true);
  expect(await exists(path.join(target, 'node_modules'))).toBe(false);
});
