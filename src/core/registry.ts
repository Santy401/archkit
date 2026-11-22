import type { Config } from './config.js';
import type { PlannedFile } from '../blueprints/engine.js';

export interface Extension {
  id: string;
  capabilities: readonly string[];
  requires: readonly string[];
  conflicts: readonly string[];
  compatible(config: Config): string | undefined;
  generate(config: Config): PlannedFile[];
  validate?(root: string, config: Config): Promise<string[]>;
}
export class ExtensionRegistry {
  private readonly entries = new Map<string, Extension>();
  register(extension: Extension): this {
    if (this.entries.has(extension.id))
      throw new Error(`Extensión duplicada: ${extension.id}`);
    this.entries.set(extension.id, extension);
    return this;
  }
  resolve(ids: readonly string[], config: Config): Extension[] {
    const resolved = new Map<string, Extension>();
    const visiting = new Set<string>();
    const visit = (id: string) => {
      if (visiting.has(id)) throw new Error(`Dependencia circular: ${id}`);
      if (resolved.has(id)) return;
      const extension = this.entries.get(id);
      if (!extension) throw new Error(`Extensión desconocida: ${id}`);
      const reason = extension.compatible(config);
      if (reason) throw new Error(`${id}: ${reason}`);
      visiting.add(id);
      for (const dependency of extension.requires) visit(dependency);
      visiting.delete(id);
      resolved.set(id, extension);
    };
    for (const id of ids) visit(id);
    for (const extension of resolved.values())
      for (const conflict of extension.conflicts) {
        if (resolved.has(conflict))
          throw new Error(
            `Extensiones incompatibles: ${extension.id}, ${conflict}`,
          );
      }
    return [...resolved.values()];
  }
}
