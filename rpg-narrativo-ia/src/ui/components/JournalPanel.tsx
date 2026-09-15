import type {
  JournalJourneyView,
  JournalLocationView,
  JournalPresenceView,
  JournalView,
} from '../journal/model';

interface JournalPanelProps {
  view: JournalView;
  trackedJourneyId: string | null;
  onTrackJourney: (journeyId: string | null) => void;
}

export function JournalPanel({ view, trackedJourneyId, onTrackJourney }: JournalPanelProps) {
  const main = view.journeys.filter((journey) => journey.status === 'active' && journey.kind === 'main');
  const optional = view.journeys.filter(
    (journey) => journey.status === 'active' && journey.kind !== 'main',
  );
  const completed = view.journeys.filter((journey) => journey.status === 'completed');

  return (
    <div className="tab-panel journal-panel">
      <header className="panel-heading panel-heading--split">
        <div>
          <span className="section-kicker">Memória do sobrevivente</span>
          <h1>Jornadas</h1>
          <p>Escolha o que acompanhar. Registros do mundo e memórias ficam recolhidos até você precisar deles.</p>
        </div>
        <span className="journal-mark" aria-hidden="true">☷</span>
      </header>

      <ul className="journal-summary" aria-label="Resumo do diário">
        <li><strong>{main.length + optional.length}</strong><span>ativas</span></li>
        <li><strong>{view.locations.length}</strong><span>locais</span></li>
        <li><strong>{view.presences.length}</strong><span>presenças</span></li>
      </ul>

      <JourneySection
        id="main-journeys"
        kicker="Rota principal"
        title="Jornadas principais"
        journeys={main}
        empty="Nenhuma jornada principal foi iniciada. Continue explorando o mundo."
        trackedJourneyId={trackedJourneyId}
        onTrackJourney={onTrackJourney}
      />
      <JourneySection
        id="optional-journeys"
        kicker="Caminhos descobertos"
        title="Jornadas opcionais"
        journeys={optional}
        empty="Nenhuma jornada opcional foi descoberta."
        trackedJourneyId={trackedJourneyId}
        onTrackJourney={onTrackJourney}
      />
      <JourneySection
        id="completed-journeys"
        kicker="Caminho percorrido"
        title="Jornadas concluídas"
        journeys={completed}
        empty="Suas jornadas concluídas aparecerão aqui."
        trackedJourneyId={trackedJourneyId}
        onTrackJourney={onTrackJourney}
      />

      <LocationsSection locations={view.locations} />
      <PresencesSection presences={view.presences} />
      <HistorySection history={view.history} />
    </div>
  );
}

export function TrackedJourneyCard({
  journey,
  onOpenJournal,
}: {
  journey: JournalJourneyView;
  onOpenJournal: () => void;
}) {
  const nextStep = journey.steps.find((step) => step.current);
  if (!nextStep) {
    return null;
  }

  return (
    <aside className="tracked-journey" aria-labelledby="tracked-journey-title">
      <div className="tracked-journey__icon" aria-hidden="true">⌖</div>
      <div>
        <span className="section-kicker">Jornada acompanhada</span>
        <h2 id="tracked-journey-title">{journey.title}</h2>
        <p>{nextStep.title}</p>
      </div>
      <button type="button" className="button button--small button--ghost" onClick={onOpenJournal}>
        Ver diário
      </button>
    </aside>
  );
}

