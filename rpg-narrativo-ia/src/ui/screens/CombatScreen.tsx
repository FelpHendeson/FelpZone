import { useState } from 'react';
import {
  FLEE_ACTION_ID,
  INITIAL_COMBAT,
  listPlayerActionViews,
  resolveTurn,
  type CombatActionDefinition,
  type CombatActionView,
  type CombatEffect,
  type CombatantState,
  type CombatOutcome,
  type CombatState,
} from '../../modules/combat';
import { INITIAL_CONDITIONS } from '../../modules/conditions';
import { INITIAL_EXECUTION } from '../../modules/execution';
import type { CompanionOrderView } from '../../modules/party';

interface CombatScreenProps {
  initialState: CombatState;
  encounterName: string;
  orderViews?: CompanionOrderView[];
  onFinish: (finalState: CombatState) => void;
}

export function CombatScreen({ initialState, encounterName, orderViews = [], onFinish }: CombatScreenProps) {
  const [state, setState] = useState<CombatState>(initialState);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, string>>(() => defaultOrders(orderViews));
  const finished = state.outcome !== 'ongoing';
  const actions = state.outcome === 'ongoing' ? listPlayerActionViews(INITIAL_COMBAT, state) : [];
  const recentLog = state.log.slice(-6);
  const numen = state.player.execution.reserves.find((entry) => entry.energyId === 'numen');
  const numenMax = INITIAL_EXECUTION.reserveByEnergyId.get('numen')?.max ?? 0;
  const foes = [state.opponent, ...(state.foes ?? [])];
  const allies = [state.player, ...(state.allies ?? [])];

  function act(actionId: string) {
    if (state.outcome !== 'ongoing') {
      return;
    }
    const orders = orderViews
      .filter((view) => view.available && selectedOrders[view.order.npcId] === view.order.id)
      .filter((view, index, list) => list.findIndex((entry) => entry.order.npcId === view.order.npcId) === index)
      .map((view) => ({ actorId: view.order.npcId, actionId: view.order.actionId }));
    setState(resolveTurn(INITIAL_COMBAT, state, actionId, orders));
  }

  return (
    <main className="screen screen--combat">
      <header className="combat-header">
        <span className="section-kicker">Confronto</span>
        <h1>{encounterName}</h1>
        <p>Turno {state.turn}</p>
        {numen ? (
          <p className="combat-reserve">
            Númen {numen.current}/{numenMax}
          </p>
        ) : null}
      </header>

      <div className="combat-arena">
        <div className="combat-side combat-side--foes" aria-label="Oponentes">
          {foes.map((combatant) => (
            <CombatantCard key={combatant.id} combatant={combatant} role="opponent" />
          ))}
        </div>
        <div className="combat-side combat-side--allies" aria-label="Grupo">
          {allies.map((combatant) => (
            <CombatantCard key={combatant.id} combatant={combatant} role={combatant.id === 'player' ? 'player' : 'ally'} />
          ))}
        </div>
      </div>

      <section className="combat-log" aria-label="Registro do combate" aria-live="polite">
        {recentLog.length === 0 ? (
          <p className="combat-log__empty">O confronto vai começar. Escolha sua ação.</p>
        ) : (
          <ul>
            {recentLog.map((entry, index) => (
              <li key={`${entry.turn}-${entry.actorId}-${index}`}>{entry.text}</li>
            ))}
          </ul>
        )}
      </section>

      {finished ? (
        <section className={`combat-result combat-result--${state.outcome}`} role="status">
          <strong>{outcomeTitle(state.outcome)}</strong>
          <p>{outcomeMessage(state.outcome)}</p>
          <p className="combat-result__detail">
            {state.outcome === 'defeat'
              ? 'Você retorna com a saúde no limite (1). O mundo avança um período.'
              : `Saúde preservada: ${state.player.health}/${state.player.maxHealth}. O mundo avança um período.`}
          </p>
          <button
            type="button"
            className="button button--primary button--action"
            onClick={() => onFinish(state)}
          >
            Voltar ao mundo
          </button>
        </section>
      ) : (
        <>
          {orderViews.length > 0 ? (
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
                  onClick={() =>
                    setSelectedOrders((current) => ({
                      ...current,
                      [view.order.npcId]: view.order.id,
                    }))
                  }
                >
                  <strong>{view.order.label}</strong>
                  <small>{view.blockedReason ?? view.order.hint}</small>
                </button>
              ))}
            </section>
          ) : null}
          <section className="combat-actions" aria-label="Ações de combate">
            {actions.map((view) => (
              <button
                key={view.action.id}
                type="button"
                className={view.available ? 'combat-action' : 'combat-action combat-action--blocked'}
                disabled={!view.available}
                onClick={() => act(view.action.id)}
              >
                <strong>{view.action.name}</strong>
                <small>{describeActionView(view)}</small>
              </button>
            ))}
            <button type="button" className="combat-action combat-action--flee" onClick={() => act(FLEE_ACTION_ID)}>
              <strong>Fugir</strong>
              <small>Encerra o confronto sem vencer</small>
            </button>
          </section>
        </>
      )}
    </main>
  );
}

function defaultOrders(views: CompanionOrderView[]): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const view of views) {
    if (!view.available || selected[view.order.npcId]) {
      continue;
    }
    selected[view.order.npcId] = view.order.id;
  }
  return selected;
}

function CombatantCard({ combatant, role }: { combatant: CombatantState; role: 'player' | 'opponent' | 'ally' }) {
  const ratio = Math.max(0, Math.round((combatant.health / combatant.maxHealth) * 100));
  const defenseName = combatant.defenseElementId
    ? INITIAL_CONDITIONS.elementById.get(combatant.defenseElementId)?.name
    : undefined;
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
      {combatant.guard > 0 ? <p className="combatant-card__guard">Escudo: {combatant.guard}</p> : null}
      {combatant.conditions.length > 0 ? (
        <ul className="combat-condition-list" aria-label="Condições ativas">
          {combatant.conditions.map((entry) => (
            <li key={entry.conditionId}>
              {INITIAL_CONDITIONS.conditionById.get(entry.conditionId)?.name ?? entry.conditionId}
              {' · '}
              {entry.remainingTurns} turno{entry.remainingTurns === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function describeActionView(view: CombatActionView): string {
  const parts = [
    describeAction(view.action),
    `prep. ${view.phases.prepare}`,
    `vel. ${view.action.speed}`,
  ];
  if (view.cost) {
    parts.push(`Númen ${view.cost.amount}`);
  }
  if (view.cooldown > 0) {
    parts.push(`recarga ${view.cooldown}`);
  }
  if (view.blockedReason) {
    parts.push(view.blockedReason);
  }
  return parts.join(' · ');
}

function describeAction(action: CombatActionDefinition): string {
  return action.effects.map(describeEffect).join(', ');
}

function describeEffect(effect: CombatEffect): string {
  if (effect.type === 'damage') {
    return `${effect.amount} de dano`;
  }
  if (effect.type === 'heal') {
    return `cura ${effect.amount}`;
  }
  if (effect.type === 'guard') {
    return `escudo ${effect.amount}`;
  }
  if (effect.type === 'condition.apply') {
    return `aplica ${INITIAL_CONDITIONS.conditionById.get(effect.conditionId)?.name ?? 'condição'}`;
  }
  if (effect.type === 'interrupt') {
    return 'interrompe preparação';
  }
  return 'alivia condição';
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
