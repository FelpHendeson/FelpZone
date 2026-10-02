import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import type { GameState } from '../core/state';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { SystemHintCard } from '../ui/components/SystemHints';
import { buildJournalView } from '../ui/journal/model';
import { buildExplorationView, currentChapter, formatTimeCost } from '../ui/sandbox';
import { skyAt } from '../ui/clock/sky';
import { clockAnimationMs } from '../ui/clock/useAnimatedClock';
import { crossesNightfall, describeCost, durationFrom, formatClock, formatDuration, setClockContext } from '../ui/clock';
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

describe('Relógio em minutos', () => {
  it('formata 24h e 12h AM/PM', () => {
    expect(formatClock(7 * 60, '24h')).toBe('07:00');
    expect(formatClock(19 * 60, '24h')).toBe('19:00');
    expect(formatClock(7 * 60, '12h')).toBe('7:00 AM');
    expect(formatClock(19 * 60, '12h')).toBe('7:00 PM');
    expect(formatClock(0, '12h')).toBe('12:00 AM');
    expect(formatClock(12 * 60, '12h')).toBe('12:00 PM');
  });

  it('mostra a duração real da ação e a hora de chegada, avisando quando entra na noite', () => {
    const morning = { day: 1, period: 'manha' as const, minute: 7 * 60 + 40 };
    expect(durationFrom({ periods: 0, minutes: 30 }, morning)).toEqual({ minutes: 30, arrivesAt: 8 * 60 + 10 });
    expect(describeCost({ periods: 0, minutes: 30 }, morning, '24h')).toBe('30 min · até 08:10');
    expect(describeCost({ periods: 0, minutes: 90 }, morning, '12h')).toBe('1 h 30 min · até 9:10 AM');
    expect(describeCost({ periods: 0, minutes: 0 }, morning, '24h')).toBe('instantâneo');
    const dusk = { day: 1, period: 'entardecer' as const, minute: 18 * 60 + 30 };
    expect(describeCost({ periods: 0, minutes: 60 }, dusk, '24h')).toBe('1 h · até 19:30 · entra na noite');
    expect(crossesNightfall(20 * 60, 60)).toBe(false);
    expect(formatDuration(90)).toBe('1 h 30 min');
  });

  it('formatTimeCost usa o horário da tela e, fora dela, só a duração', () => {
    expect(formatTimeCost({ periods: 0, minutes: 45 })).toBe('45 min');
    expect(formatTimeCost({ periods: 1 })).toBe('1 período');
    setClockContext({ day: 1, period: 'alvorecer', minute: 5 * 60 }, '24h');
    expect(formatTimeCost({ periods: 0, minutes: 45 })).toBe('45 min · até 05:45');
    // Custos legados em períodos andam até o início do período seguinte.
    expect(formatTimeCost({ periods: 1 })).toBe('2 h · até 07:00');
  });

  it('o HUD ganha o capítulo atual a partir dos gatilhos já disparados', () => {
    expect(currentChapter({})).toEqual({ number: 1, title: 'O despertar' });
    expect(currentChapter({ 'world.trigger.day-two-start.consumed': true })).toEqual({ number: 2, title: 'Os outros' });
  });

  it('o céu muda em gradiente contínuo conforme a hora', () => {
    const noon = skyAt(12 * 60);
    const dawn = skyAt(5 * 60 + 30);
    const night = skyAt(23 * 60);
    expect(noon.night).toBe(false);
    expect(night.night).toBe(true);
    expect(noon.top).not.toBe(dawn.top);
    expect(skyAt(0)).toEqual(skyAt(24 * 60));
    // Entre duas paradas a cor é interpolada, não salta.
    const a = skyAt(13 * 60);
    expect(a.top).not.toBe(noon.top);
    expect(a.top).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('a animação do relógio cresce com o tempo passado e para em 3 s', () => {
    expect(clockAnimationMs(0)).toBe(0);
    expect(clockAnimationMs(5)).toBeLessThan(600);
    expect(clockAnimationMs(60)).toBeGreaterThan(clockAnimationMs(5));
    expect(clockAnimationMs(600)).toBe(3000);
  });
});
