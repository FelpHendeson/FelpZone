import { useState } from 'react';
import type { SandboxAction } from '../../../modules/sandbox-actions';
import { type ItemKind } from '../../../modules/items';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ImagePlaceholder } from '../../components/ImagePlaceholder';
import type { ExplorationView } from '../../sandbox';
import { NeedEffectList } from './shared';
import { itemGlyph } from './helpers';

export function InventoryPanel({ view, onAction }: { view: ExplorationView; onAction: (action: SandboxAction) => void }) {
  const [filter, setFilter] = useState<'all' | ItemKind>('all');
  const [pending, setPending] = useState<
    | { type: 'equipment.equip'; itemId: string; name: string }
    | { type: 'preparation.assign'; slot: number; itemId: string; name: string }
    | null
  >(null);
  const emptyPrep = view.preparation.find((slot) => slot.itemId === null);
  const filteredInventory = filter === 'all' ? view.inventory : view.inventory.filter((item) => item.kind === filter);
  const filters: Array<{ id: 'all' | ItemKind; label: string }> = [
    { id: 'all', label: 'Visão geral' },
    { id: 'consumable', label: 'Consumíveis' },
    { id: 'equipment', label: 'Equipamentos' },
    { id: 'material', label: 'Materiais' },
  ];

  return (
    <div className="tab-panel">
      <header className="panel-heading panel-heading--split">
        <div>
          <span className="section-kicker">Pertences carregados</span>
          <h1>Mochila</h1>
        </div>
        <span className="inventory-total">{view.inventory.reduce((total, item) => total + item.quantity, 0)} itens</span>
      </header>

      <nav className="inventory-tabs" aria-label="Categorias da mochila">
        {filters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={filter === entry.id ? 'inventory-tabs__item inventory-tabs__item--active' : 'inventory-tabs__item'}
            aria-pressed={filter === entry.id}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
            <small>{entry.id === 'all' ? view.inventory.length : view.inventory.filter((item) => item.kind === entry.id).length}</small>
          </button>
        ))}
      </nav>

      {filter !== 'material' ? <section className="loadout-board" aria-label="Preparação e equipamento">
        {filter === 'all' || filter === 'consumable' ? (
        <div>
          <span className="section-kicker">Preparação</span>
          <ul className="loadout-slots">
            {view.preparation.map((slot) => (
              <li key={slot.index}>
                <strong>{slot.index + 1}</strong>
                <span>{slot.itemName ?? '—'}</span>
                {slot.itemId ? (
                  <button type="button" className="button button--compact" onClick={() => onAction({ type: 'preparation.clear', slot: slot.index })}>
                    Remover
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        ) : null}
        {filter === 'all' || filter === 'equipment' ? (
        <div>
          <span className="section-kicker">Equipado</span>
          <ul className="loadout-slots">
            {view.equipment.map((slot) => (
              <li key={slot.slot}>
                <strong>{slot.label}</strong>
                <span>{slot.itemName ?? '—'}</span>
                {slot.itemId ? (
                  <button type="button" className="button button--compact" onClick={() => onAction({ type: 'equipment.unequip', slot: slot.slot })}>
                    Desequipar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        ) : null}
      </section> : null}

      {filteredInventory.length === 0 ? (
        <div className="empty-state empty-state--large">
          <span aria-hidden="true">▣</span>
          <strong>{view.inventory.length === 0 ? 'Sua mochila está vazia' : 'Nada nesta categoria'}</strong>
          <p>{view.inventory.length === 0 ? 'Explore o mundo e revele pontos de coleta para encontrar materiais.' : 'Os itens de outras categorias continuam guardados.'}</p>
        </div>
      ) : (
        <ul className="inventory-grid">
          {filteredInventory.map((item) => (
            <li key={item.itemId} className={item.consumable ? 'inventory-grid__item inventory-grid__item--consumable' : 'inventory-grid__item'}>
              {item.imageSrc
                ? <ImagePlaceholder kind="icon" label={item.name} src={item.imageSrc} className="inventory-grid__image" />
                : <span className="inventory-grid__icon" aria-hidden="true">{itemGlyph(item.itemId)}</span>}
              <strong>{item.name}</strong>
              <span>× {item.quantity}</span>
              {item.consumable ? (
                <>
                  <NeedEffectList effects={item.effects} compact />
                  <button
                    type="button"
                    className="button button--compact inventory-grid__consume"
                    onClick={() => onAction({ type: 'needs.consume', itemId: item.itemId })}
                  >
                    Consumir
                  </button>
                </>
              ) : null}
              {item.canEquip ? (
                <button
                  type="button"
                  className="button button--compact inventory-grid__consume"
                  onClick={() => setPending({ type: 'equipment.equip', itemId: item.itemId, name: item.name })}
                >
                  Equipar
                </button>
              ) : null}
              {item.canPrepare && emptyPrep ? (
                <button
                  type="button"
                  className="button button--compact inventory-grid__consume"
                  onClick={() => setPending({ type: 'preparation.assign', slot: emptyPrep.index, itemId: item.itemId, name: item.name })}
                >
                  Preparar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.type === 'equipment.equip' ? `Equipar ${pending.name}` : pending ? `Preparar ${pending.name}` : ''}
        message={
          pending?.type === 'equipment.equip'
            ? 'Isso substitui o equipamento atual deste espaço.'
            : pending
              ? 'O consumível fica reservado para o próximo confronto.'
              : ''
        }
        confirmLabel="Confirmar"
        onConfirm={() => {
          if (pending?.type === 'equipment.equip') {
            onAction({ type: 'equipment.equip', itemId: pending.itemId });
          } else if (pending?.type === 'preparation.assign') {
            onAction({ type: 'preparation.assign', slot: pending.slot, itemId: pending.itemId });
          }
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
