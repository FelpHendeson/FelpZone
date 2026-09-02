import { useState } from 'react';
import { findNpc } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxAction } from '../../modules/sandbox-actions';
import { AttributeSummary } from '../components/AttributeSummary';
import { BottomNavigation, type GameTab } from '../components/BottomNavigation';
import { GameHud } from '../components/GameHud';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import {
  buildExplorationView,
  formatPeriodCost,
  type DestinationView,
  type ExplorationView,
  type InventoryViewItem,
  type RecipeView,
  type ResourceView,
} from '../sandbox';
import { EXPLORATION_INTRO } from './exploration-copy';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  context: SandboxContext;
  feedback?: string | null;
  onAction: (action: SandboxAction) => void;
  onExit: () => void;
}

export function ExplorationScreen({ state, campaign, context, feedback, onAction, onExit }: ExplorationScreenProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('world');
  const view = buildExplorationView(state, campaign, context);

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
        {activeTab === 'world' ? (
          <WorldPanel view={view} onAction={onAction} onOpenActions={() => setActiveTab('actions')} />
        ) : null}
        {activeTab === 'actions' ? <ActionsPanel view={view} onAction={onAction} /> : null}
        {activeTab === 'inventory' ? <InventoryPanel items={view.inventory} /> : null}
        {activeTab === 'character' ? (
          <CharacterPanel state={state} campaign={campaign} abilityName={view.abilityName} />
        ) : null}
      </div>

      <BottomNavigation active={activeTab} inventoryCount={view.inventory.length} onChange={setActiveTab} />
    </main>
  );
}

function WorldFeedback({ message }: { message: string }) {
  const discovery = message.includes('Descoberta:');

  return (
    <section
      className={discovery ? 'world-feedback world-feedback--discovery' : 'world-feedback'}
      role="status"
      aria-live="polite"
    >
      <span className="world-feedback__icon" aria-hidden="true">{discovery ? '✦' : '✓'}</span>
      <div>
        <strong>{discovery ? 'Nova descoberta' : 'Mundo atualizado'}</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}

function WorldPanel({
  view,
  onAction,
  onOpenActions,
}: {
  view: ExplorationView;
  onAction: (action: SandboxAction) => void;
  onOpenActions: () => void;
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

      <LocationMap destinations={view.destinations} currentName={view.location.name} onAction={onAction} />
    </div>
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

function InventoryPanel({ items }: { items: InventoryViewItem[] }) {
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
            <li key={item.itemId}>
              <span className="inventory-grid__icon" aria-hidden="true">{itemGlyph(item.itemId)}</span>
              <strong>{item.name}</strong>
              <span>× {item.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
