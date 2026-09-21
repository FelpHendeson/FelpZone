export const GUIDANCE_CATEGORIES = [
  'system',
  'world',
  'survival',
  'progression',
  'social',
  'society',
] as const;

export type GuidanceCategory = (typeof GUIDANCE_CATEGORIES)[number];

export interface GuidanceTopicDefinition {
  id: string;
  title: string;
  summary: string;
  body: string[];
  category: GuidanceCategory;
  popupOnUnlock?: boolean;
}

export interface IndexedGuidance {
  topics: readonly GuidanceTopicDefinition[];
  byId: ReadonlyMap<string, GuidanceTopicDefinition>;
}

export interface GuidanceState {
  unlockedTopicIds: string[];
  seenTopicIds: string[];
}

export type GuidanceCatalogInspection =
  | { ok: true; value: IndexedGuidance }
  | { ok: false; reason: string };

export type GuidanceStateInspection =
  | { ok: true; value: GuidanceState }
  | { ok: false; reason: string };
