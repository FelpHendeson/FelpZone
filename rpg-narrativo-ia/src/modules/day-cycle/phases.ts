export const DAYLIGHT_PHASES = ['daylight', 'twilight', 'night'] as const;

export type DaylightPhase = (typeof DAYLIGHT_PHASES)[number];

export interface PeriodPhaseDefinition {
  periodId: string;
  phase: DaylightPhase;
}

export const DEFAULT_PERIOD_PHASES = [
  { periodId: 'alvorecer', phase: 'twilight' },
  { periodId: 'manha', phase: 'daylight' },
  { periodId: 'meio-dia', phase: 'daylight' },
  { periodId: 'tarde', phase: 'daylight' },
  { periodId: 'entardecer', phase: 'twilight' },
  { periodId: 'noite', phase: 'night' },
] as const satisfies ReadonlyArray<PeriodPhaseDefinition>;
