import { describe, expect, it } from 'vitest';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  CalendarError,
  INITIAL_CALENDAR,
  INITIAL_CALENDAR_CATALOG,
  applyCalendarAdvance,
  createInitialCalendarState,
  dateFromWorldDay,
  deriveActorAge,
  describeCalendarDate,
  inspectCalendarCatalog,
  listCalendarBoundaries,
  listUpcomingCalendarEvents,
  PLAYER_CALENDAR_ACTOR_ID,
} from '../modules/calendar';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { buildSystemStatus } from '../modules/system-interface';
import { asV17, freshState } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function restUntil(state: GameState, targetDay: number): GameState {
  let current = state;
  let safety = 0;
  while (current.world.day < targetDay && safety < 40) {
    current = executeSandboxAction(current, { type: 'needs.rest', mode: 'simple' }).current;
    safety += 1;
  }
  return current;
}

describe('Sistema 24 — calendário e ciclo de vida', () => {
  it('rejeita catálogo hostil e protege o índice imutável', () => {
    expect(inspectCalendarCatalog({ ...structuredClone(INITIAL_CALENDAR_CATALOG), daysPerCycle: 0 }).ok).toBe(false);
    expect(
      inspectCalendarCatalog({
        ...structuredClone(INITIAL_CALENDAR_CATALOG),
        cycles: [{ id: 'ember', name: 'Brasa', seasonId: 'missing' }],
      }).ok,
    ).toBe(false);
    expect(() => (INITIAL_CALENDAR.cycleById as Map<string, never>).set('ghost', {} as never)).toThrow(CalendarError);
  });

  it('converte o dia do mundo em data, idade e estágio sem a UI enviar idade', () => {
    const dayOne = dateFromWorldDay(INITIAL_CALENDAR, 1);
    expect(dayOne).toMatchObject({ year: 1, dayInCycle: 1, cycle: expect.objectContaining({ id: 'ember' }) });
    expect(dayOne.season.id).toBe('dry');
    expect(describeCalendarDate(INITIAL_CALENDAR, 1)).toContain('Brasa');

    const life = deriveActorAge(INITIAL_CALENDAR, PLAYER_CALENDAR_ACTOR_ID, 1);
    expect(life.ageYears).toBe(18);
    expect(life.stageId).toBe('adult');

    const cycleTurn = dateFromWorldDay(INITIAL_CALENDAR, 4);
    expect(cycleTurn.cycle.id).toBe('ash');
    expect(cycleTurn.year).toBe(1);

    const newYear = dateFromWorldDay(INITIAL_CALENDAR, 13);
    expect(newYear.year).toBe(2);
    expect(newYear.cycle.id).toBe('ember');
  });

  it('um calendário compacto diferente funciona sem editar o motor', () => {
    const compact = inspectCalendarCatalog({
      id: 'short-count',
      name: 'Contagem curta',
      epochLabel: 'após a queda',
      daysPerCycle: 2,
      cycles: [
        { id: 'first', name: 'Primeiro', seasonId: 'warm' },
        { id: 'second', name: 'Segundo', seasonId: 'cool' },
      ],
      seasons: [
        { id: 'warm', name: 'Quente' },
        { id: 'cool', name: 'Fria' },
      ],
      lifeStages: [{ id: 'grown', name: 'Crescido', minAgeYears: 0 }],
      origins: [{ actorId: 'player', originDay: -7 }],
      events: [],
    });
    expect(compact.ok).toBe(true);
    if (!compact.ok) {
      return;
    }
    expect(dateFromWorldDay(compact.value, 3).cycle.id).toBe('second');
    expect(deriveActorAge(compact.value, 'player', 1).ageYears).toBe(2);
  });

  it('saltos longos geram cada fronteira uma vez e recarregar não duplica eventos', () => {
    const fromDayOne = applyCalendarAdvance(INITIAL_CALENDAR, 1, 4, createInitialCalendarState(), {});
    expect(fromDayOne.firedEventIds).toEqual(expect.arrayContaining(['cycle-watch', 'clearing-renewal']));
    expect(fromDayOne.flags['calendar.cycle-watch.kept']).toBe(true);
    expect(fromDayOne.flags['calendar.clearing-watch.renewed']).toBe(true);

    const replay = applyCalendarAdvance(INITIAL_CALENDAR, 1, 4, fromDayOne.current, fromDayOne.flags);
    expect(replay.firedEventIds).toEqual([]);
    expect(replay.current.consumedEventIds).toEqual(fromDayOne.current.consumedEventIds);

    const yearJump = applyCalendarAdvance(INITIAL_CALENDAR, 1, 13, createInitialCalendarState(), {});
    expect(yearJump.firedEventIds.filter((id) => id === 'clearing-renewal')).toHaveLength(4);
    expect(yearJump.firedEventIds).toContain('year-tenure');
    expect(listCalendarBoundaries(INITIAL_CALENDAR, 1, 13).filter((entry) => entry.type === 'year.started')).toHaveLength(1);
  });

  it('atravessar um ciclo no sandbox dispara compromisso e renovação, com idade coerente', () => {
    const crossed = restUntil(exploringState(), 4);
    expect(crossed.world.day).toBe(4);
    expect(crossed.flags['calendar.cycle-watch.kept']).toBe(true);
    expect(crossed.flags['calendar.clearing-watch.renewed']).toBe(true);
    expect(deriveActorAge(INITIAL_CALENDAR, PLAYER_CALENDAR_ACTOR_ID, crossed.world.day).ageYears).toBe(18);

    const status = buildSystemStatus(crossed);
    expect(status.calendar.ageYears).toBe(18);
    expect(status.calendar.stageName).toBe('Maioridade');
    expect(status.calendar.upcoming.some((entry) => entry.id === 'cycle-watch')).toBe(false);
    expect(JSON.stringify(status)).not.toContain('-215');

    const raw = serializeGameState(crossed);
    expect(raw).not.toContain('Contagem do Reset');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.calendar).toEqual(crossed.calendar);
      expect(loaded.state.flags['calendar.cycle-watch.kept']).toBe(true);
    }

    const restAgain = executeSandboxAction(
      loaded.status === 'ok' ? { ...loaded.state, narrativeSession: null } : crossed,
      { type: 'needs.rest', mode: 'simple' },
    ).current;
    expect(restAgain.flags['calendar.cycle-watch.kept']).toBe(true);
    const watchKeys = restAgain.calendar.consumedEventIds.filter((id) => id === 'cycle-watch' || id.startsWith('cycle-watch:'));
    expect(watchKeys).toHaveLength(1);
  });

  it('persiste calendário no schema 19 e migra v17 sem consumir eventos', () => {
    const state = exploringState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.calendar).toEqual({ consumedEventIds: [] });
    expect(listUpcomingCalendarEvents(INITIAL_CALENDAR, 1, state.calendar).map((entry) => entry.id)).toEqual([
      'cycle-watch',
      'clearing-renewal',
      'year-tenure',
    ]);

    const migrated = parseGameState(JSON.stringify(asV17(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.calendar).toEqual({ consumedEventIds: [] });
      expect(migrated.state.party).toEqual(freshState().party);
    }

    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.calendar;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
