import type { Entity } from '../../../domain/entity.js';
export interface EntityRepository { findById(id: string): Promise<Entity | undefined> }
