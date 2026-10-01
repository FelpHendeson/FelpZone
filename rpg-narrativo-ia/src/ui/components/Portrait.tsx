import { useState } from 'react';

interface PortraitProps {
  name: string;
  src?: string;
  className?: string;
}

/** Retrato decorativo: arte do pack quando existe `src`, iniciais como fallback honesto. */
export function Portrait({ name, src, className }: PortraitProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && src !== failedSrc;
  return (
    <span className={['portrait', showImage && 'portrait--loaded', className].filter(Boolean).join(' ')} aria-hidden="true">
      {showImage ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function PortraitStack({ people, max = 3 }: { people: Array<{ id: string; name: string; src?: string }>; max?: number }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="portrait-stack" aria-hidden="true">
      {shown.map((person) => <Portrait key={person.id} name={person.name} src={person.src} />)}
      {rest > 0 ? <span className="portrait portrait--more">+{rest}</span> : null}
    </span>
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
