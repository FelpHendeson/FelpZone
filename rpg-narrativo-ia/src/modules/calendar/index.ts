import { CalendarError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_CALENDAR_CATALOG } from './initial-calendar';
import type {
  CalendarAdvanceResult,
  CalendarBoundary,
  CalendarBoundaryType,
  CalendarCycleDefinition,
  CalendarDate,
  CalendarEventDefinition,
  CalendarEventKind,
  CalendarFlagEffect,
  CalendarInspection,
  CalendarLifeStageDefinition,
  CalendarLifeView,
  CalendarOriginDefinition,
  CalendarSeasonDefinition,
  CalendarState,
  CalendarUpcomingView,
  IndexedCalendar,
} from './types';
import { CALENDAR_BOUNDARY_TYPES, CALENDAR_EVENT_KINDS } from './types';

export { CalendarError } from './errors';
export { INITIAL_CALENDAR_CATALOG } from './initial-calendar';
export { CALENDAR_BOUNDARY_TYPES, CALENDAR_EVENT_KINDS } from './types';
export type {
  CalendarAdvanceResult,
  CalendarBoundary,
  CalendarBoundaryType,
  CalendarCatalog,
  CalendarDate,
  CalendarEventDefinition,
  CalendarInspection,
  CalendarLifeView,
  CalendarState,
  CalendarUpcomingView,
  IndexedCalendar,
} from './types';

export const PLAYER_CALENDAR_ACTOR_ID = 'player';

export function inspectCalendarCatalog(value: unknown): CalendarInspection<IndexedCalendar> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.epochLabel) ||
    !positiveSafeInteger(value.daysPerCycle) ||
    !Array.isArray(value.cycles) ||
    value.cycles.length === 0 ||
    !Array.isArray(value.seasons) ||
    value.seasons.length === 0 ||
    !Array.isArray(value.lifeStages) ||
    value.lifeStages.length === 0 ||
    !Array.isArray(value.origins) ||
    !Array.isArray(value.events)
  ) {
    return fail('O catálogo de calendário é inválido.');
  }

  const seasons: CalendarSeasonDefinition[] = [];
  const seasonById = new Map<string, CalendarSeasonDefinition>();
  for (const entry of value.seasons) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || seasonById.has(entry.id) || !nonEmpty(entry.name)) {
      return fail('A estação do calendário é inválida.');
    }
    const season = { id: entry.id, name: entry.name };
    seasonById.set(season.id, season);
    seasons.push(season);
  }

  const cycles: CalendarCycleDefinition[] = [];
  const cycleById = new Map<string, CalendarCycleDefinition>();
  for (const entry of value.cycles) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      cycleById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.seasonId) ||
      !seasonById.has(entry.seasonId)
    ) {
      return fail('O ciclo do calendário é inválido.');
    }
    const cycle = { id: entry.id, name: entry.name, seasonId: entry.seasonId };
    cycleById.set(cycle.id, cycle);
    cycles.push(cycle);
  }

  const lifeStages: CalendarLifeStageDefinition[] = [];
  const stageById = new Map<string, CalendarLifeStageDefinition>();
  for (const entry of value.lifeStages) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      stageById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonNegativeSafeInteger(entry.minAgeYears) ||
      (entry.maxAgeYears !== undefined &&
        (!nonNegativeSafeInteger(entry.maxAgeYears) || (entry.maxAgeYears as number) < (entry.minAgeYears as number)))
    ) {
      return fail('O estágio de vida é inválido.');
    }
    const stage: CalendarLifeStageDefinition = {
      id: entry.id,
      name: entry.name,
      minAgeYears: entry.minAgeYears as number,
      ...(entry.maxAgeYears === undefined ? {} : { maxAgeYears: entry.maxAgeYears as number }),
    };
    stageById.set(stage.id, stage);
    lifeStages.push(stage);
  }

  const origins: CalendarOriginDefinition[] = [];
  const originByActorId = new Map<string, CalendarOriginDefinition>();
  for (const entry of value.origins) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.actorId) ||
      originByActorId.has(entry.actorId) ||
      !Number.isInteger(entry.originDay) ||
      !Number.isSafeInteger(entry.originDay)
    ) {
      return fail('A origem temporal é inválida.');
    }
    const origin = { actorId: entry.actorId, originDay: entry.originDay as number };
    originByActorId.set(origin.actorId, origin);
    origins.push(origin);
  }

  const events: CalendarEventDefinition[] = [];
  const eventById = new Map<string, CalendarEventDefinition>();
  for (const entry of value.events) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      eventById.has(entry.id) ||
      !isEventKind(entry.kind) ||
      !nonEmpty(entry.label) ||
      !nonEmpty(entry.hint) ||
      !isRecord(entry.trigger) ||
      !isBoundaryType(entry.trigger.type) ||
      typeof entry.once !== 'boolean' ||
      !Array.isArray(entry.effects)
    ) {
      return fail('O evento de calendário é inválido.');
    }
    const effects: CalendarFlagEffect[] = [];
    for (const effect of entry.effects) {
      if (
        !isRecord(effect) ||
        effect.type !== 'flag.set' ||
        !nonEmpty(effect.flag) ||
        typeof effect.value !== 'boolean'
      ) {
        return fail('O efeito de calendário é inválido.');
      }
      effects.push({ type: 'flag.set', flag: effect.flag, value: effect.value });
    }
    const event: CalendarEventDefinition = {
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      hint: entry.hint,
      trigger: { type: entry.trigger.type },
      once: entry.once,
      effects: Object.freeze(effects),
    };
    eventById.set(event.id, event);
    events.push(event);
  }

  return {
    ok: true,
    value: Object.freeze({
      id: value.id,
      name: value.name,
      epochLabel: value.epochLabel,
      daysPerCycle: value.daysPerCycle,
      daysPerYear: value.daysPerCycle * cycles.length,
      cycles: Object.freeze(cycles),
      seasons: Object.freeze(seasons),
      lifeStages: Object.freeze(lifeStages),
      origins: Object.freeze(origins),
      events: Object.freeze(events),
      cycleById: new ImmutableIndex(cycleById),
      seasonById: new ImmutableIndex(seasonById),
      stageById: new ImmutableIndex(stageById),
      originByActorId: new ImmutableIndex(originByActorId),
      eventById: new ImmutableIndex(eventById),
    }),
  };
}

