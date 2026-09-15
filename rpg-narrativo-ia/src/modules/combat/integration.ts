import type { GameEffect } from '../../core/events';
import { CombatError } from './errors';
import type {
  CombatResolution,
  CombatState,
  EncounterDefinition,
  IndexedCombat,
} from './types';

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

export function buildCombatResolution(state: CombatState, encounter: EncounterDefinition): CombatResolution {
  if (state.outcome === 'ongoing') {
    throw new CombatError('O combate ainda não terminou.');
  }
  if (state.encounterId !== encounter.id) {
    throw new CombatError('A resolução não pertence ao encontro iniciado.');
  }
  if (!isSafeInteger(state.player.maxHealth) || !isSafeInteger(state.player.health) || !isSafeInteger(state.turn)) {
    throw new CombatError('O estado terminal de combate é inválido.');
  }
  return {
    encounterId: encounter.id,
    outcome: state.outcome,
    turns: state.turn,
    entryHealth: state.player.maxHealth,
    remainingHealth: state.player.health,
  };
}

export function terminalHealthFor(resolution: CombatResolution): number {
  return resolution.outcome === 'defeat' ? 1 : resolution.remainingHealth;
}

export function combatResolutionEffects(resolution: CombatResolution, currentSaude: number): GameEffect[] {
  const effects: GameEffect[] = [];
  const delta = terminalHealthFor(resolution) - currentSaude;
  if (delta !== 0) {
    effects.push({ type: 'attribute.change', attribute: 'saude', amount: delta });
  }
  if (resolution.outcome === 'victory') {
    effects.push({ type: 'flag.set', flag: combatEncounterResolvedFlag(resolution.encounterId), value: true });
    effects.push({ type: 'attribute.change', attribute: 'cautela', amount: 2 });
  }
  return effects;
}

function isSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function copyEncounter(encounter: EncounterDefinition): EncounterDefinition {
  return {
    ...encounter,
    timeCost: { ...encounter.timeCost },
    requiredDiscoveryIds: [...encounter.requiredDiscoveryIds],
  };
}
