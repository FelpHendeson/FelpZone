export class TrainingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TrainingError';
  }
}
