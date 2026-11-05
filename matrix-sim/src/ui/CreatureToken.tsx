import type { CSSProperties } from 'react';
import { actionNames, variantNames, type Creature } from '../simulation/creatures';
import { forms } from '../simulation/skills';
import { bandColor } from '../simulation/bands';
import { STEP_MS } from '../simulation/dayClock';

/**
 * Folhins come from a spritesheet (src/sprites/folhins.png) of 16×16 frames at the map's own pixel scale.
 * Rows: campina, bosque, layers. Columns: standing, step A, step B, grazing. The layer row holds the errante's cape,
 * the guardião's horns, the vidente's eye, the star of a true name and the leader's mark, drawn over the body.
 */
const SHEET = `url(${new URL('../sprites/folhins.png', import.meta.url).href})`;
const FRAME = 16, PIXELS_PER_CELL = 8;
const LAYER = { errante: 0, guardiao: 1, vidente: 2, named: 3, leader: 4 } as const;
const layer = (column: number) => ({ '--col': column, '--row': 2 } as CSSProperties);

type Props = { creature: Creature; size: number; selected: boolean; leader: boolean; running: boolean; speed: number; motion: boolean; onSelect: (id: number) => void };
export function CreatureToken({ creature: c, size, selected, leader, running, speed, motion, onSelect }: Props) {
  const moving = c.moving && running && motion;
  const label = c.trueName ? `${c.trueName} (#${c.id})` : `${forms[c.form].name} ${c.id}`;
  return <button type="button" className={`creature-token${selected ? ' creature-selected' : ''}`}
    data-moving={moving} data-awakened={c.awakenedDay !== null} data-named={!!c.trueName} data-form={c.form} data-action={c.action} data-animated={running && motion} data-facing={c.facing}
    aria-label={`${label}, ${variantNames[c.variant]}, bando ${c.bandId}, ${actionNames[c.action].toLocaleLowerCase('pt-BR')}`}
    aria-pressed={selected} title={`${c.trueName ? `${c.trueName} · ` : ''}${forms[c.form].name} #${c.id} · ${variantNames[c.variant]} · ${c.skills.length} habilidades · Bando ${c.bandId} · ${actionNames[c.action]} · Energia ${Math.round(c.energy)}`}
    style={{ left: `${(c.x + 0.5) / size * 100}%`, top: `${(c.y + 0.5) / size * 100}%`, width: `${FRAME / PIXELS_PER_CELL * 100 / size}%`, '--folhins': SHEET,
      transitionDuration: running && motion ? `${Math.max(0.1, STEP_MS / 1000 / speed)}s` : '0s', '--gait': `${Math.max(0.12, 0.32 / speed)}s` } as CSSProperties}
    onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(c.id)}>
    {c.awakenedDay !== null && <span className="folhim-aura" aria-hidden="true" />}
    <span className="folhim-facing" aria-hidden="true">
      <span className="folhim-sprite" style={{ '--row': c.variant === 'bosque' ? 1 : 0 } as CSSProperties} />
      <span className="folhim-band" style={{ background: bandColor(c.bandId) }} />
      {c.form !== 'folhim' && <span className="folhim-sprite folhim-layer" style={layer(LAYER[c.form])} />}
    </span>
    {c.trueName && <span className="folhim-sprite folhim-named" aria-hidden="true" style={layer(LAYER.named)} />}
    {leader && <span className="folhim-sprite" aria-hidden="true" style={layer(LAYER.leader)} />}
    {(c.action === 'disputing' || c.action === 'fleeing') && <span className="folhim-alert" aria-hidden="true" data-action={c.action} />}
  </button>;
}
