import { useState } from 'react';
import type { SandboxAction } from '../../../modules/sandbox-actions';
import {
  formatPeriodCost,
  type ContextualActivityView,
  type ExplorationView,
  type RecipeView,
  type ResourceView,
} from '../../sandbox';
import { EmptyAction, NeedEffectList } from './shared';
import { itemGlyph } from './helpers';

export function ActionsPanel({
  view,
  onAction,
  compact = false,
}: {
  view: ExplorationView;
  onAction: (action: SandboxAction) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'tab-panel tab-panel--action-drawer' : 'tab-panel'}>
      {!compact ? <header className="panel-heading">
        <span className="section-kicker">{view.location.name}</span>
        <h1>Ações disponíveis</h1>
        <p>Veja custos e resultados antes de comprometer um período.</p>
      </header> : <p className="action-drawer__intro">Escolha uma atividade. O custo aparece antes de você agir.</p>}

      {view.activities.length > 0 ? (
        <section className="action-section" aria-labelledby="activities-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Ações compartilhadas</span>
              <h2 id="activities-title">Atividades</h2>
            </div>
            <span className="section-count">{view.activities.length}</span>
          </div>
          <div className="action-card-list">
            {view.activities.map((activity) => (
              <ContextualActivityCard key={activity.activityId} activity={activity} onAction={onAction} />
            ))}
          </div>
        </section>
      ) : null}

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

export function ContextualActivityCard({
  activity,
  onAction,
}: {
  activity: ContextualActivityView;
  onAction: (action: SandboxAction) => void;
}) {
  const initial = activity.optionalParticipants
    .filter((participant) => participant.eligible)
    .slice(0, activity.minOptional)
    .map((participant) => participant.npcId);
  const [selected, setSelected] = useState<string[]>(initial);
  const selectionValid = selected.length >= activity.minOptional && selected.length <= activity.maxOptional;

  return (
    <article className={activity.available ? 'action-card' : 'action-card action-card--blocked'}>
      <div className="item-glyph" aria-hidden="true">◇</div>
      <div className="action-card__body">
        <div className="action-card__title">
          <h3>{activity.label}</h3>
          <span>{formatPeriodCost(activity.costPeriods)}</span>
        </div>
        <p>{activity.description}</p>
        {activity.requiredParticipants.length > 0 ? (
          <p className="action-card__outcome">
            Participantes: {activity.requiredParticipants.map((participant) => participant.name).join(', ')}
          </p>
        ) : null}
        {activity.optionalParticipants.length > 0 ? (
          <fieldset>
            <legend>Acompanhantes opcionais</legend>
            {activity.optionalParticipants.map((participant) => {
              const checked = selected.includes(participant.npcId);
              const limitReached = !checked && selected.length >= activity.maxOptional;
              return (
                <label key={participant.npcId}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!participant.eligible || limitReached}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(participant.npcId)
                          ? current.filter((id) => id !== participant.npcId)
                          : [...current, participant.npcId],
                      )
                    }
                  />
                  {participant.name}
                </label>
              );
            })}
          </fieldset>
        ) : null}
        <div className="action-card__footer">
          <small>{activity.blockedReason ?? (selectionValid ? 'Pronto para executar.' : 'Selecione os participantes necessários.')}</small>
          <button
            type="button"
            className="button button--compact"
            disabled={!activity.available || !selectionValid}
            onClick={() =>
              onAction({
                type: 'activity.perform',
                activityId: activity.activityId,
                optionalParticipantIds: selected,
              })
            }
          >
            Executar
          </button>
        </div>
      </div>
    </article>
  );
}

export function ResourceCard({ resource, onAction }: { resource: ResourceView; onAction: (action: SandboxAction) => void }) {
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

export function RecipeCard({ recipe, onAction }: { recipe: RecipeView; onAction: (action: SandboxAction) => void }) {
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
