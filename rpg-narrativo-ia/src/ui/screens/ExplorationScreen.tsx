import { useState } from 'react';
import { findNpc } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxAction } from '../../modules/sandbox-actions';
import {
  buildSystemStatus,
  type SystemStatusView,
  type SystemTrainingView,
} from '../../modules/system-interface';
import {
  INITIAL_COMBAT,
  createCombat,
  listAvailableEncounters,
  type CombatOutcome,
  type EncounterDefinition,
} from '../../modules/combat';
import { CombatScreen } from './CombatScreen';
import { AttributeSummary } from '../components/AttributeSummary';
import { BottomNavigation, type GameTab } from '../components/BottomNavigation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameHud } from '../components/GameHud';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { buildJournalView, type JournalJourneyView } from '../journal/model';
import { JournalPanel, TrackedJourneyCard } from '../components/JournalPanel';
import { formatNeedDelta } from '../needs/presentation';
import {
  buildExplorationView,
  formatPeriodCost,
  type DestinationView,
  type ExplorationView,
  type InventoryViewItem,
  type NeedEffectView,
  type PresenceView,
  type RecipeView,
  type ResourceView,
} from '../sandbox';
import { EXPLORATION_INTRO } from './exploration-copy';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  context: SandboxContext;
  feedback?: string | null;
  actionPending?: boolean;
  onAction: (action: SandboxAction) => void;
  onResolveCombat: (encounterId: string, outcome: Exclude<CombatOutcome, 'ongoing'>) => void;
  onExit: () => void;
}

export function ExplorationScreen({
  state,
  campaign,
  context,
  feedback,
  actionPending = false,
  onAction,
  onResolveCombat,
  onExit,
}: ExplorationScreenProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('world');
  const [trackedJourneyId, setTrackedJourneyId] = useState<string | null>(null);
  const [combatEncounterId, setCombatEncounterId] = useState<string | null>(null);
  const currentLocationId = state.sandbox.navigation.currentLocationId;
  const encounters = listAvailableEncounters(INITIAL_COMBAT, currentLocationId, state.flags);

  if (combatEncounterId) {
    const encounter = encounters.find((entry) => entry.id === combatEncounterId)
      ?? INITIAL_COMBAT.encounters.find((entry) => entry.id === combatEncounterId);
    const initialCombat = createCombat(INITIAL_COMBAT, combatEncounterId, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    });
    return (
      <CombatScreen
        initialState={initialCombat}
        encounterName={encounter?.name ?? 'Confronto'}
        onFinish={(outcome) => {
          onResolveCombat(combatEncounterId, outcome);
          setCombatEncounterId(null);
        }}
      />
    );
  }

  const view = buildExplorationView(state, campaign, context);
  const journal = buildJournalView(state, context);
  const trackedJourney = journal.journeys.find(
    (journey) => journey.id === trackedJourneyId && journey.status === 'active',
  );

  return (
    <main className="screen screen--exploration">
      <GameHud
        characterName={view.characterName}
        worldLabel={view.worldLabel}
        attributes={state.attributes}
        onExit={onExit}
      />

      <div className="exploration-content">
        {feedback ? <WorldFeedback message={feedback} /> : null}
        <fieldset className="sandbox-action-surface" disabled={actionPending} aria-busy={actionPending}>
          {activeTab === 'world' ? (
            <WorldPanel
              view={view}
              trackedJourney={trackedJourney}
              encounters={encounters}
              onAction={onAction}
              onFight={setCombatEncounterId}
              onOpenActions={() => setActiveTab('actions')}
              onOpenJournal={() => setActiveTab('journal')}
            />
          ) : null}
          {activeTab === 'actions' ? <ActionsPanel view={view} onAction={onAction} /> : null}
          {activeTab === 'system' ? <SystemPanel status={buildSystemStatus(state)} onAction={onAction} /> : null}
          {activeTab === 'journal' ? (
            <JournalPanel
              view={journal}
              trackedJourneyId={trackedJourneyId}
              onTrackJourney={setTrackedJourneyId}
            />
          ) : null}
          {activeTab === 'inventory' ? <InventoryPanel items={view.inventory} onAction={onAction} /> : null}
          {activeTab === 'character' ? (
            <CharacterPanel state={state} campaign={campaign} abilityName={view.abilityName} />
          ) : null}
        </fieldset>
      </div>

      <BottomNavigation active={activeTab} inventoryCount={view.inventory.length} onChange={setActiveTab} />
    </main>
  );
}

