import type { ActionPose } from '../../modules/combat';

/**
 * Silhueta sem rosto nem gênero executando uma técnica: o jogador se imagina ali.
 * A figura é montada por articulações (cabeça, pescoço, quadril, cotovelos, mãos, joelhos e pés)
 * com traços grossos e arredondados, mais o adereço da pose (lâmina, adaga, arco, cajado…).
 */
type Point = readonly [number, number];

interface PoseDefinition {
  head: Point;
  neck: Point;
  hip: Point;
  rElbow: Point;
  rHand: Point;
  lElbow: Point;
  lHand: Point;
  rKnee: Point;
  rFoot: Point;
  lKnee: Point;
  lFoot: Point;
}

const POSES: Record<ActionPose, PoseDefinition> = {
  stand: { head: [50, 22], neck: [50, 35], hip: [50, 68], rElbow: [57, 52], rHand: [59, 66], lElbow: [43, 52], lHand: [41, 66], rKnee: [54, 88], rFoot: [56, 108], lKnee: [46, 88], lFoot: [44, 108] },
  strike: { head: [58, 24], neck: [55, 36], hip: [48, 68], rElbow: [68, 38], rHand: [82, 36], lElbow: [46, 50], lHand: [53, 44], rKnee: [62, 86], rFoot: [71, 106], lKnee: [40, 88], lFoot: [30, 106] },
  slash: { head: [56, 24], neck: [53, 36], hip: [49, 68], rElbow: [64, 27], rHand: [73, 16], lElbow: [42, 50], lHand: [35, 58], rKnee: [60, 88], rFoot: [67, 107], lKnee: [42, 88], lFoot: [35, 107] },
  stab: { head: [63, 37], neck: [57, 47], hip: [46, 74], rElbow: [68, 55], rHand: [80, 57], lElbow: [46, 58], lHand: [37, 52], rKnee: [60, 87], rFoot: [69, 105], lKnee: [36, 91], lFoot: [25, 105] },
  shoot: { head: [52, 24], neck: [50, 36], hip: [49, 68], rElbow: [38, 38], rHand: [55, 36], lElbow: [64, 36], lHand: [76, 36], rKnee: [56, 88], rFoot: [62, 107], lKnee: [44, 88], lFoot: [38, 107] },
  cast: { head: [52, 24], neck: [50, 36], hip: [49, 68], rElbow: [62, 41], rHand: [74, 38], lElbow: [42, 50], lHand: [40, 58], rKnee: [55, 88], rFoot: [60, 107], lKnee: [45, 88], lFoot: [42, 107] },
  guard: { head: [50, 24], neck: [50, 36], hip: [50, 68], rElbow: [61, 47], rHand: [62, 32], lElbow: [57, 54], lHand: [64, 42], rKnee: [58, 88], rFoot: [64, 107], lKnee: [42, 88], lFoot: [36, 107] },
  dodge: { head: [37, 28], neck: [42, 40], hip: [52, 70], rElbow: [54, 44], rHand: [64, 40], lElbow: [34, 50], lHand: [26, 57], rKnee: [60, 88], rFoot: [68, 106], lKnee: [46, 90], lFoot: [40, 107] },
  advance: { head: [59, 24], neck: [56, 36], hip: [50, 68], rElbow: [63, 52], rHand: [71, 46], lElbow: [44, 48], lHand: [38, 58], rKnee: [64, 82], rFoot: [62, 101], lKnee: [44, 88], lFoot: [30, 97] },
  retreat: { head: [46, 24], neck: [46, 36], hip: [50, 68], rElbow: [56, 46], rHand: [64, 42], lElbow: [52, 52], lHand: [60, 50], rKnee: [56, 88], rFoot: [62, 107], lKnee: [42, 86], lFoot: [30, 104] },
  lunge: { head: [66, 32], neck: [60, 42], hip: [48, 70], rElbow: [68, 52], rHand: [78, 48], lElbow: [52, 56], lHand: [44, 64], rKnee: [64, 86], rFoot: [74, 104], lKnee: [40, 88], lFoot: [26, 100] },
  throw: { head: [52, 24], neck: [50, 36], hip: [49, 68], rElbow: [40, 24], rHand: [34, 13], lElbow: [60, 44], lHand: [70, 40], rKnee: [58, 88], rFoot: [66, 107], lKnee: [44, 88], lFoot: [36, 107] },
  feint: { head: [56, 24], neck: [53, 36], hip: [48, 68], rElbow: [64, 40], rHand: [74, 38], lElbow: [46, 50], lHand: [52, 44], rKnee: [60, 87], rFoot: [67, 106], lKnee: [41, 88], lFoot: [32, 106] },
  heal: { head: [50, 23], neck: [50, 35], hip: [50, 68], rElbow: [58, 52], rHand: [52, 46], lElbow: [42, 52], lHand: [48, 46], rKnee: [54, 88], rFoot: [56, 108], lKnee: [46, 88], lFoot: [44, 108] },
};

export type SilhouetteProp = 'none' | 'sword' | 'dagger' | 'bow' | 'staff';

/** Adereço padrão de cada pose quando o arquétipo não define outro. */
const POSE_PROPS: Partial<Record<ActionPose, SilhouetteProp>> = {
  slash: 'sword',
  stab: 'dagger',
  shoot: 'bow',
  cast: 'staff',
};

