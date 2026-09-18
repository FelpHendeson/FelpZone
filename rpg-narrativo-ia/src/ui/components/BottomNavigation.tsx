import type { CSSProperties } from 'react';

export type GameTab = 'world' | 'journal' | 'character' | 'inventory' | 'menu';

interface BottomNavigationProps {
  active: GameTab;
  inventoryCount: number;
  onChange: (tab: GameTab) => void;
}

const ITEMS: Array<{ id: GameTab; icon: string; label: string }> = [
  { id: 'world', icon: '◉', label: 'Mundo' },
  { id: 'journal', icon: '⌖', label: 'Jornadas' },
  { id: 'character', icon: '♙', label: 'Personagem' },
  { id: 'inventory', icon: '▣', label: 'Mochila' },
  { id: 'menu', icon: '☰', label: 'Menu' },
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
            {item.icon}
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
