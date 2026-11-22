import path from 'node:path';
import { Command } from 'commander';
import { loadConfig, resolveConfig } from '../core/config.js';
import { buildPlan, generateProject } from '../core/project.js';
import { selectedExtensions } from '../core/extensions.js';
import { findProject, newRecord } from '../records/records.js';
import { recordTypes } from '../records/model.js';
import { validateDocumentation } from '../validation/validator.js';
import { askTitle, Cancelled, confirmGeneration, wizard } from './wizard.js';
import type { Config } from '../core/config.js';

interface InitOptions {
  config?: string;
  nonInteractive?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  output?: string;
  description?: string;
  purpose?: string;
  author?: string;
  type?: string;
  size?: string;
  organization?: string;
  deployment?: string;
  architecture?: string;
  docs?: string;
  adr?: boolean;
  rfc?: boolean;
  validator?: boolean;
  agents?: boolean;
  quality?: boolean;
  git?: boolean;
}
function fromOptions(
  name: string | undefined,
  flags: InitOptions,
  base?: Config,
): Config {
  return resolveConfig({
    schemaVersion: 1,
    project: {
      ...base?.project,
      ...(name !== undefined ? { name } : {}),
      ...(flags.description !== undefined
        ? { description: flags.description }
        : {}),
      ...(flags.purpose !== undefined ? { purpose: flags.purpose } : {}),
      ...(flags.author !== undefined ? { author: flags.author } : {}),
      ...(flags.size !== undefined ? { size: flags.size } : {}),
      ...(flags.type !== undefined ? { type: flags.type } : {}),
    },
    workspace: {
      ...base?.workspace,
      ...(flags.organization !== undefined
        ? { organization: flags.organization }
        : {}),
      ...(flags.deployment !== undefined
        ? { deployment: flags.deployment }
        : {}),
    },
    architecture: {
      ...base?.architecture,
      ...(flags.architecture !== undefined
        ? { style: flags.architecture }
        : {}),
    },
    documentation: {
      ...base?.documentation,
      ...(flags.docs !== undefined ? { profile: flags.docs } : {}),
      ...(flags.adr !== undefined ? { adr: flags.adr } : {}),
      ...(flags.rfc !== undefined ? { rfc: flags.rfc } : {}),
      ...(flags.validator !== undefined ? { validator: flags.validator } : {}),
    },
    agents: {
      ...base?.agents,
      ...(flags.agents !== undefined ? { enabled: flags.agents } : {}),
    },
    tooling: {
      ...base?.tooling,
      ...(flags.quality !== undefined ? { quality: flags.quality } : {}),
      ...(flags.git !== undefined ? { git: flags.git } : {}),
    },
  });
}
export function createProgram(version: string, signal?: AbortSignal): Command {
  const program = new Command()
    .name('archkit')
    .description('Genera bases de proyectos y documentación de ingeniería.')
    .version(version)
    .showHelpAfterError()
    .exitOverride();
  program
    .command('init [name]')
    .description(
      'Inicializa un proyecto mediante asistente, opciones o YAML/JSON.',
    )
    .option('-c, --config <file>', 'Configuración YAML o JSON schemaVersion: 1')
    .option('--non-interactive', 'No solicitar información por terminal')
    .option(
      '-y, --yes',
      'Autorizar el plan de generación (obligatorio sin terminal)',
    )
    .option('--dry-run', 'Mostrar el plan sin crear archivos')
    .option('-o, --output <directory>', 'Directorio nuevo de destino')
    .option('--description <text>', 'Descripción obligatoria')
    .option('--purpose <text>', 'Propósito del proyecto')
    .option('--author <text>', 'Autor opcional')
    .option('--type <type>', 'application | library | prototype')
    .option('--size <size>', 'small | medium | large')
    .option('--organization <organization>', 'single; monorepo no soportado')
    .option(
      '--deployment <deployment>',
      'monolith | modular-monolith; services no soportado',
    )
    .option('--architecture <style>', 'hexagonal | clean | layered | minimal')
    .option('--docs <profile>', 'minimal | standard | extended')
    .option('--no-adr', 'Excluir ADR', undefined)
    .option('--no-rfc', 'Excluir RFC', undefined)
    .option('--no-validator', 'Excluir instrucciones del validador', undefined)
    .option('--no-agents', 'Excluir instrucciones para agentes', undefined)
    .option(
      '--no-quality',
      'Excluir configuración básica de calidad',
      undefined,
    )
    .option('--git', 'Inicializar Git local; no instala ni publica nada')
    .action(
      async (
        name: string | undefined,
        flags: InitOptions,
        command: Command,
      ) => {
        flags = { ...flags };
        for (const key of [
          'adr',
          'rfc',
          'validator',
          'agents',
          'quality',
        ] as const)
          if (command.getOptionValueSource(key) !== 'cli') delete flags[key];
        if (!flags.nonInteractive && !flags.config && !process.stdin.isTTY)
          throw new Error(
            'Sin terminal interactiva: usa --non-interactive --yes o --config archivo --yes.',
          );
        const base = flags.config
          ? await loadConfig(path.resolve(flags.config))
          : flags.nonInteractive
            ? undefined
            : await wizard(name, signal);
        const config = fromOptions(name, flags, base);
        const destination = path.resolve(flags.output ?? config.project.name);
        const plan = await buildPlan(config);
        console.log(
          `\nProyecto: ${config.project.name}\nDestino: ${destination}\nArquitectura: ${config.architecture.style}\nOrganización: ${config.workspace.organization} / ${config.workspace.deployment}\nDocumentación: ${config.documentation.profile}\nExtensiones: ${selectedExtensions(config).join(', ')}\nOperaciones: crear ${plan.files.length} archivos${plan.operations.length ? ', git init' : ''}\n\n${plan.files.map((file) => `  ${file.path}`).join('\n')}\n`,
        );
        if (flags.dryRun) return;
        if (!flags.yes) {
          if (!process.stdin.isTTY)
            throw new Error(
              'Se requiere --yes para autorizar la generación no interactiva.',
            );
          if (!(await confirmGeneration(signal))) throw new Cancelled();
        }
        const files = await generateProject(
          config,
          destination,
          signal ? { signal } : {},
        );
        console.log(
          `Generados ${files.length} archivos en ${destination}.\nSiguiente paso: cd ${JSON.stringify(destination)} y archkit validate.`,
        );
      },
    );
  for (const type of recordTypes)
    program
      .command(type)
      .description(`Gestiona ${type.toUpperCase()}.`)
      .command('new [title]')
      .description(
        'Crea una propuesta y actualiza su índice sin editar decisiones previas.',
      )
      .option('--project <directory>', 'Buscar proyecto desde este directorio')
      .action(
        async (title: string | undefined, flags: { project?: string }) => {
          if (!title && !process.stdin.isTTY)
            throw new Error(
              'Indica un título para usar este comando sin terminal.',
            );
          console.log(
            await newRecord(
              flags.project ?? process.cwd(),
              type,
              title ?? (await askTitle(type, signal)),
            ),
          );
        },
      );
  program
    .command('validate')
    .description('Valida .docs y sus referencias.')
    .option('--project <directory>', 'Buscar proyecto desde este directorio')
    .option('--format <format>', 'human | json', 'human')
    .action(async (flags: { project?: string; format: string }) => {
      if (!['human', 'json'].includes(flags.format))
        throw new Error('Formato inválido: usa human o json.');
      const root = await findProject(flags.project ?? process.cwd());
      const issues = await validateDocumentation(root);
      const errors = issues.filter(
        (issue) => issue.severity === 'error',
      ).length;
      if (flags.format === 'json')
        console.log(JSON.stringify({ valid: errors === 0, issues }, null, 2));
      else {
        for (const issue of issues)
          console.log(
            `${issue.severity.toUpperCase()} ${issue.rule} ${issue.file}${issue.line ? `:${issue.line}` : ''}: ${issue.message}\n  → ${issue.suggestion}`,
          );
        console.log(
          `${errors === 0 ? 'Documentación válida' : 'Documentación inválida'}: ${errors} errores, ${issues.length - errors} advertencias.`,
        );
      }
      if (errors) process.exitCode = 1;
    });
  return program;
}
