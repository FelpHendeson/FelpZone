import catalogJson from '../../../content/first-day/world/weather.json' with { type: 'json' };
import type { DayPeriod, GameState } from '../../core/state/types';
import { INITIAL_CALENDAR, dateFromWorldDay, type IndexedCalendar } from '../calendar';
import { ACTION_POSES, COMBAT_RANGES, type CombatEnvironment, type CombatFieldEffect } from '../combat';
import { DEFAULT_PERIODS } from '../time';

/**
 * Clima do dia e efeitos de campo no combate. O clima não é salvo: deriva da semente da partida,
 * do dia e da estação, então é o mesmo ao recarregar e o replay do combate confere.
 */
export interface WeatherDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface FieldEffectDefinition extends CombatFieldEffect {
  when: { weather?: string[]; periods?: DayPeriod[] };
}

export interface IndexedWeather {
  readonly weathers: readonly WeatherDefinition[];
  readonly byId: ReadonlyMap<string, WeatherDefinition>;
  readonly firstDay?: string;
  readonly seasonWeights: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly fieldEffects: readonly FieldEffectDefinition[];
}

export type WeatherInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

const PERIOD_IDS = DEFAULT_PERIODS.map((entry) => entry.id) as readonly string[];

export function inspectWeatherCatalog(value: unknown): WeatherInspection<IndexedWeather> {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!isRecord(value) || !Array.isArray(value.weathers) || value.weathers.length === 0 || !Array.isArray(value.fieldEffects)) {
    return fail('O catálogo de clima é inválido.');
  }
  const weathers: WeatherDefinition[] = [];
  for (const entry of value.weathers) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.icon) || !nonEmpty(entry.description)) {
      return fail('Um clima do catálogo é inválido.');
    }
    if (weathers.some((weather) => weather.id === entry.id)) return fail('Os climas precisam ter IDs únicos.');
    weathers.push({ id: entry.id, name: entry.name, icon: entry.icon, description: entry.description });
  }
  const ids = new Set(weathers.map((weather) => weather.id));
  if (value.firstDay !== undefined && (typeof value.firstDay !== 'string' || !ids.has(value.firstDay))) {
    return fail('O clima do primeiro dia é inválido.');
  }
  if (!isRecord(value.seasonWeights)) return fail('Os pesos de clima por estação são inválidos.');
  const seasonWeights: Record<string, Record<string, number>> = {};
  for (const [season, weights] of Object.entries(value.seasonWeights)) {
    if (!isRecord(weights) || Object.keys(weights).length === 0) return fail('Os pesos de clima por estação são inválidos.');
    const entry: Record<string, number> = {};
    for (const [weatherId, weight] of Object.entries(weights)) {
      if (!ids.has(weatherId) || !Number.isSafeInteger(weight) || (weight as number) < 0 || (weight as number) > 100) {
        return fail('Os pesos de clima por estação são inválidos.');
      }
      entry[weatherId] = weight as number;
    }
    if (Object.values(entry).every((weight) => weight === 0)) return fail('Uma estação precisa de ao menos um clima possível.');
    seasonWeights[season] = entry;
  }
  const fieldEffects: FieldEffectDefinition[] = [];
  for (const entry of value.fieldEffects) {
    const effect = inspectFieldEffect(entry, ids);
    if (!effect || fieldEffects.some((existing) => existing.id === effect.id)) return fail('Um efeito de campo do clima é inválido.');
    fieldEffects.push(effect);
  }
  return {
    ok: true,
    value: Object.freeze({
      weathers: Object.freeze(weathers),
      byId: new Map(weathers.map((weather) => [weather.id, weather])),
      ...(typeof value.firstDay === 'string' ? { firstDay: value.firstDay } : {}),
      seasonWeights: Object.freeze(seasonWeights),
      fieldEffects: Object.freeze(fieldEffects),
    }),
  };
}

