import type { Entity } from '../../../domain/entity.js';
export interface FindEntity { execute(id: string): Promise<Entity | undefined> }
