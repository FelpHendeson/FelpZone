import { describe, expect, it } from 'vitest';
import { INITIAL_SKILLS } from '../modules/skills';
import {
  CombatError,
  INITIAL_COMBAT,
  INITIAL_COMBAT_CATALOG,
  getCombatAction,
  getCombatant,
  getEncounter,
  indexCombatCatalog,
  inspectCombatCatalog,
  listEncountersByLocation,
  type CombatActionDefinition,
  type CombatCatalog,
  type IndexedCombat,
} from '../modules/combat';

function catalog(): CombatCatalog {
  return {
    actions: [
      { id: 'attack', name: 'Golpe', description: 'Golpe direto.', speed: 10, target: 'opponent', effects: [{ type: 'damage', amount: 5 }] },
      { id: 'guard', name: 'Defesa', description: 'Escudo.', speed: 14, target: 'self', effects: [{ type: 'guard', amount: 6 }] },
      { id: 'precise', name: 'Preciso', description: 'Usa Sentidos.', speed: 8, target: 'opponent', effects: [{ type: 'damage', amount: 9 }], skillId: 'sharpened-senses' },
    ],
    combatants: [{ id: 'beast', name: 'Fera', maxHealth: 18, actionIds: ['attack', 'guard'] }],
    encounters: [{ id: 'enc', locationId: 'clearing', opponentId: 'beast', name: 'Fera', description: 'Rosna.' }],
  };
}

function indexed(): IndexedCombat {
  return indexCombatCatalog(catalog(), INITIAL_SKILLS);
}

describe('Fatia 12.1 — catálogo de combate', () => {
  it('indexa ações, combatentes e encontros preservando a ordem e resolvendo referências', () => {
    const value = indexed();
    expect(value.actions.map((a) => a.id)).toEqual(['attack', 'guard', 'precise']);
    expect(getCombatant(value, 'beast').actionIds).toEqual(['attack', 'guard']);
    expect(getEncounter(value, 'enc').opponentId).toBe('beast');
    expect(listEncountersByLocation(value, 'clearing').map((e) => e.id)).toEqual(['enc']);
    expect(listEncountersByLocation(value, 'nowhere')).toEqual([]);
    expect(getCombatAction(value, 'precise').skillId).toBe('sharpened-senses');
  });

  it.each([
    null,
    {},
    { actions: 'x', combatants: [], encounters: [] },
    { actions: [{ id: '', name: 'a', description: 'b', speed: 1, target: 'self', effects: [{ type: 'guard', amount: 1 }] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 0, target: 'self', effects: [{ type: 'guard', amount: 1 }] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 1, target: 'mind', effects: [{ type: 'guard', amount: 1 }] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 1, target: 'self', effects: [] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 1, target: 'self', effects: [{ type: 'poison', amount: 1 }] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 1, target: 'self', effects: [{ type: 'damage', amount: 0 }] }], combatants: [], encounters: [] },
    { actions: [{ id: 'a', name: 'a', description: 'b', speed: 1, target: 'opponent', effects: [{ type: 'damage', amount: 1 }], skillId: 'ghost-skill' }], combatants: [], encounters: [] },
    { actions: catalog().actions, combatants: [{ id: 'x', name: 'X', maxHealth: 5, actionIds: ['missing'] }], encounters: [] },
    { actions: catalog().actions, combatants: [{ id: 'x', name: 'X', maxHealth: 0, actionIds: ['attack'] }], encounters: [] },
    { actions: catalog().actions, combatants: catalog().combatants, encounters: [{ id: 'e', locationId: 'l', opponentId: 'ghost', name: 'n', description: 'd' }] },
  ])('rejeita catálogo inválido %#', (value) => {
    expect(inspectCombatCatalog(value, INITIAL_SKILLS).ok).toBe(false);
  });

  it('congela e devolve cópias defensivas', () => {
    const source = catalog();
    const value = indexCombatCatalog(source, INITIAL_SKILLS);
    source.actions[0].name = 'Alterado';
    expect(value.actions[0].name).toBe('Golpe');
    expect(() => (value.actions as CombatActionDefinition[]).push(source.actions[0])).toThrow();
    expect(() => ((value.actions[0].effects[0] as { amount: number }).amount = 99)).toThrow();
    const copied = getCombatAction(value, 'attack');
    copied.effects[0].amount = 100;
    expect(getCombatAction(value, 'attack').effects[0].amount).toBe(5);
  });

  it('protege o índice e falha de forma controlada', () => {
    const value = indexed();
    expect(() => (value.actionById as Map<string, CombatActionDefinition>).set('x', source())).toThrow(CombatError);
    expect(() => getCombatAction(value, 'missing')).toThrow(CombatError);
    expect(() => getCombatant(value, 'missing')).toThrow(CombatError);
    expect(() => getEncounter(value, 'missing')).toThrow(CombatError);
    expect(() => getCombatAction({} as IndexedCombat, 'attack')).toThrow(CombatError);
  });

  it('valida o catálogo inicial versionado contra as habilidades iniciais', () => {
    expect(inspectCombatCatalog(INITIAL_COMBAT_CATALOG, INITIAL_SKILLS).ok).toBe(true);
    expect(INITIAL_COMBAT.encounters.length).toBeGreaterThan(0);
  });
});

function source(): CombatActionDefinition {
  return { id: 'x', name: 'X', description: 'd', speed: 1, target: 'self', effects: [{ type: 'guard', amount: 1 }] };
}
