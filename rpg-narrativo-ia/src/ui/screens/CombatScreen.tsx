import { useEffect, useState } from 'react';
import {
  FLEE_ACTION_ID,
  actionTicks,
  checkRoundPlan,
  readOpponentIntent,
  roundTicksOf,
  resolveRound,
  type CombatActionDefinition,
  type CombatEffect,
  type CombatantState,
  type CombatOutcome,
  type CombatState,
  type CombatStyle,
  type IndexedCombat,
  type RoundEvent,
} from '../../modules/combat';
import { INITIAL_CONDITIONS, type IndexedConditions } from '../../modules/conditions';
import { INITIAL_EXECUTION, type IndexedExecution } from '../../modules/execution';
import type { CompanionOrderView } from '../../modules/party';
import { Silhouette } from '../components/Silhouette';
import { poseForAction } from '../silhouettes';

/** Como o oponente decide a rodada: IA por regras (encontros e Ecos) ou outra pessoa no mesmo aparelho. */
export type CombatOpponentControl =
  | { kind: 'ai'; style?: CombatStyle }
  | { kind: 'hot-seat'; playerLabel: string; opponentLabel: string };

interface CombatScreenProps {
  initialState: CombatState;
  encounterName: string;
  combat: IndexedCombat;
  conditions?: IndexedConditions;
  execution?: IndexedExecution;
  orderViews?: CompanionOrderView[];
  control?: CombatOpponentControl;
  kicker?: string;
  finishLabel?: string;
  resultDetail?: (state: CombatState) => string;
  /** Cor das silhuetas nas cartas (a do arquétipo de quem planeja). */
  tint?: string;
  opponentTint?: string;
  /** Combos que o jogador já descobriu: aparecem nomeados entre as cartas da sequência. */
  discoveredCombos?: readonly string[];
  onFinish: (finalState: CombatState) => void;
}

type Phase = 'plan' | 'handoff' | 'plan-opponent' | 'playback';

const PLAYBACK_STEP_MS = 650;

