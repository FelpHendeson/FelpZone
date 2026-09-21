import { type ReactNode } from 'react';
import { type GameTab } from '../../components/BottomNavigation';
import { formatNeedDelta } from '../../needs/presentation';
import type { NeedEffectView } from '../../sandbox';

export type GameView = GameTab | 'map' | 'people' | 'relationships' | 'progression' | 'registry' | 'society' | 'family' | 'domain' | 'help';

export function DetailScreen({
  title,
  eyebrow,
  tone = 'system',
  onBack,
  children,
}: {
  title: string;
  eyebrow: string;
  tone?: 'world' | 'social' | 'system';
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`tab-panel detail-screen detail-screen--${tone}`}>
      <header className="detail-screen__header">
        <button type="button" className="back-button" onClick={onBack} aria-label={`Voltar de ${title}`}>
          <span aria-hidden="true">←</span>
        </button>
        <div>
          <span className="section-kicker">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </div>
  );
}

export function NeedEffectList({ effects, compact = false }: { effects: NeedEffectView[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'need-effect-list need-effect-list--compact' : 'need-effect-list'} aria-label="Efeitos">
      {effects.map((effect) => (
        <li key={effect.needId}>
          {formatNeedDelta(effect.needId, effect.amount)}{effect.limited ? ' (limitado)' : ''}
        </li>
      ))}
    </ul>
  );
}

export function EmptyAction({ message }: { message: string }) {
  return <p className="empty-action">{message}</p>;
}
