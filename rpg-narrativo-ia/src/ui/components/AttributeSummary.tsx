import { ATTRIBUTE_LABELS, type Attributes } from '../../modules/character';
import { buildNeedsPresentation, type NeedPresentation } from '../needs/presentation';

interface AttributeSummaryProps {
  attributes: Attributes;
  compact?: boolean;
}

const ORDER = ['saude', 'energia', 'fome', 'sede', 'humanidade', 'cautela'] as const;

export function AttributeSummary({ attributes, compact = false }: AttributeSummaryProps) {
  const needs = new Map<string, NeedPresentation>(
    buildNeedsPresentation(attributes).map((need) => [need.id, need]),
  );

  return (
    <ul className={compact ? 'attribute-list attribute-list--compact' : 'attribute-list'}>
      {ORDER.map((id) => {
        const need = needs.get(id);
        return (
          <li
            key={id}
            className={`attribute-list__item${need ? ` attribute-list__item--${need.band}` : ''}`}
          >
            <span className="attribute-list__name">{ATTRIBUTE_LABELS[id]}</span>
            <span className="attribute-list__value">{attributes[id]}</span>
            {need ? <span className="attribute-list__band">{need.bandLabel}</span> : null}
            {!compact ? (
              <span className="attribute-list__bar" aria-hidden="true">
                <span style={{ width: `${attributes[id]}%` }} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
