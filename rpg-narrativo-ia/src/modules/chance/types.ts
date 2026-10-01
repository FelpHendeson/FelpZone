/** Estado persistido da sorte: semente fixa por partida e cursor que só avança. */
export interface ChanceState {
  seed: number;
  cursor: number;
}

export type ChanceInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Faixa mostrada antes da escolha — o risco nunca fica escondido. */
export type ChanceBand = 'alta' | 'incerta' | 'arriscada';