export function Silhouette({
  pose,
  prop,
  tint = 'var(--accent)',
  glow,
  size = 64,
  className,
  label,
}: {
  pose: ActionPose;
  prop?: SilhouetteProp;
  tint?: string;
  glow?: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const figure = POSES[pose] ?? POSES.stand;
  const held = prop ?? POSE_PROPS[pose] ?? 'none';
  const accent = glow ?? tint;
  return (
    <svg
      className={['silhouette', className].filter(Boolean).join(' ')}
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={`halo-${pose}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="46" ry="56" fill={`url(#halo-${pose})`} />
      <ellipse cx="50" cy="112" rx="26" ry="3.5" fill="currentColor" opacity="0.18" />
      <Effects pose={pose} accent={accent} />
      {pose === 'feint' ? (
        <g opacity="0.28" transform="translate(-9 0)" fill={tint} stroke={tint}>
          <Figure figure={figure} />
        </g>
      ) : null}
      <g fill={tint} stroke={tint}>
        <Figure figure={figure} />
        <Prop prop={held} figure={figure} accent={accent} />
      </g>
    </svg>
  );
}

function Figure({ figure }: { figure: PoseDefinition }) {
  const limb = (from: Point, mid: Point, to: Point, width: number) => (
    <polyline points={`${from[0]},${from[1]} ${mid[0]},${mid[1]} ${to[0]},${to[1]}`} fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
  );
  const shoulder: Point = [figure.neck[0], figure.neck[1] + 2];
  return (
    <>
      {limb(figure.hip, figure.lKnee, figure.lFoot, 8)}
      {limb(shoulder, figure.lElbow, figure.lHand, 6.5)}
      <line x1={figure.neck[0]} y1={figure.neck[1]} x2={figure.hip[0]} y2={figure.hip[1]} strokeWidth="14" strokeLinecap="round" />
      {limb(figure.hip, figure.rKnee, figure.rFoot, 8)}
      {limb(shoulder, figure.rElbow, figure.rHand, 6.5)}
      <circle cx={figure.head[0]} cy={figure.head[1]} r="8.5" stroke="none" />
    </>
  );
}

function Prop({ prop, figure, accent }: { prop: SilhouetteProp; figure: PoseDefinition; accent: string }) {
  const [hx, hy] = figure.rHand;
  if (prop === 'sword') {
    return (
      <>
        <line x1={hx - 3} y1={hy + 3} x2={hx + 15} y2={hy - 15} strokeWidth="3" strokeLinecap="round" />
        <line x1={hx - 4} y1={hy - 3} x2={hx + 3} y2={hy + 4} strokeWidth="3" strokeLinecap="round" />
        <path d={`M ${hx + 18} ${hy - 18} Q ${hx + 30} ${hy + 10} ${hx + 6} ${hy + 30}`} fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
  }
  if (prop === 'dagger') {
    return <line x1={hx} y1={hy} x2={hx + 11} y2={hy - 1} strokeWidth="3" strokeLinecap="round" />;
  }
  if (prop === 'bow') {
    const [bx, by] = figure.lHand;
    return (
      <>
        <path d={`M ${bx - 3} ${by - 19} Q ${bx + 9} ${by} ${bx - 3} ${by + 19}`} fill="none" strokeWidth="2.8" strokeLinecap="round" />
        <polyline points={`${bx - 3},${by - 19} ${hx},${hy} ${bx - 3},${by + 19}`} fill="none" strokeWidth="1" opacity="0.8" />
        <line x1={hx} y1={hy} x2={bx + 16} y2={by} strokeWidth="1.8" strokeLinecap="round" />
      </>
    );
  }
  if (prop === 'staff') {
    const [sx, sy] = figure.lHand;
    return (
      <>
        <line x1={sx} y1={sy + 46} x2={sx} y2={sy - 44} strokeWidth="3" strokeLinecap="round" />
        <circle cx={sx} cy={sy - 47} r="4" fill={accent} stroke="none" />
      </>
    );
  }
  return null;
}

function Effects({ pose, accent }: { pose: ActionPose; accent: string }) {
  const lines = (x: number, ys: number[], length: number) =>
    ys.map((y) => <line key={y} x1={x} y1={y} x2={x + length} y2={y} stroke={accent} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />);
  switch (pose) {
    case 'cast':
      return (
        <>
          <circle cx="83" cy="38" r="7" fill={accent} opacity="0.85" />
          <circle cx="83" cy="38" r="12" fill={accent} opacity="0.25" />
        </>
      );
    case 'heal':
      return (
        <>
          <circle cx="50" cy="46" r="11" fill={accent} opacity="0.3" />
          <path d="M 68 22 h 8 M 72 18 v 8 M 26 30 h 6 M 29 27 v 6" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'guard':
      return <path d="M 70 20 Q 84 42 70 64" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.8" />;
    case 'dodge':
      return <>{lines(72, [34, 44, 54], 16)}</>;
    case 'advance':
    case 'lunge':
      return <>{lines(8, [40, 52, 64], 16)}</>;
    case 'retreat':
      return <path d="M 26 30 l -10 6 l 10 6" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />;
    case 'throw':
      return <circle cx="31" cy="9" r="3.5" fill={accent} />;
    case 'strike':
    case 'feint':
      return <path d="M 86 28 l 6 -4 M 88 36 l 7 0 M 86 44 l 6 4" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.7" />;
    default:
      return null;
  }
}
