import { useState } from 'react';
import { voiceStyle, type VoiceEntry, type VoiceKind } from './voiceEntries';

const filters: { id: string; name: string; kinds: VoiceKind[] | null }[] = [
  { id: 'all', name: 'Tudo', kinds: null },
  { id: 'life', name: 'Vida', kinds: ['arrival', 'birth', 'death', 'extinction'] },
  { id: 'society', name: 'Bandos', kinds: ['conflict', 'leadership', 'culture'] },
  { id: 'world', name: 'Mundo', kinds: ['season'] },
];

type Props = { entries: VoiceEntry[]; living: Set<number>; onFollow: (id: number) => void };
export function WorldVoice({ entries, living, onFollow }: Props) {
  const [filter, setFilter] = useState('all');
  const kinds = filters.find(f => f.id === filter)?.kinds;
  const visible = kinds ? entries.filter(e => kinds.includes(e.kind)) : entries;
  return <section className="voice-panel" aria-label="Voz do Mundo">
    <header className="voice-heading"><h2>Voz do Mundo</h2><span>O que acaba de acontecer</span></header>
    <div className="voice-filters" role="group" aria-label="Filtrar acontecimentos">{filters.map(f => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</button>)}</div>
    {visible.length ? <ol className="voice-feed" aria-live="polite">{visible.map(entry => {
      const follow = entry.creatureId !== null && living.has(entry.creatureId);
      return <li key={entry.key} className="voice-entry" data-kind={entry.kind}>
        <span className="voice-icon" aria-hidden="true">{voiceStyle[entry.kind].icon}</span>
        <div><small>Dia {entry.day} · {voiceStyle[entry.kind].label}</small><p>{entry.text}</p>
          {follow && <button type="button" className="voice-follow" onClick={() => onFollow(entry.creatureId!)}>Acompanhar #{entry.creatureId}</button>}</div>
      </li>;
    })}</ol> : <p className="voice-empty">{entries.length ? 'Nenhum acontecimento deste tipo ainda.' : 'Nada a relatar ainda. Inicie o tempo e o mundo começará a falar.'}</p>}
  </section>;
}

export function VoiceBanner({ entry, onClose }: { entry: VoiceEntry; onClose: () => void }) {
  return <div className="voice-banner" data-kind={entry.kind} role="status">
    <span className="voice-icon" aria-hidden="true">{voiceStyle[entry.kind].icon}</span>
    <div><small>A Voz do Mundo anuncia</small><p>{entry.text}</p></div>
    <button type="button" aria-label="Fechar anúncio" onClick={onClose}>×</button>
  </div>;
}
