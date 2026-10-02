import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import type { GameState } from '../core/state';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { SystemHintCard } from '../ui/components/SystemHints';
import { buildJournalView } from '../ui/journal/model';
import { buildExplorationView, currentChapter, formatPeriodCost } from '../ui/sandbox';
import { describeCost, durationOf, formatClock, formatDuration, setClockContext } from '../ui/clock';
import { deriveSystemHints, isChapterStalled } from '../ui/system-hints';
import { playFirstDay } from './helpers';

const world = loadFirstDayWorld();
const context = createSandboxContextFromWorld(world);

function explorationState(): GameState {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function hintsFor(state: GameState) {
  const view = buildExplorationView(state, firstDayCampaign, context);
  const journal = buildJournalView(state, context);
  return deriveSystemHints({ state, view, journal, triggers: world.worldTriggers });
}

afterEach(() => setClockContext(null, '24h'));

describe('Sistema-tutor', () => {
  it('fome crítica sem comida aponta explorar como urgência', () => {
    const state = explorationState();
    const hungry = { ...state, attributes: { ...state.attributes, fome: 100 } };
    const [top] = hintsFor(hungry);
    expect(top).toMatchObject({ id: 'need-fome', priority: 'urgente', title: 'Sua fome está alta' });
    expect(top?.action).toMatchObject({ kind: 'sandbox', action: { type: 'exploration.explore' } });
  });

  it('com comida na mochila, sugere consumir o item', () => {
    const state = explorationState();
    const fed = {
      ...state,
      attributes: { ...state.attributes, fome: 80 },
      inventory: [...state.inventory, { itemId: 'fruto-desconhecido', quantity: 2 }],
    };
    const hint = hintsFor(fed).find((entry) => entry.id === 'need-fome');
    expect(hint).toMatchObject({
      priority: 'importante',
      detail: 'Você tem 2× Fruto desconhecido na mochila.',
      action: { kind: 'sandbox', action: { type: 'needs.consume', itemId: 'fruto-desconhecido' } },
    });
  });

  it('necessidades estáveis não geram urgência', () => {
    expect(hintsFor(explorationState()).some((hint) => hint.priority === 'urgente')).toBe(false);
  });

  it('o capítulo nunca fica parado sem aviso: após 2 dias sem virar, o sinal da jornada sobe de prioridade', () => {
    const state = explorationState();
    const stalled = {
      ...state,
      world: { ...state.world, day: 4 },
      story: { chapterDays: { 'day-two-start': 2 } },
      flags: { ...state.flags, 'world.trigger.day-two-start.consumed': true, 'day2.started': true },
    };
    expect(isChapterStalled(stalled, world.worldTriggers)).toBe(true);
    expect(isChapterStalled({ ...stalled, world: { ...stalled.world, day: 3 } }, world.worldTriggers)).toBe(false);
  });

  it('o cartão mostra o sinal principal, o atalho e quantas orientações há a mais', () => {
    const html = renderToStaticMarkup(
      <SystemHintCard
        hints={[
          { id: 'a', priority: 'urgente', title: 'Sua sede está alta', detail: 'x', action: { kind: 'open-actions', label: 'Abrir ações' } },
          { id: 'b', priority: 'sugestão', title: 'Outro', detail: 'y' },
        ]}
        onAction={() => undefined}
      />,
    );
    expect(html).toContain('[ Sistema ] · Urgente');
    expect(html).toContain('Abrir ações');
    expect(html).toContain('Mais 1 orientação');
  });
});

describe('Relógio visual', () => {
  it('formata 24h e 12h AM/PM', () => {
    expect(formatClock(7 * 60, '24h')).toBe('07:00');
    expect(formatClock(19 * 60, '24h')).toBe('19:00');
    expect(formatClock(7 * 60, '12h')).toBe('7:00 AM');
    expect(formatClock(19 * 60, '12h')).toBe('7:00 PM');
    expect(formatClock(0, '12h')).toBe('12:00 AM');
    expect(formatClock(12 * 60, '12h')).toBe('12:00 PM');
  });

  it('converte o custo em períodos para horas a partir do período atual', () => {
    expect(durationOf(1, 'manha')).toEqual({ minutes: 4 * 60, arrivesAt: 11 * 60 });
    expect(durationOf(1, 'noite')).toEqual({ minutes: 10 * 60, arrivesAt: 29 * 60 });
    expect(describeCost(1, 'manha', '24h')).toBe('4 h · até 11:00');
    expect(describeCost(2, 'tarde', '12h')).toBe('5 h · até 7:00 PM');
    expect(describeCost(0, 'tarde', '24h')).toBe('alguns minutos');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });

  it('formatPeriodCost usa o período atual da tela e cai para "período" fora dela', () => {
    expect(formatPeriodCost(1)).toBe('1 período');
    setClockContext('alvorecer', '24h');
    expect(formatPeriodCost(1)).toBe('2 h · até 07:00');
  });

  it('o HUD ganha o capítulo atual a partir dos gatilhos já disparados', () => {
    expect(currentChapter({})).toEqual({ number: 1, title: 'O despertar' });
    expect(currentChapter({ 'world.trigger.day-two-start.consumed': true })).toEqual({ number: 2, title: 'Os outros' });
  });
});
