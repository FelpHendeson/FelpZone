import { CombatError } from './errors';
import { PLAYER_COMBAT_MAX_HEALTH } from './initial-combat';
import {
  applyCondition,
  cleanseConditions,
  INITIAL_CONDITIONS,
  isActionBlocked,
  resolveElementInteraction,
  tickConditions,
  type IndexedConditions,
} from '../conditions';
import {
  canPayCost,
  collectExecutionModifiers,
  copyExecutionState,
  createInitialExecutionState,
  DEFAULT_ACTION_PHASES,
  emptyExecutionModifiers,
  INITIAL_EXECUTION,
  payCost,
  resolveActionTiming,
  setCooldown,
  tickCooldowns,
  type ExecutionState,
  type IndexedExecution,
  type ResolvedActionTiming,
} from '../execution';
import {
  FLEE_ACTION_ID,
  PREPARED_ACTION_PREFIX,
  type CombatActionDefinition,
  type CombatActionView,
  type CombatantState,
  type CombatEffect,
  type CombatLoadoutSnapshot,
  type CombatOutcome,
  type CombatState,
  type IndexedCombat,
  type PlannedSlot,
  type PreparedConsumableState,
  type RoundEvent,
} from './types';

export interface AllySnapshot {
  id: string;
  name: string;
  maxHealth: number;
  health?: number;
  actionIds: readonly string[];
}

export interface CombatRuntime {
  conditions?: IndexedConditions;
  execution?: IndexedExecution;
}

export interface CreateCombatOptions {
  playerName?: string;
  knownSkillIds?: readonly string[];
  playerMaxHealth?: number;
  loadout?: CombatLoadoutSnapshot;
  prepared?: readonly PreparedConsumableState[];
  execution?: ExecutionState;
  allies?: readonly AllySnapshot[];
  runtime?: CombatRuntime;
}

export function emptyCombatLoadout(): CombatLoadoutSnapshot {
  return {
    equipment: { 'main-hand': null, body: null, accessory: null },
    prepared: [],
    modifiers: { damage: 0, guard: 0, healing: 0 },
    executionModifiers: emptyExecutionModifiers(),
    grantedActionIds: [],
  };
}

function resolveRuntime(runtime: CombatRuntime = {}): Required<CombatRuntime> {
  return {
    conditions: runtime.conditions ?? INITIAL_CONDITIONS,
    execution: runtime.execution ?? INITIAL_EXECUTION,
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

  const knownSkillIds = [...(options.knownSkillIds ?? [])];
  const known = new Set(knownSkillIds);
  const loadout = copyLoadout(options.loadout ?? emptyCombatLoadout());
  const prepared = (options.prepared ?? []).map((entry) => ({ ...entry }));
  const playerActionIds = catalog.actions
    .filter((action) => action.playerUsable !== false)
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

  const playerExecution = copyExecutionState(options.execution ?? createInitialExecutionState());
  const opponentExecution = createInitialExecutionState();
  const opponent = createCombatantFromTemplate(template, opponentExecution);
  const foes = (encounter.additionalOpponentIds ?? []).map((id) => {
    const extra = catalog.combatantById.get(id);
    if (!extra) {
      throw new CombatError('O combatente adicional do encontro não existe.');
    }
    return createCombatantFromTemplate(extra, createInitialExecutionState());
  });
  const allies = (options.allies ?? []).map((ally) => createAllyCombatant(ally));
  assertUniqueCombatantIds(['player', opponent.id, ...allies.map((entry) => entry.id), ...foes.map((entry) => entry.id)]);

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
      execution: playerExecution,
    },
    opponent,
    log: [],
    outcome: 'ongoing',
    loadout,
    prepared,
    usedPrepared: [],
    entryExecution: copyExecutionState(playerExecution),
    knownSkillIds,
    allies,
    foes,
    companionOrderLog: [],
    distance: encounter.startDistance ?? 'far',
    rounds: [],
    lastRound: [],
  };
}

/** Um lado de um duelo entre Despertos: nome, vitalidade e o banco de ações que leva. */
export interface DuelistSnapshot {
  name: string;
  maxHealth: number;
  actionIds: readonly string[];
  knownSkillIds?: readonly string[];
}

export const DUEL_ENCOUNTER_ID = 'duel';
export const DUEL_OPPONENT_ID = 'rival';

/** Banco de ações que um Desperto leva para um duelo: ações base e as liberadas por habilidades. */
export function duelActionBank(catalog: IndexedCombat, knownSkillIds: readonly string[]): string[] {
  const known = new Set(knownSkillIds);
  return catalog.actions
    .filter((action) => action.playerUsable !== false)
    .filter((action) => action.skillId === undefined || known.has(action.skillId))
    .map((action) => action.id);
}

/** Cria um duelo 1x1 entre dois Despertos, sem encontro do mundo nem consumíveis. */
export function createDuel(catalog: IndexedCombat, me: DuelistSnapshot, rival: DuelistSnapshot): CombatState {
  for (const side of [me, rival]) {
    if (!Number.isSafeInteger(side.maxHealth) || side.maxHealth < 1) {
      throw new CombatError('A vitalidade do duelista é inválida.');
    }
    if (side.actionIds.length === 0 || side.actionIds.some((id) => !catalog.actionById.has(id) || catalog.actionById.get(id)?.playerUsable === false)) {
      throw new CombatError('O banco de ações do duelista é inválido.');
    }
  }
  const combatant = (id: string, side: DuelistSnapshot): CombatantState => ({
    id,
    name: side.name.trim() || 'Desperto',
    maxHealth: side.maxHealth,
    health: side.maxHealth,
    guard: 0,
    actionIds: [...side.actionIds],
    conditions: [],
    execution: createInitialExecutionState(),
  });
  return {
    encounterId: DUEL_ENCOUNTER_ID,
    turn: 0,
    player: combatant('player', me),
    opponent: combatant(DUEL_OPPONENT_ID, rival),
    log: [],
    outcome: 'ongoing',
    loadout: emptyCombatLoadout(),
    prepared: [],
    usedPrepared: [],
    entryExecution: createInitialExecutionState(),
    knownSkillIds: [...(me.knownSkillIds ?? [])],
    allies: [],
    foes: [],
    companionOrderLog: [],
    distance: 'far',
    rounds: [],
    lastRound: [],
  };
}

