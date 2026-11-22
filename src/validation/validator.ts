import path from 'node:path';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { loadConfig } from '../core/config.js';
import { catalog, selectedDocuments } from '../blueprints/catalog.js';
import { exists, safePath } from '../blueprints/paths.js';
import {
  acceptedSections,
  recordDirectories,
  recordStates,
  recordTypes,
} from '../records/model.js';
import { anchors, links, metadata, prose } from './markdown.js';

export interface Issue {
  rule: `DOC-${string}`;
  severity: 'error' | 'warning';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
}
export async function validateDocumentation(project: string): Promise<Issue[]> {
  const root = path.resolve(project);
  const issues: Issue[] = [];
  const add = (
    rule: Issue['rule'],
    file: string,
    message: string,
    suggestion: string,
    line?: number,
    severity: Issue['severity'] = 'error',
  ) => {
    issues.push({
      rule,
      severity,
      file,
      message,
      suggestion,
      ...(line ? { line } : {}),
    });
  };
  const docs = path.join(root, '.docs');
  if (!(await exists(docs)) || !(await lstat(docs)).isDirectory())
    return [
      {
        rule: 'DOC-002',
        severity: 'error',
        file: '.docs',
        message: 'No existe .docs.',
        suggestion: 'Inicializa el proyecto con archkit init.',
      },
    ];
  const files = new Map<string, string>();
  const directories: string[] = [];
  const walk = async (directory: string) => {
    const relative = path.relative(root, directory).split(path.sep).join('/');
    if ((await lstat(directory)).isSymbolicLink()) {
      add(
        'DOC-004',
        relative,
        'Enlace simbólico no permitido.',
        'Sustituir por un archivo o directorio local.',
      );
      return;
    }
    directories.push(relative);
    for (const entry of (
      await readdir(directory, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const full = path.join(directory, entry.name);
      const file = path.relative(root, full).split(path.sep).join('/');
      if (entry.isSymbolicLink())
        add(
          'DOC-004',
          file,
          'Enlace simbólico no permitido.',
          'Usar archivos locales.',
        );
      else if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md'))
        files.set(file, await readFile(full, 'utf8'));
    }
  };
  await walk(docs);
  for (const file of ['README.md', 'AGENTS.md']) {
    const full = path.join(root, file);
    if (await exists(full)) {
      if ((await lstat(full)).isSymbolicLink())
        add(
          'DOC-004',
          file,
          'Enlace simbólico no permitido.',
          'Usar un archivo local.',
        );
      else if ((await lstat(full)).isFile())
        files.set(file, await readFile(full, 'utf8'));
      else
        add(
          'DOC-002',
          file,
          'Se esperaba un archivo regular.',
          'Restaurar el documento como archivo.',
        );
    }
  }
  for (const directory of directories)
    if (!files.has(`${directory}/README.md`))
      add(
        'DOC-001',
        `${directory}/README.md`,
        'Falta índice README.',
        'Crear el índice del directorio.',
      );
  let required = [
    '.docs/README.md',
    '.docs/blueprint.yaml',
    '.docs/contract.md',
  ];
  try {
    const configFile = path.join(docs, 'blueprint.yaml');
    if ((await lstat(configFile)).isSymbolicLink())
      throw new Error('blueprint.yaml no puede ser un enlace simbólico.');
    const config = await loadConfig(configFile);
    required.push(
      ...selectedDocuments(await catalog(), config.documentation.profile).map(
        (entry) => `.docs/${entry.path}`,
      ),
    );
    if (config.documentation.profile !== 'minimal')
      required.push('.docs/02-architecture/diagrams/README.md');
    if (config.documentation.profile === 'extended')
      required.push(
        '.docs/security/README.md',
        '.docs/security/threat-model.md',
      );
    if (config.documentation.adr)
      required.push(`${recordDirectories.adr}/README.md`);
    if (config.documentation.rfc)
      required.push(`${recordDirectories.rfc}/README.md`);
    if (config.documentation.validator) required.push('.docs/validator.md');
    if (config.agents.enabled) required.push('AGENTS.md', '.docs/agents.md');
  } catch (error) {
    add(
      'DOC-002',
      '.docs/blueprint.yaml',
      `Configuración documental inválida: ${(error as Error).message}`,
      'Restaurar una configuración schemaVersion: 1 válida.',
    );
  }
  required = [...new Set(required)];
  for (const file of required)
    if (
      !(await exists(safePath(root, file))) ||
      !(await lstat(safePath(root, file))).isFile()
    )
      add(
        'DOC-002',
        file,
        'Falta archivo obligatorio.',
        'Restaurar el archivo definido por el perfil.',
      );
  const definitions = new Map<string, string>();
  const references: { id: string; file: string; line: number }[] = [];
  const bodies = new Map<string, string>();
  for (const [file, content] of files) {
    const body = prose(content);
    const lineOf = (index: number) =>
      content.slice(0, index).split('\n').length;
    if ([...body.matchAll(/^#\s+\S.*$/gm)].length !== 1)
      add(
        'DOC-003',
        file,
        'Se requiere exactamente un título principal.',
        'Añadir un único encabezado # con un título.',
        1,
      );
    const pending = body.includes('<!-- archkit:pending -->');
    const naMatch = /<!-- archkit:not-applicable reason="([^"\n]+)" -->/.exec(
      body,
    );
    const notApplicable = Boolean(naMatch && naMatch[1]!.trim().length >= 10);
    if (
      (/^PENDIENTE:/m.test(body) && !pending) ||
      (pending && !/PENDIENTE:\s*\S/.test(body))
    )
      add(
        'DOC-012',
        file,
        'Declaración pendiente incompleta.',
        'Usar <!-- archkit:pending --> y PENDIENTE: con una explicación.',
      );
    if (body.includes('archkit:not-applicable') && !notApplicable)
      add(
        'DOC-012',
        file,
        'No aplicabilidad sin razón válida.',
        'Usar <!-- archkit:not-applicable reason="Razón concreta de diez caracteres o más" -->.',
      );
    const substantive = content
      .replace(/^---\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '')
      .replace(/^#\s+.*$/m, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
    if (!substantive && !notApplicable)
      add(
        'DOC-012',
        file,
        'Documento vacío sin declaración de trabajo pendiente.',
        'Añadir contenido útil o el marcador pendiente y una explicación.',
      );
    if (pending && notApplicable)
      add(
        'DOC-012',
        file,
        'Documento pendiente y no aplicable a la vez.',
        'Elegir una sola declaración.',
      );
    for (const match of body.matchAll(
      /^#{1,6}\s+((?:FR|NFR|BR|UC|AC)-\d+)\b/gm,
    )) {
      const id = match[1]!;
      if (definitions.has(id))
        add(
          'DOC-008',
          file,
          `ID duplicado ${id}; definido en ${definitions.get(id)}.`,
          'Asignar identificadores únicos.',
          lineOf(match.index),
        );
      else definitions.set(id, file);
    }
    for (const match of body.matchAll(
      /\[\[((?:FR|NFR|BR|UC|AC|ADR|RFC)-\d+)\]\]/g,
    ))
      references.push({ id: match[1]!, file, line: lineOf(match.index) });
    if (
      file.endsWith('/acceptance-criteria.md') &&
      !pending &&
      !notApplicable
    ) {
      const criteria = [
        ...body.matchAll(
          /^##\s+AC-\d+[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/gm,
        ),
      ];
      if (!criteria.length)
        add(
          'DOC-009',
          file,
          'Faltan criterios identificables.',
          'Definir ## AC-001 con Dado/Cuando/Entonces y referencia a FR o NFR.',
        );
      for (const criterion of criteria)
        if (
          !/Dado/i.test(criterion[1]!) ||
          !/Cuando/i.test(criterion[1]!) ||
          !/Entonces/i.test(criterion[1]!) ||
          !/\[\[(?:FR|NFR)-\d+\]\]/.test(criterion[1]!)
        )
          add(
            'DOC-009',
            file,
            'Criterio sin escenario o requisito relacionado.',
            'Añadir Dado/Cuando/Entonces y [[FR-001]] o [[NFR-001]].',
            lineOf(criterion.index),
          );
    }
    for (const type of recordTypes) {
      if (
        !file.startsWith(`${recordDirectories[type]}/`) ||
        file.endsWith('/README.md')
      )
        continue;
      try {
        const meta = metadata(content);
        const prefix = type.toUpperCase();
        if (
          typeof meta.id !== 'string' ||
          !new RegExp(`^${prefix}-[0-9]{4,}$`).test(meta.id) ||
          meta.type !== type
        )
          throw new Error(`Se requieren id ${prefix}-0001 y type ${type}.`);
        const number = meta.id.slice(4);
        if (
          !Number.isSafeInteger(Number(number)) ||
          Number(number) < 1 ||
          String(Number(number)).padStart(4, '0') !== number
        )
          throw new Error(
            'El número debe ser positivo, seguro y canónico (0001, 0002, …).',
          );
        if (!path.posix.basename(file).startsWith(`${number}-`))
          add(
            'DOC-005',
            file,
            'El nombre no coincide con el identificador.',
            `Renombrar a ${number}-titulo.md.`,
          );
        if (!body.includes(`# ${meta.id}:`))
          add(
            'DOC-005',
            file,
            'El título no contiene el ID.',
            `Usar # ${meta.id}: Título.`,
          );
        if (definitions.has(meta.id))
          add(
            'DOC-005',
            file,
            `ID duplicado ${meta.id}.`,
            'Asignar un número libre sin modificar decisiones aceptadas.',
          );
        else definitions.set(meta.id, file);
        if (
          typeof meta.status !== 'string' ||
          !recordStates[type].includes(meta.status)
        )
          add(
            'DOC-006',
            file,
            `Estado inválido: ${String(meta.status)}.`,
            `Usar uno de: ${recordStates[type].join(', ')}.`,
          );
        if (meta.status === 'aceptado' || meta.status === 'aceptada') {
          if (pending || notApplicable || /\bPENDIENTE\b/.test(body))
            add(
              'DOC-007',
              file,
              'Documento aceptado incompleto o no aplicable.',
              'Completar antes de aceptar; preservar decisiones previas mediante otro registro.',
            );
          for (const heading of acceptedSections[type]) {
            const section = new RegExp(
              `^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,
              'm',
            ).exec(body);
            if (!section || section[1]!.trim().length < 10)
              add(
                'DOC-007',
                file,
                `Sección obligatoria ausente o vacía: ${heading}.`,
                'Añadir texto sustantivo y evidencia.',
              );
          }
        }
      } catch (error) {
        add(
          'DOC-005',
          file,
          (error as Error).message,
          'Corregir metadatos según contract.md.',
        );
      }
    }
    for (const link of links(content)) {
      if (/^(https?:|mailto:|tel:)/i.test(link.href)) continue;
      try {
        if (/^[a-z][a-z\d+.-]*:/i.test(link.href) || link.href.startsWith('//'))
          throw new Error('Esquema no admitido.');
        const [rawFile, rawAnchor] = link.href.split('#');
        const pathname = decodeURIComponent(rawFile!.split('?')[0]!);
        if (pathname.includes('\\') || path.isAbsolute(pathname))
          throw new Error('Ruta de enlace insegura.');
        const target = path.resolve(
          root,
          path.posix.dirname(file),
          pathname || path.posix.basename(file),
        );
        if (target !== root && !target.startsWith(`${root}${path.sep}`))
          throw new Error('El enlace sale del proyecto.');
        const physical = await realpath(target);
        const physicalRoot = await realpath(root);
        if (
          physical !== physicalRoot &&
          !physical.startsWith(`${physicalRoot}${path.sep}`)
        )
          throw new Error('El enlace sale del proyecto mediante symlink.');
        if (
          rawAnchor &&
          target.endsWith('.md') &&
          !anchors(await readFile(target, 'utf8')).has(
            decodeURIComponent(rawAnchor),
          )
        )
          throw new Error('Fragmento inexistente.');
      } catch (error) {
        add(
          'DOC-004',
          file,
          `Enlace inválido ${link.href}: ${(error as Error).message}`,
          'Corregir la ruta o el fragmento del enlace.',
          lineOf(link.index),
        );
      }
    }
    const normalized = body.replace(/^# .*$/m, '').trim();
    if (
      !pending &&
      !notApplicable &&
      !file.endsWith('/README.md') &&
      normalized.length >= 200
    ) {
      if (bodies.has(normalized))
        add(
          'DOC-011',
          file,
          `Cuerpo idéntico al de ${bodies.get(normalized)}.`,
          'Mantener una fuente de verdad y enlazarla.',
          undefined,
          'warning',
        );
      else bodies.set(normalized, file);
    }
  }
  for (const ref of references)
    if (!definitions.has(ref.id))
      add(
        'DOC-010',
        ref.file,
        `Referencia sin definición: ${ref.id}.`,
        'Crear la definición o corregir el identificador.',
        ref.line,
      );
  return issues.sort(
    (a, b) =>
      a.file.localeCompare(b.file, 'en') ||
      a.rule.localeCompare(b.rule) ||
      (a.line ?? 0) - (b.line ?? 0),
  );
}
