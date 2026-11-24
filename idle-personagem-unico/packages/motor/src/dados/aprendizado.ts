/** Atividade de Aprendizado (GDD §6.4): praticar uma habilidade que já possui. */

export interface AtividadeAprendizado {
  readonly tipo: "aprendizado";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly localId: string;
  readonly subareaId: string;
  readonly cicloBaseMs: number;
  readonly xpPorCiclo: number;
  /** XP de maestria por ciclo para a habilidade praticada. */
  readonly maestriaPorCiclo: number;
}

export const ATIVIDADE_APRENDIZADO: AtividadeAprendizado = {
  tipo: "aprendizado",
  id: "praticar-habilidade",
  nome: "Praticar habilidade",
  descricao: "Repetir o movimento até o corpo lembrar sozinho.",
  localId: "pedravau",
  subareaId: "campo-de-treino",
  cicloBaseMs: 30_000,
  xpPorCiclo: 5,
  maestriaPorCiclo: 10,
};