export function indexCalendarCatalog(value: unknown): IndexedCalendar {
  const inspected = inspectCalendarCatalog(value);
  if (!inspected.ok) {
    throw new CalendarError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_CALENDAR = indexCalendarCatalog(INITIAL_CALENDAR_CATALOG);

export function createInitialCalendarState(): CalendarState {
  return { consumedEventIds: [] };
}

export function inspectCalendarState(value: unknown): CalendarInspection<CalendarState> {
  if (!isRecord(value) || !Array.isArray(value.consumedEventIds)) {
    return fail('O estado de calendário é inválido.');
  }
  const consumedEventIds: string[] = [];
  const seen = new Set<string>();
  for (const entry of value.consumedEventIds) {
    if (!nonEmpty(entry) || seen.has(entry)) {
      return fail('O estado de calendário é inválido.');
    }
    seen.add(entry);
    consumedEventIds.push(entry);
  }
  return { ok: true, value: { consumedEventIds } };
}

export function copyCalendarState(state: CalendarState): CalendarState {
  return { consumedEventIds: [...state.consumedEventIds] };
}

export function dateFromWorldDay(catalog: IndexedCalendar, worldDay: number): CalendarDate {
  if (!Number.isInteger(worldDay) || !Number.isSafeInteger(worldDay)) {
    throw new CalendarError('O dia do mundo é inválido.');
  }
  const daysPerYear = catalog.daysPerYear;
  const zeroBased = worldDay - 1;
  const yearOffset = Math.floor(divFloor(zeroBased, daysPerYear));
  const year = yearOffset + 1;
  let dayOfYear = zeroBased - yearOffset * daysPerYear;
  if (dayOfYear < 0) {
    dayOfYear += daysPerYear;
  }
  const cycleIndex = Math.floor(dayOfYear / catalog.daysPerCycle);
  const dayInCycle = (dayOfYear % catalog.daysPerCycle) + 1;
  const cycle = catalog.cycles[cycleIndex];
  if (!cycle) {
    throw new CalendarError('O ciclo do calendário é inválido.');
  }
  const season = catalog.seasonById.get(cycle.seasonId);
  if (!season) {
    throw new CalendarError('A estação do calendário é inválida.');
  }
  return { worldDay, year, cycleIndex, cycle, dayInCycle, season };
}

export function describeCalendarDate(catalog: IndexedCalendar, worldDay: number): string {
  const date = dateFromWorldDay(catalog, worldDay);
  return `${date.cycle.name} ${date.dayInCycle}, ano ${date.year} ${catalog.epochLabel}`;
}

export function deriveActorAge(catalog: IndexedCalendar, actorId: string, worldDay: number): CalendarLifeView {
  const origin = catalog.originByActorId.get(actorId);
  if (!origin) {
    throw new CalendarError('A origem temporal do ator não existe.');
  }
  const elapsed = worldDay - origin.originDay;
  if (elapsed < 0) {
    throw new CalendarError('A idade derivada é inválida.');
  }
  const ageYears = Math.floor(elapsed / catalog.daysPerYear);
  const stage = resolveLifeStage(catalog, ageYears);
  return {
    actorId,
    ageYears,
    stageId: stage.id,
    stageName: stage.name,
  };
}

export function listCalendarBoundaries(
  catalog: IndexedCalendar,
  fromDay: number,
  toDay: number,
): CalendarBoundary[] {
  if (!Number.isInteger(fromDay) || !Number.isInteger(toDay) || toDay < fromDay) {
    throw new CalendarError('O intervalo de calendário é inválido.');
  }
  const boundaries: CalendarBoundary[] = [];
  for (let day = fromDay + 1; day <= toDay; day += 1) {
    const previous = dateFromWorldDay(catalog, day - 1);
    const current = dateFromWorldDay(catalog, day);
    boundaries.push({ type: 'day.started', date: current });
    if (current.cycle.id !== previous.cycle.id || current.year !== previous.year) {
      boundaries.push({ type: 'cycle.started', date: current });
    }
    if (current.season.id !== previous.season.id || current.year !== previous.year) {
      boundaries.push({ type: 'season.started', date: current });
    }
    if (current.year !== previous.year) {
      boundaries.push({ type: 'year.started', date: current });
    }
  }
  return boundaries;
}

export function applyCalendarAdvance(
  catalog: IndexedCalendar,
  fromDay: number,
  toDay: number,
  state: CalendarState,
  flags: Record<string, boolean>,
): CalendarAdvanceResult {
  const previous = copyCalendarState(state);
  const consumed = new Set(previous.consumedEventIds);
  const nextFlags = { ...flags };
  const firedEventIds: string[] = [];

  for (const boundary of listCalendarBoundaries(catalog, fromDay, toDay)) {
    for (const event of catalog.events) {
      if (event.trigger.type !== boundary.type) {
        continue;
      }
      const occurrenceId = occurrenceKey(event, boundary);
      if (consumed.has(occurrenceId)) {
        continue;
      }
      consumed.add(occurrenceId);
      firedEventIds.push(event.id);
      for (const effect of event.effects) {
        nextFlags[effect.flag] = effect.value;
      }
    }
  }

  return {
    previous,
    current: { consumedEventIds: [...consumed] },
    firedEventIds,
    flags: nextFlags,
  };
}

export function listUpcomingCalendarEvents(
  catalog: IndexedCalendar,
  worldDay: number,
  state: CalendarState,
  limit = 3,
): CalendarUpcomingView[] {
  const consumed = new Set(state.consumedEventIds);
  const date = dateFromWorldDay(catalog, worldDay);
  const upcoming: CalendarUpcomingView[] = [];

  for (const event of catalog.events) {
    if (event.once && consumed.has(event.id)) {
      continue;
    }
    const due = describeDue(catalog, date, event.trigger.type);
    upcoming.push({
      id: event.id,
      kind: event.kind,
      label: event.label,
      hint: event.hint,
      dueLabel: due,
    });
  }

  return upcoming.slice(0, Math.max(0, limit));
}

function describeDue(catalog: IndexedCalendar, date: CalendarDate, type: CalendarBoundaryType): string {
  if (type === 'day.started') {
    return 'No próximo dia';
  }
  if (type === 'cycle.started') {
    const remaining = catalog.daysPerCycle - date.dayInCycle + 1;
    return remaining === 1 ? 'Na próxima virada de ciclo' : `Em ${remaining} dias, na virada de ciclo`;
  }
  if (type === 'season.started') {
    return 'Na próxima estação';
  }
  return 'Na próxima virada de ano';
}

function occurrenceKey(event: CalendarEventDefinition, boundary: CalendarBoundary): string {
  if (event.once) {
    return event.id;
  }
  const date = boundary.date;
  if (boundary.type === 'day.started') {
    return `${event.id}:y${date.year}:c${date.cycle.id}:d${date.dayInCycle}`;
  }
  if (boundary.type === 'cycle.started') {
    return `${event.id}:y${date.year}:c${date.cycle.id}`;
  }
  if (boundary.type === 'season.started') {
    return `${event.id}:y${date.year}:s${date.season.id}`;
  }
  return `${event.id}:y${date.year}`;
}

function resolveLifeStage(catalog: IndexedCalendar, ageYears: number): CalendarLifeStageDefinition {
  const matches = catalog.lifeStages.filter((stage) => {
    if (ageYears < stage.minAgeYears) {
      return false;
    }
    return stage.maxAgeYears === undefined || ageYears <= stage.maxAgeYears;
  });
  const stage = matches.sort((left, right) => right.minAgeYears - left.minAgeYears)[0];
  if (!stage) {
    throw new CalendarError('O estágio de vida não cobre a idade derivada.');
  }
  return stage;
}

function divFloor(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isSafeInteger(value) && value >= 1;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isSafeInteger(value) && value >= 0;
}

function isBoundaryType(value: unknown): value is CalendarBoundaryType {
  return typeof value === 'string' && (CALENDAR_BOUNDARY_TYPES as readonly string[]).includes(value);
}

function isEventKind(value: unknown): value is CalendarEventKind {
  return typeof value === 'string' && (CALENDAR_EVENT_KINDS as readonly string[]).includes(value);
}
