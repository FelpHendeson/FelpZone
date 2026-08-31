import type { ImageKind } from '../../core/events';

interface ImagePlaceholderProps {
  kind: ImageKind;
  label: string;
  className?: string;
}

const KIND_PREFIX: Record<ImageKind, string> = {
  scene: 'Cena',
  portrait: 'Retrato',
  icon: 'Ícone',
};

export function ImagePlaceholder({ kind, label, className }: ImagePlaceholderProps) {
  const prefix = KIND_PREFIX[kind];

  return (
    <div
      role="img"
      aria-label={`${prefix}: ${label}`}
      className={['placeholder', `placeholder--${kind}`, className].filter(Boolean).join(' ')}
    >
      <span className="placeholder__mark" aria-hidden="true" />
      <span className="placeholder__label">
        {prefix}: {label}
      </span>
    </div>
  );
}
