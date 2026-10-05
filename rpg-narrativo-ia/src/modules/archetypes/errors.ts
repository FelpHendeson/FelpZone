export class ArchetypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchetypeError';
  }
}
