import { ImagePlaceholder } from '../../components/ImagePlaceholder';
import { TrackedJourneyCard } from '../../components/JournalPanel';
import type { JournalJourneyView } from '../../journal/model';
import type { EncounterDefinition } from '../../../modules/combat';
import type { SandboxAction } from '../../../modules/sandbox-actions';
import {
  formatPeriodCost,
  type DestinationView,
  type ExplorationView,
  type InteractableView,
  type PresenceView,
} from '../../sandbox';
import { EXPLORATION_INTRO } from '../exploration-copy';
import { type GameView } from './shared';

export function WorldPanel({
  view,
  trackedJourney,
  encounters,
  fightBlockedReason,
  onAction,
  onFight,
  onOpenActions,
  onOpenJournal,
  onNavigate,
}: {
  view: ExplorationView;
  trackedJourney?: JournalJourneyView;
  encounters: EncounterDefinition[];
  fightBlockedReason?: string;
  onAction: (action: SandboxAction) => void;
  onFight: (encounterId: string) => void;
  onOpenActions: () => void;
  onOpenJournal: () => void;
  onNavigate: (view: GameView) => void;
}) {
  return (
    <div className="world-panel">
      <section className="location-hero" aria-labelledby="current-location-title">
        <ImagePlaceholder kind="scene" label={view.location.imageLabel} src={view.location.imageSrc} priority className="location-hero__image" />
        <div className="location-hero__shade" aria-hidden="true" />
        <div className="location-hero__badges" aria-label="Estado do local">
          <span>Zona descoberta</span>
          <span>Sistema ativo</span>
        </div>
        <div className="location-hero__content">
          <p className="location-hero__kicker">Local atual</p>
          <h1 id="current-location-title">{view.location.name}</h1>
          <p>{view.location.description}</p>
          <div className="location-progress">
            <span>Exploração</span>
            <strong>{view.location.progress}%</strong>
            <div className="progress-bar" aria-label={`${view.location.progress}% explorado`}>
              <span style={{ width: `${view.location.progress}%` }} />
            </div>
          </div>
          <div className="location-hero__actions">
            <button
              type="button"
              className="button button--primary location-hero__primary"
              disabled={!view.location.canExplore}
              onClick={() => onAction({ type: 'exploration.explore' })}
            >
              <span aria-hidden="true">⌕</span>
              <span>
                <strong>Explorar</strong>
                <small>{view.location.exploreDisabledReason ?? formatPeriodCost(view.location.exploreCostPeriods)}</small>
              </span>
            </button>
            <button type="button" className="button location-hero__secondary" onClick={onOpenActions}>
              <span aria-hidden="true">⌁</span>
              <span>
                <strong>Ações locais</strong>
                <small>{view.resources.length + view.recipes.length} disponíveis</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <details className="world-briefing">
        <summary>
          <span aria-hidden="true">❖</span>
          <strong>Orientação do Sistema</strong>
          <small>Consultar</small>
        </summary>
        <p>{EXPLORATION_INTRO}</p>
      </details>

      {trackedJourney ? (
        <TrackedJourneyCard journey={trackedJourney} onOpenJournal={onOpenJournal} />
      ) : null}

      <div className="world-context-grid">
        <WorldShortcuts view={view} onNavigate={onNavigate} />
        <InteractableSection interactables={view.interactables} onAction={onAction} />
        {view.lingering.length > 0 ? (
          <section className="lingering-section" aria-label="Condições persistentes">
            <span className="section-kicker">Feridas que permanecem</span>
            <ul className="lingering-list">
              {view.lingering.map((entry) => (
                <li key={entry.conditionId}>
                  {entry.name} · {entry.remainingPeriods} período{entry.remainingPeriods === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ThreatSection encounters={encounters} blockedReason={fightBlockedReason} onFight={onFight} />
      </div>
    </div>
  );
}

export function WorldShortcuts({ view, onNavigate }: { view: ExplorationView; onNavigate: (view: GameView) => void }) {
  const peopleHere = view.presences.length;
  return (
    <section className="world-shortcuts" aria-labelledby="world-shortcuts-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Escolha seu foco</span>
          <h2 id="world-shortcuts-title">Ao seu redor</h2>
        </div>
      </div>
      <div className="hub-card-grid hub-card-grid--compact">
        <button type="button" className="hub-card" onClick={() => onNavigate('map')}>
          <span className="hub-card__icon" aria-hidden="true">⌖</span>
          <span><strong>Mapa</strong><small>{view.destinations.length} rota{view.destinations.length === 1 ? '' : 's'} conhecida{view.destinations.length === 1 ? '' : 's'}</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="hub-card" onClick={() => onNavigate('people')}>
          <span className="hub-card__icon" aria-hidden="true">♙</span>
          <span><strong>Pessoas e criaturas</strong><small>{peopleHere === 0 ? 'Ninguém visível agora' : `${peopleHere} presença${peopleHere === 1 ? '' : 's'} neste local`}</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

export function ThreatSection({
  encounters,
  blockedReason,
  onFight,
}: {
  encounters: EncounterDefinition[];
  blockedReason?: string;
  onFight: (encounterId: string) => void;
}) {
  if (encounters.length === 0) {
    return null;
  }

  return (
    <section className="threat-section" aria-labelledby="threats-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Perigo à espreita</span>
          <h2 id="threats-title">Ameaças neste local</h2>
        </div>
        <span className="section-count">{encounters.length}</span>
      </div>
      <div className="threat-card-list">
        {encounters.map((encounter) => (
          <article key={encounter.id} className="threat-card">
            <div className="threat-card__body">
              <h3>{encounter.name}</h3>
              <p>{encounter.description}</p>
              <p className="threat-card__cost">{blockedReason ?? `Enfrentar custa ${formatPeriodCost(encounter.timeCost.periods)}`}</p>
            </div>
            <button
              type="button"
              className="button button--danger button--action"
              disabled={Boolean(blockedReason)}
              onClick={() => onFight(encounter.id)}
            >
              Enfrentar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function InteractableSection({
  interactables,
  onAction,
}: {
  interactables: InteractableView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (interactables.length === 0) {
    return null;
  }

  return (
    <section className="presence-section" aria-labelledby="interactables-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">O que dá para examinar</span>
          <h2 id="interactables-title">Pontos de interesse</h2>
        </div>
        <span className="section-count">{interactables.length}</span>
      </div>
      <div className="presence-card-list">
        {interactables.map((interactable) => (
          <article key={interactable.interactableId} className="presence-card">
            <div className="presence-card__body">
              {interactable.imageSrc ? <ImagePlaceholder kind="scene" label={interactable.imageLabel} src={interactable.imageSrc} className="interactable-media" /> : null}
              <div className="presence-card__title">
                <h3>{interactable.name}</h3>
                <p className="presence-card__meta">{interactable.stageName}</p>
              </div>
              <p>{interactable.stageDescription}</p>
              {interactable.facts.map((fact) => (
                <p key={fact}>{fact}</p>
              ))}
              <div className="presence-card__actions">
                {interactable.actions.map((action) => (
                  <button
                    key={action.actionId}
                    type="button"
                    className="button button--action"
                    disabled={!action.available}
                    onClick={() =>
                      onAction({
                        type: 'interactable.interact',
                        interactableId: interactable.interactableId,
                        actionId: action.actionId,
                      })
                    }
                  >
                    {action.label}
                    <small>{action.blockedReason ?? formatPeriodCost(action.costPeriods)}</small>
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PresenceSection({
  presences,
  onAction,
}: {
  presences: PresenceView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (presences.length === 0) {
    return null;
  }

  return (
    <section className="presence-section" aria-labelledby="presences-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Quem está aqui</span>
          <h2 id="presences-title">Presenças neste local</h2>
        </div>
        <span className="section-count">{presences.length}</span>
      </div>

      <div className="presence-card-list">
        {presences.map((presence, index) => (
          <PresenceCard
            key={presence.presenceId}
            presence={presence}
            onAction={onAction}
            initiallyOpen={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

export function PresenceCard({
  presence,
  onAction,
  initiallyOpen,
}: {
  presence: PresenceView;
  onAction: (action: SandboxAction) => void;
  initiallyOpen: boolean;
}) {
  const resolved = presence.status === 'resolved';
  const cardClass =
    presence.status === 'available'
      ? 'presence-card'
      : `presence-card presence-card--${presence.status}`;

  return (
    <article className={cardClass} aria-labelledby={`${presence.presenceId}-name`}>
      <details open={initiallyOpen}>
        <summary className="presence-card__summary">
          <ImagePlaceholder
            kind={presence.imageKind}
            label={presence.imageLabel}
            src={presence.imageSrc}
            className="presence-card__media"
          />
          <span className="presence-card__title">
            <h3 id={`${presence.presenceId}-name`}>{presence.name}</h3>
            <span className="presence-card__meta">
              <span aria-hidden="true">{presence.kindSymbol}</span>
              {presence.kindLabel} · {presence.statusLabel}
            </span>
          </span>
          <span className="presence-card__chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="presence-card__body">
        <p>{presence.description}</p>
        {presence.trust !== undefined ? (
          <p className="presence-card__trust">Confiança: {presence.trust}</p>
        ) : null}
        {presence.hint ? <p className="presence-card__hint">{presence.hint}</p> : null}
        {resolved ? (
          <p className="presence-card__resolved">Ocorrência concluída.</p>
        ) : (
          <div className="presence-actions">
            {presence.interactions.map((interaction) => {
              const reasonId = `${interaction.interactionId}-reason`;
              const hintId = `${interaction.interactionId}-hint`;
              const describedBy = [
                interaction.hint ? hintId : null,
                interaction.blockedReason ? reasonId : null,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={interaction.interactionId} className="presence-action">
                  <button
                    type="button"
                    className="button button--presence"
                    disabled={!interaction.available}
                    aria-describedby={describedBy || undefined}
                    onClick={() =>
                      onAction({
                        type: 'presence.interact',
                        presenceId: presence.presenceId,
                        interactionId: interaction.interactionId,
                      })
                    }
                  >
                    <span>{interaction.label}</span>
                    <small>{formatPeriodCost(interaction.costPeriods)}</small>
                  </button>
                  {interaction.hint ? (
                    <p id={hintId} className="presence-action__hint">
                      {interaction.hint}
                    </p>
                  ) : null}
                  {interaction.blockedReason ? (
                    <p id={reasonId} className="presence-action__reason">
                      {interaction.blockedReason}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </details>
    </article>
  );
}

export function LocationMap({
  destinations,
  currentName,
  onAction,
}: {
  destinations: DestinationView[];
  currentName: string;
  onAction: (action: SandboxAction) => void;
}) {
  const parents = destinations.filter((destination) => destination.relation === 'parent');
  const siblings = destinations.filter((destination) => destination.relation === 'sibling');
  const children = destinations.filter((destination) => destination.relation === 'child');

  return (
    <section className="world-map" aria-labelledby="world-map-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Arredores conhecidos</span>
          <h2 id="world-map-title">Mapa do local</h2>
        </div>
        <span className="section-count">{destinations.length}</span>
      </div>

      {destinations.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">?</span>
          <strong>O mapa termina aqui por enquanto</strong>
          <p>Explore o local para encontrar passagens e revelar novos destinos.</p>
        </div>
      ) : (
        <div className="map-route-list">
          <div className="map-current-location">
            <span className="map-node__marker" aria-hidden="true">●</span>
            <span><small>Você está aqui</small><strong>{currentName}</strong></span>
          </div>
          <MapGroup label="Retornar" destinations={parents} onAction={onAction} />
          <MapGroup label="Mesmo território" destinations={siblings} onAction={onAction} />
          <MapGroup label="Seguir adiante" destinations={children} onAction={onAction} />
        </div>
      )}
    </section>
  );
}

export function MapGroup({
  label,
  destinations,
  onAction,
}: {
  label: string;
  destinations: DestinationView[];
  onAction: (action: SandboxAction) => void;
}) {
  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className="map-route-group">
      <span className="map-route-group__label">{label}</span>
      {destinations.map((destination) => (
        <MapNode key={destination.locationId} destination={destination} onAction={onAction} />
      ))}
    </div>
  );
}

export function MapNode({ destination, onAction }: { destination: DestinationView; onAction: (action: SandboxAction) => void }) {
  return (
    <button
      type="button"
      className="map-node"
      disabled={!destination.accessible}
      onClick={() => onAction({ type: 'navigation.move', locationId: destination.locationId })}
    >
      <span className="map-node__marker" aria-hidden="true">{destination.accessible ? '○' : '▒'}</span>
      {destination.imageSrc ? <ImagePlaceholder kind="scene" label={destination.name} src={destination.imageSrc} className="map-node__image" /> : null}
      <span className="map-node__copy">
        <strong>{destination.name}</strong>
        <small>{destination.blockedReason ?? `${destination.relationLabel} · ${formatPeriodCost(destination.costPeriods)}`}</small>
      </span>
      <span className="map-node__arrow" aria-hidden="true">→</span>
    </button>
  );
}
