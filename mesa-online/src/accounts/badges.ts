// Selos de conquista: o catálogo e a regra de cada um. Puro e testável.

import type { GameId } from "@/games/registry";

export type BadgeId =
  | "primeira-vitoria"
  | "dez-vitorias"
  | "cinquenta-vitorias"
  | "em-chamas"
  | "veterano"
  | "magnata"
  | "hoteleiro"
  | "bom-de-pedra"
  | "dupla-afinada"
  | "la-e-lo"
  | "cruzada"
  | "apostador"
  | "pote-gordo"
  | "truqueiro"
  | "doze";

export interface BadgeInfo {
  emoji: string;
  name: string;
  description: string;
  /** Quanto maior, mais difícil: os mais raros aparecem primeiro ao lado do nome. */
  rarity: number;
}

export const BADGES: Record<BadgeId, BadgeInfo> = {
  "primeira-vitoria": { emoji: "🏅", name: "Primeira vitória", description: "Vencer uma partida.", rarity: 1 },
  "dez-vitorias": { emoji: "🥈", name: "Dez vitórias", description: "Vencer 10 partidas.", rarity: 4 },
  "cinquenta-vitorias": { emoji: "🥇", name: "Cinquenta vitórias", description: "Vencer 50 partidas.", rarity: 8 },
  "em-chamas": { emoji: "🔥", name: "Em chamas", description: "Vencer 3 partidas seguidas.", rarity: 5 },
  veterano: { emoji: "🎖️", name: "Veterano", description: "Jogar 25 partidas.", rarity: 3 },
  magnata: { emoji: "🏙️", name: "Magnata", description: "Vencer uma partida de Magnata.", rarity: 2 },
  hoteleiro: { emoji: "🏨", name: "Hoteleiro", description: "Terminar uma partida de Magnata com um hotel.", rarity: 3 },
  "bom-de-pedra": { emoji: "🁫", name: "Bom de pedra", description: "Vencer uma partida de dominó.", rarity: 2 },
  "dupla-afinada": { emoji: "🤝", name: "Dupla afinada", description: "Vencer uma partida de dominó em duplas.", rarity: 3 },
  "la-e-lo": { emoji: "↔️", name: "Lá-e-lô", description: "Bater de lá-e-lô no dominó.", rarity: 5 },
  cruzada: { emoji: "✖️", name: "Cruzada", description: "Bater de cruzada no dominó.", rarity: 7 },
  apostador: { emoji: "🎲", name: "Apostador", description: "Ganhar uma partida com aposta.", rarity: 3 },
  "pote-gordo": { emoji: "💰", name: "Pote gordo", description: "Ganhar 200 Funcoins ou mais numa partida.", rarity: 6 },
  truqueiro: { emoji: "🃏", name: "Truqueiro", description: "Vencer uma partida de truco.", rarity: 2 },
  doze: { emoji: "🔔", name: "Doze!", description: "Ganhar uma mão de truco valendo 12.", rarity: 7 },
};

export const BADGE_IDS = Object.keys(BADGES) as BadgeId[];

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === "string" && Object.hasOwn(BADGES, value);
}

/** O que a regra de cada selo precisa saber, já com as estatísticas atualizadas. */
export interface BadgeContext {
  wins: number;
  played: number;
  streak: number;
  won: boolean;
  gameId: GameId;
  feats: string[];
  stake: number;
  /** Funcoins ganhas além da própria entrada. */
  profit: number;
}

const RULES: Record<BadgeId, (ctx: BadgeContext) => boolean> = {
  "primeira-vitoria": (ctx) => ctx.wins >= 1,
  "dez-vitorias": (ctx) => ctx.wins >= 10,
  "cinquenta-vitorias": (ctx) => ctx.wins >= 50,
  "em-chamas": (ctx) => ctx.streak >= 3,
  veterano: (ctx) => ctx.played >= 25,
  magnata: (ctx) => ctx.won && ctx.gameId === "magnata",
  hoteleiro: (ctx) => ctx.gameId === "magnata" && ctx.feats.includes("hotel"),
  "bom-de-pedra": (ctx) => ctx.won && ctx.gameId === "domino",
  "dupla-afinada": (ctx) => ctx.won && ctx.feats.includes("venceu-duplas"),
  "la-e-lo": (ctx) => ctx.feats.includes("batida-la-e-lo"),
  cruzada: (ctx) => ctx.feats.includes("batida-cruzada"),
  apostador: (ctx) => ctx.won && ctx.stake > 0,
  "pote-gordo": (ctx) => ctx.profit >= 200,
  truqueiro: (ctx) => ctx.won && ctx.gameId === "truco",
  doze: (ctx) => ctx.feats.includes("mao-de-doze"),
};

/** Selos que o contexto concede (inclusive os que a pessoa já tem). */
export function badgesEarned(ctx: BadgeContext): BadgeId[] {
  return BADGE_IDS.filter((id) => RULES[id](ctx));
}

/** Os selos mais raros primeiro (para mostrar só alguns ao lado do nome). */
export function rarestFirst(ids: BadgeId[]): BadgeId[] {
  return [...ids].sort((a, b) => BADGES[b].rarity - BADGES[a].rarity);
}