function WorldFeedback({ message }: { message: string }) {
  const discovery = message.includes('Descoberta:');
  const warning = message.includes('Condição crítica:');
  const journey = message.includes('Jornada ') || message.includes('Nova jornada:');
  const className = warning
    ? 'world-feedback world-feedback--warning'
    : discovery
      ? 'world-feedback world-feedback--discovery'
      : journey
        ? 'world-feedback world-feedback--journey'
      : 'world-feedback';

  return (
    <section
      className={className}
      role="status"
      aria-live="polite"
    >
      <span className="world-feedback__icon" aria-hidden="true">{warning ? '!' : discovery ? '✦' : journey ? '⌖' : '✓'}</span>
      <div>
        <strong>{warning ? 'Atenção à condição' : discovery ? 'Nova descoberta' : journey ? 'Jornada atualizada' : 'Mundo atualizado'}</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}

function WorldPanel({
  view,
  trackedJourney,
  encounters,
  onAction,
  onFight,
  onOpenActions,
  onOpenJournal,
}: {
  view: ExplorationView;
  trackedJourney?: JournalJourneyView;
  encounters: EncounterDefinition[];
  onAction: (action: SandboxAction) => void;
  onFight: (encounterId: string) => void;
  onOpenActions: () => void;
  onOpenJournal: () => void;
}) {
  return (
    <div className="world-panel">
      <section className="location-hero" aria-labelledby="current-location-title">
        <ImagePlaceholder kind="scene" label={view.location.imageLabel} className="location-hero__image" />
        <div className="location-hero__shade" aria-hidden="true" />
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
        </div>
      </section>

      <p className="world-intro">{EXPLORATION_INTRO}</p>

      {trackedJourney ? (
        <TrackedJourneyCard journey={trackedJourney} onOpenJournal={onOpenJournal} />
      ) : null}

      <section className="primary-action-card">
        <div>
          <span className="section-kicker">Ação principal</span>
          <h2>Investigar a redondeza</h2>
          <p>
            {view.location.exploreDisabledReason ??
              `Procure passagens, recursos e sinais de vida. Custa ${formatPeriodCost(view.location.exploreCostPeriods)}.`}
          </p>
        </div>
        <button
          type="button"
          className="button button--primary button--action"
          disabled={!view.location.canExplore}
          onClick={() => onAction({ type: 'exploration.explore' })}
        >
          <span aria-hidden="true">⌕</span>
          Explorar local
        </button>
      </section>

      <div className="quick-actions" aria-label="Atalhos do local">
        <button type="button" onClick={onOpenActions}>
          <span aria-hidden="true">♧</span>
          <strong>Coletar</strong>
          <small>{countLabel(view.resources.length, 'ponto')}</small>
        </button>
        <button type="button" onClick={onOpenActions}>
          <span aria-hidden="true">⚒</span>
          <strong>Fabricar</strong>
          <small>{countLabel(view.recipes.length, 'receita')}</small>
        </button>
      </div>

      <PresenceSection presences={view.presences} onAction={onAction} />

      <ThreatSection encounters={encounters} onFight={onFight} />

      <LocationMap destinations={view.destinations} currentName={view.location.name} onAction={onAction} />
    </div>
  );
}

function ThreatSection({
  encounters,
  onFight,
}: {
  encounters: EncounterDefinition[];
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
            </div>
            <button
              type="button"
              className="button button--danger button--action"
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

function PresenceSection({
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
        {presences.map((presence) => (
          <PresenceCard key={presence.presenceId} presence={presence} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}

function PresenceCard({
  presence,
  onAction,
}: {
  presence: PresenceView;
  onAction: (action: SandboxAction) => void;
}) {
  const resolved = presence.status === 'resolved';
  const cardClass =
    presence.status === 'available'
      ? 'presence-card'
      : `presence-card presence-card--${presence.status}`;

  return (
    <article className={cardClass} aria-labelledby={`${presence.presenceId}-name`}>
      <ImagePlaceholder
        kind={presence.imageKind}
        label={presence.imageLabel}
        className="presence-card__media"
      />
      <div className="presence-card__body">
        <div className="presence-card__title">
          <h3 id={`${presence.presenceId}-name`}>{presence.name}</h3>
          <p className="presence-card__meta">
            <span aria-hidden="true">{presence.kindSymbol}</span>
            {presence.kindLabel} · {presence.statusLabel}
          </p>
        </div>
        <p>{presence.description}</p>
        {presence.trust !== undefined ? (
          <p className="presence-card__trust">Confiança: {presence.trust}</p>
        ) : null}
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
    </article>
  );
}

function LocationMap({
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
        <div className="map-tree">
          {parents.length > 0 ? (
            <div className="map-tree__row map-tree__row--parent">
              {parents.map((destination) => (
                <MapNode key={destination.locationId} destination={destination} onAction={onAction} />
              ))}
            </div>
          ) : null}
          <div className="map-tree__row map-tree__row--current">
            <span className="map-node map-node--current">
              <span className="map-node__marker" aria-hidden="true">●</span>
              <strong>{currentName}</strong>
              <small>Você está aqui</small>
            </span>
            {siblings.map((destination) => (
              <MapNode key={destination.locationId} destination={destination} onAction={onAction} />
            ))}
          </div>
          {children.length > 0 ? (
            <div className="map-tree__row map-tree__row--children">
              {children.map((destination) => (
                <MapNode key={destination.locationId} destination={destination} onAction={onAction} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function MapNode({ destination, onAction }: { destination: DestinationView; onAction: (action: SandboxAction) => void }) {
  return (
    <button
      type="button"
      className="map-node"
      disabled={!destination.accessible}
      onClick={() => onAction({ type: 'navigation.move', locationId: destination.locationId })}
    >
      <span className="map-node__marker" aria-hidden="true">{destination.accessible ? '○' : '▒'}</span>
      <strong>{destination.name}</strong>
      <small>{destination.blockedReason ?? `${destination.relationLabel} · ${formatPeriodCost(destination.costPeriods)}`}</small>
    </button>
  );
}

function ActionsPanel({ view, onAction }: { view: ExplorationView; onAction: (action: SandboxAction) => void }) {
  return (
    <div className="tab-panel">
      <header className="panel-heading">
        <span className="section-kicker">{view.location.name}</span>
        <h1>Ações disponíveis</h1>
        <p>Veja custos e resultados antes de comprometer um período.</p>
      </header>

      <section className="action-section" aria-labelledby="rest-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Recuperação</span>
            <h2 id="rest-title">Descanso</h2>
          </div>
          {view.rest.recommended ? <span className="condition-chip condition-chip--urgent">Recomendado</span> : null}
        </div>
        <article className={view.rest.recommended ? 'rest-card rest-card--recommended' : 'rest-card'}>
          <div className="rest-card__icon" aria-hidden="true">☾</div>
          <div className="rest-card__body">
            <h3>{view.rest.label}</h3>
            <p>{view.rest.description}</p>
            <NeedEffectList effects={view.rest.effects} />
            <button
              type="button"
              className="button button--compact rest-card__button"
              onClick={() => onAction({ type: 'needs.rest', mode: view.rest.mode })}
            >
              {view.rest.label} · {formatPeriodCost(view.rest.costPeriods)}
            </button>
          </div>
        </article>
      </section>

      <section className="action-section" aria-labelledby="collect-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Recursos revelados</span>
            <h2 id="collect-title">Coleta</h2>
          </div>
          <span className="section-count">{view.resources.length}</span>
        </div>
        {view.resources.length === 0 ? (
          <EmptyAction message="Nenhum ponto de coleta foi revelado neste local." />
        ) : (
          <div className="action-card-list">
            {view.resources.map((resource) => (
              <ResourceCard key={resource.nodeId} resource={resource} onAction={onAction} />
            ))}
          </div>
        )}
      </section>

      <section className="action-section" aria-labelledby="craft-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Conhecimento atual</span>
            <h2 id="craft-title">Fabricação</h2>
          </div>
          <span className="section-count">{view.recipes.length}</span>
        </div>
        {view.recipes.length === 0 ? (
          <EmptyAction message="Nenhuma receita conhecida." />
        ) : (
          <div className="action-card-list">
            {view.recipes.map((recipe) => (
              <RecipeCard key={recipe.recipeId} recipe={recipe} onAction={onAction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResourceCard({ resource, onAction }: { resource: ResourceView; onAction: (action: SandboxAction) => void }) {
  return (
    <article className={resource.collectable ? 'action-card' : 'action-card action-card--blocked'}>
      <div className="item-glyph" aria-hidden="true">{itemGlyph(resource.nodeId)}</div>
      <div className="action-card__body">
        <div className="action-card__title">
          <h3>{resource.name}</h3>
          <span>{resource.availableUnits} disponíveis</span>
        </div>
        <p>{resource.yields.map((entry) => `${entry.quantityPerUnit}× ${entry.name}`).join(' · ')}</p>
        <div className="resource-meter" aria-label={`${resource.availableUnits} unidades disponíveis`}>
          <span style={{ width: `${Math.min(100, resource.availableUnits * 10)}%` }} />
        </div>
        <div className="action-card__footer">
          <small>{resource.blockedReason ?? `Até ${resource.maxCollectable} por coleta · ${formatPeriodCost(resource.costPeriods)}`}</small>
          <button
            type="button"
            className="button button--compact"
            disabled={!resource.collectable}
            onClick={() => onAction({ type: 'resource.collect', nodeId: resource.nodeId, units: 1 })}
          >
            Coletar 1
          </button>
        </div>
      </div>
    </article>
  );
}

function RecipeCard({ recipe, onAction }: { recipe: RecipeView; onAction: (action: SandboxAction) => void }) {
  const outcome = recipe.structureName
    ? `Cria ${recipe.structureName}`
    : recipe.products.map((entry) => `${entry.quantity}× ${entry.name}`).join(' · ');

  return (
    <article className={recipe.craftable ? 'action-card' : 'action-card action-card--blocked'}>
      <div className="item-glyph" aria-hidden="true">{itemGlyph(recipe.recipeId)}</div>
      <div className="action-card__body">
        <div className="action-card__title">
          <h3>{recipe.name}</h3>
          <span>{recipe.craftable ? 'Disponível' : 'Bloqueada'}</span>
        </div>
        <ul className="ingredient-list" aria-label="Ingredientes">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.itemId}>{ingredient.quantity}× {ingredient.name}</li>
          ))}
        </ul>
        {outcome ? <p className="action-card__outcome">{outcome}</p> : null}
        <div className="action-card__footer">
          <small>
            {recipe.blockedReason ??
              `${formatPeriodCost(recipe.costPeriods)}${recipe.stationTags.length ? ` · ${recipe.stationTags.join(', ')}` : ''}`}
          </small>
          <button
            type="button"
            className="button button--compact"
            disabled={!recipe.craftable}
            onClick={() => onAction({ type: 'crafting.craft', recipeId: recipe.recipeId })}
          >
            Fabricar
          </button>
        </div>
      </div>
    </article>
  );
}

function InventoryPanel({ items, onAction }: { items: InventoryViewItem[]; onAction: (action: SandboxAction) => void }) {
  return (
    <div className="tab-panel">
      <header className="panel-heading panel-heading--split">
        <div>
          <span className="section-kicker">Pertences carregados</span>
          <h1>Mochila</h1>
        </div>
        <span className="inventory-total">{items.reduce((total, item) => total + item.quantity, 0)} itens</span>
      </header>

      {items.length === 0 ? (
        <div className="empty-state empty-state--large">
          <span aria-hidden="true">▣</span>
          <strong>Sua mochila está vazia</strong>
          <p>Explore o mundo e revele pontos de coleta para encontrar materiais.</p>
        </div>
      ) : (
        <ul className="inventory-grid">
          {items.map((item) => (
            <li key={item.itemId} className={item.consumable ? 'inventory-grid__item inventory-grid__item--consumable' : 'inventory-grid__item'}>
              <span className="inventory-grid__icon" aria-hidden="true">{itemGlyph(item.itemId)}</span>
              <strong>{item.name}</strong>
              <span>× {item.quantity}</span>
              {item.consumable ? (
                <>
                  <NeedEffectList effects={item.effects} compact />
                  <button
                    type="button"
                    className="button button--compact inventory-grid__consume"
                    onClick={() => onAction({ type: 'needs.consume', itemId: item.itemId })}
                  >
                    Consumir
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NeedEffectList({ effects, compact = false }: { effects: NeedEffectView[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'need-effect-list need-effect-list--compact' : 'need-effect-list'} aria-label="Efeitos">
      {effects.map((effect) => (
        <li key={effect.needId}>
          {formatNeedDelta(effect.needId, effect.amount)}{effect.limited ? ' (limitado)' : ''}
        </li>
      ))}
    </ul>
  );
}

function CharacterPanel({ state, campaign, abilityName }: { state: GameState; campaign: Campaign; abilityName: string }) {
  return (
    <div className="tab-panel">
      <header className="character-card">
        <span className="character-card__avatar" aria-hidden="true">♙</span>
        <span className="section-kicker">Sobrevivente</span>
        <h1>{state.character.firstName} {state.character.lastName}</h1>
        <p>{abilityName}</p>
      </header>

      <section className="character-section">
        <div className="section-heading"><h2>Condição</h2></div>
        <AttributeSummary attributes={state.attributes} />
      </section>

      <section className="character-section">
        <div className="section-heading">
          <h2>Relações</h2>
          <span className="section-count">{state.relationships.length}</span>
        </div>
        {state.relationships.length === 0 ? (
          <EmptyAction message="Nenhum vínculo foi formado." />
        ) : (
          <ul className="relationship-list">
            {state.relationships.map((relationship) => (
              <li key={relationship.characterId}>
                <span className="relationship-list__avatar" aria-hidden="true">♙</span>
                <div>
                  <strong>{findNpc(campaign, relationship.characterId)?.name ?? relationship.characterId}</strong>
                  <span>Confiança</span>
                </div>
                <strong>{relationship.trust}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SystemPanel({
  status,
  onAction,
}: {
  status: SystemStatusView;
  onAction: (action: SandboxAction) => void;
}) {
  const [pending, setPending] = useState<SystemTrainingView | null>(null);

  return (
    <div className="tab-panel">
      <header className="panel-heading">
        <span className="section-kicker">Sistema · {status.characterName}</span>
        <h1>Status</h1>
        <p>O Sistema organiza o que você já compreende sobre o próprio poder. Nível {status.level}.</p>
      </header>

      <section className="system-section" aria-labelledby="system-energy-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Fundamentos</span>
            <h2 id="system-energy-title">Eteris e Númen</h2>
          </div>
        </div>
        <ul className="system-note-list">
          {status.energies.map((energy) => (
            <li key={energy.id}>
              <strong>{energy.name}</strong>
              <p>{energy.description}</p>
            </li>
          ))}
        </ul>
        <ul className="system-chip-list" aria-label="Campos de aplicação">
          {status.fields.map((field) => (
            <li key={field.id} className="system-chip">
              <strong>{field.name}</strong>
              <span>{field.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="system-section" aria-labelledby="system-skills-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Domínio atual</span>
            <h2 id="system-skills-title">Habilidades conhecidas</h2>
          </div>
          <span className="section-count">{status.knownSkills.length}</span>
        </div>
        {status.knownSkills.length === 0 ? (
          <EmptyAction message="O Sistema ainda não registrou habilidades." />
        ) : (
          <ul className="system-skill-list">
            {status.knownSkills.map((skill) => (
              <li key={skill.skillId} className="system-skill">
                <div className="system-skill__head">
                  <strong>{skill.name}</strong>
                  <span>Proficiência {skill.proficiency}</span>
                </div>
                <p>{skill.description}</p>
                <small>{skill.pathName}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="system-section" aria-labelledby="system-tree-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Caminhos conhecidos</span>
            <h2 id="system-tree-title">Árvore de habilidades</h2>
          </div>
        </div>
        {status.tree.paths.length === 0 ? (
          <EmptyAction message="Nenhum caminho revelado ainda." />
        ) : (
          <div className="system-tree">
            {status.tree.paths.map((path) => (
              <article key={path.pathId} className="system-tree__path">
                <header className="system-tree__path-head">
                  <strong>{path.name}</strong>
                  <span>{path.field === 'corpo' ? 'Corpo' : 'Poder'}</span>
                </header>
                <ul className="system-tree__nodes">
                  {path.nodes.map((node) => (
                    <li key={node.skillId} className={`system-tree__node system-tree__node--${node.status}`}>
                      <strong>{node.name}</strong>
                      <span>
                        {node.status === 'known'
                          ? `Conhecida · proficiência ${node.proficiency}`
                          : 'Possível de desenvolver'}
                      </span>
                    </li>
                  ))}
                </ul>
                {path.hiddenCount > 0 ? (
                  <small className="system-tree__hidden">
                    +{path.hiddenCount} possibilidade(s) ainda não compreendida(s)
                  </small>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="system-section" aria-labelledby="system-training-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Métodos conhecidos</span>
            <h2 id="system-training-title">Treinamento</h2>
          </div>
          <span className="section-count">{status.trainings.length}</span>
        </div>
        {status.trainings.length === 0 ? (
          <EmptyAction message="Nenhum método de treino disponível agora." />
        ) : (
          <div className="action-card-list">
            {status.trainings.map((training) => (
              <article
                key={training.methodId}
                className={training.canTrain ? 'action-card' : 'action-card action-card--blocked'}
              >
                <div className="action-card__body">
                  <div className="action-card__title">
                    <h3>{training.name}</h3>
                    <span>{training.targetLabel}</span>
                  </div>
                  <p>{training.description}</p>
                  <ul className="training-effects" aria-label="Efeitos do treino">
                    {training.effectsSummary.map((effect) => (
                      <li key={effect}>{effect}</li>
                    ))}
                  </ul>
                  <div className="action-card__footer">
                    <small>{training.blockedReason ?? `Custa ${formatPeriodCost(training.costPeriods)}`}</small>
                    <button
                      type="button"
                      className="button button--compact"
                      disabled={!training.canTrain}
                      onClick={() => setPending(training)}
                    >
                      Treinar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Treinar: ${pending.name}` : ''}
        message={
          pending
            ? `${pending.targetLabel}. Custa ${formatPeriodCost(pending.costPeriods)}. ${pending.effectsSummary.join('. ')}.`
            : ''
        }
        confirmLabel="Confirmar treino"
        onConfirm={() => {
          if (pending) {
            onAction({ type: 'training.train', methodId: pending.methodId });
            setPending(null);
          }
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function EmptyAction({ message }: { message: string }) {
  return <p className="empty-action">{message}</p>;
}

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function itemGlyph(id: string): string {
  if (id.includes('water') || id.includes('agua') || id.includes('spring')) return '◒';
  if (id.includes('meat') || id.includes('rabbit')) return '♨';
  if (id.includes('campfire') || id.includes('cook')) return '♨';
  if (id.includes('branch') || id.includes('stick') || id.includes('galho')) return '⌁';
  if (id.includes('hide') || id.includes('cloth')) return '▧';
  if (id.includes('horn') || id.includes('bone')) return '◇';
  if (id.includes('fruit') || id.includes('fruto')) return '●';
  return '◆';
}
