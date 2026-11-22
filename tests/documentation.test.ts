import path from 'node:path';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { generateProject } from '../src/core/project.js';
import { findProject, newRecord } from '../src/records/records.js';
import { validateDocumentation } from '../src/validation/validator.js';
import { fixture, temporary } from './helpers.js';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});
async function setup() {
  const temp = await temporary();
  cleanups.push(temp.cleanup);
  await generateProject(fixture(), temp.target);
  return temp.target;
}
async function rules(root: string) {
  return (await validateDocumentation(root)).map((issue) => issue.rule);
}
async function change(root: string, file: string, content: string) {
  await writeFile(path.join(root, file), content);
}
describe('document integrity', () => {
  it('reports missing documentation', async () => {
    const temp = await temporary();
    cleanups.push(temp.cleanup);
    expect(await rules(temp.root)).toContain('DOC-002');
  });
  it('reports missing index and required documents', async () => {
    const root = await setup();
    const { unlink } = await import('node:fs/promises');
    await unlink(path.join(root, '.docs/00-project/README.md'));
    await unlink(path.join(root, '.docs/00-project/vision.md'));
    expect(await rules(root)).toEqual(
      expect.arrayContaining(['DOC-001', 'DOC-002']),
    );
  });
  it('rejects missing titles', async () => {
    const root = await setup();
    await change(root, '.docs/00-project/vision.md', 'No heading');
    expect(await rules(root)).toContain('DOC-003');
  });
  it('validates inline, reference and fragment links', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/00-project/vision.md',
      '# Visión\n\n[Scope](scope.md#alcance-test-project)\n[Ref][scope]\n\n[scope]: scope.md\n',
    );
    expect(await rules(root)).not.toContain('DOC-004');
    await change(
      root,
      '.docs/00-project/vision.md',
      '# Visión\n\n[Bad](missing.md)\n[Fragment](scope.md#missing)\n[Ref][unknown]\n',
    );
    expect(
      (await validateDocumentation(root)).filter(
        (issue) => issue.rule === 'DOC-004',
      ),
    ).toHaveLength(3);
  });
  it('rejects links escaping the project', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/00-project/vision.md',
      '# Visión\n\n[Escape](../../../secret.md)',
    );
    expect(await rules(root)).toContain('DOC-004');
  });
  it('requires explicit pending markers and accepts valid pending documents', async () => {
    const root = await setup();
    expect(await rules(root)).toEqual([]);
    await change(
      root,
      '.docs/00-project/vision.md',
      '# Visión\n\nPENDIENTE: definir usuarios.',
    );
    expect(await rules(root)).toContain('DOC-012');
  });
  it('accepts justified not-applicable declarations', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/04-quality/acceptance-criteria.md',
      '# Criterios\n\n<!-- archkit:not-applicable reason="No existe comportamiento ejecutable en este catálogo documental" -->\n',
    );
    expect(await rules(root)).toEqual([]);
    await change(
      root,
      '.docs/04-quality/acceptance-criteria.md',
      '# Criterios\n\n<!-- archkit:not-applicable reason="" -->',
    );
    expect(await rules(root)).toContain('DOC-012');
  });
  it('detects duplicate requirements and unresolved ID references', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/01-requirements/functional.md',
      '# Requisitos\n\n## FR-001 Registrar\n\nDescripción.\n\n## FR-001 Repetido\n\n[[NFR-999]]',
    );
    expect(await rules(root)).toEqual(
      expect.arrayContaining(['DOC-008', 'DOC-010']),
    );
  });
  it('requires identifiable acceptance scenarios when complete', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/04-quality/acceptance-criteria.md',
      '# Criterios\n\nTodo bien.',
    );
    expect(await rules(root)).toContain('DOC-009');
    await change(
      root,
      '.docs/01-requirements/functional.md',
      '# Funcional\n\n## FR-001 Registrar\n\nEl usuario puede registrar.',
    );
    await change(
      root,
      '.docs/04-quality/acceptance-criteria.md',
      '# Criterios\n\n## AC-001 Registro\n\nDado un usuario, Cuando registra, Entonces ve el resultado. [[FR-001]]\n',
    );
    expect(await rules(root)).toEqual([]);
  });
  it('limits duplication to identical complete bodies', async () => {
    const root = await setup();
    const body = '\n\nContenido completo y verificable. '.repeat(12);
    await change(root, '.docs/00-project/vision.md', '# Visión' + body);
    await change(root, '.docs/00-project/scope.md', '# Alcance' + body);
    expect(await rules(root)).toContain('DOC-011');
    expect(
      (await validateDocumentation(root)).find(
        (issue) => issue.rule === 'DOC-011',
      )!.severity,
    ).toBe('warning');
  });
  it('ignores references in code fences and inline code', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/00-project/vision.md',
      '# Visión\n\n`[[FR-999]]`\n\n```md\n[Bad](no.md)\n[[ADR-9999]]\n```\n',
    );
    expect(await rules(root)).toEqual([]);
  });
});
describe('ADR and RFC lifecycle', () => {
  it('discovers project from a nested folder and numbers independent series', async () => {
    const root = await setup();
    const nested = path.join(root, 'src/modules/core');
    expect(await findProject(nested)).toBe(root);
    expect(await newRecord(nested, 'adr', 'Hexagonal')).toContain(
      '0001-hexagonal.md',
    );
    expect(await newRecord(root, 'rfc', 'Primer diseño')).toContain(
      '0001-primer-diseno.md',
    );
    expect(await newRecord(root, 'adr', 'Segunda decisión')).toContain(
      '0002-segunda-decision.md',
    );
    expect(await rules(root)).toEqual([]);
    expect(
      await readFile(
        path.join(root, '.docs/02-architecture/adr/README.md'),
        'utf8',
      ),
    ).toContain('0002-segunda-decision.md');
  });
  it('rejects duplicate IDs without modifying existing records', async () => {
    const root = await setup();
    const record = await newRecord(root, 'adr', 'Uno');
    const original = await readFile(path.join(root, record), 'utf8');
    await copyFile(
      path.join(root, record),
      path.join(root, '.docs/02-architecture/adr/0001-duplicado.md'),
    );
    expect(await rules(root)).toContain('DOC-005');
    await expect(newRecord(root, 'adr', 'Tres')).rejects.toThrow('duplicado');
    expect(await readFile(path.join(root, record), 'utf8')).toBe(original);
  });
  it.each(['adr', 'rfc'] as const)(
    'checks %s states and accepted sections',
    async (type) => {
      const root = await setup();
      const record = await newRecord(root, type, 'Decision');
      const original = await readFile(path.join(root, record), 'utf8');
      await change(
        root,
        record,
        original.replace(/status: \S+/, 'status: invented'),
      );
      expect(await rules(root)).toContain('DOC-006');
      await change(
        root,
        record,
        original.replace(
          /status: \S+/,
          `status: ${type === 'adr' ? 'aceptado' : 'aceptada'}`,
        ),
      );
      expect(await rules(root)).toContain('DOC-007');
    },
  );
  it('validates complete accepted ADRs and preserves them when creating another', async () => {
    const root = await setup();
    const record = await newRecord(root, 'adr', 'Hexagonal');
    const content =
      '---\nid: ADR-0001\ntype: adr\nstatus: aceptado\n---\n# ADR-0001: Hexagonal\n\n## Contexto\n\nSe requiere aislar reglas del dominio.\n\n## Decisión\n\nSe adoptan puertos y adaptadores explícitos.\n\n## Consecuencias\n\nSe necesitan pruebas de contrato para adaptadores.\n';
    await change(root, record, content);
    expect(await rules(root)).toEqual([]);
    await newRecord(root, 'adr', 'Otra');
    expect(await readFile(path.join(root, record), 'utf8')).toBe(content);
  });
  it('honors the project lock', async () => {
    const root = await setup();
    await mkdir(path.join(root, '.docs/.records-lock'));
    await expect(newRecord(root, 'adr', 'One')).rejects.toThrow('bloqueo');
  });
  it('rejects disabled components and invalid titles', async () => {
    const temp = await temporary();
    cleanups.push(temp.cleanup);
    await generateProject(
      {
        ...fixture(),
        documentation: { ...fixture().documentation, adr: false },
      },
      temp.target,
    );
    await expect(newRecord(temp.target, 'adr', 'One')).rejects.toThrow(
      'no está habilitada',
    );
    await expect(newRecord(temp.target, 'rfc', '')).rejects.toThrow('título');
    await expect(newRecord(temp.target, 'rfc', 'bad\nline')).rejects.toThrow(
      'título',
    );
  });
});

