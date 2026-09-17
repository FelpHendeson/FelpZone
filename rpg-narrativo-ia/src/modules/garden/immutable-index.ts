import { GardenError } from './errors';

export class ImmutableIndex<K, V> implements ReadonlyMap<K, V> {
  readonly #entries: Map<K, V>;

  constructor(entries: Iterable<readonly [K, V]>) {
    this.#entries = new Map(entries);
    Object.freeze(this);
  }

  get size(): number { return this.#entries.size; }
  get(key: K): V | undefined { return this.#entries.get(key); }
  has(key: K): boolean { return this.#entries.has(key); }
  keys(): IterableIterator<K> { return this.#entries.keys(); }
  values(): IterableIterator<V> { return this.#entries.values(); }
  entries(): IterableIterator<[K, V]> { return this.#entries.entries(); }
  forEach(callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void {
    this.#entries.forEach((value, key) => callback.call(thisArg, value, key, this));
  }
  [Symbol.iterator](): IterableIterator<[K, V]> { return this.#entries.entries(); }
  get [Symbol.toStringTag](): string { return 'GardenIndex'; }
  set(key: K, value: V): never {
    void key;
    void value;
    throw new GardenError('O índice do Jardim é imutável.');
  }
  delete(key: K): never {
    void key;
    throw new GardenError('O índice do Jardim é imutável.');
  }
  clear(): never { throw new GardenError('O índice do Jardim é imutável.'); }
}
