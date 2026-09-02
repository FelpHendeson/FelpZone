import type { Campaign } from '../../core/events';
import { resolveTitle } from '../../core/engine';
import type { GameState } from '../../core/state';
import { findNpc, findTitle } from '../../campaigns/first-day';
import { fullName } from '../../modules/character';
import { notableHistory } from '../../modules/narrative';
import { AttributeSummary } from '../components/AttributeSummary';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

interface SummaryScreenProps {
  state: GameState;
  campaign: Campaign;
  onRestart: () => void;
  onBack: () => void;
}

export function SummaryScreen({ state, campaign, onRestart, onBack }: SummaryScreenProps) {
  const title = resolveTitle(state, campaign) ?? findTitle(campaign, state.progression.titleIds.at(-1) ?? '');
  const decisions = notableHistory(state.history);
  const mira = state.relationships.find((entry) => findNpc(campaign, entry.characterId));

  return (
    <main className="screen screen--narrow summary-screen">
      <section className="summary-hero">
        <ImagePlaceholder kind="scene" label="O vale depois da primeira noite" />
        <div className="summary-hero__content">
          <p className="eyebrow">Primeiro dia concluído</p>
          <h1 className="title title--small">{fullName(state.character)}</h1>
        </div>
      </section>
      {title ? (
        <section className="summary-title">
          <ImagePlaceholder kind="icon" label={title.name} />
          <div>
            <h2>{title.name}</h2>
            <p>{title.description}</p>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">Estado final</h2>
        <AttributeSummary attributes={state.attributes} />
        {mira ? (
          <p className="lede lede--tight">
            Confiança com {findNpc(campaign, mira.characterId)?.name}: {mira.trust}
          </p>
        ) : (
          <p className="lede lede--tight">Nenhum vínculo foi formado.</p>
        )}
      </section>

      <section>
        <h2 className="section-title">Decisões marcantes</h2>
        {decisions.length === 0 ? (
          <p>O dia passou sem um gesto que o histórico tenha marcado.</p>
        ) : (
          <ol className="history-list">
            {decisions.map((entry) => (
              <li key={`${entry.eventId}-${entry.choiceId}`}>
                <strong>{entry.eventTitle}</strong>
                <span>{entry.choiceLabel}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="button-stack">
        <button type="button" className="button button--primary" onClick={onRestart}>
          Reiniciar campanha
        </button>
        <button type="button" className="button button--ghost" onClick={onBack}>
          Voltar ao início
        </button>
      </div>
    </main>
  );
}
