import { useState } from 'react';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import type { SandboxAction } from '../../modules/sandbox-actions';
import { AppDialog } from '../components/AppDialog';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import {
  buildExplorationView,
  formatPeriodCost,
  type DestinationView,
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

export function ExplorationScreen({
  state,
  campaign,
  context,
  feedback,
  onAction,
  onExit,
}: ExplorationScreenProps) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const view = buildExplorationView(state, campaign, context);

  return (
    <main className="screen">
      <header className="game-header">
        <div>
          <p className="eyebrow">{view.characterName}</p>
          <p className="game-header__period">{view.worldLabel}</p>
        </div>
        <button type="button" className="button button--ghost button--small" onClick={onExit}>
          Início
        </button>
      </header>

      <p className="lede lede--tight">{EXPLORATION_INTRO}</p>

      {feedback ? (
        <p className="banner banner--info" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      <section className="sandbox-section" aria-labelledby="sandbox-location-title">
        <ImagePlaceholder kind="scene" label={view.location.imageLabel} />
        <h2 id="sandbox-location-title" className="section-title">
          {view.location.name}
        </h2>
        {view.location.description ? <p className="lede lede--tight">{view.location.description}</p> : null}
        <p>
          <strong>Exploração:</strong> {view.location.progress}%
        </p>
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${view.location.progress}%` }} />
        </div>
        <p>
          <strong>Capacidade inicial:</strong> {view.abilityName}
        </p>
      </section>

      <section className="sandbox-section" aria-labelledby="sandbox-actions-title">
        <h2 id="sandbox-actions-title" className="section-title">
          Ações
        </h2>
        <button
          type="button"
          className="button button--primary"
          disabled={!view.location.canExplore}
          onClick={() => onAction({ type: 'exploration.explore' })}
        >
          Explorar este local
        </button>
        {view.location.exploreDisabledReason ? (
          <p className="sandbox-hint">{view.location.exploreDisabledReason}</p>
        ) : (
          <p className="sandbox-hint">Custa {formatPeriodCost(view.location.exploreCostPeriods)}.</p>
        )}

        <h3 className="sandbox-subtitle">Destinos</h3>
        {view.destinations.length === 0 ? (
          <p className="sandbox-hint">Nenhum destino visível ainda. Explore o local para revelar passagens.</p>
        ) : (
          <ul className="choice-list">
            {view.destinations.map((destination) => (
              <li key={destination.locationId}>
                <DestinationButton destination={destination} onAction={onAction} />
              </li>
            ))}
          </ul>
        )}

        <h3 className="sandbox-subtitle">Coleta</h3>
        {view.resources.length === 0 ? (
          <p className="sandbox-hint">Nenhum ponto de coleta revelado neste local.</p>
        ) : (
          <ul className="choice-list">
            {view.resources.map((resource) => (
              <li key={resource.nodeId}>
                <ResourceButton resource={resource} onAction={onAction} />
              </li>
            ))}
          </ul>
        )}

        <h3 className="sandbox-subtitle">Receitas conhecidas</h3>
        {view.recipes.length === 0 ? (
          <p className="sandbox-hint">Nenhuma receita conhecida.</p>
        ) : (
          <ul className="choice-list">
            {view.recipes.map((recipe) => (
              <li key={recipe.recipeId}>
                <RecipeButton recipe={recipe} onAction={onAction} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sandbox-section">
        <button type="button" className="button" onClick={() => setInventoryOpen(true)}>
          Inventário
        </button>
        <details className="sandbox-inventory">
          <summary>Itens no inventário</summary>
          <InventoryList items={view.inventory} />
        </details>
      </section>

      <AppDialog open={inventoryOpen} title="Inventário" onClose={() => setInventoryOpen(false)}>
        <InventoryList items={view.inventory} />
      </AppDialog>
    </main>
  );
}

function DestinationButton({
  destination,
  onAction,
}: {
  destination: DestinationView;
  onAction: (action: SandboxAction) => void;
}) {
  const hints = [
    destination.relationLabel,
    `Custa ${formatPeriodCost(destination.costPeriods)}`,
    destination.blockedReason,
  ].filter((value): value is string => Boolean(value));

  return (
    <button
      type="button"
      className="choice-button"
      disabled={!destination.accessible}
      onClick={() => onAction({ type: 'navigation.move', locationId: destination.locationId })}
    >
      <span className="choice-button__label">{destination.name}</span>
      <span className="choice-button__hint">{hints.join(' · ')}</span>
    </button>
  );
}

function ResourceButton({
  resource,
  onAction,
}: {
  resource: ResourceView;
  onAction: (action: SandboxAction) => void;
}) {
  const products = resource.yields
    .map((entry) => `${entry.quantityPerUnit}× ${entry.name}`)
    .join(', ');
  const hints = [
    `${resource.availableUnits} disponíveis · até ${resource.maxCollectable} por coleta`,
    products ? `Produz ${products}` : undefined,
    `Custa ${formatPeriodCost(resource.costPeriods)}`,
    resource.blockedReason,
  ].filter((value): value is string => Boolean(value));

  return (
    <button
      type="button"
      className="choice-button"
      disabled={!resource.collectable}
      onClick={() => onAction({ type: 'resource.collect', nodeId: resource.nodeId, units: 1 })}
    >
      <span className="choice-button__label">{resource.name}</span>
      <span className="choice-button__hint">{hints.join(' · ')}</span>
    </button>
  );
}

function RecipeButton({
  recipe,
  onAction,
}: {
  recipe: RecipeView;
  onAction: (action: SandboxAction) => void;
}) {
  const ingredients = recipe.ingredients.map((entry) => `${entry.quantity}× ${entry.name}`).join(', ');
  const products = recipe.products.map((entry) => `${entry.quantity}× ${entry.name}`).join(', ');
  const outcome = recipe.structureName
    ? `Cria ${recipe.structureName}`
    : products
      ? `Produz ${products}`
      : undefined;
  const station = recipe.stationTags.length > 0 ? `Estação: ${recipe.stationTags.join(', ')}` : undefined;
  const hints = [
    ingredients ? `Ingredientes: ${ingredients}` : undefined,
    outcome,
    station,
    `Custa ${formatPeriodCost(recipe.costPeriods)}`,
    recipe.blockedReason,
  ].filter((value): value is string => Boolean(value));

  return (
    <button
      type="button"
      className="choice-button"
      disabled={!recipe.craftable}
      onClick={() => onAction({ type: 'crafting.craft', recipeId: recipe.recipeId })}
    >
      <span className="choice-button__label">{recipe.name}</span>
      <span className="choice-button__hint">{hints.join(' · ')}</span>
    </button>
  );
}

function InventoryList({ items }: { items: Array<{ itemId: string; name: string; quantity: number }> }) {
  if (items.length === 0) {
    return <p>Nada no inventário.</p>;
  }

  return (
    <ul className="asset-list">
      {items.map((item) => (
        <li key={item.itemId}>
          <strong>
            {item.name} × {item.quantity}
          </strong>
        </li>
      ))}
    </ul>
  );
}
