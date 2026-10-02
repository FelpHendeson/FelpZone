import type { CSSProperties } from 'react';
import type { Attributes } from '../../core/state';
import { DEFAULT_PERIODS, periodAtMinute } from '../../modules/time';
import { formatClock, formatDuration, type ClockFormat } from '../clock';
import { skyAt } from '../clock/sky';
import { useAnimatedClock } from '../clock/useAnimatedClock';
import { buildNeedsPresentation } from '../needs/presentation';
import { SystemCorners } from './Icon';

interface GameHudProps {
  characterName: string;
  worldLabel: string;
  chapterLabel?: string;
  /** Relógio do mundo: com ele o HUD anima a passagem do tempo e tinge o céu pela hora. */
  clock?: { day: number; minute: number; format: ClockFormat };
  attributes: Attributes;
  onExit: () => void;
}

export function GameHud({ characterName, worldLabel, chapterLabel, clock, attributes, onExit }: GameHudProps) {
  const needs = buildNeedsPresentation(attributes);
  const shown = useAnimatedClock(clock?.day ?? 1, clock?.minute ?? 0);
  const sky = clock ? skyAt(shown.minute) : null;
  const skyStyle = sky ? ({ '--sky-top': sky.top, '--sky-bottom': sky.bottom } as CSSProperties) : undefined;

  return (
    <header className={`game-hud sys-frame${sky ? ' game-hud--sky' : ''}${sky?.night ? ' game-hud--night' : ''}`} style={skyStyle}>
      <SystemCorners />
      <div className="game-hud__time" onClick={shown.animating ? shown.skip : undefined}>
        <span className="game-hud__clock">
          {chapterLabel ? <strong className="game-hud__chapter">{chapterLabel}</strong> : null}
          {clock ? (
            <span aria-live="off">
              Dia {shown.day} · <time className="game-hud__hour">{formatClock(shown.minute, clock.format)}</time> ·{' '}
              {periodName(shown.minute)}
              {worldLabel ? ` · ${worldLabel}` : ''}
              {shown.animating ? <small className="game-hud__elapsed">+{formatDuration(shown.elapsed)}</small> : null}
            </span>
          ) : (
            <span>{worldLabel}</span>
          )}
        </span>
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

function periodName(minute: number): string {
  const id = periodAtMinute(minute);
  return DEFAULT_PERIODS.find((entry) => entry.id === id)?.label ?? id;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('pt-BR') ?? '')
    .join('');
}
