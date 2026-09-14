import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { indexObjectiveCatalog, type ObjectivesSynchronizationResult } from '../modules/objectives';
import { BottomNavigation } from '../ui/components/BottomNavigation';
import { JournalPanel, TrackedJourneyCard } from '../ui/components/JournalPanel';
import { describeObjectiveFeedback, type JournalView } from '../ui/journal';

const JOURNAL: JournalView = {
  journeys: [
    {
      id: 'main',
      title: 'Primeiros passos',
      description: 'Encontre um rumo.',
      kind: 'main',
      status: 'active',
      completedSteps: 1,
      totalSteps: 2,
      steps: [
        { id: 'done', title: 'Despertar', completed: true, current: false },
        { id: 'next', title: 'Explorar a clareira', completed: false, current: true },
      ],
    },
    {
      id: 'side',
      title: 'Sinais na mata',
      description: 'Siga os rastros.',
      kind: 'hidden',
      status: 'active',
      completedSteps: 0,
      totalSteps: 1,
      steps: [{ id: 'tracks', title: 'Examinar rastros', completed: false, current: true }],
    },
    {
      id: 'complete',
      title: 'Capacidade escolhida',
      description: 'Uma decisão inicial.',
      kind: 'main',
      status: 'completed',
      completedSteps: 1,
      totalSteps: 1,
      steps: [{ id: 'ability', title: 'Escolher capacidade', completed: true, current: false }],
      completionText: 'A escolha foi registrada.',
    },
  ],
  locations: [
    {
      id: 'awakening-clearing',
      name: 'Clareira do Despertar',
      description: 'O primeiro local.',
      progress: 10,
      discoveries: [{ id: 'awakening-site', name: 'Marca do despertar', kind: 'landmark' }],
    },
  ],
  presences: [
    {
      presenceId: 'mira',
      entityId: 'mira-vale',
      locationId: 'awakening-clearing',
      kind: 'npc',
      name: 'Mira Vale',
      description: 'Outra sobrevivente.',
      status: 'known',
    },
  ],
  history: [
    {
      eventId: 'awakening',
      eventTitle: 'O despertar',
      choiceId: 'wake',
      choiceLabel: 'Respirar fundo',
      notable: true,
    },
  ],
};

describe('Fatia 10.4 — superfície de Jornadas e Diário', () => {
  it('inclui a aba Diário na navegação com seis controles acessíveis', () => {
    const html = renderToStaticMarkup(
      <BottomNavigation active="journal" inventoryCount={2} onChange={() => undefined} />,
    );

    expect(html.match(/<button/g)).toHaveLength(6);
    expect(html).toContain('aria-label="Navegação da partida"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Diário');
    expect(html).toContain('Sistema');
    expect(html).toContain('style="--bottom-navigation-items:6"');
  });

  it('separa jornadas, mostra progresso textual e oferece acompanhamento não persistido', () => {
    const html = renderToStaticMarkup(
      <JournalPanel view={JOURNAL} trackedJourneyId="main" onTrackJourney={() => undefined} />,
    );

    expect(html).toContain('Jornadas principais');
    expect(html).toContain('Jornadas opcionais');
    expect(html).toContain('Jornadas concluídas');
    expect(html).toContain('1 de 2');
    expect(html).toContain('50% concluída');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Deixar de acompanhar');
    expect(html).toContain('Sinais na mata');
    expect(html).toContain('Descoberta');
    expect(html).toContain('Clareira do Despertar');
    expect(html).toContain('Mira Vale');
    expect(html).toContain('O despertar');
  });

  it('mostra a próxima etapa acompanhada no painel de mundo', () => {
    const journey = JOURNAL.journeys[0];
    const html = renderToStaticMarkup(
      <TrackedJourneyCard journey={journey} onOpenJournal={() => undefined} />,
    );
    expect(html).toContain('Jornada acompanhada');
    expect(html).toContain('Primeiros passos');
    expect(html).toContain('Explorar a clareira');
    expect(html).toContain('Ver diário');
  });

  it('mantém estados vazios úteis antes do conteúdo da Fatia 10.5', () => {
    const html = renderToStaticMarkup(
      <JournalPanel
        view={{ journeys: [], locations: [], presences: [], history: [] }}
        trackedJourneyId={null}
        onTrackJourney={() => undefined}
      />,
    );
    expect(html).toContain('Nenhuma jornada principal foi iniciada');
    expect(html).toContain('Nenhuma jornada opcional foi descoberta');
    expect(html).toContain('Suas jornadas concluídas aparecerão aqui');
    expect(html).toContain('Nenhum local foi visitado');
    expect(html).toContain('Você ainda não encontrou ninguém');
    expect(html).toContain('Suas escolhas importantes aparecerão aqui');
  });

  it('descreve progresso e conclusão sem modal e apenas com IDs sincronizados', () => {
    const catalog = indexObjectiveCatalog({
      objectives: [
        {
          id: 'main',
          title: 'Primeiros passos',
          description: 'Encontre um rumo.',
          kind: 'main',
          stepMode: 'sequential',
          activation: { type: 'automatic' },
          steps: [{ id: 'next', title: 'Explorar a clareira', criteria: [{ type: 'flag.is', flag: 'done', value: true }] }],
        },
      ],
    });
    const base: ObjectivesSynchronizationResult = {
      previous: { entries: [{ objectiveId: 'main', completedStepIds: [], completed: false }] },
      current: { entries: [{ objectiveId: 'main', completedStepIds: ['next'], completed: true }] },
      activatedObjectiveIds: [],
      completedSteps: [{ objectiveId: 'main', stepId: 'next' }],
      completedObjectiveIds: [],
    };

    expect(describeObjectiveFeedback(base, catalog)).toBe(
      'Jornada atualizada: Primeiros passos — Explorar a clareira.',
    );
    expect(describeObjectiveFeedback({ ...base, completedObjectiveIds: ['main'] }, catalog)).toBe(
      'Jornada concluída: Primeiros passos.',
    );
  });
});
