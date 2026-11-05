import type { CSSProperties } from 'react';
import { actionNames, variantNames, type Creature } from '../simulation/creatures';
import { forms } from '../simulation/skills';
import { bandColor } from '../simulation/bands';
import { STEP_MS } from '../simulation/dayClock';

/** A Folhim is pixel art at the map's own scale: one unit of the drawing is one pixel of the world. */
const ART = 14, PIXELS_PER_CELL = 8;
type Rect = [number, number, number, number];
const Px = ({ r, fill }: { r: Rect[]; fill: string }) => <>{r.map(([x, y, w, h]) => <rect key={`${x}:${y}`} x={x} y={y} width={w} height={h} fill={fill} />)}</>;
const INK = '#3b2a1c', BROWN = '#7a5236';

type Props = { creature: Creature; size: number; selected: boolean; leader: boolean; running: boolean; speed: number; motion: boolean; onSelect: (id: number) => void };
export function CreatureToken({ creature: c, size, selected, leader, running, speed, motion, onSelect }: Props) {
  const moving = c.moving && running && motion;
  const label = c.trueName ? `${c.trueName} (#${c.id})` : `${forms[c.form].name} ${c.id}`;
  const fur = c.variant === 'bosque' ? '#9bc277' : '#e8cc96', light = c.variant === 'bosque' ? '#c8e0a0' : '#f7e4bc';
  return <button type="button" className={`creature-token${selected ? ' creature-selected' : ''}`}
    data-moving={moving} data-awakened={c.awakenedDay !== null} data-named={!!c.trueName} data-form={c.form} data-action={c.action} data-animated={running && motion} data-facing={c.facing}
    aria-label={`${label}, ${variantNames[c.variant]}, bando ${c.bandId}, ${actionNames[c.action].toLocaleLowerCase('pt-BR')}`}
    aria-pressed={selected} title={`${c.trueName ? `${c.trueName} · ` : ''}${forms[c.form].name} #${c.id} · ${variantNames[c.variant]} · ${c.skills.length} habilidades · Bando ${c.bandId} · ${actionNames[c.action]} · Energia ${Math.round(c.energy)}`}
    style={{ left: `${(c.x + 0.5) / size * 100}%`, top: `${(c.y + 0.5) / size * 100}%`, width: `${ART / PIXELS_PER_CELL * 100 / size}%`,
      transitionDuration: running && motion ? `${Math.max(0.1, STEP_MS / 1000 / speed)}s` : '0s', '--gait': `${Math.max(0.12, 0.32 / speed)}s` } as CSSProperties}
    onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(c.id)}>
    <svg viewBox="-1 -4 14 15" shapeRendering="crispEdges" aria-hidden="true">
      <Px fill="#0000004d" r={[[1, 10, 9, 1]]} />
      {c.awakenedDay !== null && <circle className="folhim-aura" cx="6" cy="4" r="7.2" fill="none" stroke="#c9b6ff" strokeWidth="0.6" shapeRendering="auto" />}
      {c.trueName && <g className="folhim-named"><Px fill="#f0d58a" r={[[5, -4, 1, 3], [4, -3, 3, 1]]} /></g>}
      <g className="folhim-facing"><g className="folhim-body">
        <g className="folhim-tail"><Px fill={BROWN} r={[[0, 4, 2, 1], [0, 5, 1, 1]]} /></g>
        <g className="folhim-leg folhim-leg-back"><Px fill={INK} r={[[3, 8, 1, 2]]} /></g>
        <g className="folhim-leg folhim-leg-front"><Px fill={INK} r={[[7, 8, 1, 2]]} /></g>
        <Px fill={INK} r={[[1, 4, 9, 5], [2, 3, 7, 3]]} />
        <Px fill={fur} r={[[2, 5, 7, 3], [3, 4, 5, 1]]} />
        <Px fill={light} r={[[3, 7, 5, 1]]} />
        <Px fill={bandColor(c.bandId)} r={[[4, 4, 3, 1]]} />
        {c.form === 'errante' && <g className="folhim-cape"><Px fill="#7fbf5a" r={[[2, 4, 3, 2], [2, 6, 1, 1]]} /></g>}
        {c.form === 'guardiao' && <g className="folhim-ridge"><Px fill="#5b4330" r={[[3, 2, 1, 1], [5, 2, 1, 1], [7, 2, 1, 1]]} /></g>}
        <g className="folhim-head">
          <Px fill={INK} r={[[6, 1, 6, 5], [7, 0, 4, 3], [7, -3, 3, 5], [9, -2, 3, 5]]} />
          <Px fill={c.variant === 'bosque' ? '#86a964' : '#d4b27c'} r={[[8, -2, 1, 3], [10, -1, 1, 3]]} />
          <Px fill={light} r={[[7, 2, 4, 3], [8, 1, 2, 1]]} />
          {c.form === 'guardiao' && <g className="folhim-horns"><Px fill="#efe2bf" r={[[7, -1, 1, 2], [11, 0, 1, 2]]} /></g>}
          <Px fill={c.form === 'vidente' ? '#b49cff' : INK} r={[c.form === 'vidente' ? [9, 2, 1, 2] : [9, 2, 1, 1]]} />
          <Px fill={BROWN} r={[[10, 3, 1, 1]]} />
          {c.action === 'grazing' && <g className="folhim-leaf"><Px fill="#8fd05a" r={[[11, 4, 1, 2]]} /></g>}
        </g>
      </g></g>
      {leader && <Px fill="#fff2b3" r={[[1, -3, 1, 1], [0, -2, 3, 1], [1, -1, 1, 1]]} />}
      {(c.action === 'disputing' || c.action === 'fleeing') && <Px fill={c.action === 'disputing' ? '#ff9b70' : '#a9e1fb'} r={[[-1, 0, 1, 2], [-1, 3, 1, 1]]} />}
    </svg>
  </button>;
}
