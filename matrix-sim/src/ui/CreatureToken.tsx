import type { CSSProperties } from 'react';
import { actionNames, variantNames, type Creature } from '../simulation/creatures';
import { forms } from '../simulation/skills';
import { bandColor } from '../simulation/bands';
import { STEP_MS } from '../simulation/dayClock';

type Props = { creature: Creature; size: number; selected: boolean; leader: boolean; running: boolean; speed: number; motion: boolean; onSelect: (id: number) => void };
export function CreatureToken({ creature: c, size, selected, leader, running, speed, motion, onSelect }: Props) {
  const moving = c.moving && running && motion;
  return <button type="button" className={`creature-token${selected ? ' creature-selected' : ''}`}
    data-moving={moving} data-awakened={c.awakenedDay !== null} data-form={c.form} data-action={c.action} data-animated={running && motion} data-facing={c.facing}
    aria-label={`${forms[c.form].name} ${c.id}, ${variantNames[c.variant]}, bando ${c.bandId}, ${actionNames[c.action].toLocaleLowerCase('pt-BR')}`}
    aria-pressed={selected} title={`${forms[c.form].name} #${c.id} · ${variantNames[c.variant]} · ${c.skills.length} habilidades · Bando ${c.bandId} · ${actionNames[c.action]} · Energia ${Math.round(c.energy)}`}
    style={{ left: `${(c.x + 0.5) / size * 100}%`, top: `${(c.y + 0.5) / size * 100}%`, width: `${100 / size}%`,
      transitionDuration: running && motion ? `${Math.max(0.1, STEP_MS / 1000 / speed)}s` : '0s', '--gait': `${Math.max(0.12, 0.32 / speed)}s` } as CSSProperties}
    onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(c.id)}>
    <svg viewBox="0 -5 36 39" aria-hidden="true">
      <ellipse cx="17" cy="26" rx="12" ry="3.5" fill="#152b3255" />
      {c.awakenedDay !== null && <circle className="folhim-aura" cx="18" cy="16" r="15" fill="none" stroke="#c9b6ff" strokeWidth="1.5" />}
      <g className="folhim-facing"><g className="folhim-body">
        <path className="folhim-tail" d="M8 21Q0 22 3 15" fill="none" stroke="#6c5039" strokeWidth="2" />
        <path className="folhim-leg folhim-leg-back" d="M11 21l-2 5h5" fill="none" stroke="#685e43" strokeWidth="2.5" strokeLinecap="round" />
        <path className="folhim-leg folhim-leg-front" d="M23 21l-1 5h5" fill="none" stroke="#685e43" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="17" cy="18" rx="11" ry="7" fill={c.variant === 'bosque' ? '#9bac79' : '#ead3a5'} stroke="#6c5039" strokeWidth="1.2" />
        <path d="M12 14q4-3 7 0" fill="none" stroke={bandColor(c.bandId)} strokeWidth="3.5" strokeLinecap="round" />
        {c.form === "errante" && <path className="folhim-cape" d="M7 17q3-8 12-7q-4 3-5 9Z" fill="#8fc46a" stroke="#4a713c" strokeWidth="0.8" />}
        {c.form === "guardiao" && <path className="folhim-ridge" d="M8 15l2-3 2 2 2-4 2 3 2-4 2 3 2-3" fill="none" stroke="#5b4330" strokeWidth="1.6" strokeLinejoin="round" />}
        <g className="folhim-head">
          <ellipse cx="25" cy="7" rx="3" ry="6" fill="#c4aa7a" transform="rotate(20 25 7)" />
          <ellipse cx="20" cy="7" rx="2.5" ry="5" fill={c.variant === 'bosque' ? '#c4d3a0' : '#f0dbb6'} transform="rotate(-15 20 7)" />
          <circle cx="26" cy="14" r="6" fill={c.variant === 'bosque' ? '#c4d3a0' : '#f0dbb6'} />
          {c.form === "guardiao" && <path className="folhim-horns" d="M23 3l-1-4M29 5l3-3" fill="none" stroke="#5b4330" strokeWidth="2" strokeLinecap="round" />}
          <circle cx="27" cy="13" r={c.form === "vidente" ? 2 : 1.3} fill={c.form === "vidente" ? "#c9b6ff" : "#263b35"} /><circle cx="32" cy="16" r="1.2" fill="#6c5039" />
          {c.action === 'grazing' && <path className="folhim-leaf" d="M29 21l6-4-2 7Z" fill="#a8d36b" stroke="#4a713c" strokeWidth="0.7" />}
        </g>
      </g></g>
      {leader && <path d="M9-4l4 4-4 4-4-4Z" fill="#fff2b3" stroke="#43513b" strokeWidth="1" />}
      {(c.action === 'disputing' || c.action === 'fleeing') && <path d="M3 2v5m0 3v1" stroke={c.action === 'disputing' ? '#ff9b70' : '#a9e1fb'} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  </button>;
}
