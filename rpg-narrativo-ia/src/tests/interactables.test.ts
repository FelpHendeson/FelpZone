import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { loadFirstDayWorld } from '../modules/content';
import {
  InteractableError,
  inspectInteractableCatalog,
  listKnownInteractablesAtLocation,
  planInteractableAction,
} from '../modules/interactables';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { createSandboxContext } from '../modules/sandbox';
import { asV11, freshState } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function reachGreatTreeMarks(): GameState {
  let state: GameState = exploringState();
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'great-tree' }).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  state = executeSandboxAction(state, { type: 'exploration.explore' }).current;
  return state;
}

describe('Sistema 18 — cenário interativo', () => {
  it('rejeita catálogo com local, descoberta ou efeito inexistente', () => {
    const world = loadFirstDayWorld();
    expect(
      inspectInteractableCatalog(
        { interactables: [{ id: 'ghost', locationId: 'missing', discoveryId: 'bark-markings' }], actions: [] },
        world.map,
        world.exploration,
      ).ok,
    ).toBe(false);
    const inspected = inspectInteractableCatalog(
        {
          interactables: [
            {
              id: 'ghost',
              locationId: 'great-tree',
              discoveryId: 'bark-markings',
              name: 'X',
              description: 'Y',
              initialStageId: 'a',
              stages: [{ id: 'a', name: 'A', description: 'A' }],
              facts: [],
            },
          ],
          actions: [
            {
              id: 'bad-unlock',
              interactableId: 'ghost',
              stageId: 'a',
              label: 'Abrir',
              timeCost: { periods: 1 },
              effects: [{ type: 'navigation.unlock', locationId: 'missing-place' }],
            },
          ],
        },
        world.map,
        world.exploration,
      );
    expect(inspected.ok).toBe(false);
    if (!inspected.ok) {
      expect(inspected.reason).toMatch(/passagem inexistente/);
    }
  });

  it('não lista nem revela o objeto antes da descoberta', () => {
    const state = exploringState();
    const context = createSandboxContext();
    expect(
      listKnownInteractablesAtLocation(
        context.interactables!,
        state.sandbox.interactables ?? { objects: [] },
        'great-tree',
        state,
      ),
    ).toEqual([]);
    expect(() =>
      planInteractableAction(
        context.interactables!,
        state.sandbox.interactables ?? { objects: [] },
        'great-tree-bark-marks',
        'examine-bark-marks',
        'great-tree',
        state,
      ),
    ).toThrow(InteractableError);
    expect(() =>
      planInteractableAction(
        context.interactables!,
        state.sandbox.interactables ?? { objects: [] },
        'great-tree-bark-marks',
        'examine-bark-marks',
        'great-tree',
        state,
      ),
    ).toThrow('O ponto de interesse não está disponível.');
  });

  it('examina, decifra, abre o oco e sobrevive a salvar e carregar', () => {
    const discovered = reachGreatTreeMarks();
    expect(
      discovered.sandbox.interactables.objects.some((entry) => entry.interactableId === 'great-tree-bark-marks'),
    ).toBe(true);

    const examined = executeSandboxAction(discovered, {
      type: 'interactable.interact',
      interactableId: 'great-tree-bark-marks',
      actionId: 'examine-bark-marks',
    });
    expect(examined.current.sandbox.interactables.objects[0]?.stageId).toBe('examined');
    expect(examined.current.sandbox.interactables.objects[0]?.revealedFactIds).toEqual(['pattern-noticed']);
    expect(examined.current.world.period).not.toBe(discovered.world.period);

    const deciphered = executeSandboxAction(examined.current, {
      type: 'interactable.interact',
      interactableId: 'great-tree-bark-marks',
      actionId: 'decipher-bark-marks',
    });
    expect(deciphered.current.sandbox.interactables.objects[0]?.stageId).toBe('deciphered');
    expect(deciphered.current.sandbox.navigation.discoveredLocationIds).toContain('great-tree-hollow');
    expect(deciphered.current.sandbox.navigation.unlockedLocationIds).toContain('great-tree-hollow');
    expect(deciphered.current.objectives.entries.find((entry) => entry.objectiveId === 'great-tree-marks')?.completed).toBe(
      true,
    );

    const loaded = parseGameState(serializeGameState(deciphered.current));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.sandbox.interactables).toEqual(deciphered.current.sandbox.interactables);
      expect(loaded.state.sandbox.navigation.discoveredLocationIds).toContain('great-tree-hollow');
    }
  });

  it('ação inválida não altera o mundo', () => {
    const discovered = reachGreatTreeMarks();
    const previous = structuredClone(discovered);
    expect(() =>
      executeSandboxAction(discovered, {
        type: 'interactable.interact',
        interactableId: 'great-tree-bark-marks',
        actionId: 'decipher-bark-marks',
      }),
    ).toThrow();
    expect(discovered).toEqual(previous);
  });

  it('migra schema 11 sem conceder descoberta de ponto de interesse', () => {
    const loaded = parseGameState(JSON.stringify(asV11(freshState())));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.sandbox.interactables).toEqual({ objects: [] });
    }
  });

  it('o motor aceita outro objeto sem código da Grande Árvore', () => {
    const world = loadFirstDayWorld();
    const inspected = inspectInteractableCatalog(
      {
        interactables: [
          {
            id: 'spring-stones',
            locationId: 'spring-lake',
            discoveryId: 'spring-source',
            name: 'Pedras da nascente',
            description: 'Pedras lisas ao redor da água.',
            initialStageId: 'idle',
            stages: [{ id: 'idle', name: 'Intocadas', description: 'Ainda não foram tocadas.' }],
            facts: [{ id: 'wet', text: 'As pedras estão frias.' }],
          },
        ],
        actions: [
          {
            id: 'touch-stones',
            interactableId: 'spring-stones',
            stageId: 'idle',
            label: 'Tocar',
            timeCost: { periods: 1 },
            once: true,
            effects: [{ type: 'interactable.revealFact', factId: 'wet' }],
          },
        ],
      },
      world.map,
      world.exploration,
    );
    expect(inspected.ok).toBe(true);
    void firstDayCampaign;
  });
});
