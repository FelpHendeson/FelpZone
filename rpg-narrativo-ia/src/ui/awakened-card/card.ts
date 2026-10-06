import type { PortraitConfig } from '../../core/state';
import { INITIAL_ARCHETYPES } from '../../modules/archetypes';
import type { AwakenedCardData } from '../../modules/awakened-card';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const DEFAULT_BUST = { kind: 'silhouette', skin: 1, hair: 1, hairColor: 1 } as const;

/** Busto usado quando a carta não leva imagem: o próprio, o equivalente do retrato pronto ou o padrão. */
export function cardBust(portrait: PortraitConfig | undefined): PortraitConfig {
  if (portrait?.kind === 'silhouette') return portrait;
  if (portrait?.kind === 'preset') {
    const preset = INITIAL_ARCHETYPES.portraitById.get(portrait.id);
    if (preset) return { kind: 'silhouette', ...preset.fallback };
  }
  return DEFAULT_BUST;
}

export function shareText(card: AwakenedCardData): string {
  return [
    `${card.name} · ${card.rankTitle} · ${card.achievements[2].value} em Reset.`,
    ...(card.sealCode ? ['Enfrente o meu Eco: cole este Selo em Ecos.', card.sealCode] : []),
  ].join('\n');
}
