export class EnergeticsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EnergeticsError';
  }
}
