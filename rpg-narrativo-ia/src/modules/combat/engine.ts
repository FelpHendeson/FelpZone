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
  type PreparedConsumableState,
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
    } else {
      target.conditions = cleanseConditions(target.conditions, effect.conditionId, effect.count);
      parts.push(`${action.name} alivia uma condição`);
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
