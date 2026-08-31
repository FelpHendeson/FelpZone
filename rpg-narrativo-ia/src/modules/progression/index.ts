import type { ProgressionState } from '../../core/state/types';

export type { ProgressionState };

export function createInitialProgression(): ProgressionState {
  return {
    abilityIds: [],
    titleIds: [],
  };
}

export function grantAbility(progression: ProgressionState, abilityId: string): ProgressionState {
  if (progression.abilityIds.includes(abilityId)) {
    return progression;
  }

  return {
    ...progression,
    abilityIds: [...progression.abilityIds, abilityId],
  };
}

export function grantTitle(progression: ProgressionState, titleId: string): ProgressionState {
  if (progression.titleIds.includes(titleId)) {
    return progression;
  }

  return {
    ...progression,
    titleIds: [...progression.titleIds, titleId],
  };
}
