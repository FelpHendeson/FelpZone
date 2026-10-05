import type { PortraitConfig } from '../../core/state';
import { INITIAL_ARCHETYPES, type IndexedArchetypes } from '../../modules/archetypes';
import { HAIR_COLORS, SKIN_TONES } from '../portrait';

/**
 * Retrato do Desperto: busto em silhueta (sem rosto) na cor do arquétipo, um retrato pronto do
 * pack ou a imagem própria. Retrato pronto sem arte ainda usa o busto equivalente.
 */
export function PortraitAvatar({
  portrait,
  archetypeId,
  size = 40,
  customSrc,
  label,
  className,
  catalog = INITIAL_ARCHETYPES,
}: {
  portrait?: PortraitConfig;
  archetypeId?: string;
  size?: number;
  customSrc?: string | null;
  label?: string;
  className?: string;
  catalog?: IndexedArchetypes;
}) {
  const archetype = archetypeId ? catalog.byId.get(archetypeId) : undefined;
  const primary = archetype?.palette.primary ?? '#5f8c8c';
  const secondary = archetype?.palette.secondary ?? '#cfe3e0';
  const classes = ['portrait-avatar', className].filter(Boolean).join(' ');
  const preset = portrait?.kind === 'preset' ? catalog.portraitById.get(portrait.id) : undefined;
  const imageSrc = portrait?.kind === 'custom' ? customSrc : preset?.image.src;
  if (imageSrc) {
    return (
      <span className={classes} style={{ width: size, height: size, borderColor: primary }} role={label ? 'img' : undefined} aria-label={label}>
        <img src={imageSrc} alt="" width={size} height={size} loading="lazy" decoding="async" />
      </span>
    );
  }
  const config = portrait?.kind === 'silhouette' ? portrait : (preset?.fallback ?? { skin: 1, hair: 1, hairColor: 1 });
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES[1];
  const hairColor = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[1];
  return (
    <svg
      className={classes}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <circle cx="50" cy="50" r="50" fill={secondary} opacity="0.18" />
      <circle cx="50" cy="50" r="48" fill="none" stroke={primary} strokeWidth="3" />
      <path d="M 14 100 Q 16 70 50 66 Q 84 70 86 100 Z" fill={primary} />
      <path d="M 42 64 L 50 74 L 58 64" fill="none" stroke={secondary} strokeWidth="3" strokeLinejoin="round" opacity="0.8" />
      <rect x="43" y="52" width="14" height="14" rx="5" fill={skin} />
      <Hair style={config.hair} color={hairColor} back />
      <ellipse cx="50" cy="40" rx="15" ry="18" fill={skin} />
      <Hair style={config.hair} color={hairColor} />
      {config.hair === 5 ? <path d="M 30 44 Q 30 18 50 16 Q 70 18 70 44 L 76 70 Q 50 60 24 70 Z" fill={primary} opacity="0.92" /> : null}
    </svg>
  );
}

function Hair({ style, color, back = false }: { style: number; color: string; back?: boolean }) {
  if (back) {
    if (style === 2) return <path d="M 33 34 Q 32 70 40 72 L 60 72 Q 68 70 67 34 Z" fill={color} />;
    if (style === 3) return <circle cx="50" cy="20" r="7" fill={color} />;
    return null;
  }
  switch (style) {
    case 0:
      return <path d="M 35 34 Q 50 20 65 34 Q 50 27 35 34 Z" fill={color} opacity="0.55" />;
    case 1:
      return <path d="M 34 38 Q 33 20 50 20 Q 67 20 66 38 Q 60 28 50 28 Q 40 28 34 38 Z" fill={color} />;
    case 2:
      return <path d="M 34 42 Q 32 19 50 19 Q 68 19 66 42 Q 62 27 50 27 Q 38 27 34 42 Z" fill={color} />;
    case 3:
      return <path d="M 35 36 Q 35 21 50 21 Q 65 21 65 36 Q 58 28 50 28 Q 42 28 35 36 Z" fill={color} />;
    case 4:
      return <path d="M 34 36 L 36 22 L 41 28 L 44 17 L 49 26 L 53 15 L 57 26 L 62 18 L 63 29 L 67 24 L 66 37 Q 50 27 34 36 Z" fill={color} />;
    default:
      return null;
  }
}
