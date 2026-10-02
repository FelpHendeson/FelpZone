/** Dia em que cada capítulo (gatilho de mundo `story.chapter`) abriu — base dos prazos relativos. */
export interface StoryState {
  chapterDays: Record<string, number>;
}

export type StoryInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
