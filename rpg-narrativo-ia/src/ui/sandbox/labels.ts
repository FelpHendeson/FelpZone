import type { IndexedExploration } from '../../modules/exploration';
import type { IndexedItems } from '../../modules/items';
import labels from '../../../content/first-day/ui/labels.json' with { type: 'json' };
import { worldTriggerConsumedFlag } from '../../modules/world-events';
import type { DayPeriod } from '../../core/state';
import { describeCost, getClockContext } from '../clock';

export function sandboxItemName(itemId: string, items?: IndexedItems): string {
  if (typeof itemId !== 'string' || itemId.trim() === '') {
    return itemId;
  }

  return items?.byId.get(itemId)?.name ?? itemId;
}

export function sandboxDiscoveryName(discoveryId: string, exploration?: IndexedExploration): string {
  if (typeof discoveryId !== 'string' || discoveryId.trim() === '') {
    return discoveryId;
  }

  return exploration?.byDiscovery.get(discoveryId)?.name ?? discoveryId;
}

export function sandboxStationName(tag: string, stations: Readonly<Record<string, string>> = labels.stations): string {
  if (typeof tag !== 'string' || tag.trim() === '') {
    return tag;
  }

  return stations[tag] ?? tag;
}

/** Custo de uma ação mostrado em horas a partir do período atual ("4 h · até 11:00"). */
export function formatPeriodCost(periods: number, from?: DayPeriod): string {
  const context = getClockContext();
  const period = from ?? context.period;
  if (period) return describeCost(periods, period, context.format);
  if (periods <= 0) return 'alguns minutos';
  return periods === 1 ? '1 período' : `${periods} períodos`;
}

export interface ChapterLabel {
  number: number;
  title: string;
}

interface ChapterEntry extends ChapterLabel {
  triggerId?: string;
}

const CHAPTERS: readonly ChapterEntry[] = (Array.isArray((labels as { chapters?: unknown }).chapters)
  ? ((labels as { chapters: unknown[] }).chapters as ChapterEntry[])
  : []
).filter((entry) => Number.isSafeInteger(entry.number) && typeof entry.title === 'string' && entry.title.trim() !== '');

/** Capítulo atual: o de maior número cujo gatilho de abertura já disparou (o primeiro não tem gatilho). */
export function currentChapter(flags: Readonly<Record<string, boolean>>, chapters: readonly ChapterEntry[] = CHAPTERS): ChapterLabel | null {
  let current: ChapterEntry | undefined;
  for (const entry of chapters) {
    const opened = entry.triggerId === undefined || flags[worldTriggerConsumedFlag(entry.triggerId)] === true;
    if (opened && (!current || entry.number > current.number)) current = entry;
  }
  return current ? { number: current.number, title: current.title } : null;
}
