import type { CSSProperties } from 'react';
import type { Attributes } from '../../core/state';
import { buildNeedsPresentation } from '../needs/presentation';

interface GameHudProps {
  characterName: string;
  worldLabel: string;
  attributes: Attributes;
  onExit: () => void;
}

export function GameHud({ characterName, worldLabel, attributes, onExit }: GameHudProps) {
  const needs = buildNeedsPresentation(attributes);

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
          {needs.map((need) => (
            <li
              key={need.id}
              className={`hud-vitals__item hud-vitals__item--${need.band}`}
              data-need={need.id}
              title={`${need.label}: ${need.bandLabel}`}
              style={{ '--vital-value': `${need.value}%` } as CSSProperties}
            >
              <span aria-hidden="true">{need.icon}</span>
              <strong>{need.value}</strong>
              <small>{need.bandLabel}</small>
              <span className="hud-vitals__meter" aria-hidden="true"><span /></span>
              <span className="sr-only">{need.label}</span>
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
