import { useState } from 'react';
import { describeDay, terrainInfo, type Terrain, type World } from '../simulation/world';

type Props = { world: World; onGenerate: (seed: string, water: number) => void; onExport: () => void };
export function WorldPanel({ world, onGenerate, onExport }: Props) {
  const [seed, setSeed] = useState(world.seed);
  const [water, setWater] = useState(Math.round(world.waterLevel * 100));
  const counts = world.cells.reduce((all, cell) => { all[cell.terrain]++; return all; }, { water: 0, sand: 0, grass: 0, forest: 0, mountain: 0 });
  const food = world.cells.reduce((sum, cell) => sum + cell.food, 0);
  return <div className="world-panel">
    <section className="day-summary" aria-label="Resumo do ambiente"><strong>Ambiente em andamento</strong><p>{describeDay(world)}</p><details><summary>Quando cada mudança acontece</summary><p>Os Folhins decidem ao longo do dia: em 1×, há um passo a cada meio segundo, com movimento suave entre passos. Crescimento e renovação dos frutos: a cada 7 dias por região. Decomposição: a cada 14 dias. Esses eventos são distribuídos ao longo do dia; o mundo não espera a virada do calendário para agir. A vegetação só perde biomassa após 14 dias seguidos com pouca água ou frio intenso, no próximo ciclo de 14 dias. A chuva e a neve são localizadas. Frentes mudam gradualmente em ciclos de 18 dias; algumas regiões podem passar semanas secas. A umidade aumenta com a precipitação local e diminui lentamente nos períodos secos.</p><p>Em 1×, cada dia dura aproximadamente 10 segundos. A velocidade altera o ritmo do relógio; os ciclos do ambiente mantêm a mesma duração em dias.</p></details></section>
    <section className="composition-panel" aria-label="Composição do mundo"><h2>Composição</h2>
      <div className="biomes">{(Object.keys(terrainInfo) as Terrain[]).map(terrain => <div key={terrain}><span><i style={{ background: terrainInfo[terrain].color }} />{terrainInfo[terrain].name}</span><strong>{(counts[terrain] / world.cells.length * 100).toFixed(1)}<small>%</small></strong><div className="bar"><div style={{ width: `${counts[terrain] / world.cells.length * 100}%`, background: terrainInfo[terrain].color }} /></div></div>)}</div>
      <p className="resource-line"><span>Alimento vegetal</span><strong>{food.toLocaleString('pt-BR')}</strong> unidades</p>
    </section>
    <section className="settings"><h2>Criar outro mundo</h2><p>Cada semente dá origem a um território. Gerar substitui o mundo atual; exporte antes se quiser guardá-lo.</p>
      <form onSubmit={e => { e.preventDefault(); onGenerate(seed, water); }}><label htmlFor="seed">Semente do mundo</label><input id="seed" value={seed} maxLength={80} required onChange={e => setSeed(e.target.value)} spellCheck={false} /><div className="range-label"><label htmlFor="water">Nível da água</label><output htmlFor="water">{water}%</output></div><input id="water" type="range" min="20" max="65" value={water} onChange={e => setWater(Number(e.target.value))} /><p className="hint">Aplica-se ao gerar o mundo. A área coberta depende do relevo.</p><button className="primary" type="submit">Gerar mundo</button><button type="button" className="secondary" onClick={() => { const next = `mundo-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`; setSeed(next); onGenerate(next, water); }}>Explorar outra semente</button></form>
    </section>
    <button className="export" onClick={onExport}>↓ Exportar este mundo <span>JSON</span></button>
  </div>;
}
