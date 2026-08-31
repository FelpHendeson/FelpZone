import { useState } from 'react';
import type { Campaign, StoryChoice, StoryEvent } from '../../core/events';
import type { GameState } from '../../core/state';
import { findAbility, findItem, findNpc } from '../../campaigns/first-day';
import { ATTRIBUTE_LABELS, fullName, storyVars } from '../../modules/character';
import { interpolate, notableHistory } from '../../modules/narrative';
import { describeWorld } from '../../modules/world';
import { AttributeSummary } from '../components/AttributeSummary';
import { AppDialog } from '../components/AppDialog';
import { ChoiceList } from '../components/ChoiceList';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

interface GameScreenProps {
  state: GameState;
  campaign: Campaign;
  event: StoryEvent;
  choices: StoryChoice[];
  onChoose: (choiceId: string) => void;
  onExit: () => void;
}

type Panel = 'none' | 'history' | 'character' | 'inventory';

export function GameScreen({ state, campaign, event, choices, onChoose, onExit }: GameScreenProps) {
  const [panel, setPanel] = useState<Panel>('none');
  const vars = storyVars(state.character);
  const body = interpolate(event.body, vars);
  const title = interpolate(event.title, vars);

  return (
    <main className="screen screen--game">
      <header className="game-header">
        <div>
          <p className="eyebrow">{fullName(state.character)}</p>
          <p className="game-header__period">{describeWorld(state.world)}</p>
        </div>
        <button type="button" className="button button--ghost button--small" onClick={onExit}>
          Início
        </button>
      </header>

      <AttributeSummary attributes={state.attributes} compact />
      <ImagePlaceholder kind="scene" label={event.image.label} />
      {event.portrait ? <ImagePlaceholder kind="portrait" label={event.portrait.label} className="placeholder--inline" /> : null}

      <article className="event">
        <h1 className="event__title">{title}</h1>
        {body.split('\n\n').map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>

      <ChoiceList choices={choices} onChoose={onChoose} />

      <nav className="game-nav" aria-label="Fichas da partida">
        <button type="button" className="button button--ghost" onClick={() => setPanel('history')}>
          Histórico
        </button>
        <button type="button" className="button button--ghost" onClick={() => setPanel('character')}>
          Personagem
        </button>
        <button type="button" className="button button--ghost" onClick={() => setPanel('inventory')}>
          Inventário
        </button>
      </nav>

      <AppDialog open={panel === 'history'} title="Histórico" onClose={() => setPanel('none')}>
        <HistoryPanel state={state} />
      </AppDialog>
      <AppDialog open={panel === 'character'} title="Personagem" onClose={() => setPanel('none')}>
        <CharacterPanel state={state} campaign={campaign} />
      </AppDialog>
      <AppDialog open={panel === 'inventory'} title="Inventário" onClose={() => setPanel('none')}>
        <InventoryPanel state={state} campaign={campaign} />
      </AppDialog>
    </main>
  );
}

function HistoryPanel({ state }: { state: GameState }) {
  const notable = notableHistory(state.history);

  if (state.history.length === 0) {
    return <p>Nenhuma decisão ainda.</p>;
  }

  return (
    <div className="stack">
      {notable.length > 0 ? (
        <section>
          <h3 className="section-title">Decisões marcantes</h3>
          <ol className="history-list">
            {notable.map((entry) => (
              <li key={`${entry.eventId}-${entry.choiceId}`}>
                <strong>{entry.eventTitle}</strong>
                <span>{entry.choiceLabel}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <section>
        <h3 className="section-title">Todas as escolhas</h3>
        <ol className="history-list">
          {state.history.map((entry, index) => (
            <li key={`${entry.eventId}-${entry.choiceId}-${index}`}>
              <strong>{entry.eventTitle}</strong>
              <span>{entry.choiceLabel}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function CharacterPanel({ state, campaign }: { state: GameState; campaign: Campaign }) {
  return (
    <div className="stack">
      <p className="lede lede--tight">{fullName(state.character)}</p>
      <AttributeSummary attributes={state.attributes} />
      <section>
        <h3 className="section-title">Capacidades</h3>
        {state.progression.abilityIds.length === 0 ? (
          <p>Nenhuma capacidade ainda.</p>
        ) : (
          <ul className="asset-list">
            {state.progression.abilityIds.map((abilityId) => {
              const ability = findAbility(campaign, abilityId);
              return (
                <li key={abilityId} className="asset-list__item">
                  <ImagePlaceholder kind="icon" label={ability?.name ?? abilityId} />
                  <div>
                    <strong>{ability?.name ?? abilityId}</strong>
                    <p>{ability?.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h3 className="section-title">Relações</h3>
        {state.relationships.length === 0 ? (
          <p>Nenhum vínculo ainda.</p>
        ) : (
          <ul className="asset-list">
            {state.relationships.map((relation) => {
              const npc = findNpc(campaign, relation.characterId);
              return (
                <li key={relation.characterId} className="asset-list__item">
                  <ImagePlaceholder kind="portrait" label={npc?.name ?? relation.characterId} />
                  <div>
                    <strong>{npc?.name ?? relation.characterId}</strong>
                    <p>Confiança {relation.trust}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="footnote">
        {ATTRIBUTE_LABELS.fome} alta significa mais fome. Os demais atributos melhoram quando sobem.
      </p>
    </div>
  );
}

function InventoryPanel({ state, campaign }: { state: GameState; campaign: Campaign }) {
  if (state.inventory.length === 0) {
    return <p>Nada no inventário.</p>;
  }

  return (
    <ul className="asset-list">
      {state.inventory.map((item) => {
        const definition = findItem(campaign, item.itemId);
        return (
          <li key={item.itemId} className="asset-list__item">
            <ImagePlaceholder kind="icon" label={definition?.name ?? item.itemId} />
            <div>
              <strong>
                {definition?.name ?? item.itemId} × {item.quantity}
              </strong>
              <p>{definition?.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
