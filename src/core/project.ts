import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { resolveConfig } from './config.js';
import type { Config } from './config.js';
import { builtinRegistry, selectedExtensions } from './extensions.js';
import {
  architecture,
  catalog,
  markdownText,
  selectedDocuments,
} from '../blueprints/catalog.js';
import { checkPlan, executePlan } from '../blueprints/engine.js';
import type { GenerationPlan, PlannedFile } from '../blueprints/engine.js';
import { validateDocumentation } from '../validation/validator.js';

export async function buildPlan(input: unknown): Promise<GenerationPlan> {
  const config = resolveConfig(input);
  const layout = await architecture(config.architecture.style);
  const entries = selectedDocuments(
    await catalog(),
    config.documentation.profile,
  );
  const name = markdownText(config.project.name);
  const pending =
    '<!-- archkit:pending -->\n\nPENDIENTE: acordar y completar con el equipo.';
  const files: PlannedFile[] = [
    {
      path: 'README.md',
      content: `# ${name}\n\n${markdownText(config.project.description)}\n\nPropósito: ${markdownText(config.project.purpose)}\n\nTipo: ${config.project.type}. Tamaño: ${config.project.size}.\n\n${config.project.author ? `Autor: ${markdownText(config.project.author)}.\n\n` : ''}[Documentación](.docs/README.md) · [Estructura](src/README.md)\n\nBase TypeScript ilustrativa sin framework ni instalación automática. Antes de desarrollar, acordar requisitos y configurar compilación y pruebas.\n`,
    },
    { path: '.docs/blueprint.yaml', content: stringify(config) },
    {
      path: '.docs/contract.md',
      content: await readFile(
        new URL('../../blueprints/contract.md', import.meta.url),
        'utf8',
      ),
    },
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\ncoverage/\n.env\n.env.*\n!.env.example\n',
    },
    {
      path: 'tests/README.md',
      content:
        '# Pruebas\n\nAñadir pruebas del comportamiento acordado y de los contratos entre componentes. No se ha seleccionado un framework de pruebas para el proyecto generado.\n',
    },
  ];
  for (const entry of entries) {
    let body = `${entry.body}\n\n${pending}`;
    if (entry.path === '00-project/vision.md')
      body = `${markdownText(config.project.purpose)}\n\n${body}`;
    if (entry.path === '02-architecture/overview.md')
      body = `Estilo: ${config.architecture.style}. Repositorio: ${config.workspace.organization}. Ejecución: ${config.workspace.deployment}.\n\n${layout.summary}\n\n${body}`;
    if (entry.path === '02-architecture/boundaries.md')
      body = `${layout.summary}\n\n${Object.entries(layout.layers)
        .map(([layer, role]) => `- **${layer || 'src'}**: ${role}`)
        .join('\n')}\n\n${body}`;
    files.push({
      path: `.docs/${entry.path}`,
      content: `# ${entry.title}: ${name}\n\n${body}\n`,
    });
  }
  const directories = new Set(
    entries.map((entry) => path.posix.dirname(entry.path)),
  );
  if (config.documentation.rfc) directories.add('06-decisions');
  for (const directory of directories) {
    const links = entries
      .filter((entry) => path.posix.dirname(entry.path) === directory)
      .map((entry) => `- [${entry.title}](${path.posix.basename(entry.path)})`);
    if (directory === '02-architecture') {
      if (config.documentation.adr) links.push('- [ADR](adr/README.md)');
      if (config.documentation.profile !== 'minimal')
        links.push('- [Diagramas](diagrams/README.md)');
    }
    if (directory === '06-decisions' && config.documentation.rfc)
      links.push('- [RFC](rfc/README.md)');
    files.push({
      path: `.docs/${directory}/README.md`,
      content: `# ${directory.slice(3)}\n\n${links.join('\n')}\n`,
    });
  }
  if (config.documentation.profile !== 'minimal')
    files.push({
      path: '.docs/02-architecture/diagrams/README.md',
      content:
        '# Diagramas\n\n<!-- archkit:pending -->\n\nPENDIENTE: documentar contexto y componentes con diagramas versionados junto al código.\n',
    });
  if (config.documentation.profile === 'extended') {
    files.push(
      {
        path: '.docs/security/README.md',
        content: '# Seguridad\n\n[Modelo de amenazas](threat-model.md).\n',
      },
      {
        path: '.docs/security/threat-model.md',
        content:
          '# Modelo de amenazas\n\n<!-- archkit:pending -->\n\nPENDIENTE: identificar activos, fronteras de confianza, amenazas, controles y riesgos residuales.\n',
      },
    );
  }
  files.push({
    path: '.docs/README.md',
    content: `# Documentación de ${name}\n\n${markdownText(config.project.description)}\n\nPerfil: ${config.documentation.profile}. [Contrato documental](contract.md).\n\n${[...directories].map((directory) => `- [${directory}](${directory}/README.md)`).join('\n')}\n${config.documentation.profile === 'extended' ? '- [Seguridad](security/README.md)\n' : ''}${config.documentation.adr ? '- [ADR](02-architecture/adr/README.md)\n' : ''}${config.documentation.rfc ? '- [RFC](06-decisions/rfc/README.md)\n' : ''}${config.agents.enabled ? '- [Agentes](agents.md)\n' : ''}${config.documentation.validator ? '- [Validador](validator.md)\n' : ''}`,
  });
  const base =
    config.workspace.deployment === 'modular-monolith'
      ? 'src/modules/core'
      : 'src';
  files.push({
    path: 'src/README.md',
    content: `# Estructura de desarrollo\n\n${layout.summary}\n\n${base === 'src' ? '' : 'El módulo inicial core es ilustrativo; sustituirlo por límites del dominio acordados. Un módulo sólo consume los contratos públicos de otro.\n\n'}${Object.entries(
      layout.layers,
    )
      .map(
        ([folder, role]) =>
          `- \`${base}${folder ? `/${folder}` : ''}\`: ${role}`,
      )
      .join(
        '\n',
      )}\n\nLos tipos Entity son ejemplos técnicos, no entidades de negocio aprobadas. Adaptar los contratos tras definir requisitos.\n`,
  });
  for (const [folder, role] of Object.entries(layout.layers)) {
    const folderPath = `${base}${folder ? `/${folder}` : ''}/README.md`;
    if (folderPath !== 'src/README.md')
      files.push({
        path: folderPath,
        content: `# ${folder || 'Código'}\n\n${role}\n`,
      });
  }
  for (const [file, content] of Object.entries(layout.sources))
    files.push({ path: `${base}/${file}`, content });
  const extensions = builtinRegistry().resolve(
    selectedExtensions(config),
    config,
  );
  for (const extension of extensions) files.push(...extension.generate(config));
  const plan: GenerationPlan = {
    files: files.sort((a, b) => a.path.localeCompare(b.path, 'en')),
    operations: config.tooling.git ? ['git-init'] : [],
  };
  checkPlan(plan);
  return plan;
}
export async function generateProject(
  input: unknown,
  destination: string,
  options: { signal?: AbortSignal } = {},
): Promise<string[]> {
  const config: Config = resolveConfig(input);
  const plan = await buildPlan(config);
  return executePlan(plan, destination, {
    ...options,
    verify: async (root) => {
      const issues = await validateDocumentation(root);
      const errors = issues.filter((issue) => issue.severity === 'error');
      if (errors.length)
        throw new Error(
          `La verificación previa falló: ${errors.map((issue) => `${issue.rule} ${issue.file}: ${issue.message}`).join('\n')}`,
        );
      for (const extension of builtinRegistry().resolve(
        selectedExtensions(config),
        config,
      )) {
        const errors = await extension.validate?.(root, config);
        if (errors?.length) throw new Error(errors.join('\n'));
      }
    },
  });
}
