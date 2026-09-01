import { findAbility } from '../../campaigns/first-day';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import { fullName } from '../../modules/character';
import { createSandboxContext } from '../../modules/sandbox';
import { describeWorld } from '../../modules/world';
import { EXPLORATION_INTRO, EXPLORATION_SANDBOX_ACTIONS } from './exploration-copy';

interface ExplorationScreenProps {
  state: GameState;
  campaign: Campaign;
  onExit: () => void;
}

export function ExplorationScreen({ state, campaign, onExit }: ExplorationScreenProps) {
  const locationName =
    createSandboxContext().map.locations.get(state.sandbox.navigation.currentLocationId)?.name ??
    state.sandbox.navigation.currentLocationId;
  const abilityId = state.progression.abilityIds[0];
  const ability = abilityId ? findAbility(campaign, abilityId) : undefined;

  return (
    <main className="screen">
      <header className="game-header">
        <div>
          <p className="eyebrow">{fullName(state.character)}</p>
          <p className="game-header__period">{describeWorld(state.world)}</p>
        </div>
        <button type="button" className="button button--ghost button--small" onClick={onExit}>
          Início
        </button>
      </header>

      <p className="lede lede--tight">{EXPLORATION_INTRO}</p>

      <section className="stack">
        <p>
          <strong>Local:</strong> {locationName}
        </p>
        <p>
          <strong>Capacidade inicial:</strong> {ability?.name ?? 'Nenhuma'}
        </p>
      </section>
      {EXPLORATION_SANDBOX_ACTIONS.map((label) => (
        <button key={label} type="button">
          {label}
        </button>
      ))}
    </main>
  );
}