function inspectFieldEffect(value: unknown, weatherIds: ReadonlySet<string>): FieldEffectDefinition | undefined {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.label)) return undefined;
  if (value.side !== 'player' && value.side !== 'foes' && value.side !== 'all') return undefined;
  const when = value.when;
  if (!isRecord(when)) return undefined;
  const weather = when.weather;
  const periods = when.periods;
  if (weather === undefined && periods === undefined) return undefined;
  if (weather !== undefined && (!Array.isArray(weather) || weather.length === 0 || weather.some((id) => !weatherIds.has(id as string)))) return undefined;
  if (periods !== undefined && (!Array.isArray(periods) || periods.length === 0 || periods.some((id) => !PERIOD_IDS.includes(id as string)))) return undefined;
  const numbers: Partial<Record<'damage' | 'prepare' | 'cost' | 'speed' | 'intent', number>> = {};
  for (const key of ['damage', 'prepare', 'cost', 'speed', 'intent'] as const) {
    const amount = value[key];
    if (amount === undefined) continue;
    if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount as number) > 5) return undefined;
    numbers[key] = amount as number;
  }
  if (Object.keys(numbers).length === 0) return undefined;
  let match: CombatFieldEffect['match'];
  if (value.match !== undefined) {
    const raw = value.match;
    if (!isRecord(raw)) return undefined;
    match = {};
    if (raw.ranges !== undefined) {
      if (!Array.isArray(raw.ranges) || raw.ranges.some((range) => !(COMBAT_RANGES as readonly unknown[]).includes(range))) return undefined;
      match.ranges = [...raw.ranges] as NonNullable<CombatFieldEffect['match']>['ranges'];
    }
    if (raw.poses !== undefined) {
      if (!Array.isArray(raw.poses) || raw.poses.some((pose) => !(ACTION_POSES as readonly unknown[]).includes(pose))) return undefined;
      match.poses = [...raw.poses] as NonNullable<CombatFieldEffect['match']>['poses'];
    }
    if (raw.classification !== undefined) {
      if (raw.classification !== 'corpo' && raw.classification !== 'poder') return undefined;
      match.classification = raw.classification;
    }
  }
  return {
    id: value.id,
    label: value.label,
    side: value.side,
    when: {
      ...(weather ? { weather: [...(weather as string[])] } : {}),
      ...(periods ? { periods: [...(periods as DayPeriod[])] } : {}),
    },
    ...(match ? { match } : {}),
    ...numbers,
  };
}

export function indexWeatherCatalog(value: unknown): IndexedWeather {
  const inspected = inspectWeatherCatalog(value);
  if (!inspected.ok) throw new Error(inspected.reason);
  return inspected.value;
}

export const INITIAL_WEATHER = indexWeatherCatalog(catalogJson);

/** Clima de um dia: sorteio determinístico pela semente da partida, ponderado pela estação. */
export function weatherFor(
  catalog: IndexedWeather,
  seed: number,
  day: number,
  calendar: IndexedCalendar = INITIAL_CALENDAR,
): WeatherDefinition {
  if (day === 1 && catalog.firstDay) return catalog.byId.get(catalog.firstDay)!;
  const season = dateFromWorldDay(calendar, day).season.id;
  const weights = catalog.seasonWeights[season] ?? Object.fromEntries(catalog.weathers.map((weather) => [weather.id, 1]));
  const entries = catalog.weathers.map((weather) => [weather, weights[weather.id] ?? 0] as const).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = hash(`${seed}:${day}`) % total;
  for (const [weather, weight] of entries) {
    if (roll < weight) return weather;
    roll -= weight;
  }
  return entries[entries.length - 1]![0];
}

/** Ambiente de um confronto do mundo: clima do dia e período atual, com os efeitos que valem. */
export function combatEnvironmentFor(
  state: Pick<GameState, 'rng' | 'world'>,
  catalog: IndexedWeather = INITIAL_WEATHER,
  calendar?: IndexedCalendar,
): CombatEnvironment {
  const weather = weatherFor(catalog, state.rng.seed, state.world.day, calendar);
  const period = state.world.period;
  const periodLabel = DEFAULT_PERIODS.find((entry) => entry.id === period)?.label ?? period;
  const effects = catalog.fieldEffects
    .filter((effect) => (!effect.when.weather || effect.when.weather.includes(weather.id)) && (!effect.when.periods || effect.when.periods.includes(period)))
    .map(({ when: _when, ...effect }) => {
      void _when;
      return effect;
    });
  return { label: `${weather.name} · ${periodLabel}`, effects };
}

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