export function listPlayerActions(
  catalog: IndexedCombat,
  state: CombatState,
  runtime: CombatRuntime = {},
): CombatActionDefinition[] {
  void runtime;
  return state.player.actionIds.map((id) => requireAction(catalog, state, id));
}

export function listPlayerActionViews(
  catalog: IndexedCombat,
  state: CombatState,
  runtime: CombatRuntime = {},
): CombatActionView[] {
  const catalogs = resolveRuntime(runtime);
  const modifiers = playerModifiers(state, catalogs);
  return state.player.actionIds.map((id) => {
    const action = requireAction(catalog, state, id);
    const timing = timingFor(action, modifiers, catalogs);
    const blocked = describeBlockedAction(state.player, action, timing, 'player', catalogs);
    return {
      action,
      available: blocked === undefined,
      ...(blocked ? { blockedReason: blocked } : {}),
      phases: timing.phases,
      readyTick: timing.readyTick,
      ...(timing.cost ? { cost: timing.cost } : {}),
      cooldown: timing.cooldown,
    };
  });
}

export function chooseOpponentAction(
  catalog: IndexedCombat,
  state: CombatState,
  runtime: CombatRuntime = {},
): string | null {
  return chooseCombatantAction(catalog, state, state.opponent, state.player, resolveRuntime(runtime));
}

