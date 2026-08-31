import type { HistoryEntry } from '../../core/state/types';

export type { HistoryEntry };

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function appendHistory(
  history: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  return [...history, entry];
}

export function notableHistory(history: HistoryEntry[]): HistoryEntry[] {
  return history.filter((entry) => entry.notable);
}