describe('record conflict and recovery regressions', () => {
  it('rejects alias YAML without reading external or cyclic content', async () => {
    const root = await setup();
    await change(
      root,
      '.docs/blueprint.yaml',
      'project: &p\n  name: demo\n  description: Test\narchitecture: *p\n',
    );
    expect(await rules(root)).toContain('DOC-002');
  });
  it('does not create a record when index markers are missing', async () => {
    const root = await setup();
    await change(root, '.docs/02-architecture/adr/README.md', '# ADR\n');
    await expect(newRecord(root, 'adr', 'Propuesta')).rejects.toThrow(
      'marcadores',
    );
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(path.join(root, '.docs/02-architecture/adr'))).toEqual(
      ['README.md'],
    );
  });
  it('preserves a colliding existing file and skips no identifiers', async () => {
    const root = await setup();
    await newRecord(root, 'adr', 'Primera');
    const record = await newRecord(root, 'adr', 'Segunda');
    const { unlink } = await import('node:fs/promises');
    await unlink(path.join(root, '.docs/02-architecture/adr/0001-primera.md'));
    expect(await newRecord(root, 'adr', 'Tercera')).toContain(
      '0003-tercera.md',
    );
    expect(await readFile(path.join(root, record), 'utf8')).toContain(
      'ADR-0002',
    );
  });
  it('serializes concurrent record creation without duplicated IDs', async () => {
    const root = await setup();
    const outcomes = await Promise.allSettled([
      newRecord(root, 'adr', 'Uno'),
      newRecord(root, 'adr', 'Dos'),
    ]);
    expect(
      outcomes.filter((result) => result.status === 'fulfilled').length,
    ).toBeGreaterThanOrEqual(1);
    expect(await rules(root)).toEqual([]);
  });
  it('validates complete accepted RFCs', async () => {
    const root = await setup();
    const record = await newRecord(root, 'rfc', 'Cambio');
    await change(
      root,
      record,
      '---\nid: RFC-0001\ntype: rfc\nstatus: aceptada\n---\n# RFC-0001: Cambio\n\n## Motivación\n\nReducir el acoplamiento de interfaces.\n\n## Propuesta\n\nVersionar contratos y revisar consumidores.\n\n## Impacto\n\nRequiere coordinar consumidores existentes.\n\n## Plan de validación\n\nEjecutar pruebas de contrato y revisar resultados.\n',
    );
    expect(await rules(root)).toEqual([]);
  });
});

it('rejects an empty document and reports a precise reference line', async () => {
  const root = await setup();
  await change(root, '.docs/00-project/vision.md', '# Visión\n');
  expect(await rules(root)).toContain('DOC-012');
  await change(
    root,
    '.docs/00-project/vision.md',
    '# Visión\n\n`Ignored [[FR-100]]`\n\n[[FR-999]]\n',
  );
  expect(
    (await validateDocumentation(root)).find(
      (issue) => issue.rule === 'DOC-010',
    )?.line,
  ).toBe(5);
});

it('does not accept directories in place of mandatory files', async () => {
  const root = await setup();
  const file = path.join(root, '.docs/00-project/vision.md');
  const { unlink } = await import('node:fs/promises');
  await unlink(file);
  await mkdir(file);
  await writeFile(
    path.join(file, 'README.md'),
    '# Índice\n\nEsto es un directorio, no el documento obligatorio.\n',
  );
  expect(await rules(root)).toContain('DOC-002');
});
