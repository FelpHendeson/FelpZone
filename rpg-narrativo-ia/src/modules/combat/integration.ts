import type { GameEffect } from '../../core/events';
import { CombatError } from './errors';
import type { CombatOutcome, EncounterDefinition, IndexedCombat } from './types';

export function combatEncounterResolvedFlag(encounterId: string): string {
  return `combat.${encounterId}.resolved`;
}

export function listAvailableEncounters(
  catalog: IndexedCombat,
  locationId: string,
  flags: Readonly<Record<string, boolean>>,
): EncounterDefinition[] {
  return catalog.encounters
    .filter((encounter) => encounter.locationId === locationId)
    .filter((encounter) => flags[combatEncounterResolvedFlag(encounter.id)] !== true)
    .map((encounter) => ({ ...encounter }));
}

export function resolveEncounterOutcome(encounterId: string, outcome: CombatOutcome): GameEffect[] {
  if (outcome === 'victory') {
    return [
      { type: 'flag.set', flag: combatEncounterResolvedFlag(encounterId), value: true },
      { type: 'attribute.change', attribute: 'cautela', amount: 2 },
    ];
  }
  if (outcome === 'defeat') {
    return [{ type: 'attribute.change', attribute: 'saude', amount: -8 }];
  }
  if (outcome === 'fled') {
    return [];
  }
  throw new CombatError('O combate ainda não terminou.');
}