function JourneySection({
  id,
  kicker,
  title,
  journeys,
  empty,
  trackedJourneyId,
  onTrackJourney,
}: {
  id: string;
  kicker: string;
  title: string;
  journeys: JournalJourneyView[];
  empty: string;
  trackedJourneyId: string | null;
  onTrackJourney: (journeyId: string | null) => void;
}) {
  return (
    <details className="journal-section" open={id === 'main-journeys'}>
      <summary className="journal-section__summary">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2 id={id}>{title}</h2>
        </div>
        <span className="section-count">{journeys.length}</span>
      </summary>
      <div className="journal-section__body">
        {journeys.length === 0 ? (
          <p className="journal-empty">{empty}</p>
        ) : (
          <div className="journey-list">
            {journeys.map((journey) => (
              <JourneyCard
                key={journey.id}
                journey={journey}
                tracked={trackedJourneyId === journey.id}
                onTrackJourney={onTrackJourney}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function JourneyCard({
  journey,
  tracked,
  onTrackJourney,
}: {
  journey: JournalJourneyView;
  tracked: boolean;
  onTrackJourney: (journeyId: string | null) => void;
}) {
  const percentage = Math.round((journey.completedSteps / journey.totalSteps) * 100);
  return (
    <article className={tracked ? 'journey-card journey-card--tracked' : 'journey-card'}>
      <div className="journey-card__heading">
        <div>
          <span className="journey-card__kind">{journeyKindLabel(journey)}</span>
          <h3>{journey.title}</h3>
        </div>
        <strong>{journey.completedSteps} de {journey.totalSteps}</strong>
      </div>
      <p>{journey.description}</p>
      <div className="journey-progress">
        <div
          className="progress-bar"
          role="progressbar"
          aria-label={`Progresso de ${journey.title}`}
          aria-valuemin={0}
          aria-valuemax={journey.totalSteps}
          aria-valuenow={journey.completedSteps}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
        <span>{percentage}% concluída</span>
      </div>
      <ul className="journey-steps">
        {journey.steps.map((step) => (
          <li key={step.id} className={step.current ? 'journey-step journey-step--current' : 'journey-step'}>
            <span aria-hidden="true">{step.completed ? '✓' : '○'}</span>
            <div>
              <strong>{step.title}</strong>
              {step.description ? <p>{step.description}</p> : null}
              <small>{step.completed ? 'Concluída' : 'Próxima etapa'}</small>
            </div>
          </li>
        ))}
      </ul>
      {journey.completionText ? <p className="journey-card__completion">{journey.completionText}</p> : null}
      {journey.status === 'active' ? (
        <button
          type="button"
          className={tracked ? 'button journey-card__track journey-card__track--active' : 'button journey-card__track'}
          aria-pressed={tracked}
          onClick={() => onTrackJourney(tracked ? null : journey.id)}
        >
          <span aria-hidden="true">⌖</span>
          {tracked ? 'Deixar de acompanhar' : 'Acompanhar jornada'}
        </button>
      ) : null}
    </article>
  );
}

function LocationsSection({ locations }: { locations: JournalLocationView[] }) {
  return (
    <details className="journal-section">
      <summary className="journal-section__summary">
        <div><span className="section-kicker">Mapa registrado</span><h2 id="journal-locations">Locais visitados</h2></div>
        <span className="section-count">{locations.length}</span>
      </summary>
      <div className="journal-section__body">
        {locations.length === 0 ? <p className="journal-empty">Nenhum local foi visitado.</p> : (
          <div className="journal-record-list">
            {locations.map((location) => (
              <article key={location.id} className="journal-record">
                <div className="journal-record__heading">
                  <span aria-hidden="true">◇</span>
                  <div><h3>{location.name}</h3><small>{location.progress}% explorado</small></div>
                </div>
                <p>{location.description}</p>
                {location.discoveries.length > 0 ? (
                  <ul className="discovery-tags" aria-label={`Descobertas em ${location.name}`}>
                    {location.discoveries.map((discovery) => <li key={discovery.id}>{discovery.name}</li>)}
                  </ul>
                ) : <small className="journal-record__empty">Nenhuma descoberta registrada.</small>}
              </article>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function PresencesSection({ presences }: { presences: JournalPresenceView[] }) {
  return (
    <details className="journal-section">
      <summary className="journal-section__summary">
        <div><span className="section-kicker">Sinais de vida</span><h2 id="journal-presences">Presenças conhecidas</h2></div>
        <span className="section-count">{presences.length}</span>
      </summary>
      <div className="journal-section__body">
        {presences.length === 0 ? <p className="journal-empty">Você ainda não encontrou ninguém.</p> : (
          <ul className="known-presence-list">
            {presences.map((presence) => (
              <li key={presence.presenceId}>
                <span className="known-presence-list__icon" aria-hidden="true">{presence.kind === 'npc' ? '♙' : '◈'}</span>
                <div><strong>{presence.name}</strong><p>{presence.description}</p></div>
                <span className="condition-chip">{presence.status === 'resolved' ? 'Concluída' : 'Conhecida'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function HistorySection({ history }: { history: JournalView['history'] }) {
  return (
    <details className="journal-section">
      <summary className="journal-section__summary">
        <div><span className="section-kicker">Memórias</span><h2 id="journal-history">Registro narrativo</h2></div>
        <span className="section-count">{history.length}</span>
      </summary>
      <div className="journal-section__body">
        {history.length === 0 ? <p className="journal-empty">Suas escolhas importantes aparecerão aqui.</p> : (
          <ol className="journal-history">
            {history.map((entry, index) => (
              <li key={`${entry.eventId}-${entry.choiceId}-${index}`}>
                <span aria-hidden="true">{entry.notable ? '✦' : '·'}</span>
                <div><strong>{entry.eventTitle}</strong><p>{entry.choiceLabel}</p></div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}

function journeyKindLabel(journey: JournalJourneyView): string {
  if (journey.status === 'completed') return 'Concluída';
  if (journey.kind === 'main') return 'Principal';
  if (journey.kind === 'hidden') return 'Descoberta';
  return 'Opcional';
}
