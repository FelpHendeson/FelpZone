import { EnergeticsError } from './errors';
import { INITIAL_ENERGETICS_CATALOG } from './initial-energetics';
import {
  APPLICATION_FIELDS,
  ENERGY_KINDS,
  type ApplicationField,
  type ApplicationFieldDefinition,
  type EnergeticsInspection,
  type EnergyDefinition,
  type EnergyKind,
  type IndexedEnergetics,
} from './types';

export { EnergeticsError } from './errors';

export const INITIAL_ENERGETICS = indexEnergeticsCatalog(INITIAL_ENERGETICS_CATALOG);

export function isEnergyKind(value: unknown): value is EnergyKind {
  return typeof value === 'string' && (ENERGY_KINDS as readonly string[]).includes(value);
}

export function isApplicationField(value: unknown): value is ApplicationField {
  return typeof value === 'string' && (APPLICATION_FIELDS as readonly string[]).includes(value);
}

export function inspectEnergeticsCatalog(value: unknown): EnergeticsInspection<IndexedEnergetics> {
  if (!isRecord(value) || !Array.isArray(value.energies) || !Array.isArray(value.fields)) {
    return fail('O catálogo de energéticos é inválido.');
  }

  const energies = inspectEnergies(value.energies);
  if (!energies.ok) {
    return energies;
  }

  const fields = inspectFields(value.fields);
  if (!fields.ok) {
    return fields;
  }

  return { ok: true, value: freezeCatalog(energies.value, fields.value) };
}

export function indexEnergeticsCatalog(value: unknown): IndexedEnergetics {
  const inspected = inspectEnergeticsCatalog(value);
  if (!inspected.ok) {
    throw new EnergeticsError(inspected.reason);
  }
  return inspected.value;
}

export function getEnergy(catalog: IndexedEnergetics, energyId: EnergyKind): EnergyDefinition {
  const energy = requireIndexed(catalog).energyById.get(energyId);
  if (!energy) {
    throw new EnergeticsError('A energia não existe.');
  }
  return { ...energy };
}

export function getApplicationField(catalog: IndexedEnergetics, fieldId: ApplicationField): ApplicationFieldDefinition {
  const field = requireIndexed(catalog).fieldById.get(fieldId);
  if (!field) {
    throw new EnergeticsError('O campo de aplicação não existe.');
  }
  return { ...field };
}

export function hasApplicationField(catalog: IndexedEnergetics, fieldId: unknown): fieldId is ApplicationField {
  return isApplicationField(fieldId) && requireIndexed(catalog).fieldById.has(fieldId);
}

function inspectEnergies(values: readonly unknown[]): EnergeticsInspection<EnergyDefinition[]> {
  if (values.length !== ENERGY_KINDS.length) {
    return fail('O catálogo precisa declarar exatamente as energias conhecidas.');
  }

  const energies: EnergyDefinition[] = [];
  const seen = new Set<EnergyKind>();
  for (const entry of values) {
    if (!isRecord(entry) || !isEnergyKind(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.description)) {
      return fail('A definição de energia é inválida.');
    }
    if (seen.has(entry.id)) {
      return fail('As energias precisam ser únicas.');
    }
    seen.add(entry.id);
    energies.push({ id: entry.id, name: entry.name, description: entry.description });
  }

  if (!ENERGY_KINDS.every((kind) => seen.has(kind))) {
    return fail('O catálogo precisa declarar todas as energias conhecidas.');
  }

  return { ok: true, value: energies };
}

function inspectFields(values: readonly unknown[]): EnergeticsInspection<ApplicationFieldDefinition[]> {
  if (values.length !== APPLICATION_FIELDS.length) {
    return fail('O catálogo precisa declarar exatamente os campos de aplicação conhecidos.');
  }

  const fields: ApplicationFieldDefinition[] = [];
  const seen = new Set<ApplicationField>();
  for (const entry of values) {
    if (!isRecord(entry) || !isApplicationField(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.description)) {
      return fail('A definição de campo de aplicação é inválida.');
    }
    if (seen.has(entry.id)) {
      return fail('Os campos de aplicação precisam ser únicos.');
    }
    seen.add(entry.id);
    fields.push({ id: entry.id, name: entry.name, description: entry.description });
  }

  if (!APPLICATION_FIELDS.every((field) => seen.has(field))) {
    return fail('O catálogo precisa declarar todos os campos de aplicação conhecidos.');
  }

  return { ok: true, value: fields };
}

function freezeCatalog(
  energies: EnergyDefinition[],
  fields: ApplicationFieldDefinition[],
): IndexedEnergetics {
  const frozenEnergies = Object.freeze(energies.map((energy) => Object.freeze({ ...energy })));
  const frozenFields = Object.freeze(fields.map((field) => Object.freeze({ ...field })));
  return Object.freeze({
    energies: frozenEnergies,
    fields: frozenFields,
    energyById: new Map(frozenEnergies.map((energy) => [energy.id, energy] as const)),
    fieldById: new Map(frozenFields.map((field) => [field.id, field] as const)),
  });
}

function requireIndexed(catalog: IndexedEnergetics): IndexedEnergetics {
  if (
    !isRecord(catalog) ||
    !Array.isArray(catalog.energies) ||
    !Array.isArray(catalog.fields) ||
    !isReadonlyMap(catalog.energyById) ||
    !isReadonlyMap(catalog.fieldById)
  ) {
    throw new EnergeticsError('O catálogo indexado de energéticos é inválido.');
  }
  return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return value instanceof Map;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fail<T>(reason: string): EnergeticsInspection<T> {
  return { ok: false, reason };
}

export {
  APPLICATION_FIELDS,
  ENERGY_KINDS,
  type ApplicationField,
  type ApplicationFieldDefinition,
  type EnergeticsCatalog,
  type EnergeticsInspection,
  type EnergyDefinition,
  type EnergyKind,
  type IndexedEnergetics,
} from './types';

export { INITIAL_ENERGETICS_CATALOG } from './initial-energetics';
