import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS } from '../campaigns/first-day/world-triggers';
import { ATTRIBUTE_IDS, inspectGameState, type GameState } from '../core/state';
import { itemQuantity } from '../modules/inventory';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { createMemoryPersistence, parseGameState, serializeGameState } from '../infrastructure/persistence';
import { buildExplorationView, commitSandboxAction } from '../ui/sandbox';
import { toAppScreen } from '../ui/routing';
import { asV3, playChoices, playFirstDay } from './helpers';

const context = createSandboxContext();
const consumedFlag = worldTriggerConsumedFlag('first-priority');

function enterExploration() {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function viewOf(state: GameState) {
  return buildExplorationView(state, firstDayCampaign, context);
}

function commit(state: GameState, action: SandboxAction) {
  return commitSandboxAction(state, action, context, {
    campaign: firstDayCampaign,
    catalog: FIRST_DAY_WORLD_TRIGGERS,
    persist: () => undefined,
  });
}

function mustCommit(state: GameState, action: SandboxAction) {
  const attempt = commit(state, action);
  expect(attempt.ok).toBe(true);
  if (!attempt.ok) {
    throw new Error(attempt.error);
  }

  return attempt;
}

function exploreTimes(state: GameState, times: number) {
  let current = state;
  for (let index = 0; index < times; index += 1) {
    current = executeSandboxAction(current, { type: 'exploration.explore' }, { context }).current;
  }

  return current;
}

function talkMira(state: GameState) {
  return mustCommit(state, {
    type: 'presence.interact',
    presenceId: 'mira-awakening-clearing',
    interactionId: 'talk-mira-awakening-clearing',
  });
}

describe('Fatia 8.6 — conteúdo jogável de Mira e do coelho', () => {
  it('Mira não aparece antes da descoberta e explorar não abre narrativa', () => {
    const start = enterExploration();
    expect(viewOf(start).presences).toEqual([]);

    const revealed = mustCommit(start, { type: 'exploration.explore' });
    const mira = viewOf(revealed.current).presences[0];

    expect(revealed.openedTrigger).toBeUndefined();
    expect(revealed.current.narrativeSession).toBeNull();
    expect(toAppScreen(revealed.current)).toBe('exploration');
    expect(mira?.presenceId).toBe('mira-awakening-clearing');
    expect(mira?.status).toBe('available');
    expect(mira?.interactions.some((interaction) => interaction.interactionId === 'talk-mira-awakening-clearing')).toBe(
      true,
    );
  });

  it('conversar abre exatamente uma sessão, aplica o custo uma vez e devolve ao mesmo local', () => {
    const revealed = mustCommit(enterExploration(), { type: 'exploration.explore' }).current;
    const location = revealed.sandbox.navigation.currentLocationId;
    const worldBefore = { ...revealed.world };
    const historyBefore = revealed.history.length;

    const talked = talkMira(revealed);
    expect(talked.result.timeCost).toEqual({ periods: 1 });
    expect(talked.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(talked.current.world).not.toEqual(worldBefore);
    expect(toAppScreen(talked.current)).toBe('game');

    const firstChoice = playChoices(talked.current, ['seek-water']);
    expect(firstChoice.world).toEqual(talked.current.world);

    const returned = playChoices(firstChoice, [
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]);

    expect(returned.narrativeSession).toBeNull();
    expect(returned.sandbox.navigation.currentLocationId).toBe(location);
    expect(returned.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(returned.flags['camp.together']).toBe(true);
    expect(returned.relationships.some((entry) => entry.characterId === 'mira-vale')).toBe(true);
    expect(returned.history.length).toBeGreaterThan(historyBefore);
    expect(viewOf(returned).presences[0]?.status).toBe('resolved');
    expect(toAppScreen(returned)).toBe('exploration');

    const again = commit(returned, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.error).toMatch(/já foi resolvida/);
    }
  });

  it('observar Mira permanece no sandbox e não resolve a presença', () => {
    const revealed = mustCommit(enterExploration(), { type: 'exploration.explore' }).current;
    const observed = mustCommit(revealed, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'observe-mira-awakening-clearing',
    });

    expect(observed.current.narrativeSession).toBeNull();
    expect(observed.current.flags['observed.mira']).toBe(true);
    expect(observed.current.sandbox.presences.resolvedPresenceIds).toEqual([]);
    expect(observed.feedback).toMatch(/sobrevivente/);
    expect(toAppScreen(observed.current)).toBe('exploration');
  });

  it('o coelho só aparece depois de horned-rabbit-tracks e a interação fica no sandbox', () => {
    const start = enterExploration();
    expect(viewOf(start).presences.map((presence) => presence.presenceId)).not.toContain('horned-rabbit-dense-woods');

    const atWoods = mustCommit(exploreTimes(start, 6), {
      type: 'navigation.move',
      locationId: 'dense-woods',
    }).current;
    expect(viewOf(atWoods).presences).toEqual([]);

    const beforeTracks = exploreTimes(atWoods, 3);
    expect(
      beforeTracks.sandbox.exploration.locations
        .find((entry) => entry.locationId === 'dense-woods')
        ?.revealedDiscoveryIds.includes('horned-rabbit-tracks'),
    ).toBe(false);
    expect(viewOf(beforeTracks).presences).toEqual([]);

    const revealed = exploreTimes(atWoods, 4);
    const rabbit = viewOf(revealed).presences[0];
    expect(rabbit?.presenceId).toBe('horned-rabbit-dense-woods');
    expect(rabbit?.kind).toBe('animal');
    expect(revealed.narrativeSession).toBeNull();

    const attributesBefore = { ...revealed.attributes };
    const observed = mustCommit(revealed, {
      type: 'presence.interact',
      presenceId: 'horned-rabbit-dense-woods',
      interactionId: 'observe-horned-rabbit-dense-woods',
    });

    expect(observed.result.timeCost).toEqual({ periods: 1 });
    expect(observed.current.narrativeSession).toBeNull();
    expect(observed.current.flags['saw.horned.rabbit']).toBe(true);
    expect(observed.feedback).toMatch(/coelho chifrudo/);
    expect(toAppScreen(observed.current)).toBe('exploration');
    expect(observed.current.sandbox.navigation.currentLocationId).toBe('dense-woods');
    expect(Object.keys(observed.current.attributes)).toEqual([...ATTRIBUTE_IDS]);
    expect(observed.current.attributes).toEqual(attributesBefore);
    expect(JSON.stringify(observed.current)).not.toMatch(/combat|hp|vida da criatura/i);

    const avoided = mustCommit(observed.current, {
      type: 'presence.interact',
      presenceId: 'horned-rabbit-dense-woods',
      interactionId: 'avoid-horned-rabbit-dense-woods',
    });
    expect(avoided.result.timeCost).toEqual({ periods: 0 });
    expect(avoided.current.world).toEqual(observed.current.world);
    expect(avoided.current.flags['avoided.horned.rabbit']).toBe(true);
    expect(avoided.current.narrativeSession).toBeNull();
    expect(viewOf(avoided.current).presences[0]?.status).toBe('available');
  });

  it('save e reload preservam descobertas, resoluções e o fluxo sandbox anterior', () => {
    const revealed = mustCommit(enterExploration(), { type: 'exploration.explore' }).current;
    const returned = playChoices(talkMira(revealed).current, [
      'seek-water',
      'alert-hide',
      'meet-open',
      'share-fruit',
      'accept-shelter',
      'together-summary',
    ]);
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(returned);

    const loaded = persistence.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      throw new Error('save inválido');
    }

    expect(loaded.state.sandbox.presences).toEqual({
      discoveredPresenceIds: ['mira-awakening-clearing'],
      resolvedPresenceIds: ['mira-awakening-clearing'],
    });
    expect(loaded.state.narrativeSession).toBeNull();
    expect(toAppScreen(loaded.state)).toBe('exploration');

    const ready = exploreTimes(loaded.state, 2);
    const collected = mustCommit(ready, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 }).current;
    expect(itemQuantity(collected.inventory, 'fallen-branch')).toBe(1);
    expect(viewOf(collected).recipes.length).toBeGreaterThan(0);
    expect(mustCommit(ready, { type: 'navigation.move', locationId: 'great-tree' }).current.sandbox.navigation.currentLocationId).toBe(
      'great-tree',
    );
  });

  it('saves migrados com o gatilho já consumido não duplicam o primeiro encontro', () => {
    const revealed = mustCommit(enterExploration(), { type: 'exploration.explore' }).current;
    const flagged = {
      ...revealed,
      flags: { ...revealed.flags, [consumedFlag]: true },
    };

    const migrated = parseGameState(JSON.stringify(asV3(flagged)), context);
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      throw new Error('save inválido');
    }

    expect(migrated.state.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(migrated.state.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(viewOf(migrated.state).presences[0]?.status).toBe('resolved');

    const talk = commit(migrated.state, {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    });
    expect(talk.ok).toBe(false);

    const raw = JSON.parse(serializeGameState(revealed, context)) as Record<string, unknown>;
    raw.flags = { ...(raw.flags as Record<string, boolean>), [consumedFlag]: true };
    raw.sandbox = {
      ...(raw.sandbox as Record<string, unknown>),
      presences: { discoveredPresenceIds: [], resolvedPresenceIds: [] },
    };
    const roundtrip = parseGameState(JSON.stringify(raw), context);
    expect(roundtrip.status).toBe('ok');
    if (roundtrip.status === 'ok') {
      expect(inspectGameState(roundtrip.state, context).ok).toBe(true);
      expect(roundtrip.state.sandbox.presences.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
      expect(roundtrip.state.sandbox.presences.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    }
  });
});
