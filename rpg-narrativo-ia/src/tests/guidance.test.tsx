import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, startGame } from '../core/engine';
import { applyEffects } from '../core/effects';
import { SCHEMA_VERSION, SCHEMA_VERSION_V24 } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { assembleFirstDayRaw, composeWorld } from '../modules/content';
import {
  GuidanceError,
  INITIAL_GUIDANCE,
  createInitialGuidanceState,
  inspectGuidanceCatalog,
  listUnseenGuidanceTopics,
  markGuidanceTopicSeen,
  unlockGuidanceTopic,
} from '../modules/guidance';
import { GuidancePanel } from '../ui/screens/exploration/GuidancePanel';
import { now } from './helpers';

describe('orientação e Central de Ajuda', () => {
  it('valida catálogo e rejeita IDs duplicados', () => {
    expect(inspectGuidanceCatalog({ topics: [] }).ok).toBe(true);
    const duplicated = {
      topics: [
        { id: 'x', title: 'X', summary: 'Resumo', body: ['Texto'], category: 'system' },
        { id: 'x', title: 'Y', summary: 'Resumo', body: ['Texto'], category: 'world' },
      ],
    };
    expect(inspectGuidanceCatalog(duplicated).ok).toBe(false);
  });

  it('desbloqueia e marca como visto de forma idempotente', () => {
    const initial = createInitialGuidanceState();
    const unlocked = unlockGuidanceTopic(INITIAL_GUIDANCE, initial, 'system-basics');
    const unlockedAgain = unlockGuidanceTopic(INITIAL_GUIDANCE, unlocked, 'system-basics');
    const seen = markGuidanceTopicSeen(INITIAL_GUIDANCE, unlocked, 'system-basics');
    const seenAgain = markGuidanceTopicSeen(INITIAL_GUIDANCE, seen, 'system-basics');

    expect(unlockedAgain).toBe(unlocked);
    expect(seenAgain).toBe(seen);
    expect(unlocked.unlockedTopicIds).toEqual(['system-basics']);
    expect(seen.seenTopicIds).toEqual(['system-basics']);
    expect(() => markGuidanceTopicSeen(INITIAL_GUIDANCE, initial, 'system-basics')).toThrow(GuidanceError);
  });

  it('aplica guidance.unlock pelo estado canônico', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, firstDayCampaign, now);
    const next = applyEffects(
      state,
      [{ type: 'guidance.unlock', topicId: 'system-basics' }],
      undefined,
      INITIAL_GUIDANCE,
    );

    expect(next.guidance.unlockedTopicIds).toEqual(['system-basics']);
    expect(state.guidance.unlockedTopicIds).toEqual([]);
  });

  it('o fluxo inicial desbloqueia tópicos pela campanha', () => {
    let state = startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, firstDayCampaign, now);
    state = applyChoice(state, firstDayCampaign, 'awake-calm', now);
    expect(state.guidance.unlockedTopicIds).toEqual(['choices-and-consequences']);

    state = applyChoice(state, firstDayCampaign, 'system-touch', now);
    expect(state.guidance.unlockedTopicIds).toEqual([
      'choices-and-consequences',
      'system-basics',
      'time',
    ]);

    state = applyChoice(state, firstDayCampaign, 'ability-perception', now);
    expect(state.guidance.unlockedTopicIds).toEqual([
      'choices-and-consequences',
      'system-basics',
      'time',
      'exploration',
      'journeys',
    ]);
    expect(listUnseenGuidanceTopics(INITIAL_GUIDANCE, state.guidance)).toHaveLength(5);
  });

  it('migra schema 24 marcando a ajuda básica como vista', () => {
    const current = startGame({ firstName: 'Lia', lastName: 'Nunes', sex: 'female' }, firstDayCampaign, now);
    const raw = JSON.parse(serializeGameState(current)) as Record<string, unknown>;
    raw.schemaVersion = SCHEMA_VERSION_V24;
    delete raw.guidance;

    const parsed = parseGameState(JSON.stringify(raw));
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') {
      expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
      const allIds = INITIAL_GUIDANCE.topics.map((topic) => topic.id);
      expect(parsed.state.guidance.unlockedTopicIds).toEqual(allIds);
      expect(parsed.state.guidance.seenTopicIds).toEqual(allIds);
    }
  });

  it('rejeita schema atual sem guidance', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, firstDayCampaign, now);
    const raw = JSON.parse(serializeGameState(state)) as Record<string, unknown>;
    delete raw.guidance;
    expect(parseGameState(JSON.stringify(raw)).status).toBe('corrupt');
  });

  it('usa o catálogo do pack ativo e rejeita referência inexistente', () => {
    const renamed = structuredClone(assembleFirstDayRaw()) as {
      guidance: { topics: Array<{ id: string; title: string }> };
      events: Array<{ choices: Array<{ effects: unknown[] }> }>;
    };
    const topic = renamed.guidance.topics.find((entry) => entry.id === 'system-basics');
    expect(topic).toBeDefined();
    topic!.title = 'Interface do Novo Mundo';
    expect(composeWorld(renamed).guidance.byId.get('system-basics')?.title).toBe('Interface do Novo Mundo');
    expect(INITIAL_GUIDANCE.byId.get('system-basics')?.title).toBe('O Sistema');

    const hostile = structuredClone(assembleFirstDayRaw()) as {
      events: Array<{ choices: Array<{ effects: unknown[] }> }>;
    };
    hostile.events[0]!.choices[0]!.effects.push({ type: 'guidance.unlock', topicId: 'missing-topic' });
    expect(() => composeWorld(hostile)).toThrow(/missing-topic/);
  });

  it('a Central de Ajuda mostra somente tópicos desbloqueados', () => {
    const state = unlockGuidanceTopic(INITIAL_GUIDANCE, createInitialGuidanceState(), 'system-basics');
    const html = renderToStaticMarkup(
      <GuidancePanel
        catalog={INITIAL_GUIDANCE}
        state={state}
        onSeen={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(html).toContain('O Sistema');
    expect(html).toContain('Consultar o Sistema não consome períodos do dia.');
    expect(html).not.toContain('Etéris é a energia presente no ambiente');
  });
});
