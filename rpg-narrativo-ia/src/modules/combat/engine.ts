import { CombatError } from './errors';
import { PLAYER_COMBAT_MAX_HEALTH } from './initial-combat';
import {
  applyCondition,
  cleanseConditions,
  INITIAL_CONDITIONS,
  isActionBlocked,
  resolveElementInteraction,
  tickConditions,
} from '../conditions';
import {
  FLEE_ACTION_ID,
  PREPARED_ACTION_PREFIX,
  type CombatActionDefinition,
  type CombatantState,
  type CombatEffect,
  type CombatLoadoutSnapshot,
  type CombatOutcome,
  type CombatState,
  type IndexedCombat,
  type PreparedConsumableState,
} from './types';

export interface CreateCombatOptions {
  playerName?: string;
  knownSkillIds?: readonly string[];
  playerMaxHealth?: number;
  loadout?: CombatLoadoutSnapshot;
  prepared?: readonly PreparedConsumableState[];
}

export function emptyCombatLoadout(): CombatLoadoutSnapshot {
  return {
    equipment: { 'main-hand': null, body: null, accessory: null },
    prepared: [],
    modifiers: { damage: 0, guard: 0, healing: 0 },
    grantedActionIds: [],
  };
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
  const loadout = copyLoadout(options.loadout ?? emptyCombatLoadout());
  const prepared = (options.prepared ?? []).map((entry) => ({ ...entry }));
  const playerActionIds = catalog.actions
    .filter((action) => action.skillId === undefined || known.has(action.skillId))
    .map((action) => action.id);
  for (const actionId of loadout.grantedActionIds) {
    if (catalog.actionById.has(actionId) && !playerActionIds.includes(actionId)) {
      playerActionIds.push(actionId);
    }
  }
  for (const entry of prepared) {
    playerActionIds.push(`${PREPARED_ACTION_PREFIX}${entry.index}`);
  }

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
      conditions: [],
    },
    opponent: {
      id: template.id,
      name: template.name,
      maxHealth: template.maxHealth,
      health: template.maxHealth,
      guard: 0,
      actionIds: [...template.actionIds],
      conditions: [],
      ...(template.defenseElementId ? { defenseElementId: template.defenseElementId } : {}),
    },
    log: [],
    outcome: 'ongoing',
    loadout,
    prepared,
    usedPrepared: [],
  };
}

export function listPlayerActions(catalog: IndexedCombat, state: CombatState): CombatActionDefinition[] {
  return state.player.actionIds.map((id) => requireAction(catalog, state, id));
}

export function chooseOpponentAction(catalog: IndexedCombat, state: CombatState): string {
  const opponent = state.opponent;
  const available = opponent.actionIds.map((id) => requireAction(catalog, state, id));

  const heal = available.find((action) => totalOf(action, 'heal') > 0);
  if (heal && opponent.health <= Math.floor(opponent.maxHealth * 0.3)) {
    return heal.id;
  }

  const applying = available.find((action) =>
    action.effects.some((effect) => {
      if (effect.type !== 'condition.apply') {
        return false;
      }
      return !state.player.conditions.some((entry) => entry.conditionId === effect.conditionId);
    }),
  );
  if (applying) {
    return applying.id;
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
  let prepared = state.prepared.map((entry) => ({ ...entry }));
  const usedPrepared = state.usedPrepared.map((entry) => ({ ...entry }));

  if (playerActionId === FLEE_ACTION_ID) {
    log.push({ turn, actorId: 'player', actionId: FLEE_ACTION_ID, text: `${state.player.name} recua do confronto.` });
    return { ...cloneState(state), turn, log, prepared, usedPrepared, outcome: 'fled' };
  }

  if (!state.player.actionIds.includes(playerActionId)) {
    throw new CombatError('A ação de combate não está disponível.');
  }

  const playerAction = requireAction(catalog, state, playerActionId);
  const opponentAction = requireAction(catalog, state, chooseOpponentAction(catalog, state));

  const player = copyCombatant(state.player);
  const opponent = copyCombatant(state.opponent);

  const startTick = tickConditions(INITIAL_CONDITIONS, player.conditions, 'turn-start');
  player.conditions = startTick.conditions;
  player.health = Math.max(0, player.health - startTick.damage);
  const opponentStart = tickConditions(INITIAL_CONDITIONS, opponent.conditions, 'turn-start');
  opponent.conditions = opponentStart.conditions;
  opponent.health = Math.max(0, opponent.health - opponentStart.damage);

  if (isActionBlocked(INITIAL_CONDITIONS, player.conditions, actionCategory(playerAction))) {
    throw new CombatError('Uma condição impede esta ação.');
  }

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
    const modifiers = step.who === 'player' ? state.loadout.modifiers : { damage: 0, guard: 0, healing: 0 };
    const text = applyAction(step.action, actor, target, modifiers);
    log.push({ turn, actorId: actor.id, actionId: step.action.id, text: `${actor.name}: ${text}` });
  }

  if (playerActionId.startsWith(PREPARED_ACTION_PREFIX)) {
    const slot = Number(playerActionId.slice(PREPARED_ACTION_PREFIX.length));
    const used = prepared.find((entry) => entry.index === slot);
    if (!used) {
      throw new CombatError('O consumível preparado não está mais disponível.');
    }
    usedPrepared.push({ slot, itemId: used.itemId });
    prepared = prepared.filter((entry) => entry.index !== slot);
    player.actionIds = player.actionIds.filter((id) => id !== playerActionId);
  }

  const playerEnd = tickConditions(INITIAL_CONDITIONS, player.conditions, 'turn-end');
  player.conditions = playerEnd.conditions;
  player.health = Math.max(0, player.health - playerEnd.damage);
  const opponentEnd = tickConditions(INITIAL_CONDITIONS, opponent.conditions, 'turn-end');
  opponent.conditions = opponentEnd.conditions;
  opponent.health = Math.max(0, opponent.health - opponentEnd.damage);

  return {
    ...cloneState(state),
    turn,
    player,
    opponent,
    log,
    prepared,
    usedPrepared,
    outcome: deriveOutcome(player, opponent),
  };
}

