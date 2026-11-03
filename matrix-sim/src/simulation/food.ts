import type { Vegetation } from './world';
export function edibleFood(v: Vegetation) { return v.grass * 0.2 + v.shrubs * 0.3 + v.fruit; }
export function foodFrom(v: Vegetation) { return Math.round(edibleFood(v)); }
