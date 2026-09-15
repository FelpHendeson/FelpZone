import { CombatError } from './errors';
import { PLAYER_COMBAT_MAX_HEALTH } from './initial-combat';
import {
  FLEE_ACTION_ID,
  type CombatActionDefinition,
  type CombatantState,
  type CombatOutcome,
  type CombatState,
  type IndexedCombat,
} from './types';

export interface CreateCombatOptions {
  playerName?: string;
  knownSkillIds?: readonly string[];
  playerMaxHealth?: number;
}

export function createCombat(
  catalog: IndexedCombat,
  encounterId: string,
  options: CreateCombatOptions = {},
): CombatState {
  const encounter = catalog.encounterById.get(encounterId);
  if (!encounter) {
    throw new CombatError('O encontro não existe.');
  }
  const template = catalog.combatantById.get(encounter.opponentId);
  if (!template) {
    throw new CombatError('O combatente do encontro não existe.');
  }

  const known = new Set(options.knownSkillIds ?? []);
  const playerActionIds = catalog.actions
    .filter((action) => action.skillId === undefined || known.has(action.skillId))
    .map((action) => action.id);
  const maxHealth = options.playerMaxHealth ?? PLAYER_COMBAT_MAX_HEALTH;
  if (!Number.isSafeInteger(maxHealth) || maxHealth < 1) {
    throw new CombatError('A vitalidade inicial do jogador é inválida.');
  }

  return {
    encounterId,
    turn: 0,
    player: {
      id: 'player',
      name: options.playerName?.trim() || 'Sobrevivente',
      maxHealth,
      health: maxHealth,
      guard: 0,
      actionIds: playerActionIds,
    },
    opponent: {
      id: template.id,
      name: template.name,
      maxHealth: template.maxHealth,
      health: template.maxHealth,
      guard: 0,
      actionIds: [...template.actionIds],
    },
    log: [],
    outcome: 'ongoing',
  };
}

export function listPlayerActions(catalog: IndexedCombat, state: CombatState): CombatActionDefinition[] {
  return state.player.actionIds.map((id) => requireAction(catalog, id));
}

export function chooseOpponentAction(catalog: IndexedCombat, state: CombatState): string {
  const opponent = state.opponent;
  const available = opponent.actionIds.map((id) => requireAction(catalog, id));

  const heal = available.find((action) => totalOf(action, 'heal') > 0);
  if (heal && opponent.health <= Math.floor(opponent.maxHealth * 0.3)) {
    return heal.id;
  }

  const damaging = available
    .filter((action) => totalOf(action, 'damage') > 0)
    .sort((left, right) => totalOf(right, 'damage') - totalOf(left, 'damage'));
  if (damaging.length > 0) {
    return damaging[0].id;
  }

  return available[0].id;
}

export function resolveTurn(catalog: IndexedCombat, state: CombatState, playerActionId: string): CombatState {
  if (state.outcome !== 'ongoing') {
    throw new CombatError('O combate já terminou.');
  }

  const turn = state.turn + 1;
  const log = state.log.map((entry) => ({ ...entry }));

  if (playerActionId === FLEE_ACTION_ID) {
    log.push({ turn, actorId: 'player', actionId: FLEE_ACTION_ID, text: `${state.player.name} recua do confronto.` });
    return { ...cloneState(state), turn, log, outcome: 'fled' };
  }

  if (!state.player.actionIds.includes(playerActionId)) {
    throw new CombatError('A ação de combate não está disponível.');
  }

  const playerAction = requireAction(catalog, playerActionId);
  const opponentAction = requireAction(catalog, chooseOpponentAction(catalog, state));

  const player = copyCombatant(state.player);
  const opponent = copyCombatant(state.opponent);

  const order = [
    { who: 'player' as const, action: playerAction },
    { who: 'opponent' as const, action: opponentAction },
  ].sort((left, right) => right.action.speed - left.action.speed || (left.who === 'player' ? -1 : 1));

  for (const step of order) {
    const actor = step.who === 'player' ? player : opponent;
    if (actor.health <= 0) {
      continue;
    }
    const foe = step.who === 'player' ? opponent : player;
    const target = step.action.target === 'self' ? actor : foe;
    const text = applyAction(step.action, target);
    log.push({ turn, actorId: actor.id, actionId: step.action.id, text: `${actor.name}: ${text}` });
  }

  return { ...cloneState(state), turn, player, opponent, log, outcome: deriveOutcome(player, opponent) };
}

function applyAction(action: CombatActionDefinition, target: CombatantState): string {
  const parts: string[] = [];
  for (const effect of action.effects) {
    if (effect.type === 'damage') {
      const absorbed = Math.min(target.guard, effect.amount);
      target.guard -= absorbed;
      const dealt = effect.amount - absorbed;
      target.health = Math.max(0, target.health - dealt);
      parts.push(absorbed > 0 ? `${action.name} causa ${dealt} (${absorbed} absorvido)` : `${action.name} causa ${dealt} de dano`);
    } else if (effect.type === 'heal') {
      const before = target.health;
      target.health = Math.min(target.maxHealth, target.health + effect.amount);
      parts.push(`${action.name} recupera ${target.health - before} de vida`);
    } else {
      target.guard += effect.amount;
      parts.push(`${action.name} ergue um escudo de ${effect.amount}`);
    }
  }
  return parts.join('; ');
}

function deriveOutcome(player: CombatantState, opponent: CombatantState): CombatOutcome {
  if (opponent.health <= 0) {
    return 'victory';
  }
  if (player.health <= 0) {
    return 'defeat';
  }
  return 'ongoing';
}

function totalOf(action: CombatActionDefinition, type: 'damage' | 'heal'): number {
  return action.effects.filter((effect) => effect.type === type).reduce((sum, effect) => sum + effect.amount, 0);
}

function requireAction(catalog: IndexedCombat, actionId: string): CombatActionDefinition {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new CombatError('A ação de combate não existe.');
  }
  return action;
}

function copyCombatant(state: CombatantState): CombatantState {
  return { ...state, actionIds: [...state.actionIds] };
}

function cloneState(state: CombatState): CombatState {
  return {
    encounterId: state.encounterId,
    turn: state.turn,
    player: copyCombatant(state.player),
    opponent: copyCombatant(state.opponent),
    log: state.log.map((entry) => ({ ...entry })),
    outcome: state.outcome,
  };
}
