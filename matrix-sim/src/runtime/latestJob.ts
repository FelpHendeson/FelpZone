/** At most one active job and one replaceable pending input. */
export class LatestJob<Input, Output> {
  private pending: { input: Input; revision: number } | null = null;
  private revision = 0;
  private active = false;
  private disposed = false;
  private latest: { input: Input; revision: number } | null = null;
  constructor(
    private run: (input: Input) => Promise<Output>,
    private publish: (output: Output) => void,
    private discard: (output: Output) => void,
    private onError: (error: unknown) => void,
    private compatible: (older: Input, newer: Input) => boolean = () => false,
  ) {}
  submit(input: Input) {
    if (this.disposed) return;
    this.pending = this.latest = { input, revision: ++this.revision };
    void this.drain();
  }
  dispose() { this.disposed = true; this.pending = null; }
  private async drain() {
    if (this.active || this.disposed || !this.pending) return;
    const job = this.pending; this.pending = null; this.active = true;
    try {
      const result = await this.run(job.input);
      if (this.disposed || (job.revision !== this.revision && !this.compatible(job.input, this.latest!.input))) this.discard(result);
      else this.publish(result);
    } catch (error) { if (!this.disposed && job.revision === this.revision) this.onError(error); }
    finally { this.active = false; void this.drain(); }
  }
}
