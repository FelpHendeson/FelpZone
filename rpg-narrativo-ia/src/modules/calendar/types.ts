export const CALENDAR_BOUNDARY_TYPES = ['day.started', 'cycle.started', 'season.started', 'year.started'] as const;
export const CALENDAR_EVENT_KINDS = ['appointment', 'renewal', 'process'] as const;

export type CalendarBoundaryType = (typeof CALENDAR_BOUNDARY_TYPES)[number];
export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export interface CalendarCycleDefinition {
  id: string;
  name: string;
  seasonId: string;
}

export interface CalendarSeasonDefinition {
  id: string;
  name: string;
}

export interface CalendarLifeStageDefinition {
  id: string;
  name: string;
  minAgeYears: number;
  maxAgeYears?: number;
}

export interface CalendarOriginDefinition {
  actorId: string;
  originDay: number;
}

export interface CalendarEventDefinition {
  id: string;
  kind: CalendarEventKind;
  label: string;
  hint: string;
  trigger: { type: CalendarBoundaryType };
  once: boolean;
  effects: readonly CalendarFlagEffect[];
}

export interface CalendarFlagEffect {
  type: 'flag.set';
  flag: string;
  value: boolean;
}

export interface CalendarCatalog {
  id: string;
  name: string;
  epochLabel: string;
  daysPerCycle: number;
  cycles: readonly CalendarCycleDefinition[];
  seasons: readonly CalendarSeasonDefinition[];
  lifeStages: readonly CalendarLifeStageDefinition[];
  origins: readonly CalendarOriginDefinition[];
  events: readonly CalendarEventDefinition[];
}

export interface IndexedCalendar {
  readonly id: string;
  readonly name: string;
  readonly epochLabel: string;
  readonly daysPerCycle: number;
  readonly daysPerYear: number;
  readonly cycles: readonly CalendarCycleDefinition[];
  readonly seasons: readonly CalendarSeasonDefinition[];
  readonly lifeStages: readonly CalendarLifeStageDefinition[];
  readonly origins: readonly CalendarOriginDefinition[];
  readonly events: readonly CalendarEventDefinition[];
  readonly cycleById: ReadonlyMap<string, CalendarCycleDefinition>;
  readonly seasonById: ReadonlyMap<string, CalendarSeasonDefinition>;
  readonly stageById: ReadonlyMap<string, CalendarLifeStageDefinition>;
  readonly originByActorId: ReadonlyMap<string, CalendarOriginDefinition>;
  readonly eventById: ReadonlyMap<string, CalendarEventDefinition>;
}

export interface CalendarState {
  consumedEventIds: string[];
}

export interface CalendarDate {
  worldDay: number;
  year: number;
  cycleIndex: number;
  cycle: CalendarCycleDefinition;
  dayInCycle: number;
  season: CalendarSeasonDefinition;
}

export interface CalendarBoundary {
  type: CalendarBoundaryType;
  date: CalendarDate;
}

export interface CalendarLifeView {
  actorId: string;
  ageYears: number;
  stageId: string;
  stageName: string;
}

export interface CalendarUpcomingView {
  id: string;
  kind: CalendarEventKind;
  label: string;
  hint: string;
  dueLabel: string;
}

export interface CalendarAdvanceResult {
  previous: CalendarState;
  current: CalendarState;
  firedEventIds: string[];
  flags: Record<string, boolean>;
}

export type CalendarInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
