export interface PeriodDefinition {
  id: string;
  label: string;
}

/**
 * Períodos do dia em ordem a partir da meia-noite. O dia vira às 00:00 (Madrugada);
 * cada período começa no minuto declarado em `PERIOD_START_MINUTES` (`./clock`).
 */
export const DEFAULT_PERIODS = [
  { id: 'madrugada', label: 'Madrugada' },
  { id: 'alvorecer', label: 'Alvorecer' },
  { id: 'manha', label: 'Manhã' },
  { id: 'meio-dia', label: 'Meio-dia' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'entardecer', label: 'Entardecer' },
  { id: 'noite', label: 'Noite' },
] as const satisfies ReadonlyArray<PeriodDefinition>;

export type DefaultPeriodId = (typeof DEFAULT_PERIODS)[number]['id'];
