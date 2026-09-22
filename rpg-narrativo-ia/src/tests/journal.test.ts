import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { createInitialState } from '../core/state';
import { indexObjectiveCatalog, synchronizeObjectives } from '../modules/objectives';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { buildJournalView } from '../ui/journal';
import { playChoices, revealMiraForTest } from './helpers';

const context = createSandboxContext();
const objectives = indexObjectiveCatalog({
  objectives: [
    {
      id: 'first-path',
      title: 'Primeiro caminho',
      description: 'Aprenda a observar o mundo.',
      kind: 'main',
      stepMode: 'sequential',
      activation: { type: 'automatic' },
      completionText: 'Você encontrou seu rumo.',
      steps: [
        {
          id: 'ability',
          title: 'Escolha uma capacidade',
          criteria: [{ type: 'progression.ability.has', abilityId: 'olhar-atento' }],
        },
        {
          id: 'clearing',
          title: 'Explore a clareira',
          criteria: [{ type: 'exploration.discovery.revealed', discoveryId: 'awakening-site' }],
        },
        {
          id: 'spring',
          title: 'Visite a nascente',
          criteria: [{ type: 'navigation.location.visited', locationId: 'spring-lake' }],
        },
        {
          id: 'fire',
          title: 'Construa uma fogueira',
          criteria: [{ type: 'crafting.structure.active', structureId: 'campfire' }],
        },
      ],
    },
    {
      id: 'secret-threat',
      title: 'A ameaça sob as raízes',
      description: 'Conteúdo que não pode vazar.',
      kind: 'hidden',
      stepMode: 'sequential',
      activation: { type: 'criteria', criteria: [{ type: 'flag.is', flag: 'secret.known', value: true }] },
      steps: [
        {
          id: 'secret-step',
          title: 'Entre na passagem secreta',
          criteria: [{ type: 'flag.is', flag: 'secret.done', value: true }],
        },
      ],
    },
    {
      id: 'mira-signs',
      title: 'Sinais de outra pessoa',
      description: 'Registre o primeiro encontro.',
      kind: 'side',
      stepMode: 'parallel',
      activation: {
        type: 'criteria',
        criteria: [{ type: 'presence.discovered', presenceId: 'mira-awakening-clearing' }],
      },
      steps: [
        {
          id: 'find-mira',
          title: 'Encontre Mira',
          criteria: [{ type: 'presence.discovered', presenceId: 'mira-awakening-clearing' }],
        },
      ],
    },
  ],
});

function journalState() {
  const initial = createInitialState(
    { firstName: 'Ana', lastName: 'Cruz' },
    firstDayCampaign,
    () => '2026-09-11T12:00:00.000Z',
    context,
    objectives,
  );
  const exploring = playChoices(
    initial,
    ['awake-calm', 'system-touch', 'ability-perception'],
    firstDayCampaign,
    () => '2026-09-11T12:00:00.000Z',
    objectives,
  );
  const explored = executeSandboxAction(exploring, { type: 'exploration.explore' }, {
    context,
    campaign: firstDayCampaign,
    objectives,
    now: () => '2026-09-11T13:00:00.000Z',
  }).current;
  const withMira = revealMiraForTest(explored);
  const synchronized = synchronizeObjectives(objectives, withMira.objectives, withMira);
  return { ...withMira, objectives: synchronized.current };
}

describe('Fatia 10.3 — diário derivado', () => {
  it('deriva somente conhecimento adquirido, na ordem canônica e sem antecipar etapas', () => {
    const state = journalState();
    const before = structuredClone(state);
    const journal = buildJournalView(state, context, objectives);

    expect(journal.journeys.map((journey) => journey.id)).toEqual(['first-path', 'mira-signs']);
    expect(journal.journeys[0]).toMatchObject({
      id: 'first-path',
      status: 'active',
      completedSteps: 2,
      totalSteps: 4,
    });
    expect(journal.journeys[0].steps).toEqual([
      expect.objectContaining({ id: 'ability', completed: true, current: false }),
      expect.objectContaining({ id: 'clearing', completed: true, current: false }),
      expect.objectContaining({ id: 'spring', completed: false, current: true }),
    ]);
    expect(journal.journeys[0].steps.some((step) => step.id === 'fire')).toBe(false);
    expect(journal.journeys[0].completionText).toBeUndefined();
    expect(journal.journeys[1]).toMatchObject({
      id: 'mira-signs',
      kind: 'side',
      status: 'completed',
      completedSteps: 1,
      totalSteps: 1,
    });

    const serialized = JSON.stringify(journal);
    expect(serialized).not.toContain('secret-threat');
    expect(serialized).not.toContain('A ameaça sob as raízes');
    expect(serialized).not.toContain('secret-step');

    expect(journal.locations).toEqual([
      expect.objectContaining({
        id: 'awakening-clearing',
        name: 'Clareira do Despertar',
        progress: 10,
        discoveries: [
          { id: 'awakening-site', name: 'Marca do despertar', kind: 'landmark' },
          { id: 'first-priority-event', name: 'Leitura inicial da clareira', kind: 'landmark' },
          { id: 'human-footprints', name: 'Pegadas humanas recentes', kind: 'landmark' },
          { id: 'human-cut-branch', name: 'Ramo cortado de propósito', kind: 'landmark' },
          { id: 'path-spring-lake', name: 'Passagem para a Nascente', kind: 'passage' },
        ],
      }),
    ]);
    expect(journal.presences).toEqual([
      expect.objectContaining({
        presenceId: 'mira-awakening-clearing',
        entityId: 'mira-vale',
        name: 'Mira Vale',
        status: 'known',
      }),
    ]);
    expect(journal.history).toEqual(state.history);
    expect(journal.history).not.toBe(state.history);
    expect(state).toEqual(before);
  });

  it('reconstrói o diário de forma idempotente e devolve cópias defensivas', () => {
    const state = journalState();
    const first = buildJournalView(state, context, objectives);
    const second = buildJournalView(state, context, objectives);
    expect(second).toEqual(first);

    first.journeys[0].title = 'Alterado fora';
    first.locations[0].discoveries[0].name = 'Alterado fora';
    first.presences[0].name = 'Alterado fora';
    first.history[0].choiceLabel = 'Alterado fora';

    expect(buildJournalView(state, context, objectives)).toEqual(second);
  });
});
