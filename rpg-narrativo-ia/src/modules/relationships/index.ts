import type { Relationship } from '../../core/state/types';

export type { Relationship };

export const TRUST_MIN = 0;
export const TRUST_MAX = 100;

export function changeRelationship(
  relationships: Relationship[],
  characterId: string,
  amount: number,
): Relationship[] {
  const existing = relationships.find((entry) => entry.characterId === characterId);
  const nextTrust = clampTrust((existing?.trust ?? 0) + amount);

  if (!existing) {
    return [...relationships, { characterId, trust: nextTrust }];
  }

  return relationships.map((entry) =>
    entry.characterId === characterId ? { ...entry, trust: nextTrust } : entry,
  );
}

export function getTrust(relationships: Relationship[], characterId: string): number {
  return relationships.find((entry) => entry.characterId === characterId)?.trust ?? 0;
}

function clampTrust(value: number): number {
  if (Number.isNaN(value)) {
    return TRUST_MIN;
  }

  return Math.min(TRUST_MAX, Math.max(TRUST_MIN, Math.round(value)));
}
