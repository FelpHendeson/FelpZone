import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { climateAt, terrainInfo, type Terrain, type World } from '../simulation/world';
import { layerInfo, layerValue, scaleColor, weatherLegend, type Layer } from '../rendering/drawWorld';
import { useWorldRenderer } from '../rendering/useWorldRenderer';
import { drawAtmosphere, LANDSCAPE_CELL } from '../rendering/landscape';
import './world-map.css';
import { actionNames } from '../simulation/creatures';
import { STEP_MS } from '../simulation/dayClock';

type Props = { world: World; running: boolean; speed: number; selected: number; onSelect: (index: number) => void; selectedCreature: number | null; onSelectCreature: (id: number) => void };
export function WorldMap({ world, running, speed, selected, onSelect, selectedCreature, onSelectCreature }: Props) {
  const [layer, setLayer] = useState<Layer>('terrain');
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [help, setHelp] = useState(false);
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
  const renderError = useWorldRenderer(canvas, world, layer, zoom);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { if (preference.matches) setAnimate(false); };
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
  return <section className="map-section" aria-label="Exploração do mundo">
    <div className="map-toolbar"><div><strong>Visão do mundo</strong><span>Semente: {world.seed}</span></div><label className="grid-control"><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /> Mostrar grade</label></div>
    <div className="layers" aria-label="Camadas do mapa">{(Object.keys(layerInfo) as Layer[]).map(value => <button key={value} aria-pressed={layer === value} className={layer === value ? 'active' : ''} onClick={() => { setLayer(value); setHover(null); }}>{layerInfo[value].name}</button>)}</div>
    <div className="map-legend" aria-label={`Legenda de ${layerInfo[layer].name}`}>
      <p>{layerInfo[layer].description}</p>
      {layer === 'weather' ? <div className="terrain-legend weather-legend">{weatherLegend.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div> : layer === 'terrain' ? <><div className="terrain-legend">{(Object.keys(terrainInfo) as Terrain[]).map(terrain => <span key={terrain}><i style={{ background: terrainInfo[terrain].color }} />{terrainInfo[terrain].name}</span>)}</div><div className="symbol-legend"><span><i className="tree-symbol" />Árvores</span><span><i className="shrub-symbol" />Arbustos</span><span><i className="fruit-symbol" />Frutos</span><span><i className="selection-symbol" />Região fixada</span></div></> : <><div className="legend-ramp" style={{ background: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => scaleColor(layer, i / 8)).join(', ')})` }} /><div className="legend-endpoints"><span>{layerInfo[layer].min}</span><span>{layerInfo[layer].max}</span></div>{layer !== 'elevation' && <span className="water-exclusion"><i />Água: fora da escala de solo e recursos</span>}</>}
    </div>
    {layer === 'terrain' && <div className="landscape-controls"><span>Visão naturalista <small>{climateAt(world.seed, world.day).season}</small></span><label><input type="checkbox" checked={animate} onChange={e => setAnimate(e.target.checked)} />Mostrar chuva e neve</label><p>A paisagem só muda com o estado do mundo. Chuva e neve se movem apenas com o tempo rodando.</p></div>}
    <div className="navigation-tools" aria-label="Navegação do mapa"><div className="zoom-controls"><button aria-label="Diminuir zoom" disabled={zoom === 1} onClick={() => changeZoom(zoom - 1)}>−</button><output aria-label="Zoom atual">{zoom}×</output><button aria-label="Aumentar zoom" disabled={zoom === 4} onClick={() => changeZoom(zoom + 1)}>+</button></div><button onClick={centerSelection}>Centralizar seleção</button><button onClick={() => { changeZoom(1); if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; } }}>Ver mundo inteiro</button><button aria-expanded={help} aria-controls="map-help" onClick={() => setHelp(value => !value)}>Como explorar</button></div>
    {help && <p id="map-help" className="map-help">Passe o mouse para uma prévia. Clique ou toque para fixar uma região. Com zoom, arraste o mapa ou deslize com o dedo. Com o mapa em foco: use as setas para explorar, + e − para o zoom e 0 para ver tudo.</p>}
    {renderError && <p className="map-help" role="alert">{renderError}</p>}
    <div className="map-frame" ref={frame}>
      <div className={`map-viewport${dragging ? ' is-dragging' : ''}`} ref={viewport} onScroll={() => setHover(null)}>
        <div className={`map-surface${layer === 'terrain' ? ' natural-landscape' : ''}`} style={{ width: `${zoom * 100}%` }}><canvas ref={canvas} tabIndex={0} role="img" aria-label="Mapa interativo do mundo" aria-describedby="map-instructions selected-region-summary" onPointerDown={event => {
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
          <div className="creatures-layer" aria-label="Habitantes do mundo">{world.life.creatures.map(c => <button key={c.id} type="button" className={`creature-token${selectedCreature === c.id ? ' creature-selected' : ''}`} aria-label={`Folhim ${c.id}, ${c.variant}, bando ${c.bandId}, ${actionNames[c.action].toLocaleLowerCase('pt-BR')}`} aria-pressed={selectedCreature === c.id} title={`Folhim #${c.id} · ${c.variant} · Bando ${c.bandId} · ${actionNames[c.action]} · Energia ${Math.round(c.energy)}`} style={{ left: `${(c.x + 0.5) / world.size * 100}%`, top: `${(c.y + 0.5) / world.size * 100}%`, width: `${100 / world.size}%`, transitionDuration: running ? `${Math.max(0.1, STEP_MS / 1000 / speed)}s` : '0s' }} onPointerDown={event => event.stopPropagation()} onClick={() => onSelectCreature(c.id)}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 20Q0 20 3 14" fill="none" stroke="#6c5039" strokeWidth="2" /><ellipse cx="16" cy="22" rx="11" ry="5" fill="#152b3266" /><ellipse cx="16" cy="17" rx="10" ry="7" fill={c.variant === 'bosque' ? '#9bac79' : '#ead3a5'} stroke="#6c5039" strokeWidth="1.5" /><ellipse cx="22" cy="9" rx="3" ry="6" fill="#c4aa7a" transform="rotate(20 22 9)" /><ellipse cx="17" cy="9" rx="2.5" ry="5" fill={c.variant === 'bosque' ? '#c4d3a0' : '#f0dbb6'} transform="rotate(-15 17 9)" /><circle cx="23" cy="15" r="5.5" fill={c.variant === 'bosque' ? '#c4d3a0' : '#f0dbb6'} /><circle cx="24" cy="14" r="1.2" fill="#263b35" /><circle cx="28" cy="17" r="1" fill="#6c5039" />{c.action === 'grazing' && <path d="M26 22l5-3-1 5Z" fill="#9bc15c" />}{world.life.bands.some(b => b.leaderId === c.id) && <path d="M9 0l4 4-4 4-4-4Z" fill="#fff2b3" stroke="#43513b" strokeWidth="1" />}{(c.action === 'disputing' || c.action === 'fleeing') && <circle cx="5" cy="12" r="3" fill={c.action === 'disputing' ? '#e8916d' : '#94cce0'} />}</svg></button>)}</div>
        </div>
      </div>
      <span className="north" aria-hidden="true">N ↑</span>
      {hover && <div className="map-tooltip" role="tooltip" style={{ left: hover.x, top: hover.y }}><strong>{terrainInfo[world.cells[hover.index].terrain].name}<span>({world.cells[hover.index].x}, {world.cells[hover.index].y})</span></strong><span>{layerValue(world.cells[hover.index], layer)}</span><small>Clique para fixar esta região</small></div>}
    </div>
    <div className="map-footer" id="map-instructions"><span>{zoom > 1 ? 'Arraste para navegar · Clique em um Folhim para acompanhá-lo' : 'Clique no terreno para inspecionar ou em um Folhim para acompanhar'}</span><span>{world.life.creatures.length} Folhins · Mapa {world.size} × {world.size}</span></div>
    <div className="selected-summary" id="selected-region-summary"><div><span className="pinned-label">Região fixada</span><strong><i style={{ background: terrainInfo[cell.terrain].color }} />{terrainInfo[cell.terrain].name} <small>({cell.x}, {cell.y})</small></strong></div><dl><div><dt>Umidade</dt><dd>{Math.round(cell.moisture * 100)}%</dd></div><div><dt>Fertilidade</dt><dd>{Math.round(cell.fertility * 100)}%</dd></div><div><dt>Alimento</dt><dd>{cell.food} un.</dd></div></dl><p>{layerValue(cell, layer)}<a href="#region-details">Abrir detalhes da região</a></p></div>
    <span className="sr-only" role="status">Região fixada: {terrainInfo[cell.terrain].name}, coluna {cell.x}, linha {cell.y}.</span>
  </section>;
}
