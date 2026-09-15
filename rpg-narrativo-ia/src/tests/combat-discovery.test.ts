import { describe, expect, it } from 'vitest';
import {
  CombatError,
  INITIAL_COMBAT,
  listAvailableEncounters,
  validateEncounterDiscoveries,
} from '../modules/combat';
import { INITIAL_EXPLORATION_DEFINITIONS } from '../modules/exploration';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';

const KNOWN_DISCOVERY_IDS = new Set(
  INITIAL_EXPLORATION_DEFINITIONS.flatMap((location) => location.discoveries.map((discovery) => discovery.id)),
);

describe('Fatia 12.8 — descoberta e disponibilidade de encontros', () => {
  it('só revela a ameaça quando a descoberta exigida está revelada no local', () => {
    const hidden = listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, {}, []);
    expect(hidden.map((encounter) => encounter.id)).not.toContain('clearing-predator');

    const revealed = listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, {}, [
      'wary-predator-tracks',
    ]);
    expect(revealed.map((encounter) => encounter.id)).toContain('clearing-predator');
  });

  it('o encontro protótipo declara custo temporal e o requisito de descoberta', () => {
    const encounter = INITIAL_COMBAT.encounters.find((entry) => entry.id === 'clearing-predator');
    expect(encounter?.timeCost).toEqual({ periods: 1 });
    expect(encounter?.requiredDiscoveryIds).toEqual(['wary-predator-tracks']);
  });

  it('a validação de composição aceita requisitos existentes no catálogo de exploração', () => {
    expect(() => validateEncounterDiscoveries(INITIAL_COMBAT, KNOWN_DISCOVERY_IDS)).not.toThrow();
  });

  it('a validação de composição rejeita requisito de descoberta inexistente', () => {
    expect(() => validateEncounterDiscoveries(INITIAL_COMBAT, new Set<string>())).toThrow(CombatError);
  });
});
