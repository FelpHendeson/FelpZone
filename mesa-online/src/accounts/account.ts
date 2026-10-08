// Regras puras das contas: validação de cadastro, carteira de fichas,
// liquidação de partidas e selos. Não conhece HTTP nem armazenamento.
// Decisões em docs/ESPECIFICACAO-EVOLUCAO-4.md, seções 2 e 4.

import type { GameId } from "@/games/registry";
import { RoomError, type MatchResult } from "@/rooms/room";
import { BADGES, badgesEarned, rarestFirst, type BadgeId } from "./badges";

/** Fichas virtuais: sem valor real, não se compram nem se sacam. */
export const STARTING_CHIPS = 1000;
export const DAILY_BONUS = 100;
const MAX_EMAIL = 254;
const NICK_MIN = 3;
const NICK_MAX = 16;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;
/** Apelidos que confundiriam com o sistema ou com robôs: o começo não pode ser este... */
const RESERVED_PREFIXES = ["robo", "admin", "sistema", "moderador", "suporte", "felpzone"];
/** ...e o apelido não pode ser exatamente este. */
const RESERVED_WORDS = ["mesa", "banco", "casa", "bot"];

/** Entrada de uma partida em andamento (aposta ou só a participação, com 0). */
export interface Hold {
  matchId: string;
  roomCode: string;
  amount: number;
  at: number;
}

export interface GameStats {
  played: number;
  wins: number;
}

export interface Stats {
  played: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** Saldo das apostas: fichas ganhas menos as perdidas. */
  chipsWon: number;
  games: Partial<Record<GameId, GameStats>>;
}

export interface EarnedBadge {
  id: BadgeId;
  at: number;
}

export interface Account {
  id: string;
  email: string;
  nickname: string;
  /** Apelido sem acentos e em minúsculas: é ele que precisa ser único. */
  nicknameKey: string;
  avatar: string;
  passwordHash: string;
  createdAt: number;
  /** Saldo disponível (as entradas em jogo já saíram dele). */
  chips: number;
  holds: Hold[];
  /** Dia (fuso de Brasília) do último bônus diário. */
  bonusDay: string | null;
  stats: Stats;
  badges: EarnedBadge[];
  version: number;
}

/** O que a própria pessoa vê da conta. */
export type Me = Omit<Account, "passwordHash" | "nicknameKey" | "version"> & { inPlay: number; bonusAvailable: boolean };

/** O que qualquer pessoa vê de outra: sem e-mail e sem carteira. */
export interface PublicProfile {
  id: string;
  nickname: string;
  avatar: string;
  createdAt: number;
  stats: Stats;
  badges: EarnedBadge[];
}

/** Resumo para a lista de online e para o assento na mesa. */
export interface PlayerCard {
  id: string;
  nickname: string;
  avatar: string;
  wins: number;
  badges: BadgeId[];
}

export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") throw new RoomError("Informe o e-mail.");
  const email = input.trim().toLowerCase();
  if (!email) throw new RoomError("Informe o e-mail.");
  const [local, domain, ...rest] = email.split("@");
  const valid =
    email.length <= MAX_EMAIL &&
    rest.length === 0 &&
    !!local &&
    local.length <= 64 &&
    !!domain &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..") &&
    /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
  if (!valid) throw new RoomError("E-mail inválido. Confira se está no formato nome@exemplo.com.");
  return email;
}

/** Apelido sem acentos e em minúsculas, para comparar ("José" = "jose"). */
export function nicknameKeyOf(nickname: string): string {
  return nickname.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function normalizeNickname(input: unknown): { nickname: string; key: string } {
  if (typeof input !== "string") throw new RoomError("Escolha um apelido.");
  const nickname = input.normalize("NFC").trim();
  const length = [...nickname].length;
  if (length < NICK_MIN || length > NICK_MAX) throw new RoomError(`O apelido precisa ter de ${NICK_MIN} a ${NICK_MAX} caracteres.`);
  if (!/^\p{L}[\p{L}\p{N}_.]*$/u.test(nickname)) {
    throw new RoomError("Use só letras, números, _ ou . no apelido, começando por uma letra.");
  }
  const key = nicknameKeyOf(nickname);
  if (RESERVED_PREFIXES.some((word) => key.startsWith(word)) || RESERVED_WORDS.includes(key)) throw new RoomError("Esse apelido é reservado. Escolha outro.");
  return { nickname, key };
}

export function validatePassword(input: unknown): string {
  if (typeof input !== "string" || [...input].length < PASSWORD_MIN) {
    throw new RoomError(`A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`);
  }
  if (input.length > PASSWORD_MAX) throw new RoomError("Senha longa demais.");
  return input;
}

export function newAccount(params: {
  id: string;
  email: string;
  nickname: string;
  nicknameKey: string;
  avatar: string;
  passwordHash: string;
  now: number;
}): Account {
  return {
    id: params.id,
    email: params.email,
    nickname: params.nickname,
    nicknameKey: params.nicknameKey,
    avatar: params.avatar,
    passwordHash: params.passwordHash,
    createdAt: params.now,
    chips: STARTING_CHIPS,
    holds: [],
    bonusDay: null,
    stats: { played: 0, wins: 0, streak: 0, bestStreak: 0, chipsWon: 0, games: {} },
    badges: [],
    version: 0,
  };
}

/** Dia no fuso de Brasília (AAAA-MM-DD), para o bônus diário. */
export function dayKey(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(now));
}

