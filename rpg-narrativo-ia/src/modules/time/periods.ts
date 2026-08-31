export interface PeriodDefinition {
  id: string;
  label: string;
}

export const DEFAULT_PERIODS = [
  { id: 'alvorecer', label: 'Alvorecer' },
  { id: 'manha', label: 'Manhã' },
  { id: 'meio-dia', label: 'Meio-dia' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'entardecer', label: 'Entardecer' },
  { id: 'noite', label: 'Noite' },
] as const satisfies ReadonlyArray<PeriodDefinition>;

export type DefaultPeriodId = (typeof DEFAULT_PERIODS)[number]['id'];
