/**
 * Competição (GDD §15, F12) [Proposta; números Calibrar em `docs/CALIBRACAO.md`].
 * Arena assíncrona contra bots por arquétipo, Campo de Provas, torneio
 * semanal em chave e temporadas de 8 semanas com tema.
 */
import type { Item } from "./coleta";

export const CONFIG_COMPETICAO = Object.freeze({
  /** Duelo: passos de 0,5 s, no máximo 2 min (depois vence quem tem mais vida, em fração). */
  passoMs: 500,
  duracaoMaximaMs: 120_000,
  /** Arena: lutas por dia (dia real, UTC) e Elo. */
  lutasPorDia: 10,
  ratingInicial: 1_000,
  fatorK: 32,
  /** Pontos de temporada por luta (vitória / derrota) e gold por vitória (× nível). */
  pontosVitoria: 10,
  pontosDerrota: 2,
  ouroVitoriaPorNivel: 8,
  /** Replays guardados. */
  replays: 10,
  /** Torneio: 16 na chave; pontos e gold por colocação (1º, 2º, 3º-4º, 5º-8º, 9º-16º). */
  tamanhoTorneio: 16,
  pontosTorneio: [300, 180, 100, 50, 20],
  ouroTorneioPorNivel: [400, 200, 100, 40, 10],
  /** Semana: começa na segunda 00:00 UTC; temporada: 8 semanas. */
  semanaMs: 7 * 24 * 3_600_000,
  epocaSemanaMs: 4 * 24 * 3_600_000,
  semanasPorTemporada: 8,
  /** Pontos de temporada para ganhar a relíquia do tema. */
  pontosReliquia: 2_500,
  historico: 20,
});

export interface Arquetipo {
  readonly id: string;
  readonly nome: string;
  readonly racaId: string;
  readonly coreId: string;
}

/** Arquétipos dos bots de Arena (GDD: "tanque de Draconato, assassino Sangue-Pálido..."). */
export const ARQUETIPOS: readonly Arquetipo[] = [
  { id: "tanque-draconato", nome: "Tanque Draconato", racaId: "draconato", coreId: "guardiao-da-terra" },
  { id: "assassino-sangue-palido", nome: "Assassino Sangue-Pálido", racaId: "sangue-palido", coreId: "ser-das-trevas" },
  { id: "cacador-lobisomem", nome: "Caçador Lobisomem", racaId: "lobisomem", coreId: "predador-nato" },
  { id: "berserker-orc", nome: "Berserker Orc", racaId: "orc", coreId: "portador-da-chama" },
  { id: "arcano-elfo", nome: "Arcano Elfo", racaId: "elfo", coreId: "mente-lucida" },
  { id: "paladino-humano", nome: "Paladino Humano", racaId: "humano", coreId: "alma-da-luz" },
  { id: "tempestade-silfo", nome: "Tempestade Silfo", racaId: "silfo", coreId: "filho-da-tempestade" },
  { id: "muralha-anao", nome: "Muralha Anã", racaId: "anao", coreId: "guardiao-da-terra" },
];

export interface TemaTemporada {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  /** Tags (de raça ou core) que ganham o bônus de ataque na Arena. */
  readonly tags: readonly string[];
  readonly bonusAtaque: number;
  /** Relíquia nomeada da temporada. */
  readonly reliquiaId: string;
}

export const TEMAS: readonly TemaTemporada[] = [
  { id: "lua-negra", nome: "Temporada da Lua Negra", descricao: "Sombras +20% de ataque na Arena.", tags: ["sombra", "trevas", "noite"], bonusAtaque: 0.2, reliquiaId: "insignia-da-lua-negra" },
  { id: "sol-partido", nome: "Temporada do Sol Partido", descricao: "Luz e fogo +20% de ataque na Arena.", tags: ["luz", "fogo"], bonusAtaque: 0.2, reliquiaId: "insignia-do-sol-partido" },
  { id: "fera-solta", nome: "Temporada da Fera Solta", descricao: "Feras e caçadores +20% de ataque na Arena.", tags: ["fera", "caca", "lua"], bonusAtaque: 0.2, reliquiaId: "insignia-da-fera-solta" },
  { id: "pedra-e-vento", nome: "Temporada de Pedra e Vento", descricao: "Terra e tempestade +20% de ataque na Arena.", tags: ["terra", "pedra", "vento", "tempestade"], bonusAtaque: 0.2, reliquiaId: "insignia-de-pedra-e-vento" },
];

const insignia = (id: string, nome: string, descricao: string, mods: { alvo: string; operacao: "percentual" | "somar"; valor: number }[]): Item => ({
  id,
  nome,
  categoria: "equipamento",
  raridade: "epico",
  descricao,
  preco: 0,
  pilha: 1,
  equipamento: { slot: "reliquia", tier: 3, precoCompra: null, modificadores: mods.map((m) => ({ ...m, origem: { tipo: "equipamento" as const, id } })), nomeado: {} },
});

/** Relíquias nomeadas de temporada (uma por tema). */
export const RELIQUIAS_TEMPORADA: readonly Item[] = [
  insignia("insignia-da-lua-negra", "Insígnia da Lua Negra", "Prêmio de quem brilhou quando a lua sumiu.", [{ alvo: "critico", operacao: "somar", valor: 0.04 }, { alvo: "esquiva", operacao: "somar", valor: 0.02 }]),
  insignia("insignia-do-sol-partido", "Insígnia do Sol Partido", "Ainda quente da última luta.", [{ alvo: "ataque", operacao: "percentual", valor: 0.06 }]),
  insignia("insignia-da-fera-solta", "Insígnia da Fera Solta", "Tem marcas de dente. Suas, provavelmente.", [{ alvo: "ataque", operacao: "percentual", valor: 0.03 }, { alvo: "vida", operacao: "percentual", valor: 0.05 }]),
  insignia("insignia-de-pedra-e-vento", "Insígnia de Pedra e Vento", "Pesada como pedra, leve como desculpa.", [{ alvo: "defesa", operacao: "percentual", valor: 0.06 }]),
];
