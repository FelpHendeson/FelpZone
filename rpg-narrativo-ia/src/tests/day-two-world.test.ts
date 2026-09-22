import { describe, expect, it } from 'vitest';
import { startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { inspectLocationAccess } from '../modules/navigation';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { listKnownPresencesAtLocation } from '../modules/presences';
import { deriveNpcAt } from '../modules/npcs';
import { now } from './helpers';

const world = loadFirstDayWorld();
const context = createSandboxContextFromWorld(world);
const options = { context, objectives: world.objectives, campaign: world.campaign, now };

function startSandbox(): GameState {
  const state = startGame(
    { firstName: 'Ana', lastName: 'Cruz', sex: 'female' },
    world.campaign,
    now,
    context,
    world.objectives,
  );
  return { ...state, narrativeSession: null };
}

describe('Dia 2 — Fatia B: mundo e sobreviventes', () => {
  it('mantém as pistas, a Margem Rochosa e os sobreviventes ocultos no Dia 1; reavalia progresso antigo no Dia 2', () => {
    let state = startSandbox();
    state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;
    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;
    state = executeSandboxAction(state, { type: 'exploration.explore' }, options).current;

    const springBefore = state.sandbox.exploration.locations.find((entry) => entry.locationId === 'spring-lake');
    expect(springBefore?.progress).toBe(30);
    expect(springBefore?.revealedDiscoveryIds).not.toContain('multiple-human-tracks');
    expect(state.sandbox.navigation.discoveredLocationIds).not.toContain('rocky-bank');
    expect(inspectLocationAccess(world.map, state.sandbox.navigation, 'rocky-bank').accessible).toBe(false);
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('davi-rocky-bank');

    const dayTwo = { ...state, flags: { ...state.flags, 'day2.started': true } };
    state = executeSandboxAction(dayTwo, { type: 'navigation.move', locationId: 'awakening-clearing' }, options).current;
    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'spring-lake' }, options).current;

    const springAfter = state.sandbox.exploration.locations.find((entry) => entry.locationId === 'spring-lake');
    expect(springAfter?.progress).toBe(30);
    expect(springAfter?.revealedDiscoveryIds).toEqual(expect.arrayContaining([
      'multiple-human-tracks', 'dried-blood-trace', 'path-rocky-bank',
    ]));
    expect(state.sandbox.navigation.discoveredLocationIds).toContain('rocky-bank');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('caio-rocky-bank');

    state = executeSandboxAction(state, { type: 'navigation.move', locationId: 'rocky-bank' }, options).current;
    expect(state.sandbox.exploration.locations.find((entry) => entry.locationId === 'rocky-bank')?.revealedDiscoveryIds)
      .toContain('survivors-rocky-bank');
    expect(listKnownPresencesAtLocation(world.presences, state.sandbox.presences, 'rocky-bank')
      .map((entry) => entry.entity.id)).toEqual(['caio-nascimento', 'davi-moura']);
  });

  it('valida a agenda e as referências dos dois NPCs no pack', () => {
    expect(world.npcs.npcById.get('caio-nascimento')?.defaultScheduleId).toBe('caio-routine');
    expect(world.npcs.npcById.get('davi-moura')?.defaultScheduleId).toBe('davi-routine');
    expect(world.npcs.factById.get('davi-needs-rest')?.npcId).toBe('davi-moura');
    expect(world.npcs.scheduleById.get('caio-routine')?.entries.find((entry) => entry.period === 'meio-dia')?.locationId)
      .toBe('spring-lake');
    expect(world.npcs.scheduleById.get('davi-routine')?.entries.every((entry) => entry.locationId === 'rocky-bank'))
      .toBe(true);
    expect(deriveNpcAt(world.npcs, { entries: [] }, 'caio-nascimento', 'manha', () => true)).toBeNull();
  });
});
