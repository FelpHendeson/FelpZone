import { describe, expect, it } from 'vitest';
import {
  APPLICATION_FIELDS,
  ENERGY_KINDS,
  EnergeticsError,
  INITIAL_ENERGETICS,
  INITIAL_ENERGETICS_CATALOG,
  getApplicationField,
  getEnergy,
  hasApplicationField,
  indexEnergeticsCatalog,
  inspectEnergeticsCatalog,
  isApplicationField,
  isEnergyKind,
  type EnergeticsCatalog,
  type IndexedEnergetics,
} from '../modules/energetics';

function catalog(): EnergeticsCatalog {
  return {
    energies: [
      { id: 'eteris', name: 'Eteris', description: 'Energia ambiental.' },
      { id: 'numen', name: 'Númen', description: 'Eteris interiorizado.' },
    ],
    fields: [
      { id: 'corpo', name: 'Corpo', description: 'Aplicações interiorizadas.' },
      { id: 'poder', name: 'Poder', description: 'Aplicações exteriorizadas.' },
    ],
  };
}

describe('Fatia 11.1 — catálogo de energéticos', () => {
  it('indexa energias e campos válidos preservando a ordem declarada', () => {
    const value = indexEnergeticsCatalog(catalog());

    expect(value.energies.map((energy) => energy.id)).toEqual(['eteris', 'numen']);
    expect(value.fields.map((field) => field.id)).toEqual(['corpo', 'poder']);
    expect(getEnergy(value, 'numen').name).toBe('Númen');
    expect(getApplicationField(value, 'corpo').name).toBe('Corpo');
  });

  it('reconhece as energias e os campos canônicos', () => {
    expect(ENERGY_KINDS).toEqual(['eteris', 'numen']);
    expect(APPLICATION_FIELDS).toEqual(['corpo', 'poder']);
    expect(isEnergyKind('eteris')).toBe(true);
    expect(isEnergyKind('mana')).toBe(false);
    expect(isApplicationField('poder')).toBe(true);
    expect(isApplicationField('mente')).toBe(false);
    expect(hasApplicationField(INITIAL_ENERGETICS, 'corpo')).toBe(true);
    expect(hasApplicationField(INITIAL_ENERGETICS, 'mente')).toBe(false);
  });

  it.each([
    null,
    {},
    { energies: 'invalid', fields: [] },
    { energies: catalog().energies, fields: 'invalid' },
    { energies: [catalog().energies[0]], fields: catalog().fields },
    { energies: [...catalog().energies, catalog().energies[0]], fields: catalog().fields },
    { energies: [{ id: 'eteris', name: 'Eteris', description: 'x' }, { id: 'eteris', name: 'Eteris', description: 'y' }], fields: catalog().fields },
    { energies: [{ id: 'mana', name: 'Mana', description: 'x' }, catalog().energies[1]], fields: catalog().fields },
    { energies: [{ id: 'eteris', name: ' ', description: 'x' }, catalog().energies[1]], fields: catalog().fields },
    { energies: catalog().energies, fields: [catalog().fields[0]] },
    { energies: catalog().energies, fields: [{ id: 'mente', name: 'Mente', description: 'x' }, catalog().fields[1]] },
    { energies: catalog().energies, fields: [{ id: 'corpo', name: 'Corpo', description: '' }, catalog().fields[1]] },
  ])('rejeita forma de catálogo inválida %#', (value) => {
    expect(inspectEnergeticsCatalog(value).ok).toBe(false);
  });

  it('congela definições e devolve cópias defensivas nas consultas', () => {
    const source = catalog();
    const value = indexEnergeticsCatalog(source);

    source.energies[0].name = 'Alterado fora';
    expect(value.energies[0].name).toBe('Eteris');
    expect(() => ((value.energies[0] as unknown as { name: string }).name = 'x')).toThrow();
    expect(() => (value.energies as unknown as unknown[]).push({})).toThrow();

    const copied = getEnergy(value, 'eteris');
    copied.name = 'mutado';
    expect(getEnergy(value, 'eteris').name).toBe('Eteris');
  });

  it('falha de forma controlada para catálogos e IDs inválidos', () => {
    expect(() => indexEnergeticsCatalog({})).toThrow(EnergeticsError);
    const value = indexEnergeticsCatalog(catalog());
    expect(() => getEnergy({} as IndexedEnergetics, 'eteris')).toThrow(EnergeticsError);
    expect(() => getApplicationField(value, 'mente' as never)).toThrow(EnergeticsError);
  });

  it('valida o catálogo inicial versionado', () => {
    expect(inspectEnergeticsCatalog(INITIAL_ENERGETICS_CATALOG).ok).toBe(true);
    expect(INITIAL_ENERGETICS.energies.map((energy) => energy.id)).toEqual(['eteris', 'numen']);
  });
});
