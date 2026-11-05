import type { CSSProperties } from 'react';
import { elementNames } from '../simulation/beings';
import { genesisText, type GenesisStep } from './genesis';

type Props = { steps: GenesisStep[]; step: number; onSkip: () => void };
/** Who is acting in the genesis right now, in their own words, with a way out for whoever has seen it before. */
export function GenesisCaption({ steps, step, onSkip }: Props) {
  const current = steps[step];
  const acting = current.kind === 'god' || current.kind === 'species' ? current.def : null;
  const gods = steps.filter(s => s.kind === 'god');
  return <div className="genesis-caption" key={step} style={{ '--being': acting?.color ?? '#e9cf8f' } as CSSProperties} role="status">
    <small>{current.kind === 'rules' ? 'Gênese' : current.kind === 'species' ? 'A primeira espécie' : current.kind === 'end' ? 'Gênese' : `Entidade suprema da ${elementNames[acting!.element]}`}</small>
    {acting && <h2><span aria-hidden="true">{acting.glyph}</span>{acting.name} <em>{acting.epithet}</em></h2>}
    <p>{genesisText(current)}</p>
    {current.kind === 'god' && <p className="genesis-detail"><strong>Núcleo: {acting!.core.name}.</strong> {acting!.personality}</p>}
    <div className="genesis-footer">
      <ol aria-label="Ordem da Gênese">{gods.map(g => <li key={g.def.id} data-done={g.start <= current.start} style={{ '--being': g.def.color } as CSSProperties} title={g.def.name}>{g.def.glyph}</li>)}</ol>
      <button type="button" onClick={onSkip}>Pular Gênese ›</button>
    </div>
  </div>;
}
