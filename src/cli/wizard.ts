import * as prompts from '@clack/prompts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  projectName,
  recommendations,
  resolveConfig,
  sizes,
  styles,
  profiles,
} from '../core/config.js';
import type { Config } from '../core/config.js';

export class Cancelled extends Error {
  constructor() {
    super('Operación cancelada; no se generaron archivos.');
  }
}
export function answer<T>(value: T): Exclude<T, symbol> {
  if (prompts.isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
}
export async function gitAvailable(): Promise<boolean> {
  try {
    await promisify(execFile)('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}
const options = <T extends string>(values: readonly T[]) =>
  values.map((value) => ({ value, label: value }));
export async function wizard(
  name?: string,
  signal?: AbortSignal,
): Promise<Config> {
  const context = signal ? { signal } : {};
  prompts.intro('ArchKit 0.1.0');
  prompts.log.step('1/7 · Identidad');
  const project = {
    name:
      name ??
      answer(
        await prompts.text({
          ...context,
          message: 'Nombre del proyecto',
          validate(value) {
            const result = projectName.safeParse(value);
            return result.success ? undefined : result.error.issues[0]?.message;
          },
        }),
      ),
    description: answer(
      await prompts.text({
        ...context,
        message: 'Descripción',
        validate: (value) =>
          value?.trim() ? undefined : 'La descripción es obligatoria.',
      }),
    ),
    purpose: answer(
      await prompts.text({
        ...context,
        message: 'Propósito general',
        validate: (value) =>
          value?.trim() ? undefined : 'Indica el propósito.',
      }),
    ),
    type: answer(
      await prompts.select({
        ...context,
        message: 'Tipo',
        options: options(['application', 'library', 'prototype'] as const),
      }),
    ),
    author: answer(
      await prompts.text({
        ...context,
        message: 'Autor (opcional)',
        placeholder: 'Sin especificar',
      }),
    ),
  };
  prompts.log.step('2/7 · Tamaño y recomendaciones');
  const size = answer(
    await prompts.select<Config['project']['size']>({
      ...context,
      message: 'Tamaño (orienta los valores predeterminados)',
      options: sizes.map((value) => ({
        value,
        label: value,
        hint:
          value === 'small'
            ? 'prototipo o biblioteca sencilla'
            : value === 'medium'
              ? 'aplicación con responsabilidades diferenciadas'
              : 'sistema con mayor organización',
      })),
      initialValue: 'medium',
    }),
  );
  const recommended = recommendations(size);
  prompts.log.step('3/7 · Organización');
  const organization = answer(
    await prompts.select({
      ...context,
      message: 'Organización del repositorio',
      options: [
        { value: 'single' as const, label: 'Single-project' },
        {
          value: 'monorepo' as const,
          label: 'Monorepo (previsto; no soportado en v0.1.0)',
          disabled: true,
        },
      ],
    }),
  );
  const deployment = answer(
    await prompts.select({
      ...context,
      message: 'Arquitectura de ejecución',
      initialValue: recommended.deployment,
      options: [
        { value: 'monolith' as const, label: 'Monolito' },
        { value: 'modular-monolith' as const, label: 'Monolito modular' },
        {
          value: 'services' as const,
          label: 'Servicios independientes (previsto; no soportado en v0.1.0)',
          disabled: true,
        },
      ],
    }),
  );
  prompts.log.step('4/7 · Arquitectura');
  const style = answer(
    await prompts.select({
      ...context,
      message: 'Estilo arquitectónico',
      initialValue: 'hexagonal',
      options: styles.map((value) => ({
        value,
        label: value,
        hint: {
          hexagonal: 'dominio, puertos y adaptadores',
          clean: 'regla de dependencia hacia entidades y casos de uso',
          layered: 'presentación → negocio → datos',
          minimal: 'sin capas obligatorias',
        }[value],
      })),
    }),
  );
  prompts.log.step('5/7 · Documentación');
  const profile = answer(
    await prompts.select({
      ...context,
      message: 'Perfil documental',
      initialValue: recommended.profile,
      options: options(profiles),
    }),
  );
  prompts.log.step('6/7 · Componentes');
  const availableGit = await gitAvailable();
  const components = answer(
    await prompts.multiselect({
      ...context,
      message:
        'Componentes (ADR/RFC/validador/agentes requieren documentación, incluida en todos los perfiles)',
      required: false,
      initialValues: ['adr', 'rfc', 'validator', 'agents', 'quality'],
      options: [
        { value: 'adr', label: 'ADR' },
        { value: 'rfc', label: 'RFC' },
        { value: 'validator', label: 'Documentation Validator' },
        { value: 'agents', label: 'AI Agent Instructions' },
        {
          value: 'quality',
          label:
            'Basic Quality Configuration (EditorConfig, atributos Git y formato)',
        },
        {
          value: 'git',
          label: availableGit ? 'Git initialization' : 'Git no está disponible',
          disabled: !availableGit,
        },
      ],
    }),
  );
  return resolveConfig({
    project: { ...project, author: project.author.trim() || undefined, size },
    workspace: { organization, deployment },
    architecture: { style },
    documentation: {
      profile,
      adr: components.includes('adr'),
      rfc: components.includes('rfc'),
      validator: components.includes('validator'),
    },
    agents: { enabled: components.includes('agents') },
    tooling: {
      git: components.includes('git'),
      quality: components.includes('quality'),
    },
  });
}
export async function confirmGeneration(
  signal?: AbortSignal,
): Promise<boolean> {
  const context = signal ? { signal } : {};
  return answer(
    await prompts.confirm({
      ...context,
      message: '7/7 · ¿Generar este proyecto?',
      initialValue: true,
    }),
  );
}
export async function askTitle(
  kind: string,
  signal?: AbortSignal,
): Promise<string> {
  const context = signal ? { signal } : {};
  return answer(
    await prompts.text({
      ...context,
      message: `Título ${kind.toUpperCase()}`,
      validate: (value) =>
        value?.trim() ? undefined : 'El título es obligatorio.',
    }),
  );
}
