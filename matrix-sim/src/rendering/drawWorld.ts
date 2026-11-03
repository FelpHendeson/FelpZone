import { terrainInfo, type Cell, type World } from '../simulation/world';
import { drawLandscape, LANDSCAPE_CELL } from './landscape';
import type { DrawingContext, Surface } from './surface';
import { precipitationNames } from '../simulation/regionalWeather';
export type Layer = 'terrain' | 'elevation' | 'food' | 'moisture' | 'fertility' | 'vegetation' | 'weather';
export const weatherLegend = [
  { name: 'Chuva', color: '#609db6' }, { name: 'Neve', color: '#dce8e5' },
  { name: 'Sem precipitação · 0–6 dias', color: '#a9ad83' }, { name: '7–13 dias secos', color: '#c2a56d' },
  { name: '14–27 dias secos', color: '#b47d52' }, { name: '28+ dias secos', color: '#88523f' },
];
export function weatherColor(cell: Cell) {
  const index = cell.precipitation === 'rain' ? 0 : cell.precipitation === 'snow' ? 1 : cell.dryDays >= 28 ? 5 : cell.dryDays >= 14 ? 4 : cell.dryDays >= 7 ? 3 : 2;
  return weatherLegend[index].color;
}
export const layerInfo: Record<Layer, { name: string; description: string; min: string; max: string }> = {
  terrain: { name: 'Terreno', description: 'Paisagem com relevo, margens e vegetação. As copas mostram árvores, os pequenos grupos mostram arbustos e os pontos dourados indicam frutos. Amplie para ver os detalhes.', min: '', max: '' },
  elevation: { name: 'Altitude', description: 'Altura relativa do terreno, incluindo o fundo dos corpos d’água. Não representa metros.', min: '0% · Baixo', max: '100% · Alto' },
  moisture: { name: 'Umidade', description: 'Água disponível no solo: a chuva e a proximidade da água aumentam este valor.', min: '0% · Seco', max: '100% · Úmido' },
  fertility: { name: 'Fertilidade', description: 'Condição do solo para sustentar o crescimento da vegetação.', min: '0% · Pobre', max: '100% · Fértil' },
  vegetation: { name: 'Vegetação', description: 'Soma da biomassa de cobertura rasteira, arbustos e árvores. Não é uma contagem de plantas.', min: '0 · Sem cobertura', max: '215 · Densa' },
  food: { name: 'Alimento', description: 'Folhas, sementes e frutos disponíveis em cada região, em unidades de alimento.', min: '0 un. · Ausente', max: '100 un. · Abundante' },
  weather: { name: 'Clima', description: 'Onde há chuva ou neve hoje e há quanto tempo cada região está sem precipitação. Um período seco não significa necessariamente solo seco: água próxima também sustenta a umidade.', min: '', max: '' },
};
export function scaleColor(layer: Layer, ratio: number) {
  const value = Math.max(0, Math.min(1, ratio));
  if (layer === 'elevation') return `hsl(190 12% ${15 + value * 73}%)`;
  if (layer === 'moisture') return `hsl(200 ${20 + value * 45}% ${18 + value * 52}%)`;
  if (layer === 'fertility') return `hsl(${25 + value * 60} 35% ${18 + value * 45}%)`;
  if (layer === 'vegetation') return `hsl(${45 + value * 90} 35% ${20 + value * 35}%)`;
  return `hsl(${40 + value * 100} 38% ${22 + value * 35}%)`;
}
export function vegetationTotal(cell: Cell) { return cell.vegetation.grass + cell.vegetation.shrubs + cell.vegetation.trees; }
export function layerValue(cell: Cell, layer: Layer): string {
  if (layer === 'terrain') return terrainInfo[cell.terrain].name;
  if (layer === 'weather') return `${precipitationNames[cell.precipitation]} · ${cell.dryDays} dias sem precipitação`;
  if (layer !== 'elevation' && cell.terrain === 'water') return 'Água · sem solo ou vegetação';
  if (layer === 'food') return `${cell.food} un. de alimento`;
  if (layer === 'vegetation') return `${vegetationTotal(cell).toFixed(1)} un. de biomassa`;
  const value = layer === 'elevation' ? cell.elevation : layer === 'moisture' ? cell.moisture : cell.fertility;
  return `${Math.round(value * 100)}% de ${layerInfo[layer].name.toLocaleLowerCase('pt-BR')}`;
}
export const CELL_SIZE = LANDSCAPE_CELL;
export function drawWorld(canvas: Surface, world: World, layer: Layer, resolution = CELL_SIZE) {
  if (canvas.width !== world.size * resolution) canvas.width = world.size * resolution;
  if (canvas.height !== world.size * resolution) canvas.height = world.size * resolution;
  const ctx = canvas.getContext('2d') as DrawingContext | null;
  if (!ctx) throw new Error('Não foi possível desenhar o mundo.');
  ctx.setTransform(resolution / CELL_SIZE, 0, 0, resolution / CELL_SIZE, 0, 0);
  ctx.clearRect(0, 0, world.size * CELL_SIZE, world.size * CELL_SIZE);
  if (layer === 'terrain') drawLandscape(ctx, world);
  else for (const cell of world.cells) {
    if (layer === 'weather') ctx.fillStyle = weatherColor(cell);
    else if (layer === 'elevation') ctx.fillStyle = scaleColor(layer, cell.elevation);
    else if (cell.terrain === 'water') ctx.fillStyle = '#243f50';
    else if (layer === 'moisture') ctx.fillStyle = scaleColor(layer, cell.moisture);
    else if (layer === 'fertility') ctx.fillStyle = scaleColor(layer, cell.fertility);
    else if (layer === 'vegetation') ctx.fillStyle = scaleColor(layer, vegetationTotal(cell) / 215);
    else ctx.fillStyle = scaleColor(layer, cell.food / 100);
    const x = cell.x * CELL_SIZE, y = cell.y * CELL_SIZE;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
  }
}