export function claimBonus(account: Account, now: number): Account {
  const today = dayKey(now);
  if (account.bonusDay === today) throw new RoomError("Você já pegou o bônus de hoje. Volte amanhã!", 409);
  return { ...account, chips: account.chips + DAILY_BONUS, bonusDay: today };
}

/**
 * Separa a entrada de uma partida. Idempotente: a mesma partida não cobra duas
 * vezes. Partidas sem aposta também criam a retenção (de 0), que garante contar
 * a vitória uma vez só.
 */
export function placeHold(account: Account, hold: Hold): Account {
  if (account.holds.some((item) => item.matchId === hold.matchId)) return account;
  if (account.chips < hold.amount) {
    throw new RoomError(`${account.nickname} não tem fichas suficientes (a aposta é de ${hold.amount}).`, 409);
  }
  return { ...account, chips: account.chips - hold.amount, holds: [...account.holds, hold] };
}

/** Devolve a entrada de uma partida que não aconteceu ou sumiu. */
export function refundHold(account: Account, matchId: string): Account {
  const hold = account.holds.find((item) => item.matchId === matchId);
  if (!hold) return account;
  return { ...account, chips: account.chips + hold.amount, holds: account.holds.filter((item) => item !== hold) };
}

/**
 * Liquida a partida para esta conta: paga a parte do pote, conta partida e
 * vitória e concede selos. Só age se a retenção ainda existir — então chamar de
 * novo não paga nem conta duas vezes.
 */
export function applyResult(account: Account, result: MatchResult, now: number): Account {
  const hold = account.holds.find((item) => item.matchId === result.matchId);
  if (!hold) return account;
  const seat = result.seats.find((item) => item.userId === account.id);
  const holds = account.holds.filter((item) => item !== hold);
  if (!seat) return { ...account, chips: account.chips + hold.amount, holds };

  const won = result.winners.includes(seat.playerId);
  const payout = result.payouts[seat.playerId] ?? 0;
  const game = account.stats.games[result.gameId] ?? { played: 0, wins: 0 };
  const streak = won ? account.stats.streak + 1 : 0;
  const stats: Stats = {
    played: account.stats.played + 1,
    wins: account.stats.wins + (won ? 1 : 0),
    streak,
    bestStreak: Math.max(account.stats.bestStreak, streak),
    chipsWon: account.stats.chipsWon + payout - hold.amount,
    games: { ...account.stats.games, [result.gameId]: { played: game.played + 1, wins: game.wins + (won ? 1 : 0) } },
  };
  const earned = badgesEarned({
    wins: stats.wins,
    played: stats.played,
    streak,
    won,
    gameId: result.gameId,
    feats: result.feats[seat.playerId] ?? [],
    stake: result.stake,
    profit: payout - hold.amount,
  });
  const have = new Set(account.badges.map((badge) => badge.id));
  const badges = [...account.badges, ...earned.filter((id) => !have.has(id)).map((id) => ({ id, at: now }))];
  return { ...account, chips: account.chips + payout, holds, stats, badges };
}

export function newBadges(before: Account, after: Account): BadgeId[] {
  const had = new Set(before.badges.map((badge) => badge.id));
  return after.badges.map((badge) => badge.id).filter((id) => !had.has(id));
}

export function topBadges(account: Pick<Account, "badges">, count = 3): BadgeId[] {
  return rarestFirst(account.badges.map((badge) => badge.id).filter((id) => Object.hasOwn(BADGES, id))).slice(0, count);
}

export function cardOf(account: Account): PlayerCard {
  return { id: account.id, nickname: account.nickname, avatar: account.avatar, wins: account.stats.wins, badges: topBadges(account) };
}

export function meOf(account: Account, now: number): Me {
  const { passwordHash: _hash, nicknameKey: _key, version: _version, ...rest } = account;
  void _hash;
  void _key;
  void _version;
  return {
    ...rest,
    inPlay: account.holds.reduce((sum, hold) => sum + hold.amount, 0),
    bonusAvailable: account.bonusDay !== dayKey(now),
  };
}

export function profileOf(account: Account): PublicProfile {
  return {
    id: account.id,
    nickname: account.nickname,
    avatar: account.avatar,
    createdAt: account.createdAt,
    stats: account.stats,
    badges: account.badges,
  };
}
