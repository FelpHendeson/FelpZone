import type { CSSProperties } from 'react';
import { beingDefinitions, devotion, type BeingDefinition, type BeingState } from '../simulation/beings';
import type { World } from '../simulation/world';

type Props = { world: World; selected: number; onSelect: (index: number) => void; only?: Set<string> };

/** Primordial beings on the map: a soft reach halo and a clickable home marker. */
export function BeingsOverlay({ world, selected, onSelect, only }: Props) {
  return <div className="beings-overlay" aria-label="Seres primordiais">{world.beings.map(state => {
    const def = beingDefinitions.find(d => d.id === state.id);
    if (!def || (only && !only.has(state.id))) return null;
    return <BeingMarker key={state.id} world={world} state={state} def={def} selected={selected === state.home} onSelect={onSelect} />;
  })}</div>;
}

function BeingMarker({ world, state, def, selected, onSelect }: { world: World; state: BeingState; def: BeingDefinition; selected: boolean; onSelect: (index: number) => void }) {
  const cell = world.cells[state.home];
  const faith = devotion(world, state, def);
  const left = `${(cell.x + 0.5) / world.size * 100}%`;
  const top = `${(cell.y + 0.5) / world.size * 100}%`;
  const diameter = `${(def.reach * 2 + 1) / world.size * 100}%`;
  return <>
    <i className="being-halo" aria-hidden="true" style={{ left, top, width: diameter, height: diameter, '--being': def.color } as CSSProperties} />
    <button type="button" className="being-home" aria-pressed={selected}
      style={{ left, top, '--being': def.color } as CSSProperties}
      aria-label={`${def.name}, ${def.epithet}, poder ${Math.round(state.power)}`}
      title={`${def.name} · ${def.epithet} · poder ${Math.round(state.power)} · ${faith.near} por perto · ${faith.named} nomeados`}
      onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(state.home)}>
      <span className="being-glyph" aria-hidden="true">{def.glyph}</span>
      <span>{def.name}</span>
    </button>
  </>;
}
