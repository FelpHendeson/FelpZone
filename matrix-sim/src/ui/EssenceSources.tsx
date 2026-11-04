import type { CSSProperties } from 'react';
import type { World } from '../simulation/world';

type Props = { world: World; selected: number; onSelect: (index: number) => void };
/** Glowing markers where essence surfaces; clicking one pins that region. */
export function EssenceSources({ world, selected, onSelect }: Props) {
  return <div className="essence-sources" aria-label="Nascentes de essência">{world.essenceSources.map(source => {
    const cell = world.cells[source.index];
    return <button key={source.index} type="button" className="essence-source" aria-pressed={selected === source.index}
      style={{ left: `${(cell.x + 0.5) / world.size * 100}%`, top: `${(cell.y + 0.5) / world.size * 100}%`, '--strength': cell.essence } as CSSProperties}
      aria-label={`${source.name}, nascente de essência`} title={`${source.name} · essência ${Math.round(cell.essence * 100)}%`}
      onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(source.index)}>
      <i aria-hidden="true" /><span>{source.name}</span>
    </button>;
  })}</div>;
}
