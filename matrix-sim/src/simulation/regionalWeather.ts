export type ClimateZone = 'dry' | 'temperate' | 'wet';
export type Precipitation = 'none' | 'rain' | 'snow';
export const climateZoneNames: Record<ClimateZone, string> = { dry: 'Tendência seca', temperate: 'Intermediária', wet: 'Tendência úmida' };
export const precipitationNames: Record<Precipitation, string> = { none: 'Sem precipitação', rain: 'Chuva', snow: 'Neve' };
const REGIONS = 4;
export const WEATHER_PERIOD_DAYS = 18;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => n * n * (3 - 2 * n);

function randomAt(seed: string, x: number, y: number, period: number) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  hash ^= Math.imul(x + 37, 374761393) ^ Math.imul(y + 71, 668265263) ^ Math.imul(period + 103, 1274126177);
  hash = Math.imul(hash ^ hash >>> 16, 2246822507);
  hash = Math.imul(hash ^ hash >>> 13, 3266489909);
  return ((hash ^ hash >>> 16) >>> 0) / 4294967296;
}

/** Coarse spatial fields and gradual temporal interpolation avoid per-cell weather RNG. */
export function createRegionalWeather(seed: string, size: number, day: number) {
  const period = Math.floor(day / WEATHER_PERIOD_DAYS);
  const phase = smooth(day % WEATHER_PERIOD_DAYS / WEATHER_PERIOD_DAYS);
  const season = Math.floor(day / 90) % 4;
  const makeField = (salt: string, time: number) => Array.from({ length: (REGIONS + 1) ** 2 }, (_, i) => randomAt(`${seed}:${salt}`, i % (REGIONS + 1), Math.floor(i / (REGIONS + 1)), time));
  const geography = makeField('geography', 0);
  const before = makeField('front', period), after = makeField('front', period + 1);
  const sample = (field: number[], x: number, y: number) => {
    const px = x / size * REGIONS, py = y / size * REGIONS;
    const ix = Math.floor(px), iy = Math.floor(py), fx = smooth(px - ix), fy = smooth(py - iy);
    const index = iy * (REGIONS + 1) + ix;
    return (field[index] * (1 - fx) + field[index + 1] * fx) * (1 - fy) + (field[index + REGIONS + 1] * (1 - fx) + field[index + REGIONS + 2] * fx) * fy;
  };
  return (x: number, y: number, temperature: number) => {
    const tendency = sample(geography, x, y);
    const climateZone: ClimateZone = tendency < 0.38 ? 'dry' : tendency > 0.62 ? 'wet' : 'temperate';
    const front = sample(before, x, y) * (1 - phase) + sample(after, x, y) * phase;
    const threshold = [0.5, 0.62, 0.54, 0.57][season] + (0.5 - tendency) * 0.28;
    const rainfall = front > threshold ? clamp(0.15 + (front - threshold) / 0.3) : 0;
    const precipitation: Precipitation = rainfall === 0 ? 'none' : temperature <= 0 ? 'snow' : 'rain';
    return { climateZone, rainfall, precipitation };
  };
}
