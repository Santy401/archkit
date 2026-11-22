import type { EntityRepository } from '../ports/outbound/entity-repository.js';
import type { FindEntity } from '../ports/inbound/find-entity.js';
export function createFindEntity(repository: EntityRepository): FindEntity {
  return { execute: (id) => repository.findById(id) };
}
