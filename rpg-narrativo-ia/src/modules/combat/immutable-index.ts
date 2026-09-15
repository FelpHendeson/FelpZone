import { CombatError } from './errors';

export class ImmutableIndex<K, V> implements ReadonlyMap<K, V> {
  readonly #entries: Map<K, V>;

  constructor(entries: Iterable<readonly [K, V]>) {
    this.#entries = new Map(entries);
    Object.freeze(this);
  }

  get size(): number {
    return this.#entries.size;
  }

  get(key: K): V | undefined {
    return this.#entries.get(key);
  }

  has(key: K): boolean {
    return this.#entries.has(key);
  }

  keys(): IterableIterator<K> {
    return this.#entries.keys();
  }

  values(): IterableIterator<V> {
    return this.#entries.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.#entries.entries();
  }

  forEach(callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void {
    this.#entries.forEach((value, key) => callback.call(thisArg, value, key, this));
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.#entries.entries();
  }

  get [Symbol.toStringTag](): string {
    return 'CombatIndex';
  }

  set(key: K, value: V): never {
    void key;
    void value;
    throw new CombatError('O índice de combate é imutável.');
  }

  delete(key: K): never {
    void key;
    throw new CombatError('O índice de combate é imutável.');
  }

  clear(): never {
    throw new CombatError('O índice de combate é imutável.');
  }
}
