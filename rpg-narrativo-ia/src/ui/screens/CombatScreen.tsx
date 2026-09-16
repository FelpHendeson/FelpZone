import { useState } from 'react';
import {
  FLEE_ACTION_ID,
  INITIAL_COMBAT,
  listPlayerActions,
  resolveTurn,
  type CombatActionDefinition,
  type CombatEffect,
  type CombatantState,
  type CombatOutcome,
  type CombatState,
} from '../../modules/combat';
import { INITIAL_CONDITIONS } from '../../modules/conditions';

interface CombatScreenProps {
  initialState: CombatState;
  encounterName: string;
  onFinish: (finalState: CombatState) => void;
}

export function CombatScreen({ initialState, encounterName, onFinish }: CombatScreenProps) {
  const [state, setState] = useState<CombatState>(initialState);
  const finished = state.outcome !== 'ongoing';
  const actions = state.outcome === 'ongoing' ? listPlayerActions(INITIAL_COMBAT, state) : [];
  const recentLog = state.log.slice(-6);

  function act(actionId: string) {
    if (state.outcome !== 'ongoing') {
      return;
    }
    setState(resolveTurn(INITIAL_COMBAT, state, actionId));
  }

  return (
    <main className="screen screen--combat">
      <header className="combat-header">
        <span className="section-kicker">Confronto</span>
        <h1>{encounterName}</h1>
        <p>Turno {state.turn}</p>
      </header>

      <div className="combat-arena">
        <CombatantCard combatant={state.opponent} role="opponent" />
        <CombatantCard combatant={state.player} role="player" />
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
        <section className="combat-actions" aria-label="Ações de combate">
          {actions.map((action) => (
            <button key={action.id} type="button" className="combat-action" onClick={() => act(action.id)}>
              <strong>{action.name}</strong>
              <small>{describeAction(action)} · vel. {action.speed}</small>
            </button>
          ))}
          <button type="button" className="combat-action combat-action--flee" onClick={() => act(FLEE_ACTION_ID)}>
            <strong>Fugir</strong>
            <small>Encerra o confronto sem vencer</small>
          </button>
        </section>
      )}
    </main>
  );
}

function CombatantCard({ combatant, role }: { combatant: CombatantState; role: 'player' | 'opponent' }) {
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
