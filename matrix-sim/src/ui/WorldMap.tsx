import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { climateAt, terrainInfo, type Terrain, type World } from '../simulation/world';
import { layerInfo, layerValue, scaleColor, weatherLegend, type Layer } from '../rendering/drawWorld';
import { useWorldRenderer } from '../rendering/useWorldRenderer';
import { drawAtmosphere, LANDSCAPE_CELL } from '../rendering/landscape';
import './world-map.css';
import { bandColor, bandProfile } from '../simulation/bands';
import type { Territories } from '../simulation/territories';
import { TerritoryOverlay } from './TerritoryOverlay';
import { CreatureToken } from './CreatureToken';
import { EssenceSources } from './EssenceSources';

type Props = { world: World; territories: Territories; running: boolean; speed: number; selected: number; onSelect: (index: number) => void; selectedCreature: number | null; onSelectCreature: (id: number) => void };
export function WorldMap({ world, territories, running, speed, selected, onSelect, selectedCreature, onSelectCreature }: Props) {
  const [layer, setLayer] = useState<Layer>('terrain');
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [help, setHelp] = useState(false);
  const [territoriesOn, setTerritoriesOn] = useState(true);
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [animate, setAnimate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canvas = useRef<HTMLCanvasElement>(null);
  const atmosphere = useRef<HTMLCanvasElement>(null);
  const atmosphereWorld = useRef(world);
  useEffect(() => { atmosphereWorld.current = world; }, [world]);
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const centerNext = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const cell = world.cells[selected];
  const territoriesVisible = territoriesOn && layer === 'terrain';
  const selectedBand = world.life.bands.find(b => b.id === (world.life.creatures.find(c => c.id === selectedCreature)?.bandId ?? territories.owners[selected]));
  const [legendOpen, setLegendOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const zoomAnchor = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null);
  const wheelDelta = useRef(0);
  const renderError = useWorldRenderer(canvas, world, layer, zoom);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { if (preference.matches) { setAnimate(false); setMotion(false); } };
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const overlay = atmosphere.current;
    if (!overlay) return;
    // Weather does not need the resolution of the detailed, cached landscape.
    // A smaller overlay avoids repainting millions of pixels for precipitation.
    overlay.width = overlay.height = world.size * LANDSCAPE_CELL / 3;
    const ctx = overlay.getContext('2d');
    if (!ctx || layer !== 'terrain' || !running || !animate) return;
    ctx.scale(1 / 3, 1 / 3);
    let frameId = 0, last = 0, visible = true;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    observer.observe(overlay);
    function frame(now: number) {
      if (visible && !document.hidden && now - last > 100) { drawAtmosphere(ctx!, atmosphereWorld.current, now / 1000); last = now; }
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(frameId); observer.disconnect(); };
  }, [world.seed, world.size, world.waterLevel, layer, animate, running]);
  function centerSelection() {
    const view = viewport.current, map = canvas.current;
    if (!view || !map) return;
    view.scrollLeft = (cell.x + 0.5) / world.size * map.clientWidth - view.clientWidth / 2;
    view.scrollTop = (cell.y + 0.5) / world.size * map.clientHeight - view.clientHeight / 2;
  }
  useEffect(() => {
    if (centerNext.current) { centerSelection(); centerNext.current = false; }
  }, [zoom, selected]);
  useEffect(() => {
    if (selectedCreature === null) return;
    centerNext.current = true;
    setZoom(current => Math.max(2, current));
  }, [selectedCreature]);
  useEffect(() => {
    if (selectedCreature !== null) centerSelection();
  }, [selectedCreature, selected, zoom]);
  function changeZoom(value: number) { centerNext.current = true; setHover(null); setZoom(Math.max(1, Math.min(4, value))); }
  // Wheel zoom keeps the point under the cursor in place. React wheel listeners are passive, so this one is native.
  useEffect(() => {
    const view = viewport.current;
    if (!view) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      wheelDelta.current += event.deltaY;
      if (Math.abs(wheelDelta.current) < 50) return;
      const step = wheelDelta.current < 0 ? 1 : -1;
      wheelDelta.current = 0;
      const rect = view.getBoundingClientRect(), px = event.clientX - rect.left, py = event.clientY - rect.top;
      zoomAnchor.current = { fx: (view.scrollLeft + px) / view.scrollWidth, fy: (view.scrollTop + py) / view.scrollHeight, px, py };
      setHover(null);
      setZoom(current => Math.max(1, Math.min(4, current + step)));
    };
    view.addEventListener('wheel', wheel, { passive: false });
    return () => view.removeEventListener('wheel', wheel);
  }, []);
  useLayoutEffect(() => {
    const view = viewport.current, anchor = zoomAnchor.current;
    if (!view || !anchor) return;
    zoomAnchor.current = null;
    view.scrollLeft = anchor.fx * view.scrollWidth - anchor.px;
    view.scrollTop = anchor.fy * view.scrollHeight - anchor.py;
  }, [zoom]);
  function indexAt(clientX: number, clientY: number) {
    const rect = canvas.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(world.size - 1, Math.floor((clientX - rect.left) / rect.width * world.size)));
    const y = Math.max(0, Math.min(world.size - 1, Math.floor((clientY - rect.top) / rect.height * world.size)));
    return y * world.size + x;
  }
  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const view = viewport.current!;
    if (drag.current && event.buttons === 1) {
      const dx = event.clientX - drag.current.x, dy = event.clientY - drag.current.y;
      if (zoom > 1 && Math.hypot(dx, dy) > 5) drag.current.moved = true;
      if (drag.current.moved) {
        view.scrollLeft = drag.current.left - dx; view.scrollTop = drag.current.top - dy;
        setDragging(true); setHover(null); return;
      }
    }
    if (event.pointerType === 'touch') return;
    const rect = frame.current!.getBoundingClientRect();
    const index = indexAt(event.clientX, event.clientY);
    setHover(previous => previous?.index === index ? previous : { index, x: Math.max(8, Math.min(rect.width - 220, event.clientX - rect.left + 16)), y: Math.max(8, Math.min(rect.height - 100, event.clientY - rect.top + 16)) });
  }
  function releasePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return;
    suppressClick.current = drag.current.moved;
    drag.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const legendBody = layer === 'weather' ? <div className="terrain-legend weather-legend">{weatherLegend.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
    : layer === 'terrain' ? <><div className="terrain-legend">{(Object.keys(terrainInfo) as Terrain[]).map(terrain => <span key={terrain}><i style={{ background: terrainInfo[terrain].color }} />{terrainInfo[terrain].name}</span>)}</div><div className="symbol-legend"><span><i className="tree-symbol" />Árvores</span><span><i className="shrub-symbol" />Arbustos</span><span><i className="fruit-symbol" />Frutos</span><span><i className="selection-symbol" />Região fixada</span></div></>
    : <><div className="legend-ramp" style={{ background: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => scaleColor(layer, i / 8)).join(', ')})` }} /><div className="legend-endpoints"><span>{layerInfo[layer].min}</span><span>{layerInfo[layer].max}</span></div>{layer !== 'elevation' && layer !== 'essence' && <span className="water-exclusion"><i />Água: fora da escala de solo e recursos</span>}</>;
  return <section className="map-section" aria-label="Exploração do mundo">
    <div className="map-frame" ref={frame}>
      <div className={`map-viewport${dragging ? ' is-dragging' : ''}`} ref={viewport} onScroll={() => setHover(null)}>
        <div className={`map-surface${layer === 'terrain' ? ' natural-landscape' : ''}`} style={{ width: `${zoom * 100}%` }}><canvas ref={canvas} tabIndex={0} role="img" aria-label="Mapa interativo do mundo" aria-describedby="map-instructions" onPointerDown={event => {
          suppressClick.current = false;
          if (event.pointerType !== 'mouse' || event.button !== 0) return;
          const view = viewport.current!;
          drag.current = { x: event.clientX, y: event.clientY, left: view.scrollLeft, top: view.scrollTop, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={pointerMove} onPointerUp={releasePointer} onPointerCancel={() => { drag.current = null; suppressClick.current = true; setDragging(false); setHover(null); }} onPointerLeave={() => setHover(null)} onClick={event => { if (suppressClick.current) { suppressClick.current = false; return; } onSelect(indexAt(event.clientX, event.clientY)); setHover(null); }} onKeyDown={event => {
          const moves: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
          const move = moves[event.key];
          if (move) { event.preventDefault(); centerNext.current = true; onSelect(Math.max(0, Math.min(world.size - 1, cell.y + move[1])) * world.size + Math.max(0, Math.min(world.size - 1, cell.x + move[0]))); }
          if (['+', '=', '-', '0'].includes(event.key)) { event.preventDefault(); changeZoom(event.key === '0' ? 1 : zoom + (event.key === '-' ? -1 : 1)); }
          if (event.key === 'Escape') setHover(null);
        }} /><canvas ref={atmosphere} className="atmosphere-canvas" aria-hidden="true" />{grid && <div className="map-grid" aria-hidden="true" style={{ backgroundSize: `${100 / world.size}% ${100 / world.size}%` }} />}<div className="map-selection" aria-hidden="true" style={{ left: `${cell.x / world.size * 100}%`, top: `${cell.y / world.size * 100}%`, width: `${100 / world.size}%`, height: `${100 / world.size}%` }} />
          {territoriesVisible && <TerritoryOverlay territories={territories} size={world.size} focused={selectedBand?.id ?? null} />}
          {territoriesVisible && <div className="territory-labels" aria-label="Nomes dos territórios">{world.life.bands.filter(b => territories.areas.has(b.id)).map(b => <button key={b.id} className="territory-name" style={{ left: `${(b.home % world.size + 0.5) / world.size * 100}%`, top: `${(Math.floor(b.home / world.size) + 0.5) / world.size * 100}%`, borderColor: bandColor(b.id), color: bandColor(b.id) }} aria-label={`Território de ${b.name}, acompanhar bando`} onPointerDown={event => event.stopPropagation()} onClick={() => b.leaderId !== null && onSelectCreature(b.leaderId)}>{b.name}</button>)}</div>}
          {(layer === 'terrain' || layer === 'essence') && <EssenceSources world={world} selected={selected} onSelect={index => { onSelect(index); setHover(null); }} />}
          <div className="creatures-layer" aria-label="Habitantes do mundo">{world.life.creatures.map(c => <CreatureToken key={c.id} creature={c} size={world.size} selected={selectedCreature === c.id} leader={world.life.bands.some(b => b.leaderId === c.id)} running={running} speed={speed} motion={motion} onSelect={onSelectCreature} />)}</div>
        </div>
      </div>
      {/* Controls float over the world so the map keeps the whole stage. */}
      <div className="map-hud map-hud-top">
        <div className="layers" role="group" aria-label="Camadas do mapa">{(Object.keys(layerInfo) as Layer[]).map(value => <button key={value} type="button" aria-pressed={layer === value} className={layer === value ? 'active' : ''} onClick={() => { setLayer(value); setHover(null); }}>{layerInfo[value].name}</button>)}</div>
        <button type="button" className={territoriesVisible ? 'map-chip active' : 'map-chip'} aria-pressed={territoriesVisible} onClick={() => { if (layer !== 'terrain') { setLayer('terrain'); setTerritoriesOn(true); } else setTerritoriesOn(value => !value); }}>⚑ Territórios</button>
      </div>
      <div className="map-hud map-hud-corner">
        <span className="north" aria-hidden="true">N ↑</span>
        <button type="button" className={optionsOpen ? 'map-chip active' : 'map-chip'} aria-expanded={optionsOpen} aria-controls="map-options" onClick={() => setOptionsOpen(value => !value)}>⚙ Opções</button>
        {optionsOpen && <div className="map-popover" id="map-options">
          <label><input type="checkbox" checked={animate} onChange={e => setAnimate(e.target.checked)} />Mostrar chuva e neve</label>
          <label><input type="checkbox" checked={motion} onChange={event => setMotion(event.target.checked)} />Animar habitantes</label>
          <label><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} />Mostrar grade</label>
          <button type="button" aria-expanded={help} aria-controls="map-help" onClick={() => setHelp(value => !value)}>Como explorar</button>
          {help && <p id="map-help">Roda do mouse aproxima e afasta. Arraste para navegar. Clique para fixar uma região ou acompanhar um Folhim. Com o mapa em foco: setas exploram, + e − mudam o zoom e 0 mostra tudo. Chuva e neve só se movem com o tempo rodando.</p>}
        </div>}
      </div>
      <div className="map-hud map-hud-legend">
        {legendOpen ? <div className="map-legend" aria-label={`Legenda de ${layerInfo[layer].name}`}>
          <div className="map-legend-title"><strong>{layerInfo[layer].name}{layer === 'terrain' && <small>{climateAt(world.seed, world.day).season}</small>}</strong><button type="button" aria-label="Ocultar legenda" aria-expanded="true" onClick={() => setLegendOpen(false)}>×</button></div>
          <p>{layerInfo[layer].description}</p>
          {legendBody}
          {territoriesVisible && <div className="territory-legend" aria-label="Legenda dos territórios"><p>Área de influência de cada bando. Listras indicam disputa. Clique para acompanhar o líder.</p><div>{world.life.bands.filter(b => territories.areas.has(b.id)).map(b => <button key={b.id} type="button" aria-pressed={selectedBand?.id === b.id} disabled={b.leaderId === null} onClick={() => b.leaderId !== null && onSelectCreature(b.leaderId)}><i style={{ background: bandColor(b.id) }} /><strong>{b.name}</strong><span>{territories.areas.get(b.id)} regiões · {bandProfile(b)}</span></button>)}</div></div>}
        </div> : <button type="button" className="map-chip" aria-expanded="false" onClick={() => setLegendOpen(true)}>☷ Legenda</button>}
      </div>
      <div className="map-hud map-hud-zoom navigation-tools" aria-label="Navegação do mapa">
        <button type="button" aria-label="Diminuir zoom" disabled={zoom === 1} onClick={() => changeZoom(zoom - 1)}>−</button><output aria-label="Zoom atual">{zoom}×</output><button type="button" aria-label="Aumentar zoom" disabled={zoom === 4} onClick={() => changeZoom(zoom + 1)}>+</button>
        <button type="button" onClick={centerSelection} title="Centralizar seleção" aria-label="Centralizar seleção">⌖</button>
        <button type="button" title="Ver mundo inteiro" aria-label="Ver mundo inteiro" onClick={() => { changeZoom(1); if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; } }}>⤢</button>
      </div>
      {renderError && <p className="map-alert" role="alert">{renderError}</p>}
      {hover && <div className="map-tooltip" role="tooltip" style={{ left: hover.x, top: hover.y }}><strong>{terrainInfo[world.cells[hover.index].terrain].name}<span>({world.cells[hover.index].x}, {world.cells[hover.index].y})</span></strong><span>{layerValue(world.cells[hover.index], layer)}</span><small>Clique para fixar esta região</small></div>}
    </div>
    <span className="sr-only" id="map-instructions">{zoom > 1 ? 'Arraste para navegar. Clique em um Folhim para acompanhá-lo.' : 'Clique no terreno para inspecionar ou em um Folhim para acompanhar.'} Mapa {world.size} por {world.size}.</span>
    <span className="sr-only" role="status">Região fixada: {terrainInfo[cell.terrain].name}, coluna {cell.x}, linha {cell.y}.</span>
  </section>;
}
