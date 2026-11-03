import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { climateAt, createWorld, describeDay, weatherDescription, terrainInfo, type Terrain } from './simulation/world';
import { climateZoneNames, precipitationNames } from './simulation/regionalWeather';
import { useSimulation } from './simulation/useSimulation';
import { useDayClock } from './simulation/useDayClock';
import { NORMAL_DAY_MS, SPEEDS, TICKS_PER_DAY } from './simulation/dayClock';
import { WorldMap } from './ui/WorldMap';
import { LifePanel } from './ui/LifePanel';
import { populateWorld } from './simulation/creatures';
import './style.css';

function App() {
  const { world, replaceWorld, advance, busy, error } = useSimulation();
  const [seed, setSeed] = useState('origem-001');
  const [water, setWater] = useState(40);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedCreature, setSelectedCreature] = useState<number | null>(null);
  const [selected, setSelected] = useState(48 * 96 + 48);
  const [message, setMessage] = useState('Mundo criado. Selecione uma região para explorar.');
  const { progress, reset: resetClock } = useDayClock(running && !error, speed, advance);
  useEffect(() => { if (error) setRunning(false); }, [error]);
  useEffect(() => {
    const creature = world.life.creatures.find(c => c.id === selectedCreature);
    if (creature) setSelected(creature.y * world.size + creature.x);
  }, [world.life.creatures, world.size, selectedCreature]);
  function selectCreature(id: number) { setSelectedCreature(id); const creature = world.life.creatures.find(c => c.id === id); if (creature) setSelected(creature.y * world.size + creature.x); }
  const climate = climateAt(world.seed, world.day);
  const cell = world.cells[selected];
  const counts = world.cells.reduce((all, cell) => { all[cell.terrain]++; return all; }, { water: 0, sand: 0, grass: 0, forest: 0, mountain: 0 });
  const food = world.cells.reduce((sum, cell) => sum + cell.food, 0);
  function generate(nextSeed: string) {
    try { const next = populateWorld(createWorld(nextSeed, 96, water / 100)); setRunning(false); setSelectedCreature(null); resetClock(); replaceWorld(next); setSeed(nextSeed); setMessage(`Mundo gerado com a semente ${nextSeed}. O tempo está pausado.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o mundo.'); }
  }
  function exportWorld() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(world)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'matrix-sim-mundo.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Mundo exportado em JSON.');
  }
  return <div className="app">
    <header><a className="brand" href="./"><span className="brand-symbol">◈</span> Matrix Sim</a><span className="phase">Experimento 01 <span>/</span> Gênese</span><span className="status"><i /> Mundo disponível</span></header>
    <main>
      <div className="intro"><div><p className="eyebrow">Laboratório de mundos</p><h1>O mundo começa<br />a se transformar.</h1><p>A chuva nutre o solo. A vegetação cresce e produz alimento.<br className="desktop" /> Acompanhe a primeira espécie explorando o território.</p></div><div className="world-stamp"><span>{climate.season} / Ano {climate.year}</span><strong>Dia {world.day}</strong><span>{world.cells.length.toLocaleString('pt-BR')} regiões conectadas</span></div></div>
      <section className="time-controls" aria-label="Passagem do tempo"><div className="clock-info"><strong>{running ? 'Mundo em evolução' : 'Tempo pausado'}</strong><span>{weatherDescription(world)} · Luz sazonal: {Math.round(climate.sunlight * 100)}%</span></div><div className="clock-actions"><button className="primary" aria-pressed={running} onClick={() => setRunning(value => !value)}>{running ? 'Pausar' : 'Iniciar tempo'}</button><button className="secondary" disabled={running || busy || !!error} onClick={() => { resetClock(); void advance(TICKS_PER_DAY - world.tick); }}>Avançar 1 dia</button><div className="speed-selector" role="group" aria-label="Velocidade da simulação">{SPEEDS.map(value => <button key={value} type="button" aria-label={`Velocidade ${value.toLocaleString('pt-BR')} vezes`} aria-pressed={speed === value} className={speed === value ? 'speed-active' : ''} onClick={() => setSpeed(value)} title={`1 dia a cada ${NORMAL_DAY_MS / 1000 / value} segundos`}>{value.toLocaleString('pt-BR')}×</button>)}</div></div></section>
      <div className="day-pacing"><span>{speed.toLocaleString('pt-BR')}× · Um dia a cada {NORMAL_DAY_MS / 1000 / speed} segundos{!running ? ' · Pausado' : ''}</span><progress ref={progress} max={1} defaultValue={0} aria-label="Progresso até o próximo dia" /><span>Próximo dia: {world.day + 1}</span></div>
      <section className="day-summary" aria-label="Resumo do ambiente"><strong>Ambiente em andamento</strong><p>{describeDay(world)}</p><details><summary>Quando cada mudança acontece</summary><p>Os Folhins decidem ao longo do dia: em 1×, há um passo a cada meio segundo, com movimento suave entre passos. Crescimento e renovação dos frutos: a cada 7 dias por região. Decomposição: a cada 14 dias. Esses eventos são distribuídos ao longo do dia; o mundo não espera a virada do calendário para agir. A vegetação só perde biomassa após 14 dias seguidos com pouca água ou frio intenso, no próximo ciclo de 14 dias. A chuva e a neve são localizadas. Frentes mudam gradualmente em ciclos de 18 dias; algumas regiões podem passar semanas secas. A umidade aumenta com a precipitação local e diminui lentamente nos períodos secos.</p><p>Em 1×, cada dia dura aproximadamente 10 segundos. A velocidade altera o ritmo do relógio; os ciclos do ambiente mantêm a mesma duração em dias.</p></details></section>
      <LifePanel world={world} selected={selectedCreature} onSelect={selectCreature} />
      <div className="workspace">
        <WorldMap world={world} running={running} speed={speed} selected={selected} onSelect={index => { setSelected(index); setSelectedCreature(null); }} selectedCreature={selectedCreature} onSelectCreature={selectCreature} />
        <aside>
          <section className="settings"><h2>Condições iniciais</h2><p>Cada semente dá origem a um território.</p><form onSubmit={e => { e.preventDefault(); generate(seed); }}><label htmlFor="seed">Semente do mundo</label><input id="seed" value={seed} maxLength={80} required onChange={e => setSeed(e.target.value)} spellCheck={false} /><div className="range-label"><label htmlFor="water">Nível da água</label><output htmlFor="water">{water}%</output></div><input id="water" type="range" min="20" max="65" value={water} onChange={e => setWater(Number(e.target.value))} /><p className="hint">Aplica-se ao gerar o mundo. A área coberta depende do relevo.</p><button className="primary" type="submit">Gerar mundo</button><button type="button" className="secondary" onClick={() => generate(`mundo-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`)}>Explorar outra semente</button></form></section>
          <section className="inspection" id="region-details" aria-label="Detalhes da região fixada"><div className="section-heading"><h2>Região fixada</h2><span>Coluna {cell.x} · Linha {cell.y}</span></div><div className="terrain-name"><i style={{ background: terrainInfo[cell.terrain].color }} /><h3>{terrainInfo[cell.terrain].name}</h3></div><p>{terrainInfo[cell.terrain].description}</p><dl><div><dt>Clima local</dt><dd>{precipitationNames[cell.precipitation]}</dd></div><div><dt>Faixa climática</dt><dd>{climateZoneNames[cell.climateZone]}</dd></div><div><dt>Sem precipitação há</dt><dd>{cell.dryDays} dias</dd></div><div><dt>Altitude relativa</dt><dd>{Math.round(cell.elevation * 100)}%</dd></div><div><dt>Temperatura</dt><dd>{cell.temperature.toFixed(1)} °C</dd></div><div><dt>Umidade</dt><dd>{Math.round(cell.moisture * 100)}%</dd></div><div><dt>Fertilidade do solo</dt><dd>{Math.round(cell.fertility * 100)}%</dd></div><div><dt>Alimento disponível</dt><dd>{cell.food} un.</dd></div></dl><h3 className="vegetation-title">Origem do alimento</h3><p className="food-explanation">Folhas e sementes vêm da cobertura rasteira e dos arbustos. Árvores e arbustos também produzem frutos.</p><dl><div><dt>Cobertura rasteira</dt><dd>{cell.vegetation.grass.toFixed(1)}</dd></div><div><dt>Arbustos</dt><dd>{cell.vegetation.shrubs.toFixed(1)}</dd></div><div><dt>Árvores</dt><dd>{cell.vegetation.trees.toFixed(1)}</dd></div><div><dt>Frutos disponíveis</dt><dd>{cell.vegetation.fruit.toFixed(1)}</dd></div><div><dt>Matéria em decomposição</dt><dd>{cell.vegetation.litter.toFixed(1)}</dd></div></dl><details className="metric-guide"><summary>Como ler estes valores</summary><p>Altitude: altura relativa, de 0 a 100%; não representa metros. Umidade: reserva de água no solo. Fertilidade: capacidade do solo de sustentar o crescimento.</p><p>Cobertura rasteira, arbustos, árvores e matéria orgânica são medidos em biomassa, não em número de plantas. O alimento combina folhas, sementes e frutos. Temperatura e clima são simplificados.</p></details></section>
          <button className="export" onClick={exportWorld}>↓ Exportar este mundo <span>JSON</span></button>
        </aside>
      </div>
      <section className="overview" aria-label="Composição do mundo"><div className="composition"><h2>O ambiente em movimento</h2><p>Solo, água e vegetação.<br />{world.life.creatures.length} Folhins vivos.</p></div><div className="biomes">{(Object.keys(terrainInfo) as Terrain[]).map(terrain => <div key={terrain}><span><i style={{ background: terrainInfo[terrain].color }} />{terrainInfo[terrain].name}</span><strong>{(counts[terrain] / world.cells.length * 100).toFixed(1)}<small>%</small></strong><div className="bar"><div style={{ width: `${counts[terrain] / world.cells.length * 100}%`, background: terrainInfo[terrain].color }} /></div></div>)}</div><div className="resource-total"><span>Alimento vegetal</span><strong>{food.toLocaleString('pt-BR')}</strong><small>unidades no território</small></div></section>
      <p className="feedback" role={error ? 'alert' : 'status'}>{error || (busy && !running ? 'Concluindo a atualização em andamento…' : message)}</p>
    </main><footer><span>Matrix Sim / Laboratório experimental</span><span>Etapa atual: primeira espécie</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