function chooseCombatantAction(
  catalog: IndexedCombat,
  state: CombatState,
  actor: CombatantState,
  foe: CombatantState,
  runtime: Required<CombatRuntime>,
): string | null {
  const available = listUsableActions(catalog, state, actor, actor.id === 'player' ? 'player' : 'opponent', runtime);
  if (available.length === 0) {
    return null;
  }

  const heal = available.find((action) => totalOf(action, 'heal') > 0);
  if (heal && actor.health <= Math.floor(actor.maxHealth * 0.3)) {
    return heal.id;
  }

  const applying = available.find((action) =>
    action.effects.some((effect) => {
      if (effect.type !== 'condition.apply') {
        return false;
      }
      return !foe.conditions.some((entry) => entry.conditionId === effect.conditionId);
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

export function resolveTurn(
  catalog: IndexedCombat,
  state: CombatState,
  playerActionId: string,
  companionOrders: readonly { actorId: string; actionId: string }[] = [],
  runtime: CombatRuntime = {},
): CombatState {
  const catalogs = resolveRuntime(runtime);
  if (state.outcome !== 'ongoing') {
    throw new CombatError('O combate já terminou.');
  }

  const turn = state.turn + 1;
  const log = state.log.map((entry) => ({ ...entry }));
  let prepared = state.prepared.map((entry) => ({ ...entry }));
  const usedPrepared = state.usedPrepared.map((entry) => ({ ...entry }));
  const player = copyCombatant(state.player);
  const opponent = copyCombatant(state.opponent);
  const allies = (state.allies ?? []).map(copyCombatant);
  const foes = (state.foes ?? []).map(copyCombatant);
  const orders = inspectCompanionOrders(companionOrders);

  if (playerActionId === FLEE_ACTION_ID) {
    tickAllCooldowns([player, opponent, ...allies, ...foes]);
    log.push({ turn, actorId: 'player', actionId: FLEE_ACTION_ID, text: `${state.player.name} recua do confronto.` });
    return finishTurn(state, {
      turn,
      player,
      opponent,
      allies,
      foes,
      log,
      prepared,
      usedPrepared,
      outcome: 'fled',
      companionOrderLog: appendOrders(state, orders),
    });
  }

  if (!state.player.actionIds.includes(playerActionId)) {
    throw new CombatError('A ação de combate não está disponível.');
  }

  applyStartTicks([player, opponent, ...allies, ...foes], catalogs);
  if (player.health <= 0 || living(enemiesOf(opponent, foes)).length === 0) {
    applyEndTicks([player, opponent, ...allies, ...foes], catalogs);
    return finishTurn(state, {
      turn,
      player,
      opponent,
      allies,
      foes,
      log,
      prepared,
      usedPrepared,
      outcome: deriveOutcome(player, opponent, foes),
      companionOrderLog: appendOrders(state, orders),
    });
  }

  const playerAction = requireAction(catalog, state, playerActionId);
  const playerTiming = timingFor(playerAction, playerModifiers(state, catalogs), catalogs);
  const blocked = describeBlockedAction(player, playerAction, playerTiming, 'player', catalogs);
  if (blocked) {
    throw new CombatError(blocked);
  }
  assertValidTarget(playerAction, player, opponent, allies, foes);

  const actors = new Map<string, CombatantState>(
    [player, opponent, ...allies, ...foes].map((entry) => [entry.id, entry]),
  );
  const steps: TimelineStep[] = [
    { actorId: player.id, side: 'ally', action: playerAction, timing: playerTiming },
  ];

  for (const order of orders) {
    const ally = allies.find((entry) => entry.id === order.actorId);
    if (!ally || ally.health <= 0) {
      throw new CombatError('O companheiro não pode receber esta orientação.');
    }
    if (!ally.actionIds.includes(order.actionId)) {
      throw new CombatError('A orientação de companheiro não está disponível.');
    }
    const action = requireAction(catalog, state, order.actionId);
    const timing = timingFor(action, emptyExecutionModifiers(), catalogs);
    const orderBlocked = describeBlockedAction(ally, action, timing, 'ally', catalogs);
    if (orderBlocked) {
      throw new CombatError(orderBlocked);
    }
    assertValidTarget(action, ally, opponent, allies, foes);
    steps.push({ actorId: ally.id, side: 'ally', action, timing });
  }

  const orderedAllies = new Set(orders.map((entry) => entry.actorId));
  for (const ally of living(allies)) {
    if (orderedAllies.has(ally.id)) {
      continue;
    }
    const snapshot: CombatState = { ...state, player, opponent, allies, foes };
    const actionId = chooseCombatantAction(catalog, snapshot, ally, firstLiving(enemiesOf(opponent, foes)) ?? opponent, catalogs);
    if (!actionId) {
      continue;
    }
    const action = requireAction(catalog, state, actionId);
    steps.push({ actorId: ally.id, side: 'ally', action, timing: timingFor(action, emptyExecutionModifiers(), catalogs) });
  }

  for (const foe of living([opponent, ...foes])) {
    const snapshot: CombatState = { ...state, player, opponent, allies, foes };
    const actionId = chooseCombatantAction(catalog, snapshot, foe, firstLiving([player, ...allies]) ?? player, catalogs);
    if (!actionId) {
      continue;
    }
    const action = requireAction(catalog, state, actionId);
    const timing = timingFor(action, emptyExecutionModifiers(), catalogs);
    if (describeBlockedAction(foe, action, timing, 'opponent', catalogs)) {
      throw new CombatError('A IA tentou uma ação indisponível.');
    }
    steps.push({ actorId: foe.id, side: 'foe', action, timing });
  }

  for (const step of steps) {
    const actor = actors.get(step.actorId);
    if (!actor) {
      throw new CombatError('O combatente da fila não existe.');
    }
    actor.execution = payCost(actor.execution, step.timing.cost);
  }

  const interrupted = new Set<string>();
  const ordered = [...steps].sort(compareTimeline);

  for (const step of ordered) {
    const actor = actors.get(step.actorId);
    if (!actor) {
      continue;
    }
    if (actor.health <= 0 || interrupted.has(step.actorId)) {
      if (interrupted.has(step.actorId)) {
        log.push({
          turn,
          actorId: actor.id,
          actionId: step.action.id,
          text: `${actor.name}: ${step.action.name} foi interrompida na preparação.`,
        });
      }
      continue;
    }
    const opposing = step.side === 'ally' ? living(enemiesOf(opponent, foes)) : living([player, ...allies]);
    const target = step.action.target === 'self' ? actor : opposing[0];
    if (!target) {
      continue;
    }
    const modifiers = step.actorId === player.id ? state.loadout.modifiers : { damage: 0, guard: 0, healing: 0 };
    const text = applyAction(step.action, actor, target, modifiers, catalogs);
    log.push({ turn, actorId: actor.id, actionId: step.action.id, text: `${actor.name}: ${text}` });

    for (const other of ordered) {
      if (other.side === step.side || interrupted.has(other.actorId) || other.timing.readyTick <= step.timing.readyTick) {
        continue;
      }
      if (canInterrupt(step.action, other.action)) {
        interrupted.add(other.actorId);
      }
    }
  }

  const usedThisTurn = new Map<string, string[]>();
  for (const step of steps) {
    const actor = actors.get(step.actorId);
    if (!actor) {
      continue;
    }
    if (step.timing.cooldown > 0) {
      actor.execution = setCooldown(actor.execution, step.action.id, step.timing.cooldown);
      usedThisTurn.set(step.actorId, [...(usedThisTurn.get(step.actorId) ?? []), step.action.id]);
    }
  }
  for (const combatant of [player, opponent, ...allies, ...foes]) {
    combatant.execution = tickCooldowns(combatant.execution, usedThisTurn.get(combatant.id) ?? []);
  }

  if (playerActionId.startsWith(PREPARED_ACTION_PREFIX) && !interrupted.has(player.id)) {
    const slot = Number(playerActionId.slice(PREPARED_ACTION_PREFIX.length));
    const used = prepared.find((entry) => entry.index === slot);
    if (!used) {
      throw new CombatError('O consumível preparado não está mais disponível.');
    }
    usedPrepared.push({ slot, itemId: used.itemId });
    prepared = prepared.filter((entry) => entry.index !== slot);
    player.actionIds = player.actionIds.filter((id) => id !== playerActionId);
  }

  applyEndTicks([player, opponent, ...allies, ...foes], catalogs);

  return finishTurn(state, {
    turn,
    player,
    opponent,
    allies,
    foes,
    log,
    prepared,
    usedPrepared,
    outcome: deriveOutcome(player, opponent, foes),
    companionOrderLog: appendOrders(state, orders),
  });
}

function listUsableActions(
  catalog: IndexedCombat,
  state: CombatState,
  actor: CombatantState,
  who: 'player' | 'opponent' | 'ally',
  runtime: Required<CombatRuntime>,
): CombatActionDefinition[] {
  const modifiers = who === 'player' ? playerModifiers(state, runtime) : emptyExecutionModifiers();
  return actor.actionIds
    .map((id) => requireAction(catalog, state, id))
    .filter((action) => describeBlockedAction(actor, action, timingFor(action, modifiers, runtime), who, runtime) === undefined);
}

function describeBlockedAction(
  actor: CombatantState,
  action: CombatActionDefinition,
  timing: ResolvedActionTiming,
  who: 'player' | 'opponent' | 'ally',
  runtime: Required<CombatRuntime>,
): string | undefined {
  if (isActionBlocked(runtime.conditions, actor.conditions, actionCategory(action))) {
    return who === 'opponent' ? 'Uma condição impede a ação do oponente.' : 'Uma condição impede esta ação.';
  }
  const remaining = actor.execution.cooldowns.find((entry) => entry.actionId === action.id)?.remaining ?? 0;
  if (remaining > 0) {
    return 'A ação ainda está em recarga.';
  }
  if (!canPayCost(actor.execution, timing.cost)) {
    return 'A reserva de Númen é insuficiente.';
  }
  return undefined;
}

function playerModifiers(state: CombatState, runtime: Required<CombatRuntime>) {
  return collectExecutionModifiers(
    runtime.execution,
    state.knownSkillIds,
    state.loadout.executionModifiers,
  );
}

function timingFor(
  action: CombatActionDefinition,
  modifiers: ReturnType<typeof playerModifiers>,
  runtime: Required<CombatRuntime>,
): ResolvedActionTiming {
  return resolveActionTiming(
    {
      phases: action.phases ?? DEFAULT_ACTION_PHASES,
      speed: action.speed,
      cost: action.cost,
      cooldown: action.cooldown,
    },
    modifiers,
    runtime.execution.limits,
  );
}

function canInterrupt(actorAction: CombatActionDefinition, preparing: CombatActionDefinition): boolean {
  if (!preparing.interruptible) {
    return false;
  }
  return actorAction.effects.some((effect) => effect.type === 'damage' || effect.type === 'interrupt');
}

function applyAction(
  action: CombatActionDefinition,
  actor: CombatantState,
  target: CombatantState,
  modifiers: { damage: number; guard: number; healing: number },
  runtime: Required<CombatRuntime>,
): string {
  const parts: string[] = [];
  for (const effect of action.effects) {
    if (effect.type === 'interrupt') {
      parts.push(`${action.name} tenta interromper a preparação`);
      continue;
    }
    if (effect.type === 'damage') {
      const affinity = resolveAffinity(action.elementId, target.defenseElementId, runtime);
      const incoming = conditionValueModifier(target.conditions, 'damage', runtime);
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
      target.conditions = applyCondition(runtime.conditions, target.conditions, {
        conditionId: effect.conditionId,
        remainingTurns: effect.duration,
        potency: effect.potency,
        sourceCombatantId: actor.id,
      });
      parts.push(`${action.name} aplica ${runtime.conditions.conditionById.get(effect.conditionId)?.name ?? effect.conditionId}`);
    } else if (effect.type === 'condition.cleanse') {
      target.conditions = cleanseConditions(target.conditions, effect.conditionId, effect.count);
      parts.push(`${action.name} alivia uma condição`);
    } else if (effect.type === 'evade') {
      parts.push(`${action.name}: pronto para se esquivar`);
    } else {
      parts.push(effect.to === 'near' ? `${action.name}: avança` : `${action.name}: abre distância`);
    }
  }
  return parts.join('; ');
}

function resolveAffinity(
  sourceElementId: string | undefined,
  defenseElementId: string | undefined,
  runtime: Required<CombatRuntime>,
) {
  const source = sourceElementId ?? 'physical';
  const defense = defenseElementId ?? 'physical';
  return resolveElementInteraction(runtime.conditions, source, defense);
}

function conditionValueModifier(
  conditions: CombatantState['conditions'],
  target: 'damage' | 'guard' | 'healing',
  runtime: Required<CombatRuntime>,
): number {
  let amount = 0;
  for (const entry of conditions) {
    const definition = runtime.conditions.conditionById.get(entry.conditionId);
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

function deriveOutcome(player: CombatantState, opponent: CombatantState, foes: CombatantState[]): CombatOutcome {
  if (living(enemiesOf(opponent, foes)).length === 0) {
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
      phases: { ...DEFAULT_ACTION_PHASES },
      range: 'self',
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
    execution: copyExecutionState(state.execution ?? createInitialExecutionState()),
  };
}

function copyLoadout(loadout: CombatLoadoutSnapshot): CombatLoadoutSnapshot {
  return {
    equipment: { ...loadout.equipment },
    prepared: loadout.prepared.map((entry) => ({ ...entry })),
    modifiers: { ...loadout.modifiers },
    executionModifiers: { ...(loadout.executionModifiers ?? emptyExecutionModifiers()) },
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
    entryExecution: copyExecutionState(state.entryExecution ?? createInitialExecutionState()),
    knownSkillIds: [...(state.knownSkillIds ?? [])],
    allies: (state.allies ?? []).map(copyCombatant),
    foes: (state.foes ?? []).map(copyCombatant),
    companionOrderLog: (state.companionOrderLog ?? []).map((turn) => turn.map((entry) => ({ ...entry }))),
    ...(state.distance ? { distance: state.distance } : {}),
    ...(state.rounds ? { rounds: state.rounds.map((round) => ({ player: [...round.player], opponent: [...round.opponent] })) } : {}),
    ...(state.lastRound ? { lastRound: state.lastRound.map((entry) => ({ ...entry })) } : {}),
  };
}

interface TimelineStep {
  actorId: string;
  side: 'ally' | 'foe';
  action: CombatActionDefinition;
  timing: ResolvedActionTiming;
}

interface TurnPatch {
  turn: number;
  player: CombatantState;
  opponent: CombatantState;
  allies: CombatantState[];
  foes: CombatantState[];
  log: CombatState['log'];
  prepared: CombatState['prepared'];
  usedPrepared: CombatState['usedPrepared'];
  outcome: CombatState['outcome'];
  companionOrderLog: CombatState['companionOrderLog'];
}

function finishTurn(state: CombatState, patch: TurnPatch): CombatState {
  return {
    ...cloneState(state),
    ...patch,
  };
}

function createCombatantFromTemplate(
  template: { id: string; name: string; maxHealth: number; actionIds: readonly string[]; defenseElementId?: string },
  execution: ExecutionState,
): CombatantState {
  return {
    id: template.id,
    name: template.name,
    maxHealth: template.maxHealth,
    health: template.maxHealth,
    guard: 0,
    actionIds: [...template.actionIds],
    conditions: [],
    execution,
    ...(template.defenseElementId ? { defenseElementId: template.defenseElementId } : {}),
  };
}

function createAllyCombatant(ally: AllySnapshot): CombatantState {
  if (!Number.isSafeInteger(ally.maxHealth) || ally.maxHealth < 1) {
    throw new CombatError('A vitalidade do companheiro é inválida.');
  }
  const health = ally.health ?? ally.maxHealth;
  if (!Number.isSafeInteger(health) || health < 1 || health > ally.maxHealth) {
    throw new CombatError('A vitalidade do companheiro é inválida.');
  }
  if (ally.actionIds.length === 0 || ally.actionIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
    throw new CombatError('O companheiro precisa declarar ações válidas.');
  }
  return {
    id: ally.id,
    name: ally.name,
    maxHealth: ally.maxHealth,
    health,
    guard: 0,
    actionIds: [...ally.actionIds],
    conditions: [],
    execution: createInitialExecutionState(),
  };
}

function assertUniqueCombatantIds(ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id.trim() || seen.has(id)) {
      throw new CombatError('Um ator não pode ocupar duas equipes.');
    }
    seen.add(id);
  }
}

function inspectCompanionOrders(
  value: readonly { actorId: string; actionId: string }[],
): { actorId: string; actionId: string }[] {
  const seen = new Set<string>();
  const orders: { actorId: string; actionId: string }[] = [];
  for (const entry of value) {
    if (!entry.actorId.trim() || !entry.actionId.trim() || seen.has(entry.actorId)) {
      throw new CombatError('A orientação de companheiro é inválida.');
    }
    seen.add(entry.actorId);
    orders.push({ actorId: entry.actorId, actionId: entry.actionId });
  }
  return orders;
}

function appendOrders(
  state: CombatState,
  orders: { actorId: string; actionId: string }[],
): { actorId: string; actionId: string }[][] {
  return [...(state.companionOrderLog ?? []).map((turn) => turn.map((entry) => ({ ...entry }))), orders.map((entry) => ({ ...entry }))];
}

function applyStartTicks(combatants: CombatantState[], runtime: Required<CombatRuntime>): void {
  for (const combatant of combatants) {
    const ticked = tickConditions(runtime.conditions, combatant.conditions, 'turn-start');
    combatant.conditions = ticked.conditions;
    combatant.health = Math.max(0, combatant.health - ticked.damage);
  }
}

function applyEndTicks(combatants: CombatantState[], runtime: Required<CombatRuntime>): void {
  for (const combatant of combatants) {
    const ticked = tickConditions(runtime.conditions, combatant.conditions, 'turn-end');
    combatant.conditions = ticked.conditions;
    combatant.health = Math.max(0, combatant.health - ticked.damage);
  }
}

function tickAllCooldowns(combatants: CombatantState[]): void {
  for (const combatant of combatants) {
    combatant.execution = tickCooldowns(combatant.execution);
  }
}

function living(combatants: CombatantState[]): CombatantState[] {
  return combatants.filter((entry) => entry.health > 0);
}

function enemiesOf(opponent: CombatantState, foes: CombatantState[]): CombatantState[] {
  return [opponent, ...foes];
}

function firstLiving(combatants: CombatantState[]): CombatantState | undefined {
  return living(combatants)[0];
}

function assertValidTarget(
  action: CombatActionDefinition,
  _actor: CombatantState,
  opponent: CombatantState,
  _allies: CombatantState[],
  foes: CombatantState[],
): void {
  void _actor;
  void _allies;
  if (action.target === 'self') {
    return;
  }
  const enemies = living(enemiesOf(opponent, foes));
  if (enemies.length === 0) {
    throw new CombatError('O alvo desta ação é inválido.');
  }
}

function compareTimeline(left: TimelineStep, right: TimelineStep): number {
  if (left.timing.readyTick !== right.timing.readyTick) {
    return left.timing.readyTick - right.timing.readyTick;
  }
  if (left.timing.speed !== right.timing.speed) {
    return right.timing.speed - left.timing.speed;
  }
  if (left.actorId === 'player') {
    return -1;
  }
  if (right.actorId === 'player') {
    return 1;
  }
  return left.actorId.localeCompare(right.actorId);
}

// ---------------------------------------------------------------------------------------------
// Combate planejado por rodadas: cada lado monta uma sequência de ações dentro do orçamento de
// tempos da rodada, os dois se declaram prontos e a linha do tempo resolve tudo intercalado.
// ---------------------------------------------------------------------------------------------

/** Tempos disponíveis para cada lado montar a sequência de uma rodada. */
export const ROUND_TICKS = 5;

export type CombatStyle = 'balanced' | 'aggressive' | 'defensive';

export interface PlanCheck {
  ok: boolean;
  reason?: string;
  usedTicks: number;
  slots: PlannedSlot[];
}

export interface ResolveRoundOptions {
  /** Sequência do oponente declarada por outra pessoa (duelo). Sem ela, a IA planeja. */
  opponentPlan?: readonly string[];
  opponentStyle?: CombatStyle;
  /** Orientações a companheiros: a ação pedida abre a sequência dele nesta rodada. */
  companionOrders?: readonly { actorId: string; actionId: string }[];
  runtime?: CombatRuntime;
}

/** Quantos tempos a ação ocupa: preparação + execução + recuperação (mínimo 1). */
export function actionTicks(
  catalog: IndexedCombat,
  state: CombatState,
  actorId: string,
  actionId: string,
  runtime: CombatRuntime = {},
): number {
  const catalogs = resolveRuntime(runtime);
  const action = requireAction(catalog, state, actionId);
  return durationOf(timingFor(action, modifiersFor(state, actorId, catalogs), catalogs));
}

/** Valida uma sequência e devolve a posição de cada ação na trilha de tempos. */
export function checkRoundPlan(
  catalog: IndexedCombat,
  state: CombatState,
  actorId: string,
  actionIds: readonly string[],
  runtime: CombatRuntime = {},
): PlanCheck {
  const catalogs = resolveRuntime(runtime);
  const actor = actorById(state, actorId);
  if (!actor) return { ok: false, reason: 'O combatente não existe.', usedTicks: 0, slots: [] };
  const slots: PlannedSlot[] = [];
  let cursor = 1;
  let execution = copyExecutionState(actor.execution);
  const usedOnce = new Set<string>();
  for (const actionId of actionIds) {
    if (!actor.actionIds.includes(actionId)) {
      return { ok: false, reason: 'A ação não está no banco de ações.', usedTicks: cursor - 1, slots };
    }
    const action = requireAction(catalog, state, actionId);
    const timing = timingFor(action, modifiersFor(state, actorId, catalogs), catalogs);
    const blocked = describeBlockedAction({ ...actor, execution }, action, timing, roleOf(state, actorId), catalogs);
    if (blocked) return { ok: false, reason: blocked, usedTicks: cursor - 1, slots };
    if ((timing.cooldown > 0 || actionId.startsWith(PREPARED_ACTION_PREFIX)) && usedOnce.has(actionId)) {
      return { ok: false, reason: `${action.name} só pode ser usada uma vez por rodada.`, usedTicks: cursor - 1, slots };
    }
    const duration = durationOf(timing);
    if (cursor - 1 + duration > ROUND_TICKS) {
      return { ok: false, reason: 'Não cabe nos tempos que restam nesta rodada.', usedTicks: cursor - 1, slots };
    }
    execution = payCost(execution, timing.cost);
    usedOnce.add(actionId);
    slots.push({ actionId, start: cursor, lands: cursor + timing.phases.prepare, duration });
    cursor += duration;
  }
  return { ok: true, usedTicks: cursor - 1, slots };
}

/**
 * IA por regras que monta a rodada inteira de um combatente: cura quando ferido, aproxima-se se
 * só golpeia de perto, aplica condições que o alvo ainda não tem e preenche com o melhor dano por
 * tempo. Determinística: o mesmo estado sempre gera a mesma sequência.
 */
export function planCombatantRound(
  catalog: IndexedCombat,
  state: CombatState,
  actorId: string,
  style: CombatStyle = 'balanced',
  runtime: CombatRuntime = {},
): string[] {
  const catalogs = resolveRuntime(runtime);
  const actor = actorById(state, actorId);
  if (!actor || actor.health <= 0) return [];
  const onPlayerSide = actorId === 'player' || (state.allies ?? []).some((entry) => entry.id === actorId);
  const foe = onPlayerSide
    ? living([state.opponent, ...(state.foes ?? [])])[0]
    : living([state.player, ...(state.allies ?? [])])[0];
  if (!foe) return [];

  const plan: string[] = [];
  let remaining = ROUND_TICKS;
  let distance = state.distance ?? 'far';
  let execution = copyExecutionState(actor.execution);
  const roundIndex = (state.rounds ?? []).length;
  const options = actor.actionIds.map((id) => requireAction(catalog, state, id));
  const timingOf = (action: CombatActionDefinition) => timingFor(action, modifiersFor(state, actorId, catalogs), catalogs);

  const usable = (action: CombatActionDefinition) => {
    const timing = timingOf(action);
    if (durationOf(timing) > remaining) return false;
    if ((timing.cooldown > 0 || action.id.startsWith(PREPARED_ACTION_PREFIX)) && plan.includes(action.id)) return false;
    return describeBlockedAction({ ...actor, execution }, action, timing, roleOf(state, actorId), catalogs) === undefined;
  };
  const reaches = (action: CombatActionDefinition) =>
    action.target === 'self' || (action.range ?? 'melee') !== 'melee' || distance === 'near';
  const perTick = (action: CombatActionDefinition) => totalOf(action, 'damage') / durationOf(timingOf(action));
  const isDefense = (action: CombatActionDefinition) =>
    action.effects.some((effect) => effect.type === 'guard' || effect.type === 'evade');

  for (let step = 0; step < ROUND_TICKS * 2; step += 1) {
    const candidates = options.filter(usable);
    if (candidates.length === 0) break;
    const damaging = candidates
      .filter((action) => totalOf(action, 'damage') > 0 && reaches(action))
      .sort((left, right) => perTick(right) - perTick(left) || right.speed - left.speed);
    let pick: CombatActionDefinition | undefined;

    if (actor.health <= Math.floor(actor.maxHealth * 0.3)) {
      pick = candidates.find((action) => totalOf(action, 'heal') > 0 && !plan.includes(action.id));
    }
    if (!pick && plan.length === 0 && (style === 'defensive' || (style === 'balanced' && roundIndex % 2 === 1))) {
      pick = candidates.find(isDefense);
    }
    if (!pick && damaging.length === 0 && distance === 'far') {
      pick = candidates.find((action) => action.effects.some((effect) => effect.type === 'move' && effect.to === 'near'));
    }
    if (!pick && style !== 'aggressive') {
      pick = candidates.find(
        (action) =>
          reaches(action) &&
          !plan.includes(action.id) &&
          action.effects.some(
            (effect) =>
              effect.type === 'condition.apply' && !foe.conditions.some((entry) => entry.conditionId === effect.conditionId),
          ),
      );
    }
    if (!pick) pick = damaging[0];
    if (!pick) pick = candidates.find((action) => isDefense(action) && !plan.includes(action.id));
    if (!pick) break;

    const timing = timingOf(pick);
    plan.push(pick.id);
    execution = payCost(execution, timing.cost);
    remaining -= durationOf(timing);
    for (const effect of pick.effects) {
      if (effect.type === 'move') distance = effect.to;
    }
  }
  return plan;
}

/** O que o Sistema deixa ler da intenção do oponente: a primeira ação (duas com Sentidos Aguçados). */
export function readOpponentIntent(
  catalog: IndexedCombat,
  state: CombatState,
  style: CombatStyle = 'balanced',
  runtime: CombatRuntime = {},
): { revealed: CombatActionDefinition[]; hidden: number } {
  const plan = planCombatantRound(catalog, state, state.opponent.id, style, runtime);
  const count = (state.knownSkillIds ?? []).includes('sharpened-senses') ? 2 : 1;
  return {
    revealed: plan.slice(0, count).map((id) => requireAction(catalog, state, id)),
    hidden: Math.max(0, plan.length - count),
  };
}

interface RoundStep {
  actorId: string;
  side: 'ally' | 'foe';
  action: CombatActionDefinition;
  timing: ResolvedActionTiming;
  start: number;
  lands: number;
  order: number;
}

export function resolveRound(
  catalog: IndexedCombat,
  state: CombatState,
  playerPlan: readonly string[],
  options: ResolveRoundOptions = {},
): CombatState {
  const catalogs = resolveRuntime(options.runtime);
  if (state.outcome !== 'ongoing') {
    throw new CombatError('O combate já terminou.');
  }
  const round = state.turn + 1;
  const log = state.log.map((entry) => ({ ...entry }));
  let prepared = state.prepared.map((entry) => ({ ...entry }));
  const usedPrepared = state.usedPrepared.map((entry) => ({ ...entry }));
  const player = copyCombatant(state.player);
  const opponent = copyCombatant(state.opponent);
  const allies = (state.allies ?? []).map(copyCombatant);
  const foes = (state.foes ?? []).map(copyCombatant);
  const rounds = (state.rounds ?? []).map((entry) => ({ player: [...entry.player], opponent: [...entry.opponent] }));
  const events: RoundEvent[] = [];

  if (playerPlan.length === 1 && playerPlan[0] === FLEE_ACTION_ID) {
    tickAllCooldowns([player, opponent, ...allies, ...foes]);
    const text = `${state.player.name} recua do confronto.`;
    log.push({ turn: round, actorId: 'player', actionId: FLEE_ACTION_ID, text });
    events.push({ tick: 1, actorId: 'player', actionId: FLEE_ACTION_ID, kind: 'move', text });
    rounds.push({ player: [FLEE_ACTION_ID], opponent: [] });
    return {
      ...finishTurn(state, patchOf(round, player, opponent, allies, foes, log, prepared, usedPrepared, 'fled', state)),
      distance: state.distance ?? 'far',
      rounds,
      lastRound: events,
    };
  }

  if (playerPlan.length === 0) throw new CombatError('Monte ao menos uma ação antes de declarar pronto.');
  const playerCheck = checkRoundPlan(catalog, state, 'player', playerPlan, options.runtime);
  if (!playerCheck.ok) throw new CombatError(playerCheck.reason ?? 'A sequência da rodada é inválida.');

  const opponentPlan = options.opponentPlan
    ? [...options.opponentPlan]
    : planCombatantRound(catalog, state, state.opponent.id, options.opponentStyle ?? 'balanced', options.runtime);
  if (options.opponentPlan) {
    const check = checkRoundPlan(catalog, state, state.opponent.id, opponentPlan, options.runtime);
    if (!check.ok) throw new CombatError(check.reason ?? 'A sequência do oponente é inválida.');
  }

  const orders = inspectCompanionOrders(options.companionOrders ?? []);
  const plans: { actorId: string; side: 'ally' | 'foe'; actionIds: string[] }[] = [
    { actorId: 'player', side: 'ally', actionIds: [...playerPlan] },
    ...allies
      .filter((ally) => ally.health > 0)
      .map((ally) => ({
        actorId: ally.id,
        side: 'ally' as const,
        actionIds: allyRoundPlan(catalog, state, ally, orders.find((entry) => entry.actorId === ally.id)?.actionId, options.runtime),
      })),
    { actorId: opponent.id, side: 'foe', actionIds: opponentPlan },
    ...foes
      .filter((foe) => foe.health > 0)
      .map((foe) => ({
        actorId: foe.id,
        side: 'foe' as const,
        actionIds: planCombatantRound(catalog, state, foe.id, 'balanced', options.runtime),
      })),
  ];

  applyStartTicks([player, opponent, ...allies, ...foes], catalogs);
  const actors = new Map<string, CombatantState>([player, opponent, ...allies, ...foes].map((entry) => [entry.id, entry]));

  const steps: RoundStep[] = [];
  let order = 0;
  for (const plan of plans) {
    let cursor = 1;
    const actor = actors.get(plan.actorId);
    if (!actor) continue;
    for (const actionId of plan.actionIds) {
      const action = requireAction(catalog, state, actionId);
      const timing = timingFor(action, modifiersFor(state, plan.actorId, catalogs), catalogs);
      actor.execution = payCost(actor.execution, timing.cost);
      steps.push({
        actorId: plan.actorId,
        side: plan.side,
        action,
        timing,
        start: cursor,
        lands: cursor + timing.phases.prepare,
        order: order++,
      });
      cursor += durationOf(timing);
    }
  }

  let distance = state.distance ?? 'far';
  const evading = new Map<string, { from: number; to: number }>();
  const cancelled = new Set<number>();
  const ordered = [...steps].sort(
    (left, right) =>
      left.lands - right.lands ||
      right.timing.speed - left.timing.speed ||
      (left.actorId === 'player' ? -1 : right.actorId === 'player' ? 1 : left.order - right.order),
  );

  for (const step of ordered) {
    const actor = actors.get(step.actorId);
    if (!actor || actor.health <= 0) continue;
    const record = (kind: RoundEvent['kind'], text: string) => {
      const line = `${actor.name}: ${text}`;
      events.push({ tick: step.lands, actorId: actor.id, actionId: step.action.id, kind, text: line });
      log.push({ turn: round, actorId: actor.id, actionId: step.action.id, text: line });
    };
    if (cancelled.has(step.order)) {
      record('interrupted', `${step.action.name} foi interrompida antes de sair.`);
      continue;
    }
    const opposing = step.side === 'ally' ? living([opponent, ...foes]) : living([player, ...allies]);
    const target = step.action.target === 'self' ? actor : opposing[0];
    if (!target) continue;

    const movesNear = step.action.effects.some((effect) => effect.type === 'move' && effect.to === 'near');
    if (step.action.target !== 'self' && (step.action.range ?? 'melee') === 'melee' && distance === 'far' && !movesNear) {
      record('out-of-range', `${step.action.name} não alcança — longe demais.`);
      continue;
    }
    for (const effect of step.action.effects) {
      if (effect.type === 'move') distance = effect.to;
      if (effect.type === 'evade') evading.set(actor.id, { from: step.lands, to: step.lands + effect.ticks - 1 });
    }
    const window = target !== actor ? evading.get(target.id) : undefined;
    if (window && step.lands >= window.from && step.lands <= window.to && totalOf(step.action, 'damage') > 0) {
      record('evaded', `${step.action.name} — ${target.name} se esquiva.`);
      continue;
    }

    const coreEffects = step.action.effects.filter((effect) => effect.type !== 'move' && effect.type !== 'evade');
    const healthBefore = target.health;
    const modifiers = actor.id === player.id ? state.loadout.modifiers : { damage: 0, guard: 0, healing: 0 };
    const text = coreEffects.length > 0
      ? applyAction({ ...step.action, effects: coreEffects }, actor, target, modifiers, catalogs)
      : describeMovement(step.action);
    const moved = step.action.effects.some((effect) => effect.type === 'move');
    record(target === actor ? (moved ? 'move' : 'self') : 'hit', text);

    const wounded = target !== actor && target.health < healthBefore;
    const forcesInterrupt = step.action.effects.some((effect) => effect.type === 'interrupt');
    if (wounded || forcesInterrupt) {
      for (const other of steps) {
        if (
          other.actorId === target.id &&
          other.action.interruptible &&
          other.start <= step.lands &&
          step.lands < other.lands
        ) {
          cancelled.add(other.order);
        }
      }
    }
  }

  const usedThisRound = new Map<string, string[]>();
  for (const step of steps) {
    const actor = actors.get(step.actorId);
    if (actor && step.timing.cooldown > 0) {
      actor.execution = setCooldown(actor.execution, step.action.id, step.timing.cooldown);
      usedThisRound.set(step.actorId, [...(usedThisRound.get(step.actorId) ?? []), step.action.id]);
    }
  }
  for (const combatant of [player, opponent, ...allies, ...foes]) {
    combatant.execution = tickCooldowns(combatant.execution, usedThisRound.get(combatant.id) ?? []);
    // A postura defensiva vale para a rodada em que foi erguida.
    combatant.guard = 0;
  }

  for (const step of steps) {
    if (step.actorId !== 'player' || !step.action.id.startsWith(PREPARED_ACTION_PREFIX) || cancelled.has(step.order)) continue;
    const slot = Number(step.action.id.slice(PREPARED_ACTION_PREFIX.length));
    const used = prepared.find((entry) => entry.index === slot);
    if (!used) continue;
    usedPrepared.push({ slot, itemId: used.itemId });
    prepared = prepared.filter((entry) => entry.index !== slot);
    player.actionIds = player.actionIds.filter((id) => id !== step.action.id);
  }

  applyEndTicks([player, opponent, ...allies, ...foes], catalogs);
  rounds.push({ player: [...playerPlan], opponent: [...opponentPlan] });
  const outcome = deriveOutcome(player, opponent, foes);
  return {
    ...finishTurn(state, {
      ...patchOf(round, player, opponent, allies, foes, log, prepared, usedPrepared, outcome, state),
      companionOrderLog: appendOrders(state, orders),
    }),
    distance,
    rounds,
    lastRound: events,
  };
}

function patchOf(
  turn: number,
  player: CombatantState,
  opponent: CombatantState,
  allies: CombatantState[],
  foes: CombatantState[],
  log: CombatState['log'],
  prepared: CombatState['prepared'],
  usedPrepared: CombatState['usedPrepared'],
  outcome: CombatState['outcome'],
  state: CombatState,
): TurnPatch {
  return { turn, player, opponent, allies, foes, log, prepared, usedPrepared, outcome, companionOrderLog: appendOrders(state, []) };
}

/** Sequência de um companheiro: a orientação recebida primeiro, depois o que a IA dele escolheria. */
function allyRoundPlan(
  catalog: IndexedCombat,
  state: CombatState,
  ally: CombatantState,
  orderedActionId: string | undefined,
  runtime: CombatRuntime | undefined,
): string[] {
  const planned = planCombatantRound(catalog, state, ally.id, 'balanced', runtime);
  if (orderedActionId === undefined) return planned;
  if (!ally.actionIds.includes(orderedActionId)) {
    throw new CombatError('A orientação de companheiro não está disponível.');
  }
  const plan = [orderedActionId];
  if (!checkRoundPlan(catalog, state, ally.id, plan, runtime).ok) {
    throw new CombatError('A orientação de companheiro não está disponível.');
  }
  for (const actionId of planned) {
    if (checkRoundPlan(catalog, state, ally.id, [...plan, actionId], runtime).ok) plan.push(actionId);
  }
  return plan;
}

function durationOf(timing: ResolvedActionTiming): number {
  return Math.max(1, timing.phases.prepare + timing.phases.execute + timing.phases.recover);
}

function actorById(state: CombatState, actorId: string): CombatantState | undefined {
  return [state.player, state.opponent, ...(state.allies ?? []), ...(state.foes ?? [])].find((entry) => entry.id === actorId);
}

function roleOf(state: CombatState, actorId: string): 'player' | 'opponent' | 'ally' {
  if (actorId === 'player') return 'player';
  return (state.allies ?? []).some((entry) => entry.id === actorId) ? 'ally' : 'opponent';
}

function modifiersFor(state: CombatState, actorId: string, runtime: Required<CombatRuntime>) {
  return actorId === 'player' ? playerModifiers(state, runtime) : emptyExecutionModifiers();
}

function describeMovement(action: CombatActionDefinition): string {
  const move = action.effects.find((effect): effect is Extract<CombatEffect, { type: 'move' }> => effect.type === 'move');
  if (move) return move.to === 'near' ? `${action.name}: fecha a distância` : `${action.name}: abre distância`;
  return `${action.name}: pronto para se esquivar`;
}
