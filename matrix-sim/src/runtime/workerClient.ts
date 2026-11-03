export class WorkerClient<Request, Response> {
  private nextId = 0;
  private failure: Error | null = null;
  private pending = new Map<number, { resolve: (value: Response) => void; reject: (error: Error) => void }>();
  constructor(private worker: Worker) {
    worker.onmessage = (event: MessageEvent<{ id: number; result: Response; error?: string }>) => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.result);
    };
    worker.onerror = () => this.dispose(new Error('O processamento em segundo plano foi interrompido. Recarregue a página.'));
    worker.onmessageerror = () => this.dispose(new Error('Não foi possível receber a atualização do mundo. Recarregue a página.'));
  }
  request(command: Request): Promise<Response> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      try { this.worker.postMessage({ id, command }); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
  dispose(error = new Error('Processamento encerrado.')) {
    this.failure = error; this.worker.terminate();
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
