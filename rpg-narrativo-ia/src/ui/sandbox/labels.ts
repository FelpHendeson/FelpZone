import type { IndexedExploration } from '../../modules/exploration';
import type { IndexedItems } from '../../modules/items';
import labels from '../../../content/first-day/ui/labels.json' with { type: 'json' };

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

export function formatPeriodCost(periods: number): string {
  return periods === 1 ? '1 período' : `${periods} períodos`;
}
