import type { IndexedExploration } from '../../modules/exploration';
import type { IndexedItems } from '../../modules/items';
import labels from '../../../content/first-day/ui/labels.json' with { type: 'json' };
import { worldTriggerConsumedFlag } from '../../modules/world-events';
import type { WorldState } from '../../core/state';
import type { TimeCost } from '../../modules/time';
import { describeCost, formatDuration, getClockContext } from '../clock';

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

/** Custo de uma ação a partir do horário atual ("30 min · até 07:30"). */
export function formatTimeCost(cost: TimeCost, from?: WorldState): string {
  const context = getClockContext();
  const world = from ?? context.world;
  if (world) return describeCost(cost, world, context.format);
  if (cost.minutes !== undefined) return formatDuration(cost.minutes);
  if (cost.periods <= 0) return 'instantâneo';
  return cost.periods === 1 ? '1 período' : `${cost.periods} períodos`;
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
