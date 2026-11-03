export const NORMAL_DAY_MS = 10_000;
export const TICKS_PER_DAY = 20;
export const STEP_MS = NORMAL_DAY_MS / TICKS_PER_DAY;
export const SPEEDS = [0.5, 1, 2, 5, 10] as const;

/** Bounded fixed steps; a slow or hidden tab never creates an unbounded backlog. */
export class DayClock {
  private remainder = 0;
  private ticks = 0;
  get progress() { return (this.ticks % TICKS_PER_DAY + this.remainder / STEP_MS) / TICKS_PER_DAY; }
  update(elapsedMs: number, speed: number) {
    if (!Number.isFinite(elapsedMs) || !Number.isFinite(speed)) return 0;
    this.remainder += Math.min(250, Math.max(0, elapsedMs)) * Math.max(0, speed);
    const steps = Math.floor((this.remainder + 1e-7) / STEP_MS);
    this.remainder = Math.max(0, this.remainder - steps * STEP_MS);
    this.ticks += steps;
    return steps;
  }
}
