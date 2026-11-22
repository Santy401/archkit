import { z } from 'zod';
import { parse } from 'yaml';
import { readFile } from 'node:fs/promises';

export const styles = ['hexagonal', 'clean', 'layered', 'minimal'] as const;
export const profiles = ['minimal', 'standard', 'extended'] as const;
export const sizes = ['small', 'medium', 'large'] as const;
export const projectName = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    'Usa letras ASCII, números, guion o guion bajo; empieza con letra o número.',
  )
  .refine(
    (value) => !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(value),
    'Nombre reservado por Windows.',
  );
const text = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (value) =>
      ![...value].some((character) => {
        const code = character.charCodeAt(0);
        return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
      }),
    'Texto con caracteres de control.',
  );
export const configSchema = z
  .strictObject({
    schemaVersion: z.literal(1).default(1),
    project: z.strictObject({
      name: projectName,
      description: text,
      purpose: text.default('PENDIENTE: definir el propósito con el equipo.'),
      size: z.enum(sizes).default('medium'),
      type: z
        .enum(['application', 'library', 'prototype'])
        .default('application'),
      author: text.optional(),
    }),
    workspace: z
      .strictObject({
        organization: z.enum(['single', 'monorepo']).default('single'),
        deployment: z
          .enum(['monolith', 'modular-monolith', 'services'])
          .default('modular-monolith'),
      })
      .default({ organization: 'single', deployment: 'modular-monolith' }),
    architecture: z
      .strictObject({ style: z.enum(styles).default('hexagonal') })
      .default({ style: 'hexagonal' }),
    documentation: z
      .strictObject({
        profile: z.enum(profiles).default('standard'),
        adr: z.boolean().default(true),
        rfc: z.boolean().default(true),
        validator: z.boolean().default(true),
      })
      .default({ profile: 'standard', adr: true, rfc: true, validator: true }),
    agents: z
      .strictObject({ enabled: z.boolean().default(true) })
      .default({ enabled: true }),
    tooling: z
      .strictObject({
        git: z.boolean().default(false),
        quality: z.boolean().default(true),
      })
      .default({ git: false, quality: true }),
  })
  .superRefine((config, ctx) => {
    if (config.workspace.organization !== 'single')
      ctx.addIssue({
        code: 'custom',
        path: ['workspace', 'organization'],
        message: 'Monorepo no está soportado en v0.1.0; usa single.',
      });
    if (config.workspace.deployment === 'services')
      ctx.addIssue({
        code: 'custom',
        path: ['workspace', 'deployment'],
        message: 'Servicios independientes no están soportados en v0.1.0.',
      });
  });
export type Config = z.infer<typeof configSchema>;
export function resolveConfig(input: unknown): Config {
  const result = configSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Configuración inválida:\n${result.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n')}`,
    );
  return result.data;
}
export async function loadConfig(file: string): Promise<Config> {
  return resolveConfig(
    parse(await readFile(file, 'utf8'), { maxAliasCount: 0 }),
  );
}
export function recommendations(size: Config['project']['size']) {
  return {
    profile:
      size === 'small' ? 'minimal' : size === 'large' ? 'extended' : 'standard',
    deployment: size === 'small' ? 'monolith' : 'modular-monolith',
  } as const;
}
