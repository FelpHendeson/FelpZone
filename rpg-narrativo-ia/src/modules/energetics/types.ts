export const ENERGY_KINDS = ['eteris', 'numen'] as const;

export type EnergyKind = (typeof ENERGY_KINDS)[number];

export const APPLICATION_FIELDS = ['corpo', 'poder'] as const;

export type ApplicationField = (typeof APPLICATION_FIELDS)[number];

export interface EnergyDefinition {
  id: EnergyKind;
  name: string;
  description: string;
}

export interface ApplicationFieldDefinition {
  id: ApplicationField;
  name: string;
  description: string;
}

export interface EnergeticsCatalog {
  energies: readonly EnergyDefinition[];
  fields: readonly ApplicationFieldDefinition[];
}

export interface IndexedEnergetics {
  readonly energies: readonly EnergyDefinition[];
  readonly fields: readonly ApplicationFieldDefinition[];
  readonly energyById: ReadonlyMap<EnergyKind, EnergyDefinition>;
  readonly fieldById: ReadonlyMap<ApplicationField, ApplicationFieldDefinition>;
}

export type EnergeticsInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
