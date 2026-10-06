import type { CombatantShape } from '../../modules/combat';

/**
 * Silhueta simples de criatura para o palco da rodada, voltada para a direita como as figuras
 * humanas. Só traços grossos e chapados: a criatura se lê pela forma, não pelo detalhe.
 */
export function CreatureSilhouette({
  shape,
  tint = 'var(--danger)',
  size = 64,
  className,
}: {
  shape: Exclude<CombatantShape, 'humanoid'>;
  tint?: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={['silhouette', 'silhouette--creature', className].filter(Boolean).join(' ')}
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="50" cy="112" rx="30" ry="3.5" fill="currentColor" opacity="0.18" />
      <g fill={tint} stroke={tint} strokeLinecap="round" strokeLinejoin="round">
        {shape === 'beast' ? <Beast /> : shape === 'bird' ? <Bird /> : shape === 'serpent' ? <Serpent /> : <Boar />}
      </g>
    </svg>
  );
}

function Beast() {
  return (
    <>
      <path d="M26 70 Q16 62 8 50" fill="none" strokeWidth="5" />
      <ellipse cx="50" cy="74" rx="26" ry="11" stroke="none" />
      <path d="M68 70 L76 56 L84 54 L96 62 L94 66 L84 68 L78 76 Z" strokeWidth="3" />
      <path d="M78 56 L77 45 L84 53 Z" strokeWidth="2" />
      <line x1="32" y1="80" x2="28" y2="108" strokeWidth="6" />
      <line x1="42" y1="82" x2="44" y2="108" strokeWidth="6" />
      <line x1="60" y1="82" x2="58" y2="108" strokeWidth="6" />
      <line x1="70" y1="78" x2="74" y2="108" strokeWidth="6" />
    </>
  );
}

function Bird() {
  return (
    <>
      <path d="M38 70 L18 84 L24 74 L14 76 Z" strokeWidth="2" />
      <ellipse cx="50" cy="68" rx="17" ry="11" stroke="none" />
      <circle cx="68" cy="54" r="8" stroke="none" />
      <path d="M74 51 L88 55 L74 58 Z" strokeWidth="2" />
      <path d="M44 64 Q30 36 14 26 Q34 32 58 60 Z" strokeWidth="2" />
      <line x1="48" y1="78" x2="46" y2="104" strokeWidth="2.5" />
      <line x1="56" y1="78" x2="58" y2="104" strokeWidth="2.5" />
    </>
  );
}

function Serpent() {
  return (
    <>
      <path d="M10 104 Q26 92 42 104 Q58 116 68 98 Q76 82 72 68" fill="none" strokeWidth="10" />
      <ellipse cx="78" cy="62" rx="11" ry="7" stroke="none" transform="rotate(-20 78 62)" />
      <path d="M88 58 L96 54 M88 58 L96 60" fill="none" strokeWidth="1.5" />
    </>
  );
}

function Boar() {
  return (
    <>
      <path d="M30 58 L34 48 L38 58 L44 46 L48 57 L54 45 L58 57 L64 48 L66 58" strokeWidth="2" />
      <ellipse cx="46" cy="74" rx="30" ry="17" stroke="none" />
      <path d="M68 62 L92 72 L90 84 L70 88 Z" strokeWidth="3" />
      <path d="M86 82 Q96 80 94 70" fill="none" strokeWidth="3" stroke="var(--text)" />
      <line x1="26" y1="86" x2="24" y2="108" strokeWidth="8" />
      <line x1="38" y1="88" x2="38" y2="108" strokeWidth="8" />
      <line x1="56" y1="88" x2="56" y2="108" strokeWidth="8" />
      <line x1="66" y1="86" x2="70" y2="108" strokeWidth="8" />
    </>
  );
}
