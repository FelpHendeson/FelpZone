import type { GameEffect } from '../../core/events';
import { copyExecutionState, createInitialExecutionState } from '../execution';
import { CombatError } from './errors';
import type {
  CombatLoadoutSnapshot,
  CombatResolution,
  CombatState,
  EncounterDefinition,
  IndexedCombat,
  PreparedConsumableState,
} from './types';
import { createCombat, emptyCombatLoadout, resolveTurn } from './engine';

export interface VerifyCombatResolutionOptions {
  playerName?: string;
  knownSkillIds?: readonly string[];
  playerMaxHealth: number;
  loadout?: CombatLoadoutSnapshot;
  prepared?: readonly PreparedConsumableState[];
  execution?: import('../execution').ExecutionState;
  allies?: import('./engine').AllySnapshot[];
}

export function combatEncounterResolvedFlag(encounterId: string): string {
  return `combat.${encounterId}.resolved`;
}

export function listAvailableEncounters(
  catalog: IndexedCombat,
  locationId: string,
  flags: Readonly<Record<string, boolean>>,
  revealedDiscoveryIds: readonly string[] = [],
  activeOrganizationIds: readonly string[] = [],
): EncounterDefinition[] {
  const revealed = new Set(revealedDiscoveryIds);
  const organizations = new Set(activeOrganizationIds);
  return catalog.encounters
    .filter((encounter) => encounter.locationId === locationId)
    .filter((encounter) => flags[combatEncounterResolvedFlag(encounter.id)] !== true)
    .filter((encounter) => encounter.requiredDiscoveryIds.every((id) => revealed.has(id)))
    .filter(
      (encounter) =>
        encounter.requiredOrganizationId === undefined || organizations.has(encounter.requiredOrganizationId),
    )
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
  if (
    !isPositiveSafeInteger(state.player.maxHealth) ||
    !isSafeInteger(state.player.health) ||
    state.player.health > state.player.maxHealth ||
    !isPositiveSafeInteger(state.opponent.maxHealth) ||
    !isSafeInteger(state.opponent.health) ||
    state.opponent.health > state.opponent.maxHealth ||
    !isPositiveSafeInteger(state.turn) ||
    !terminalOutcomeMatches(state)
  ) {
    throw new CombatError('O estado terminal de combate é inválido.');
  }
  const playerActionIds = extractPlayerActionIds(state);
  return {
    encounterId: encounter.id,
    outcome: state.outcome,
    turns: state.turn,
    entryHealth: state.player.maxHealth,
    remainingHealth: state.player.health,
    playerActionIds,
    usedPrepared: (state.usedPrepared ?? []).map((entry) => ({ ...entry })),
    equipment: {
      'main-hand': state.loadout?.equipment['main-hand'] ?? null,
      body: state.loadout?.equipment.body ?? null,
      accessory: state.loadout?.equipment.accessory ?? null,
    },
    entryExecution: copyExecutionState(state.entryExecution ?? createInitialExecutionState()),
    remainingExecution: copyExecutionState(state.player.execution ?? createInitialExecutionState()),
    companionOrders: (state.companionOrderLog ?? []).map((turn) => turn.map((entry) => ({ ...entry }))),
    allyVitals: (state.allies ?? []).map((ally) => ({ actorId: ally.id, health: ally.health })),
  };
}

export function verifyCombatResolution(
  catalog: IndexedCombat,
  resolution: CombatResolution,
  encounter: EncounterDefinition,
  options: VerifyCombatResolutionOptions,
): CombatResolution {
  if (
    resolution.encounterId !== encounter.id ||
    resolution.entryHealth !== options.playerMaxHealth ||
    resolution.turns !== resolution.playerActionIds.length ||
    !isPositiveSafeInteger(options.playerMaxHealth)
  ) {
    throw new CombatError('A resolução de combate não corresponde ao estado atual do mundo.');
  }

  let replayed = createCombat(catalog, encounter.id, {
    playerName: options.playerName,
    knownSkillIds: options.knownSkillIds,
    playerMaxHealth: options.playerMaxHealth,
    loadout: options.loadout ?? emptyCombatLoadout(),
    prepared: options.prepared ?? [],
    execution: options.execution ?? resolution.entryExecution ?? createInitialExecutionState(),
    allies: options.allies ?? [],
  });
  const orderLog = resolution.companionOrders ?? [];
  if (orderLog.length !== 0 && orderLog.length !== resolution.playerActionIds.length) {
    throw new CombatError('A resolução de combate não corresponde à sequência de ações informada.');
  }
  for (const [index, actionId] of resolution.playerActionIds.entries()) {
    if (replayed.outcome !== 'ongoing') {
      throw new CombatError('A sequência de combate continua depois de um desfecho terminal.');
    }
    replayed = resolveTurn(catalog, replayed, actionId, orderLog[index] ?? []);
  }

  const verified = buildCombatResolution(replayed, encounter);
  if (
    verified.outcome !== resolution.outcome ||
    verified.turns !== resolution.turns ||
    verified.entryHealth !== resolution.entryHealth ||
    verified.remainingHealth !== resolution.remainingHealth ||
    JSON.stringify(verified.usedPrepared) !== JSON.stringify(resolution.usedPrepared ?? []) ||
    JSON.stringify(verified.equipment) !== JSON.stringify(resolution.equipment ?? emptyCombatLoadout().equipment) ||
    JSON.stringify(verified.remainingExecution) !== JSON.stringify(resolution.remainingExecution ?? createInitialExecutionState()) ||
    JSON.stringify(verified.companionOrders) !== JSON.stringify(resolution.companionOrders ?? verified.companionOrders) ||
    JSON.stringify(verified.allyVitals) !== JSON.stringify(resolution.allyVitals ?? verified.allyVitals)
  ) {
    throw new CombatError('A resolução de combate não corresponde à sequência de ações informada.');
  }
  return verified;
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

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function terminalOutcomeMatches(state: CombatState): boolean {
  const enemies = [state.opponent, ...(state.foes ?? [])];
  if (state.outcome === 'victory') {
    return state.player.health > 0 && enemies.every((enemy) => enemy.health === 0);
  }
  if (state.outcome === 'defeat') {
    return state.player.health === 0 && enemies.some((enemy) => enemy.health > 0);
  }
  return state.player.health > 0 && enemies.some((enemy) => enemy.health > 0);
}

function extractPlayerActionIds(state: CombatState): string[] {
  if (!Array.isArray(state.log)) {
    throw new CombatError('O histórico terminal de combate é inválido.');
  }
  const playerActionIds: string[] = [];
  for (let turn = 1; turn <= state.turn; turn += 1) {
    const entries = state.log.filter((entry) => entry.turn === turn && entry.actorId === state.player.id);
    if (entries.length !== 1 || !nonEmpty(entries[0].actionId)) {
      throw new CombatError('O histórico terminal de combate é inválido.');
    }
    playerActionIds.push(entries[0].actionId);
  }
  return playerActionIds;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function copyEncounter(encounter: EncounterDefinition): EncounterDefinition {
  return {
    ...encounter,
    timeCost: { ...encounter.timeCost },
    requiredDiscoveryIds: [...encounter.requiredDiscoveryIds],
    ...(encounter.additionalOpponentIds ? { additionalOpponentIds: [...encounter.additionalOpponentIds] } : {}),
    ...(encounter.reward ? { reward: { ...encounter.reward } } : {}),
  };
}
