import type { GameState } from '../core/state';

export type PlayScreen = 'narrative' | 'exploration' | 'summary';
export type AppPlayScreen = 'game' | 'exploration' | 'summary';

export function resolvePlayScreen(state: GameState): PlayScreen {
  if (state.status === 'completed') {
    return 'summary';
  }

  if (state.narrativeSession !== null) {
    return 'narrative';
  }

  return 'exploration';
}

export function toAppScreen(state: GameState): AppPlayScreen {
  const play = resolvePlayScreen(state);
  return play === 'narrative' ? 'game' : play;
}

export function hasActiveNarrativeSession(state: GameState): boolean {
  return state.status === 'playing' && state.narrativeSession !== null;
}
