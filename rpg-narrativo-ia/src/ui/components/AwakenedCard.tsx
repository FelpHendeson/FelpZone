import type { Ref } from 'react';
import type { PortraitConfig } from '../../core/state';
import type { ActionPose } from '../../modules/combat';
import { wrapCode, type AwakenedCardData } from '../../modules/awakened-card';
import { CARD_HEIGHT, CARD_WIDTH } from '../awakened-card/card';
import { PortraitAvatar } from './PortraitAvatar';
import { Silhouette, type SilhouetteProp } from './Silhouette';


// A carta vira imagem fora da página: cores e fontes precisam ser valores fixos, sem variáveis CSS.
const BG = '#0b1216';
const PANEL = '#111a20';
const LINE = '#26363c';
const TEXT = '#edf4f1';
const MUTED = '#99aaa6';
const SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";
const SANS = "'Segoe UI', system-ui, sans-serif";
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const CODE_WIDTH = 118;
const CODE_LINES = 5;

/** Quebra um valor longo em duas linhas no espaço mais perto do meio. */
function twoLines(value: string, max: number): string[] {
  if (value.length <= max) return [value];
  const middle = value.length / 2;
  let split = -1;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === ' ' && (split < 0 || Math.abs(index - middle) < Math.abs(split - middle))) split = index;
  }
  return split < 0 ? [value] : [value.slice(0, split), value.slice(split + 1)];
}

/**
 * Carta do Desperto em SVG, no formato de post vertical (1080×1350). A mesma marcação serve de
 * prévia na tela e de origem da imagem PNG.
 */
export function AwakenedCard({
  card,
  portraitHref,
  portraitConfig,
  pose,
  prop,
  svgRef,
}: {
  card: AwakenedCardData;
  /** Imagem do retrato já como data URL (retrato pronto ou próprio autorizado). */
  portraitHref?: string;
  /** Busto usado quando não há imagem. */
  portraitConfig: PortraitConfig;
  pose: ActionPose;
  prop?: SilhouetteProp;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const { primary, secondary } = card.palette;
  const nameSize = card.name.length > 22 ? 58 : 76;
  // Até 5 linhas no rodapé; um Selo maior que isso vai só no texto compartilhado.
  const wrapped = card.sealCode ? wrapCode(card.sealCode, CODE_WIDTH) : [];
  const code = wrapped.length <= CODE_LINES ? wrapped : [];
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      className="awakened-card"
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      role="img"
      aria-label={`Carta do Desperto de ${card.name}`}
    >
      <defs>
        <radialGradient id="card-glow" cx="50%" cy="28%" r="60%">
          <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
        <clipPath id="card-portrait-clip">
          <circle cx="540" cy="390" r="196" />
        </clipPath>
      </defs>
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={BG} />
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#card-glow)" />
      <rect x="28" y="28" width="1024" height="1294" rx="40" fill="none" stroke={primary} strokeWidth="6" />
      <rect x="46" y="46" width="988" height="1258" rx="28" fill="none" stroke={secondary} strokeOpacity="0.35" strokeWidth="2" />

      <text x="540" y="122" textAnchor="middle" fill={secondary} fontFamily={SANS} fontSize="28" letterSpacing="4">
        [ SISTEMA ] · CARTA DO DESPERTO
      </text>

      <circle cx="540" cy="390" r="204" fill={primary} fillOpacity="0.15" stroke={primary} strokeWidth="8" />
      {portraitHref ? (
        <image
          href={portraitHref}
          x="344"
          y="194"
          width="392"
          height="392"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#card-portrait-clip)"
        />
      ) : (
        <g clipPath="url(#card-portrait-clip)">
          <g transform="translate(344 194)">
            <PortraitAvatar portrait={portraitConfig} archetypeId={card.archetypeId} size={392} />
          </g>
        </g>
      )}

      <text x="540" y="686" textAnchor="middle" fill={TEXT} fontFamily={SERIF} fontSize={nameSize} fontWeight="700">
        {card.name}
      </text>
      <text x="540" y="748" textAnchor="middle" fill={primary} fontFamily={SANS} fontSize="40" fontWeight="600">
        {card.rankTitle}
      </text>
      <text x="540" y="796" textAnchor="middle" fill={MUTED} fontFamily={SANS} fontSize="28">
        {card.rank === 'initiate'
          ? `Iniciado · ${card.archetypeName}`
          : card.rankTitle === card.archetypeName
            ? 'Patente · Aprendiz'
            : `Aprendiz · ${card.archetypeName}`}
      </text>

      <rect x="90" y="832" width="900" height="196" rx="24" fill={PANEL} stroke={LINE} strokeWidth="2" />
      <g transform="translate(112 826)" color={TEXT}>
        <Silhouette pose={pose} prop={prop} tint={primary} glow={secondary} size={170} />
      </g>
      <text x="320" y="908" fill={MUTED} fontFamily={SANS} fontSize="24" letterSpacing="3">
        {card.signature ? 'TÉCNICA DE ASSINATURA' : 'POSTURA'}
      </text>
      <text x="320" y="972" fill={TEXT} fontFamily={SERIF} fontSize="50" fontWeight="700">
        {card.signature?.name ?? 'Ainda sem técnica'}
      </text>

      {card.achievements.map((achievement, index) => {
        const x = 90 + index * 306;
        const lines = twoLines(achievement.value, 16);
        return (
          <g key={achievement.label}>
            <rect x={x} y="1052" width="288" height="128" rx="20" fill={PANEL} stroke={LINE} strokeWidth="2" />
            <text x={x + 144} y="1092" textAnchor="middle" fill={MUTED} fontFamily={SANS} fontSize="21">
              {achievement.label}
            </text>
            {lines.map((line, lineIndex) => (
              <text
                key={lineIndex}
                x={x + 144}
                y={(lines.length === 1 ? 1140 : 1128) + lineIndex * 32}
                textAnchor="middle"
                fill={TEXT}
                fontFamily={SANS}
                fontSize="28"
                fontWeight="700"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {code.length > 0 ? (
        <>
          <text x="540" y="1206" textAnchor="middle" fill={secondary} fontFamily={SANS} fontSize="21">
            Selo do Eco · cole em Ecos para enfrentar este Desperto
          </text>
          {code.map((line, index) => (
            <text key={index} x="540" y={1230 + index * 16} textAnchor="middle" fill={MUTED} fontFamily={MONO} fontSize="13">
              {line}
            </text>
          ))}
        </>
      ) : (
        <text x="540" y="1250" textAnchor="middle" fill={MUTED} fontFamily={SANS} fontSize="22">
          {card.sealCode
            ? 'O Selo do Eco segue no texto compartilhado com esta carta.'
            : 'O Eco deste Desperto nasce na primeira vitória reconhecida pelo Sistema.'}
        </text>
      )}
    </svg>
  );
}
