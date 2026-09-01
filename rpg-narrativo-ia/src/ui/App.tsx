import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, bindSavedState, getAvailableChoices, getCurrentEvent, startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { createPersistence, type GamePersistence, type LoadResult } from '../infrastructure/persistence';
import { normalizeIdentity } from '../modules/character';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CreateCharacterScreen } from './screens/CreateCharacterScreen';
import { ExplorationScreen } from './screens/ExplorationScreen';
import { GameScreen } from './screens/GameScreen';
import { StartScreen } from './screens/StartScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { hasActiveNarrativeSession, toAppScreen } from './routing';
import { useMemo, useState } from 'react';

type Screen = 'start' | 'create' | 'game' | 'exploration' | 'summary';
type ConfirmKind = 'none' | 'new-game' | 'delete' | 'restart';

const campaign = firstDayCampaign;

function bindLoadResult(result: LoadResult): LoadResult {
  if (result.status !== 'ok') {
    return result;
  }

  const bound = bindSavedState(result.state, campaign);
  if (!bound.ok) {
    return { status: 'corrupt', reason: bound.reason };
  }

  return { status: 'ok', state: bound.state };
}

function createBrowserPersistence(): GamePersistence {
  try {
    const probe = '__reset_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return createPersistence(window.localStorage);
  } catch {
    const memory = new Map<string, string>();
    return createPersistence({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    });
  }
}

export function App() {
  const persistence = useMemo(() => createBrowserPersistence(), []);
  const [loadResult, setLoadResult] = useState<LoadResult>(() => bindLoadResult(persistence.load()));
  const [screen, setScreen] = useState<Screen>('start');
  const [state, setState] = useState<GameState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>('none');
  const [error, setError] = useState<string | null>(null);

  const savedState = loadResult.status === 'ok' ? loadResult.state : null;

  function refreshLoad() {
    setLoadResult(bindLoadResult(persistence.load()));
  }

  function persist(next: GameState) {
    persistence.save(next);
    setState(next);
    refreshLoad();
  }

  function goToSavedGame(next: GameState) {
    setState(next);
    setScreen(toAppScreen(next));
  }

  function requestNewGame() {
    if (loadResult.status === 'ok') {
      setConfirm('new-game');
      return;
    }

    persistence.clear();
    refreshLoad();
    setState(null);
    setScreen('create');
  }

  function confirmNewGame() {
    persistence.clear();
    refreshLoad();
    setState(null);
    setConfirm('none');
    setScreen('create');
  }

  function handleCreate(firstName: string, lastName: string) {
    const next = startGame(normalizeIdentity(firstName, lastName), campaign);
    persist(next);
    setError(null);
    setScreen('game');
  }

  function handleChoice(choiceId: string) {
    if (!state) {
      return;
    }

    try {
      const next = applyChoice(state, campaign, choiceId);
      persist(next);
      setError(null);
      setScreen(toAppScreen(next));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível aplicar a escolha.');
    }
  }

  function handleDelete() {
    persistence.clear();
    refreshLoad();
    setState(null);
    setConfirm('none');
    setScreen('start');
  }

  const saveWarning =
    loadResult.status === 'incompatible'
      ? 'O salvamento deste navegador não é compatível com esta versão. Comece uma nova partida.'
      : loadResult.status === 'corrupt'
        ? 'O salvamento está corrompido e não pode ser continuado.'
        : undefined;

  return (
    <div className="app-shell">
      {error ? <p className="banner banner--warning">{error}</p> : null}

      {screen === 'start' ? (
        <StartScreen
          canContinue={Boolean(savedState)}
          continueLabel={savedState?.status === 'completed' ? 'Abrir resumo da partida' : 'Continuar'}
          saveWarning={saveWarning}
          hasSave={loadResult.status !== 'empty'}
          onNewGame={requestNewGame}
          onContinue={() => savedState && goToSavedGame(savedState)}
          onDelete={() => setConfirm('delete')}
        />
      ) : null}

      {screen === 'create' ? (
        <CreateCharacterScreen onBack={() => setScreen('start')} onConfirm={handleCreate} />
      ) : null}

      {screen === 'game' && state && hasActiveNarrativeSession(state) ? (
        <GameScreen
          state={state}
          campaign={campaign}
          event={getCurrentEvent(state, campaign)}
          choices={getAvailableChoices(state, campaign)}
          onChoose={handleChoice}
          onExit={() => setScreen('start')}
        />
      ) : null}

      {screen === 'exploration' && state ? (
        <ExplorationScreen state={state} campaign={campaign} onExit={() => setScreen('start')} />
      ) : null}

      {screen === 'summary' && state ? (
        <SummaryScreen
          state={state}
          campaign={campaign}
          onRestart={() => setConfirm('restart')}
          onBack={() => setScreen('start')}
        />
      ) : null}

      <ConfirmDialog
        open={confirm === 'new-game'}
        title="Começar de novo?"
        message="A partida salva neste navegador será apagada."
        confirmLabel="Apagar e começar"
        onConfirm={confirmNewGame}
        onCancel={() => setConfirm('none')}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Apagar partida?"
        message="O salvamento local será removido. Esta ação não pode ser desfeita neste navegador."
        confirmLabel="Apagar partida"
        onConfirm={handleDelete}
        onCancel={() => setConfirm('none')}
      />
      <ConfirmDialog
        open={confirm === 'restart'}
        title="Reiniciar campanha?"
        message="O primeiro dia será apagado e você criará outro personagem."
        confirmLabel="Reiniciar"
        onConfirm={confirmNewGame}
        onCancel={() => setConfirm('none')}
      />
    </div>
  );
}