function applyAction(
  action: CombatActionDefinition,
  actor: CombatantState,
  target: CombatantState,
  modifiers: { damage: number; guard: number; healing: number },
): string {
  const parts: string[] = [];
  for (const effect of action.effects) {
    if (effect.type === 'damage') {
      const affinity = resolveAffinity(action.elementId, target.defenseElementId);
      const incoming = conditionValueModifier(target.conditions, 'damage');
      const amount = Math.max(0, Math.round((effect.amount + modifiers.damage + incoming) * affinity.multiplier));
      const absorbed = Math.min(target.guard, amount);
      target.guard -= absorbed;
      const dealt = amount - absorbed;
      target.health = Math.max(0, target.health - dealt);
      const affinityText = affinity.label === 'neutral' ? '' : ` (${affinity.label === 'effective' ? 'eficaz' : 'resistido'})`;
      parts.push(absorbed > 0 ? `${action.name} causa ${dealt} (${absorbed} absorvido)${affinityText}` : `${action.name} causa ${dealt} de dano${affinityText}`);
    } else if (effect.type === 'heal') {
      const amount = Math.max(0, effect.amount + modifiers.healing);
      const before = target.health;
      target.health = Math.min(target.maxHealth, target.health + amount);
      parts.push(`${action.name} recupera ${target.health - before} de vida`);
    } else if (effect.type === 'guard') {
      const amount = Math.max(0, effect.amount + modifiers.guard);
      target.guard += amount;
      parts.push(`${action.name} ergue um escudo de ${amount}`);
    } else if (effect.type === 'condition.apply') {
      target.conditions = applyCondition(INITIAL_CONDITIONS, target.conditions, {
        conditionId: effect.conditionId,
        remainingTurns: effect.duration,
        potency: effect.potency,
        sourceCombatantId: actor.id,
      });
      parts.push(`${action.name} aplica ${INITIAL_CONDITIONS.conditionById.get(effect.conditionId)?.name ?? effect.conditionId}`);
    } else {
      target.conditions = cleanseConditions(target.conditions, effect.conditionId, effect.count);
      parts.push(`${action.name} alivia uma condição`);
    }
  }
  return parts.join('; ');
}

function resolveAffinity(sourceElementId: string | undefined, defenseElementId: string | undefined) {
  const source = sourceElementId ?? 'physical';
  const defense = defenseElementId ?? 'physical';
  return resolveElementInteraction(INITIAL_CONDITIONS, source, defense);
}

function conditionValueModifier(
  conditions: CombatantState['conditions'],
  target: 'damage' | 'guard' | 'healing',
): number {
  let amount = 0;
  for (const entry of conditions) {
    const definition = INITIAL_CONDITIONS.conditionById.get(entry.conditionId);
    for (const effect of definition?.effects ?? []) {
      if (effect.type === 'combat.value.modify' && effect.target === target) {
        amount += effect.amount * Math.max(1, entry.potency);
      }
    }
  }
  return amount;
}

function actionCategory(action: CombatActionDefinition): 'heal' | 'damage' | 'guard' {
  if (action.effects.some((effect) => effect.type === 'heal' || effect.type === 'condition.cleanse')) {
    return 'heal';
  }
  if (action.effects.some((effect) => effect.type === 'guard')) {
    return 'guard';
  }
  return 'damage';
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
  return action.effects
    .filter((effect): effect is Extract<CombatEffect, { type: 'damage' | 'heal' }> => effect.type === type)
    .reduce((sum, effect) => sum + effect.amount, 0);
}

function requireAction(catalog: IndexedCombat, state: CombatState, actionId: string): CombatActionDefinition {
  if (actionId.startsWith(PREPARED_ACTION_PREFIX)) {
    const slot = Number(actionId.slice(PREPARED_ACTION_PREFIX.length));
    const prepared = state.prepared.find((entry) => entry.index === slot);
    if (!prepared) {
      throw new CombatError('O consumível preparado não está disponível.');
    }
    return {
      id: actionId,
      name: prepared.name,
      description: `Usa ${prepared.name} preparado.`,
      speed: 16,
      target: 'self',
      effects: [{ type: 'heal', amount: prepared.heal }],
    };
  }
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new CombatError('A ação de combate não existe.');
  }
  return action;
}

function copyCombatant(state: CombatantState): CombatantState {
  return {
    ...state,
    actionIds: [...state.actionIds],
    conditions: (state.conditions ?? []).map((entry) => ({ ...entry })),
  };
}

function copyLoadout(loadout: CombatLoadoutSnapshot): CombatLoadoutSnapshot {
  return {
    equipment: { ...loadout.equipment },
    prepared: loadout.prepared.map((entry) => ({ ...entry })),
    modifiers: { ...loadout.modifiers },
    grantedActionIds: [...(loadout.grantedActionIds ?? [])],
  };
}

function cloneState(state: CombatState): CombatState {
  return {
    encounterId: state.encounterId,
    turn: state.turn,
    player: copyCombatant(state.player),
    opponent: copyCombatant(state.opponent),
    log: state.log.map((entry) => ({ ...entry })),
    outcome: state.outcome,
    loadout: copyLoadout(state.loadout),
    prepared: state.prepared.map((entry) => ({ ...entry })),
    usedPrepared: state.usedPrepared.map((entry) => ({ ...entry })),
  };
}
