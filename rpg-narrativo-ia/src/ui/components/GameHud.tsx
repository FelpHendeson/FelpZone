import type { Attributes } from '../../core/state';

interface GameHudProps {
  characterName: string;
  worldLabel: string;
  attributes: Attributes;
  onExit: () => void;
}

const HUD_ATTRIBUTES = [
  { id: 'saude', icon: '♥', label: 'Saúde' },
  { id: 'energia', icon: 'ϟ', label: 'Energia' },
  { id: 'fome', icon: '◒', label: 'Fome' },
] as const;

export function GameHud({ characterName, worldLabel, attributes, onExit }: GameHudProps) {
  return (
    <header className="game-hud">
      <div className="game-hud__time">
        <span>{worldLabel}</span>
        <button type="button" className="icon-button" onClick={onExit} aria-label="Voltar ao menu inicial">
          ☰
        </button>
      </div>
      <div className="game-hud__identity">
        <span className="avatar-placeholder" aria-hidden="true">
          {initials(characterName)}
        </span>
        <div className="game-hud__name">
          <span>Sobrevivente</span>
          <strong>{characterName}</strong>
        </div>
        <ul className="hud-vitals" aria-label="Condição atual">
          {HUD_ATTRIBUTES.map(({ id, icon, label }) => (
            <li key={id} title={label}>
              <span aria-hidden="true">{icon}</span>
              <strong>{attributes[id]}</strong>
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pt-BR') ?? '')
    .join('');
}
