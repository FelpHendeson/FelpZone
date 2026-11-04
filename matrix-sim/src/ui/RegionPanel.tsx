import { terrainInfo, type Cell } from '../simulation/world';
import { climateZoneNames, precipitationNames } from '../simulation/regionalWeather';
import { bandColor, bandProfile, type Band } from '../simulation/bands';
import type { EssenceSource } from '../simulation/essence';

type Props = { cell: Cell; band?: Band; contested: boolean; sources: EssenceSource[]; size: number };
export function RegionPanel({ cell, band, contested, sources, size }: Props) {
  const nearest = sources.map(source => ({ source, distance: Math.abs(source.index % size - cell.x) + Math.abs(Math.floor(source.index / size) - cell.y) })).sort((a, b) => a.distance - b.distance)[0];
  return <section className="inspection" id="region-details" aria-label="Detalhes da região fixada">
    <div className="section-heading"><h2>Região fixada</h2><span>Coluna {cell.x} · Linha {cell.y}</span></div>
    <div className="terrain-name"><i style={{ background: terrainInfo[cell.terrain].color }} /><h3>{terrainInfo[cell.terrain].name}</h3></div>
    <p>{terrainInfo[cell.terrain].description}</p>
    {band && <div className="territory-inspection"><i style={{ background: bandColor(band.id) }} /><strong>{band.name}</strong><span>{contested ? 'Área disputada' : 'Área de influência'} · {bandProfile(band)} · Ataque {Math.round(band.attack * 100)} · Defesa {Math.round(band.defense * 100)}</span></div>}
    <div className="essence-inspection"><div><strong>✧ Essência {Math.round(cell.essence * 100)}%</strong><span>natural {Math.round(cell.essenceBase * 100)}%</span></div><div className="essence-meter" aria-hidden="true"><span style={{ width: `${cell.essence * 100}%` }} /><i style={{ left: `${cell.essenceBase * 100}%` }} /></div>{nearest && <p>{nearest.distance === 0 ? `${nearest.source.name} aflora aqui.` : `${nearest.source.name} fica a ${nearest.distance} regiões daqui.`}</p>}</div>
    <dl><div><dt>Clima local</dt><dd>{precipitationNames[cell.precipitation]}</dd></div><div><dt>Faixa climática</dt><dd>{climateZoneNames[cell.climateZone]}</dd></div><div><dt>Sem precipitação há</dt><dd>{cell.dryDays} dias</dd></div><div><dt>Altitude relativa</dt><dd>{Math.round(cell.elevation * 100)}%</dd></div><div><dt>Temperatura</dt><dd>{cell.temperature.toFixed(1)} °C</dd></div><div><dt>Umidade</dt><dd>{Math.round(cell.moisture * 100)}%</dd></div><div><dt>Fertilidade do solo</dt><dd>{Math.round(cell.fertility * 100)}%</dd></div><div><dt>Alimento disponível</dt><dd>{cell.food} un.</dd></div></dl>
    <h3 className="vegetation-title">Origem do alimento</h3>
    <p className="food-explanation">Folhas e sementes vêm da cobertura rasteira e dos arbustos. Árvores e arbustos também produzem frutos.</p>
    <dl><div><dt>Cobertura rasteira</dt><dd>{cell.vegetation.grass.toFixed(1)}</dd></div><div><dt>Arbustos</dt><dd>{cell.vegetation.shrubs.toFixed(1)}</dd></div><div><dt>Árvores</dt><dd>{cell.vegetation.trees.toFixed(1)}</dd></div><div><dt>Frutos disponíveis</dt><dd>{cell.vegetation.fruit.toFixed(1)}</dd></div><div><dt>Matéria em decomposição</dt><dd>{cell.vegetation.litter.toFixed(1)}</dd></div></dl>
    <details className="metric-guide"><summary>Como ler estes valores</summary><p>Altitude: altura relativa, de 0 a 100%; não representa metros. Umidade: reserva de água no solo. Fertilidade: capacidade do solo de sustentar o crescimento.</p><p>Cobertura rasteira, arbustos, árvores e matéria orgânica são medidos em biomassa, não em número de plantas. O alimento combina folhas, sementes e frutos. Temperatura e clima são simplificados.</p></details>
  </section>;
}
