import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createWorld, type World } from './simulation/world';
import { useSimulation } from './simulation/useSimulation';
import { useDayClock } from './simulation/useDayClock';
import { TICKS_PER_DAY } from './simulation/dayClock';
import { buildTerritories, territoryKey } from './simulation/territories';
import { WorldMap } from './ui/WorldMap';
import { LifePanel } from './ui/LifePanel';
import { Hud } from './ui/Hud';
import { RegionPanel } from './ui/RegionPanel';
import { WorldPanel } from './ui/WorldPanel';
import { VoiceBanner, WorldVoice } from './ui/WorldVoice';
import { chronicleChanges, newAnnouncements, voiceFeed, worldGenesis, type VoiceEntry } from './ui/voiceEntries';
import { populateWorld } from './simulation/creatures';
import './style.css';
import './ui/game.css';

type Tab = 'life' | 'region' | 'world';
const tabs: { id: Tab; name: string }[] = [{ id: 'life', name: 'Habitantes' }, { id: 'region', name: 'Região' }, { id: 'world', name: 'Mundo' }];

function App() {
  const { world, replaceWorld, advance, busy, error } = useSimulation();
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedCreature, setSelectedCreature] = useState<number | null>(null);
  const [selected, setSelected] = useState(48 * 96 + 48);
  const [tab, setTab] = useState<Tab>('life');
  const [panels, setPanels] = useState({ left: true, right: true });
  const [message, setMessage] = useState('');
  const [chronicle, setChronicle] = useState<VoiceEntry[]>([]);
  const [banner, setBanner] = useState<VoiceEntry | null>(null);
  const previous = useRef<World | null>(null);
  const { progress, reset: resetClock } = useDayClock(running && !error, speed, advance);
  useEffect(() => { if (error) setRunning(false); }, [error]);
  useEffect(() => {
    const creature = world.life.creatures.find(c => c.id === selectedCreature);
    if (creature) setSelected(creature.y * world.size + creature.x);
  }, [world.life.creatures, world.size, selectedCreature]);
  // The Voice listens to every new state: life events come from the engine, seasons and extinctions are derived here.
  useEffect(() => {
    const before = previous.current;
    previous.current = world;
    const changes = before && before.seed === world.seed ? chronicleChanges(before, world) : worldGenesis(world);
    if (changes.length) setChronicle(current => [...current, ...changes].slice(-40));
    const announced = newAnnouncements(before, world, changes);
    if (announced.length) setBanner(announced.at(-1)!);
  }, [world]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(current => current === banner ? null : current), 6000);
    return () => clearTimeout(timer);
  }, [banner]);
  // Borders depend on homes and population range, not every creature's animation/energy frame.
  const territoryIdentity = territoryKey(world);
  const territories = useMemo(() => buildTerritories(world), [world.seed, world.size, world.waterLevel, territoryIdentity]);
  const feed = useMemo(() => voiceFeed(world.life.events, chronicle), [world.life.events, chronicle]);
  const living = useMemo(() => new Set(world.life.creatures.map(c => c.id)), [world.life.creatures]);
  function selectCreature(id: number) {
    setSelectedCreature(id); setTab('life'); setPanels(current => ({ ...current, left: true }));
    const creature = world.life.creatures.find(c => c.id === id);
    if (creature) setSelected(creature.y * world.size + creature.x);
  }
  function selectRegion(index: number) { setSelected(index); setSelectedCreature(null); setTab('region'); }
  function generate(nextSeed: string, water: number) {
    try {
      const next = populateWorld(createWorld(nextSeed, 96, water / 100));
      setRunning(false); setSelectedCreature(null); resetClock(); setChronicle([]); setBanner(null);
      replaceWorld(next); setMessage(`Mundo gerado com a semente ${nextSeed}. O tempo está pausado.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o mundo.'); }
  }
  function exportWorld() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(world)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'matrix-sim-mundo.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Mundo exportado em JSON.');
  }
  const status = error || (busy && !running ? 'Concluindo a atualização em andamento…' : message);
  return <div className="game" data-left={panels.left} data-right={panels.right}>
    <Hud world={world} running={running} speed={speed} canStep={!busy && !error} progress={progress}
      onToggleRunning={() => setRunning(value => !value)} onStep={() => { resetClock(); void advance(TICKS_PER_DAY - world.tick); }} onSpeed={setSpeed}
      panels={panels} onTogglePanel={side => setPanels(current => ({ ...current, [side]: !current[side] }))} />
    <div className="stage">
      {panels.left && <aside className="side-panel" id="side-panel" aria-label="Painel do mundo">
        <div className="side-tabs" role="tablist">{tabs.map(t => <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}>{t.name}</button>)}</div>
        <div className="side-content" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'life' && <LifePanel world={world} selected={selectedCreature} onSelect={selectCreature} />}
          {tab === 'region' && <RegionPanel cell={world.cells[selected]} sources={world.essenceSources} size={world.size} band={world.life.bands.find(b => b.id === territories.owners[selected])} contested={!!territories.contested[selected]} />}
          {tab === 'world' && <WorldPanel key={world.seed} world={world} onGenerate={generate} onExport={exportWorld} />}
        </div>
      </aside>}
      <main className="map-stage">
        <WorldMap world={world} territories={territories} running={running} speed={speed} selected={selected} onSelect={selectRegion} selectedCreature={selectedCreature} onSelectCreature={selectCreature} />
        {banner && <VoiceBanner key={banner.key} entry={banner} onClose={() => setBanner(null)} />}
        {status && <p className="feedback" role={error ? 'alert' : 'status'}>{status}</p>}
      </main>
      {panels.right && <aside className="voice-column" id="voice-panel"><WorldVoice entries={feed} living={living} onFollow={selectCreature} /></aside>}
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
