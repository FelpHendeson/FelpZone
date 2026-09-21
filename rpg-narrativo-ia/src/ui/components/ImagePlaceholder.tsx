import { useState } from 'react';
import type { ImageKind } from '../../core/events';

interface ImagePlaceholderProps {
  kind: ImageKind;
  label: string;
  src?: string;
  priority?: boolean;
  className?: string;
}

const KIND_PREFIX: Record<ImageKind, string> = {
  scene: 'Cena',
  portrait: 'Retrato',
  icon: 'Ícone',
};

export function ImagePlaceholder({ kind, label, src, priority = false, className }: ImagePlaceholderProps) {
  const prefix = KIND_PREFIX[kind];
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && src !== failedSrc;

  return (
    <div
      role="img"
      aria-label={`${prefix}: ${label}`}
      className={['placeholder', `placeholder--${kind}`, showImage && 'placeholder--loaded', className].filter(Boolean).join(' ')}
    >
      {showImage ? (
        <img className="placeholder__image" src={src} alt="" loading={priority ? 'eager' : 'lazy'} onError={() => setFailedSrc(src)} />
      ) : (
        <>
          <span className="placeholder__mark" aria-hidden="true" />
          <span className="placeholder__label">{prefix}: {label}</span>
        </>
      )}
    </div>
  );
}
