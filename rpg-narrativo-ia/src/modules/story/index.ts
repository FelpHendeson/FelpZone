import type { StoryInspection, StoryState } from './types';

export type { StoryInspection, StoryState } from './types';

const MAX_CHAPTERS = 512;

export function createInitialStoryState(): StoryState {
  return { chapterDays: {} };
}

export function copyStoryState(state: StoryState): StoryState {
  return { chapterDays: { ...state.chapterDays } };
}

export function recordChapterOpened(state: StoryState, triggerId: string, day: number): StoryState {
  if (state.chapterDays[triggerId] !== undefined) return state;
  return { chapterDays: { ...state.chapterDays, [triggerId]: day } };
}

export function inspectStoryState(value: unknown): StoryInspection<StoryState> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'O estado de capítulos do salvamento é inválido.' };
  }
  const days = (value as Record<string, unknown>).chapterDays;
  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    return { ok: false, reason: 'O estado de capítulos do salvamento é inválido.' };
  }
  const entries = Object.entries(days as Record<string, unknown>);
  if (entries.length > MAX_CHAPTERS) {
    return { ok: false, reason: 'O estado de capítulos do salvamento é inválido.' };
  }
  const chapterDays: Record<string, number> = {};
  for (const [id, day] of entries) {
    if (id.trim() === '' || typeof day !== 'number' || !Number.isSafeInteger(day) || day <= 0) {
      return { ok: false, reason: 'O estado de capítulos do salvamento é inválido.' };
    }
    chapterDays[id] = day;
  }
  return { ok: true, value: { chapterDays } };
}
