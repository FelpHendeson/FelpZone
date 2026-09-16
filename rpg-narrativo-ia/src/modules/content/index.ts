import { composeWorld } from './compose';
import { ContentError } from './errors';
import { assembleFirstDayRaw } from './first-day-bundle';
import { createJsonPackSource } from './sources';
import type { ContentSource, IndexedWorld } from './types';

export { composeSkills, composeWorld } from './compose';
export { ContentError } from './errors';
export { assembleFirstDayRaw, FIRST_DAY_SKILLS_RAW } from './first-day-bundle';
export { createJsonPackSource, createMemorySource, createRemoteSource } from './sources';
export type { ContentSource, IndexedWorld, PackFileKey } from './types';
export { PACK_FILE_KEYS } from './types';

export const FIRST_DAY_SOURCE_ID = 'json:first-day';

export function createFirstDaySource(): ContentSource {
  return createJsonPackSource(FIRST_DAY_SOURCE_ID, assembleFirstDayRaw());
}

export function loadWorld(source: ContentSource): IndexedWorld | Promise<IndexedWorld> {
  const raw = source.loadRaw();
  if (raw instanceof Promise) {
    return raw.then((value) => composeWorld(value, source.id));
  }
  return composeWorld(raw, source.id);
}

export function loadFirstDayWorld(): IndexedWorld {
  const loaded = loadWorld(createFirstDaySource());
  if (loaded instanceof Promise) {
    throw new ContentError('A fonte empacotada do primeiro dia não pode ser assíncrona.');
  }
  return loaded;
}