export function CombatScreen({
  initialState,
  encounterName,
  combat,
  conditions,
  execution,
  orderViews = [],
  control = { kind: 'ai' },
  kicker = 'Confronto',
  finishLabel = 'Voltar ao mundo',
  resultDetail = defaultResultDetail,
  tint = 'var(--accent)',
  opponentTint = 'var(--danger)',
  discoveredCombos = [],
  onFinish,
}: CombatScreenProps) {
  const [state, setState] = useState<CombatState>(initialState);
  const [shown, setShown] = useState<CombatState>(initialState);
  const [phase, setPhase] = useState<Phase>('plan');
  const [plan, setPlan] = useState<string[]>([]);
  const [opponentPlan, setOpponentPlan] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, string>>(() => defaultOrders(orderViews));
  const runtime = { conditions, execution };
  const conditionCatalog = conditions ?? INITIAL_CONDITIONS;
  const executionCatalog = execution ?? INITIAL_EXECUTION;
  const style = control.kind === 'ai' ? control.style ?? 'balanced' : 'balanced';
  const events = state.lastRound ?? [];
  const finished = state.outcome !== 'ongoing' && phase !== 'playback';

  useEffect(() => {
    if (phase !== 'playback') return;
    const done = revealed >= events.length;
    const timer = window.setTimeout(
      () => {
        if (done) {
          setShown(state);
          setPhase('plan');
        } else {
          setRevealed((value) => value + 1);
        }
      },
      done ? 400 : PLAYBACK_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, revealed, events.length, state]);

  const planningOpponent = phase === 'plan-opponent';
  const actorId = planningOpponent ? state.opponent.id : 'player';
  const actor = planningOpponent ? state.opponent : state.player;
  const current = planningOpponent ? opponentPlan : plan;
  const setCurrent = planningOpponent ? setOpponentPlan : setPlan;
  const check = checkRoundPlan(combat, state, actorId, current, runtime);
  const usedTicks = check.usedTicks;
  const roundTicks = roundTicksOf(actor);
  // Sentidos Aguçados percebem quando a sequência está a uma ação de um combo ainda desconhecido.
  const senses = !planningOpponent && (state.knownSkillIds ?? []).includes('sharpened-senses');
  const lastPlanned = current[current.length - 1];
  const nearCombo =
    senses &&
    lastPlanned !== undefined &&
    combat.combos.some(
      (combo) => combo.first === lastPlanned && !discoveredCombos.includes(combo.id) && actor.actionIds.includes(combo.second),
    );
  const numen = actor.execution.reserves.find((entry) => entry.energyId === 'numen');
  const numenMax = executionCatalog.reserveByEnergyId.get('numen')?.max ?? 0;
  const intent = control.kind === 'ai' && state.outcome === 'ongoing' ? readOpponentIntent(combat, state, style, runtime) : null;
  const foes = [shown.opponent, ...(shown.foes ?? [])];
  const allies = [shown.player, ...(shown.allies ?? [])];

  function declareReady() {
    if (current.length === 0 || !check.ok) return;
    if (control.kind === 'hot-seat' && phase === 'plan') {
      setPhase('handoff');
      return;
    }
    const orders = orderViews
      .filter((view) => view.available && selectedOrders[view.order.npcId] === view.order.id)
      .map((view) => ({ actorId: view.order.npcId, actionId: view.order.actionId }));
    const next = resolveRound(combat, state, plan, {
      runtime,
      opponentStyle: style,
      companionOrders: orders,
      ...(control.kind === 'hot-seat' ? { opponentPlan } : {}),
    });
    play(next);
  }

  function flee() {
    play(resolveRound(combat, state, [FLEE_ACTION_ID], { runtime, opponentStyle: style }));
  }

  function play(next: CombatState) {
    setShown(state);
    setState(next);
    setPlan([]);
    setOpponentPlan([]);
    setRevealed(0);
    setPhase('playback');
  }

  return (
    <main className="screen screen--combat">
      <header className="combat-header">
        <span className="section-kicker">{kicker}</span>
        <h1>{encounterName}</h1>
        <p>
          Rodada {state.turn + (phase === 'playback' || finished ? 0 : 1)} · {shown.distance === 'near' ? 'Perto' : 'Longe'}
          {numen ? ` · Númen ${numen.current}/${numenMax}` : ''}
        </p>
      </header>

      <div className="combat-arena">
        <div className="combat-side combat-side--foes" aria-label="Oponentes">
          {foes.map((combatant) => (
            <CombatantCard key={combatant.id} combatant={combatant} role="opponent" conditions={conditionCatalog} />
          ))}
        </div>
        <div className="combat-side combat-side--allies" aria-label="Grupo">
          {allies.map((combatant) => (
            <CombatantCard key={combatant.id} combatant={combatant} role={combatant.id === 'player' ? 'player' : 'ally'} conditions={conditionCatalog} />
          ))}
        </div>
      </div>

      {phase === 'playback' ? (
        <RoundPlayback events={events.slice(0, revealed)} total={events.length} onSkip={() => setRevealed(events.length)} />
      ) : finished ? (
        <section className={`combat-result combat-result--${state.outcome}`} role="status">
          <strong>{outcomeTitle(state.outcome)}</strong>
          <p>{outcomeMessage(state.outcome)}</p>
          <p className="combat-result__detail">{resultDetail(state)}</p>
          <RoundPlayback events={events} total={events.length} compact />
          <button type="button" className="button button--primary button--action" onClick={() => onFinish(state)}>
            {finishLabel}
          </button>
        </section>
      ) : phase === 'handoff' && control.kind === 'hot-seat' ? (
        <section className="combat-handoff" role="status">
          <span className="section-kicker">[ Sistema ] · Sequência guardada</span>
          <strong>Passe o aparelho para {control.opponentLabel}</strong>
          <p>{control.playerLabel} já se declarou pronto. A sequência fica oculta até a rodada acontecer.</p>
          <button type="button" className="button button--primary" onClick={() => setPhase('plan-opponent')}>
            Sou {control.opponentLabel}, montar minha rodada
          </button>
        </section>
      ) : (
        <>
          {state.log.length > 0 ? <RoundPlayback events={state.lastRound ?? []} total={(state.lastRound ?? []).length} compact /> : null}
          {intent && intent.revealed.length > 0 ? (
            <section className="combat-intent" aria-label="Leitura do Sistema">
              <span className="section-kicker">[ Sistema ] · Leitura</span>
              <p>
                {state.opponent.name} prepara: <strong>{intent.revealed.map((action) => action.name).join(' → ')}</strong>
                {intent.hidden > 0 ? ` → ${intent.hidden} ação${intent.hidden === 1 ? '' : 'ões'} oculta${intent.hidden === 1 ? '' : 's'}` : ''}
              </p>
            </section>
          ) : null}
          {control.kind === 'hot-seat' ? (
            <p className="combat-turn-owner">
              Vez de <strong>{planningOpponent ? control.opponentLabel : control.playerLabel}</strong> montar a rodada
            </p>
          ) : null}

          <section className="combat-plan" aria-label="Sequência da rodada">
            <div className="combat-plan__head">
              <strong>Sua sequência</strong>
              <span>{usedTicks}/{roundTicks} tempos</span>
            </div>
            <div className="combat-track" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${roundTicks}, minmax(0, 1fr))` }}>
              {check.slots.map((slot, index) => (
                <span
                  key={`${slot.actionId}-${index}`}
                  className="combat-track__slot"
                  style={{ gridColumn: `${slot.start} / span ${slot.duration}` }}
                >
                  {index + 1}
                </span>
              ))}
              {Array.from({ length: roundTicks - usedTicks }, (_, index) => (
                <span key={`free-${index}`} className="combat-track__free" style={{ gridColumn: `${usedTicks + index + 1} / span 1` }}>
                  {usedTicks + index + 1}
                </span>
              ))}
            </div>
            {check.slots.length > 0 ? (
              <ol className="combat-sequence">
                {check.slots.map((slot, index) => {
                  const name = combat.actionById.get(slot.actionId)?.name ?? labelForPrepared(state, slot.actionId);
                  const combo = index > 0 ? combat.comboByPair.get(`${check.slots[index - 1]!.actionId}>${slot.actionId}`) : undefined;
                  const known = combo !== undefined && discoveredCombos.includes(combo.id);
                  return (
                    <li key={`${slot.actionId}-${index}`}>
                      {combo && (known || senses) ? (
                        <span className={known ? 'combat-sequence__combo' : 'combat-sequence__combo combat-sequence__combo--hidden'}>
                          {known ? `◆ ${combo.name}` : '◇ Sequência possível'}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="combat-sequence__item"
                        onClick={() => setCurrent(current.filter((_, position) => position !== index))}
                        aria-label={`Remover ${name} da sequência`}
                      >
                        <span className="combat-sequence__index">{index + 1}</span>
                        <strong>{name}</strong>
                        <small>tempo {slot.lands}</small>
                        <span aria-hidden="true">×</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="combat-plan__hint">Toque nas ações abaixo para montar a rodada. Toque numa ação da sequência para tirá-la.</p>
            )}
            {nearCombo ? <p className="combat-plan__hint combat-plan__hint--senses">◇ Sentidos Aguçados: a próxima ação pode fechar uma sequência ainda desconhecida.</p> : null}
            {!check.ok && check.reason ? <p className="combat-plan__error">{check.reason}</p> : null}
            <div className="combat-plan__actions">
              <button type="button" className="button button--ghost button--compact" disabled={current.length === 0} onClick={() => setCurrent([])}>
                Limpar
              </button>
              <button type="button" className="button button--primary" disabled={current.length === 0 || !check.ok} onClick={declareReady}>
                Pronto
              </button>
            </div>
          </section>

          {!planningOpponent && orderViews.length > 0 ? (
            <section className="combat-orders" aria-label="Orientações de companheiro">
              {orderViews.map((view) => (
                <button
                  key={view.order.id}
                  type="button"
                  className={
                    selectedOrders[view.order.npcId] === view.order.id
                      ? 'combat-action combat-action--selected'
                      : view.available
                        ? 'combat-action'
                        : 'combat-action combat-action--blocked'
                  }
                  disabled={!view.available}
                  onClick={() => setSelectedOrders((value) => ({ ...value, [view.order.npcId]: view.order.id }))}
                >
                  <strong>{view.order.label}</strong>
                  <small>{view.blockedReason ?? view.order.hint}</small>
                </button>
              ))}
            </section>
          ) : null}

          <section className="combat-actions" aria-label="Banco de ações">
            {signatureFirst(actor.actionIds, planningOpponent ? [] : state.loadout.grantedActionIds).map((actionId) => {
              const action = actionFor(combat, state, actionId);
              const ticks = actionTicks(combat, state, actorId, actionId, runtime);
              const attempt = checkRoundPlan(combat, state, actorId, [...current, actionId], runtime);
              return (
                <button
                  key={actionId}
                  type="button"
                  className={attempt.ok ? 'combat-action combat-action--card' : 'combat-action combat-action--card combat-action--blocked'}
                  disabled={!attempt.ok}
                  onClick={() => setCurrent([...current, actionId])}
                >
                  <Silhouette pose={poseForAction(action)} size={44} tint={planningOpponent ? opponentTint : tint} className="combat-action__figure" />
                  <strong>{action.name}</strong>
                  <small>{describeAction(action, conditionCatalog, ticks)}</small>
                  {!attempt.ok && attempt.reason && !(attempt.reason.startsWith('Não cabe') && usedTicks >= roundTicks) ? (
                    <small className="combat-action__why">{attempt.reason}</small>
                  ) : null}
                </button>
              );
            })}
            {!planningOpponent ? (
              <button type="button" className="combat-action combat-action--flee" onClick={flee}>
                <strong>Fugir</strong>
                <small>Encerra o confronto sem vencer</small>
              </button>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}

function RoundPlayback({ events, total, compact = false, onSkip }: { events: RoundEvent[]; total: number; compact?: boolean; onSkip?: () => void }) {
  return (
    <section className={compact ? 'combat-log combat-log--compact' : 'combat-log'} aria-label="Linha do tempo da rodada" aria-live="polite">
      {!compact ? <span className="section-kicker">A rodada acontece · {events.length}/{total}</span> : null}
      {events.length === 0 ? (
        <p className="combat-log__empty">Os dois lados se declararam prontos.</p>
      ) : (
        <ul>
          {events.map((event, index) => (
            <li key={`${event.tick}-${event.actorId}-${index}`} className={`combat-log__event combat-log__event--${event.kind}`}>
              <span className="combat-log__tick">T{event.tick}</span> {event.text}
            </li>
          ))}
        </ul>
      )}
      {onSkip ? (
        <button type="button" className="button button--ghost button--compact" onClick={onSkip}>
          Pular
        </button>
      ) : null}
    </section>
  );
}

/** Técnicas de assinatura (concedidas pelo equipamento) abrem o banco de ações. */
function signatureFirst(actionIds: readonly string[], granted: readonly string[]): string[] {
  const signature = new Set(granted);
  return [...actionIds.filter((id) => signature.has(id)), ...actionIds.filter((id) => !signature.has(id))];
}

function defaultOrders(views: CompanionOrderView[]): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const view of views) {
    if (!view.available || selected[view.order.npcId]) continue;
    selected[view.order.npcId] = view.order.id;
  }
  return selected;
}

function actionFor(catalog: IndexedCombat, state: CombatState, actionId: string): CombatActionDefinition {
  const found = catalog.actionById.get(actionId);
  if (found) return found;
  return {
    id: actionId,
    name: labelForPrepared(state, actionId),
    description: 'Consumível preparado.',
    speed: 16,
    target: 'self',
    effects: [{ type: 'heal', amount: state.prepared.find((entry) => `prepared:${entry.index}` === actionId)?.heal ?? 0 }],
  };
}

function labelForPrepared(state: CombatState, actionId: string): string {
  return state.prepared.find((entry) => `prepared:${entry.index}` === actionId)?.name ?? actionId;
}

function CombatantCard({ combatant, role, conditions }: { combatant: CombatantState; role: 'player' | 'opponent' | 'ally'; conditions: IndexedConditions }) {
  const ratio = Math.max(0, Math.round((combatant.health / combatant.maxHealth) * 100));
  const defenseName = combatant.defenseElementId ? conditions.elementById.get(combatant.defenseElementId)?.name : undefined;
  return (
    <article className={`combatant-card combatant-card--${role}`}>
      <div className="combatant-card__head">
        <strong>{combatant.name}</strong>
        <span>
          {combatant.health}/{combatant.maxHealth}
        </span>
      </div>
      <div className="combatant-health" aria-label={`${combatant.health} de ${combatant.maxHealth} de vida`}>
        <span style={{ width: `${ratio}%` }} />
      </div>
      {defenseName ? <p className="combatant-card__guard">Afinidade conhecida: {defenseName}</p> : null}
      {combatant.conditions.length > 0 ? (
        <ul className="combat-condition-list" aria-label="Condições ativas">
          {combatant.conditions.map((entry) => (
            <li key={entry.conditionId}>
              {conditions.conditionById.get(entry.conditionId)?.name ?? entry.conditionId}
              {' · '}
              {entry.remainingTurns} rodada{entry.remainingTurns === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function describeAction(action: CombatActionDefinition, conditions: IndexedConditions, ticks: number): string {
  const parts = [`${ticks} tempo${ticks === 1 ? '' : 's'}`, ...action.effects.map((effect) => describeEffect(effect, conditions))];
  if (action.target !== 'self') parts.push(action.range === 'reach' ? 'alcança de longe' : 'corpo a corpo');
  if (action.cost) parts.push(`Númen ${action.cost.amount}`);
  if (action.interruptible) parts.push('interrompível');
  return parts.join(' · ');
}

function describeEffect(effect: CombatEffect, conditions: IndexedConditions): string {
  switch (effect.type) {
    case 'damage':
      return `${effect.amount} de dano`;
    case 'heal':
      return `cura ${effect.amount}`;
    case 'guard':
      return `escudo ${effect.amount}`;
    case 'condition.apply':
      return `aplica ${conditions.conditionById.get(effect.conditionId)?.name ?? 'condição'}`;
    case 'interrupt':
      return 'desmancha preparação';
    case 'evade':
      return `esquiva ${effect.ticks} tempo${effect.ticks === 1 ? '' : 's'}`;
    case 'move':
      return effect.to === 'near' ? 'aproxima' : 'afasta';
    default:
      return 'alivia condição';
  }
}

function defaultResultDetail(state: CombatState): string {
  return state.outcome === 'defeat'
    ? 'Você retorna com a saúde no limite (1). O confronto consome alguns minutos do dia.'
    : `Saúde preservada: ${state.player.health}/${state.player.maxHealth}. O confronto consome alguns minutos do dia.`;
}

function outcomeTitle(outcome: CombatOutcome): string {
  if (outcome === 'victory') return 'Vitória';
  if (outcome === 'defeat') return 'Derrota';
  return 'Fuga';
}

function outcomeMessage(outcome: CombatOutcome): string {
  if (outcome === 'victory') return 'A ameaça foi superada. Você retoma o controle da exploração.';
  if (outcome === 'defeat') return 'Você foi ferido e precisou recuar para sobreviver.';
  return 'Você escapou do confronto sem resolvê-lo.';
}
