import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/state';
import { ordinalDay, storyVars } from '../modules/character';
import { loadFirstDayWorld } from '../modules/content';
import { interpolate } from '../modules/narrative';
import { chapterWindow, isConditionMet, isChapterKeyResolved } from '../modules/world-events';
import { freshState } from './helpers';

const world = loadFirstDayWorld();
const trigger = (id: string) => world.worldTriggers.byId.get(id)!;

function withHistory(state: GameState, ...eventIds: string[]): GameState {
  return {
    ...state,
    history: [
      ...state.history,
      ...eventIds.map((eventId) => ({ eventId, eventTitle: eventId, choiceId: 'x', choiceLabel: 'x', notable: false })),
    ],
  };
}

describe('Eventos destravados por eventos', () => {
  it('nenhum capítulo depende de um dia fixo, a não ser as travas de "não antes do dia"', () => {
    const chapters = world.worldTriggers.definitions.filter((entry) => entry.source.type === 'story.chapter');
    expect(chapters.length).toBeGreaterThan(0);
    const floors = Object.fromEntries(chapters.map((entry) => [entry.id, entry.source.type === 'story.chapter' ? entry.source.notBeforeDay : undefined]));
    // Só duas travas de dia restam: a manhã depois da primeira noite e o fim do primeiro ciclo do Sistema.
    expect(Object.entries(floors).filter(([, day]) => day !== undefined)).toEqual([
      ['day-two-start', 2],
      ['day-seven-start', 7],
    ]);
  });

  it('o capítulo seguinte é destravado pelo evento anterior já vivido', () => {
    const base = freshState();
    const source = trigger('day-five-start').source;
    if (source.type !== 'story.chapter') throw new Error('capítulo esperado');
    expect(isChapterKeyResolved(source, base)).toBe(false);
    expect(isChapterKeyResolved(source, withHistory(base, 'day-four-awakening'))).toBe(true);
    expect(isConditionMet({ type: 'event.seen', eventId: 'day-four-awakening' }, withHistory(base, 'day-four-awakening'))).toBe(true);
  });

  it('um capítulo atrasado abre no amanhecer seguinte ao anterior, não numa data fixa', () => {
    const base = freshState();
    const late = { ...base, story: { chapterDays: { 'day-four-start': 9 } } };
    const source = trigger('day-five-start').source;
    if (source.type !== 'story.chapter') throw new Error('capítulo esperado');
    expect(chapterWindow(source, late)).toEqual({ earliest: 10 });
    const early = { ...base, story: { chapterDays: { 'day-six-start': 4 } } };
    const registry = trigger('day-seven-start').source;
    if (registry.type !== 'story.chapter') throw new Error('capítulo esperado');
    // O Registro respeita a trava: o primeiro ciclo de avaliação do Sistema dura sete dias.
    expect(chapterWindow(registry, early)).toEqual({ earliest: 7 });
  });

  it('os textos dizem o dia real em que a cena acontece', () => {
    expect([1, 2, 3, 7, 10, 12, 21, 30, 100].map(ordinalDay)).toEqual([
      'primeiro', 'segundo', 'terceiro', 'sétimo', 'décimo', 'décimo segundo', 'vigésimo primeiro', 'trigésimo', '100º',
    ]);
    const event = world.campaign.events.find((entry) => entry.id === 'day-five-awakening')!;
    const vars = storyVars({ firstName: 'Ana', lastName: 'Cruz', sex: 'female' }, 9);
    expect(interpolate(event.title, vars)).toBe('O nono amanhecer');
    expect(JSON.stringify(world.campaign.events)).not.toMatch(/quinto dia|sexto dia|Dia 2/);
  });
});
