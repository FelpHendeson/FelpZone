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
  revealedDiscoveryIds: readonly string[] = [],
): EncounterDefinition[] {
  const revealed = new Set(revealedDiscoveryIds);
  return catalog.encounters
    .filter((encounter) => encounter.locationId === locationId)
    .filter((encounter) => flags[combatEncounterResolvedFlag(encounter.id)] !== true)
    .filter((encounter) => encounter.requiredDiscoveryIds.every((id) => revealed.has(id)))
    .map((encounter) => copyEncounter(encounter));
}

export function validateEncounterDiscoveries(
  catalog: IndexedCombat,
  knownDiscoveryIds: ReadonlySet<string>,
): void {
  for (const encounter of catalog.encounters) {
    for (const id of encounter.requiredDiscoveryIds) {
      if (!knownDiscoveryIds.has(id)) {
        throw new CombatError(`O encontro ${encounter.id} exige uma descoberta inexistente: ${id}.`);
      }
    }
  }
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

function copyEncounter(encounter: EncounterDefinition): EncounterDefinition {
  return {
    ...encounter,
    timeCost: { ...encounter.timeCost },
    requiredDiscoveryIds: [...encounter.requiredDiscoveryIds],
  };
}
