import { ATTRIBUTE_LABELS, type Attributes } from '../../modules/character';

interface AttributeSummaryProps {
  attributes: Attributes;
  compact?: boolean;
}

const ORDER = ['saude', 'energia', 'fome', 'humanidade', 'cautela'] as const;

export function AttributeSummary({ attributes, compact = false }: AttributeSummaryProps) {
  return (
    <ul className={compact ? 'attribute-list attribute-list--compact' : 'attribute-list'}>
      {ORDER.map((id) => (
        <li key={id} className="attribute-list__item">
          <span className="attribute-list__name">{ATTRIBUTE_LABELS[id]}</span>
          <span className="attribute-list__value">{attributes[id]}</span>
          {!compact ? (
            <span className="attribute-list__bar" aria-hidden="true">
              <span style={{ width: `${attributes[id]}%` }} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
