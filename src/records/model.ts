export const recordTypes = ['adr', 'rfc'] as const;
export type RecordType = (typeof recordTypes)[number];
export const recordDirectories: Record<RecordType, string> = {
  adr: '.docs/02-architecture/adr',
  rfc: '.docs/06-decisions/rfc',
};
export const recordStates: Record<RecordType, readonly string[]> = {
  adr: ['propuesto', 'aceptado', 'rechazado', 'sustituido'],
  rfc: ['borrador', 'en-revision', 'aceptada', 'rechazada', 'retirada'],
};
export const acceptedSections: Record<RecordType, readonly string[]> = {
  adr: ['Contexto', 'Decisión', 'Consecuencias'],
  rfc: ['Motivación', 'Propuesta', 'Impacto', 'Plan de validación'],
};
