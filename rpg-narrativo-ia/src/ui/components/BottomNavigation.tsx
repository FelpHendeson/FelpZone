import type { CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';

export type GameTab = 'world' | 'journal' | 'character' | 'inventory' | 'menu';

interface BottomNavigationProps {
  active: GameTab;
  inventoryCount: number;
  onChange: (tab: GameTab) => void;
}

const ITEMS: Array<{ id: GameTab; icon: IconName; label: string }> = [
  { id: 'world', icon: 'world', label: 'Mundo' },
  { id: 'journal', icon: 'journal', label: 'Jornadas' },
  { id: 'character', icon: 'character', label: 'Personagem' },
  { id: 'inventory', icon: 'inventory', label: 'Mochila' },
  { id: 'menu', icon: 'menu', label: 'Menu' },
];

export function BottomNavigation({ active, inventoryCount, onChange }: BottomNavigationProps) {
  return (
    <nav
      className="bottom-nav"
      aria-label="Navegação da partida"
      style={{ '--bottom-navigation-items': ITEMS.length } as CSSProperties}
    >
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            <Icon name={item.icon} />
          </span>
          <span className="bottom-nav__label">{item.label}</span>
          {item.id === 'inventory' && inventoryCount > 0 ? (
            <span className="bottom-nav__badge" aria-label={`${inventoryCount} tipos de item`}>
              {inventoryCount}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
