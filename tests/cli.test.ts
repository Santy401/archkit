import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { temporary, fixture } from './helpers.js';
const execute = promisify(execFile);
const bin = path.resolve('dist/cli/main.js');
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});
async function setup() {
  const temp = await temporary();
  cleanups.push(temp.cleanup);
  return temp;
}
async function cli(args: string[], cwd?: string) {
  try {
    const result = await execute(process.execPath, [bin, ...args], {
      ...(cwd ? { cwd } : {}),
      timeout: 15000,
    });
    return { ...result, code: 0 };
  } catch (error) {
    const result = error as { stdout: string; stderr: string; code: number };
    return result;
  }
}
describe('built CLI', () => {
  it('provides help and version', async () => {
    expect((await cli(['--help'])).stdout).toContain('init');
    expect((await cli(['--version'])).stdout.trim()).toBe('0.1.0');
  });
  it('rejects argument errors and unsupported combinations', async () => {
    expect((await cli(['--unknown'])).code).toBe(2);
    expect(
      (
        await cli([
          'init',
          'bad/name',
          '--description',
          'Test',
          '--non-interactive',
          '--yes',
        ])
      ).code,
    ).toBe(1);
    expect(
      (
        await cli([
          'init',
          'test',
          '--description',
          'Test',
          '--non-interactive',
          '--organization',
          'monorepo',
          '--yes',
        ])
      ).stderr,
    ).toContain('no está soportado');
  });
  it('requires non-interactive consent', async () => {
    const { root } = await setup();
    expect(
      (
        await cli(
          ['init', 'test', '--description', 'Test', '--non-interactive'],
          root,
        )
      ).code,
    ).toBe(1);
    expect((await cli(['init', 'test'], root)).stderr).toContain(
      'Sin terminal',
    );
  });
  it('creates, records and validates in a temporary directory', async () => {
    const { root } = await setup();
    expect(
      (
        await cli(
          [
            'init',
            'demo',
            '--description',
            'Demo',
            '--non-interactive',
            '--yes',
          ],
          root,
        )
      ).code,
    ).toBe(0);
    const project = path.join(root, 'demo');
    expect((await cli(['adr', 'new', 'Arquitectura'], project)).code).toBe(0);
    expect((await cli(['rfc', 'new', 'Cambios'], project)).code).toBe(0);
    const result = await cli(['validate', '--format', 'json'], project);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).valid).toBe(true);
    await writeFile(path.join(project, '.docs/00-project/vision.md'), 'broken');
    const failed = await cli(['validate', '--format', 'json'], project);
    expect(failed.code).toBe(1);
    expect(JSON.parse(failed.stdout).issues[0].rule).toBe('DOC-003');
    expect((await cli(['validate', '--format', 'xml'], project)).code).toBe(1);
  });
  it('loads JSON config and preserves disabled options', async () => {
    const { root } = await setup();
    const config = fixture();
    config.agents.enabled = false;
    config.documentation.adr = false;
    await writeFile(path.join(root, 'config.json'), JSON.stringify(config));
    expect(
      (await cli(['init', '--config', 'config.json', '--yes'], root)).code,
    ).toBe(0);
    const generated = await readFile(
      path.join(root, 'test-project/.docs/blueprint.yaml'),
      'utf8',
    );
    expect(generated).toContain('adr: false');
    expect(generated).toContain('enabled: false');
  });
  it('supports YAML config, flag overrides and dry-run without writes', async () => {
    const { root } = await setup();
    await writeFile(
      path.join(root, 'config.yaml'),
      'schemaVersion: 1\nproject:\n  name: from-config\n  description: A test\n',
    );
    const result = await cli(
      ['init', 'override', '--config', 'config.yaml', '--no-rfc', '--dry-run'],
      root,
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Proyecto: override');
    expect(result.stdout).not.toContain('.docs/06-decisions/rfc/README.md');
  });
});
