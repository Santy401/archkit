export { resolveConfig, loadConfig, configSchema } from './core/config.js';
export type { Config } from './core/config.js';
export { buildPlan, generateProject } from './core/project.js';
export { ExtensionRegistry } from './core/registry.js';
export type { Extension } from './core/registry.js';
export { executePlan, render } from './blueprints/engine.js';
export type { GenerationPlan, PlannedFile } from './blueprints/engine.js';
export { validateDocumentation } from './validation/validator.js';
export { newRecord, findProject } from './records/records.js';
