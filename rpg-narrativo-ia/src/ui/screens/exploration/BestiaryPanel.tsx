import type { GameState } from '../../../core/state';
import { BESTIARY_LEVEL_NAMES, INITIAL_BESTIARY, bestiaryLevel, type BestiaryLevel } from '../../../modules/bestiary';
import { INITIAL_COMBAT, actionTicks, createCombat } from '../../../modules/combat';
import { INITIAL_CONDITIONS } from '../../../modules/conditions';
import { DetailScreen } from './shared';

/** Bestiário: cada criatura revela mais conforme é avistada, enfrentada, estudada e dominada. */
export function BestiaryPanel({ state, onBack }: { state: GameState; onBack: () => void }) {
  const cards = INITIAL_BESTIARY.entries.map((entry) => ({ entry, level: bestiaryLevel(state, entry.combatantId) }));
  return (
    <DetailScreen title="Bestiário" eyebrow="Registro de criaturas" tone="world" onBack={onBack}>
      <p className="detail-screen__intro">
        [ Sistema ] Cada confronto ensina algo. Avistar revela o nome; enfrentar, a força; ver todas as ações, o repertório; e dominar,
        o padrão — quem domina uma criatura lê uma ação a mais dela em combate.
      </p>
      <div className="bestiary-grid">
        {cards.map(({ entry, level }) => (
          <BestiaryCard key={entry.combatantId} combatantId={entry.combatantId} level={level} state={state} />
        ))}
      </div>
    </DetailScreen>
  );
}

function BestiaryCard({ combatantId, level, state }: { combatantId: string; level: BestiaryLevel; state: GameState }) {
  const entry = INITIAL_BESTIARY.byCombatantId.get(combatantId)!;
  const combatant = INITIAL_COMBAT.combatantById.get(combatantId)!;
  const record = state.bestiary?.entries[combatantId];
  if (level === 0) {
    return (
      <article className="bestiary-card bestiary-card--unknown" aria-label="Criatura desconhecida">
        <span className="bestiary-card__glyph" aria-hidden="true">?</span>
        <strong>???</strong>
        <small>Ainda não avistada.</small>
      </article>
    );
  }
  const encounter = INITIAL_COMBAT.encounters.find((candidate) => candidate.opponentId === combatantId)
    ?? INITIAL_COMBAT.encounters.find((candidate) => (candidate.additionalOpponentIds ?? []).includes(combatantId));
  const sample = encounter && encounter.opponentId === combatantId ? createCombat(INITIAL_COMBAT, encounter.id) : undefined;
  const element = combatant.defenseElementId ? INITIAL_CONDITIONS.elementById.get(combatant.defenseElementId)?.name : undefined;
  const noteVisible = entry.note && state.relationships.some((relationship) => relationship.characterId === entry.note!.npcId);
  return (
    <article className={`bestiary-card bestiary-card--level-${level}`} aria-label={combatant.name}>
      <header>
        <strong>{combatant.name}</strong>
        <span className="bestiary-card__level" aria-label={`Nível ${level} de 4: ${BESTIARY_LEVEL_NAMES[level]}`}>
          {'★'.repeat(level)}
          {'☆'.repeat(4 - level)} · {BESTIARY_LEVEL_NAMES[level]}
        </span>
      </header>
      <small className="bestiary-card__region">{entry.region}</small>
      <p>{entry.summary}</p>
      {level >= 2 ? (
        <>
          <p>{entry.lore}</p>
          <p className="bestiary-card__stats">
            Vitalidade {combatant.maxHealth}
            {element ? ` · afinidade: ${element}` : ''} · {record?.encounters ?? 0} confronto{record?.encounters === 1 ? '' : 's'} ·{' '}
            {record?.victories ?? 0} vitória{record?.victories === 1 ? '' : 's'}
          </p>
        </>
      ) : (
        <p className="bestiary-card__hint">Enfrente para saber mais.</p>
      )}
      {level >= 3 ? (
        <div className="bestiary-card__section">
          <span className="section-kicker">Repertório</span>
          <ul>
            {combatant.actionIds.map((actionId) => {
              const action = INITIAL_COMBAT.actionById.get(actionId);
              const ticks = sample ? actionTicks(INITIAL_COMBAT, sample, sample.opponent.id, actionId) : undefined;
              return (
                <li key={actionId}>
                  <strong>{action?.name ?? actionId}</strong>
                  {ticks ? ` · ${ticks} tempo${ticks === 1 ? '' : 's'}` : ''}
                  {action?.interruptible ? ' · interrompível' : ''}
                </li>
              );
            })}
          </ul>
        </div>
      ) : level === 2 ? (
        <p className="bestiary-card__hint">
          Ações vistas: {record?.actionsSeen.length ?? 0}/{combatant.actionIds.length}. Veja todas em combate para estudá-la.
        </p>
      ) : null}
      {level >= 4 ? (
        <div className="bestiary-card__section bestiary-card__section--pattern">
          <span className="section-kicker">Padrão</span>
          <p>{entry.pattern}</p>
          {noteVisible ? (
            <p className="bestiary-card__note">{entry.note!.text}</p>
          ) : null}
        </div>
      ) : level === 3 ? (
        <p className="bestiary-card__hint">
          Vença {INITIAL_BESTIARY.masteryVictories} vezes (ou uma, com Sentidos Aguçados) para dominar o padrão.
        </p>
      ) : null}
    </article>
  );
}
