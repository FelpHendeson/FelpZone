// Casos de uso das contas: cadastro, login, sessão, carteira, apostas, praça.
// Senhas só como hash scrypt com sal; sessões só como hash do token.

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import {
  applyResult,
  cardOf,
  claimBonus,
  meOf,
  newAccount,
  normalizeEmail,
  normalizeNickname,
  nicknameKeyOf,
  placeHold,
  profileOf,
  refundHold,
  topBadges,
  validatePassword,
  type Account,
  type Me,
  type PublicProfile,
} from "@/accounts/account";
import { avatarOr, isAvatar } from "@/rooms/avatars";
import { RoomError, type Identity, type MatchResult, type Room } from "@/rooms/room";
import { getKv, keys, type Kv } from "./kv";
import { getRoomStore, type RoomStore } from "./store";

export const SESSION_COOKIE = "mesa_sessao";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_WRITE_ATTEMPTS = 8;
const LIMITS = {
  signup: { limit: 10, window: 3600 },
  loginIp: { limit: 10, window: 600 },
  loginEmail: { limit: 10, window: 600 },
} as const;

export interface Deps {
  kv: Kv;
  store: RoomStore;
}

export const defaults = (): Deps => ({ kv: getKv(), store: getRoomStore() });

// ---------------------------------------------------------------------------
// Senhas e sessões

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash usado quando o e-mail não existe, para o tempo de resposta não denunciar isso. */
let decoyHash: Promise<string> | null = null;

const sessionKey = (token: string) => keys.session(createHash("sha256").update(token).digest("hex"));

async function openSession(kv: Kv, userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(sessionKey(token), userId, SESSION_TTL_SECONDS);
  return token;
}

export async function limit(kv: Kv, key: string, rule: { limit: number; window: number }, message = "Muitas tentativas. Aguarde alguns minutos.") {
  if (!(await kv.hit(key, rule.limit, rule.window))) throw new RoomError(message, 429);
}

// ---------------------------------------------------------------------------
// Documento da conta

export async function readAccount(kv: Kv, id: string): Promise<Account | null> {
  const json = await kv.get(keys.account(id));
  return json ? (JSON.parse(json) as Account) : null;
}

/** Lê, altera e grava com controle de versão; atualiza o cartão público. */
export async function updateAccount(kv: Kv, id: string, change: (account: Account) => Account): Promise<{ before: Account; after: Account }> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const before = await readAccount(kv, id);
    if (!before) throw new RoomError("Conta não encontrada.", 404);
    const changed = change(before);
    if (changed === before) return { before, after: before };
    const after = { ...changed, version: before.version + 1 };
    if (await kv.writeDoc(keys.account(id), JSON.stringify(after), before.version, after.version)) {
      await kv.set(keys.card(id), JSON.stringify(cardOf(after)));
      return { before, after };
    }
  }
  throw new RoomError("A conta está ocupada. Tente de novo.", 503);
}

export async function accountForToken(token: string | null, deps: Deps = defaults()): Promise<Account | null> {
  if (!token) return null;
  const userId = await deps.kv.get(sessionKey(token));
  return userId ? readAccount(deps.kv, userId) : null;
}

export async function requireAccount(token: string | null, deps: Deps): Promise<Account> {
  const account = await accountForToken(token, deps);
  if (!account) throw new RoomError("Entre na sua conta para continuar.", 401);
  return account;
}

// ---------------------------------------------------------------------------
// Cadastro, login e perfil

export async function signUp(
  input: { email: unknown; nickname: unknown; password: unknown; avatar?: unknown; ip?: string | null },
  deps: Deps = defaults(),
  now = Date.now(),
): Promise<{ me: Me; token: string }> {
  const email = normalizeEmail(input.email);
  const { nickname, key } = normalizeNickname(input.nickname);
  const password = validatePassword(input.password);
  await limit(deps.kv, `cadastro:${input.ip ?? "?"}`, LIMITS.signup, "Muitos cadastros deste lugar. Tente mais tarde.");

  const id = randomBytes(9).toString("hex");
  if (!(await deps.kv.setNx(keys.email(email), id))) throw new RoomError("Este e-mail já tem uma conta. Entre com ele.", 409);
  if (!(await deps.kv.setNx(keys.nickname(key), id))) {
    await deps.kv.del(keys.email(email));
    throw new RoomError("Esse apelido já está em uso. Escolha outro.", 409);
  }
  const account = newAccount({
    id,
    email,
    nickname,
    nicknameKey: key,
    avatar: avatarOr(input.avatar, nickname),
    passwordHash: await hashPassword(password),
    now,
  });
  const saved = { ...account, version: 1 };
  await deps.kv.writeDoc(keys.account(id), JSON.stringify(saved), 0, 1);
  await deps.kv.set(keys.card(id), JSON.stringify(cardOf(saved)));
  return { me: meOf(saved, now), token: await openSession(deps.kv, id) };
}

export async function logIn(
  input: { email: unknown; password: unknown; ip?: string | null },
  deps: Deps = defaults(),
  now = Date.now(),
): Promise<{ me: Me; token: string }> {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  await limit(deps.kv, `login:${input.ip ?? "?"}`, LIMITS.loginIp);
  await limit(deps.kv, `login-email:${email}`, LIMITS.loginEmail);
  const id = email ? await deps.kv.get(keys.email(email)) : null;
  const account = id ? await readAccount(deps.kv, id) : null;
  if (!account) {
    decoyHash ??= hashPassword("senha-de-mentira");
    await verifyPassword(password, await decoyHash);
    throw new RoomError("E-mail ou senha incorretos.", 401);
  }
  if (!(await verifyPassword(password, account.passwordHash))) throw new RoomError("E-mail ou senha incorretos.", 401);
  const settled = await settleHolds(account, deps, now);
  return { me: meOf(settled, now), token: await openSession(deps.kv, account.id) };
}

export async function logOut(token: string | null, deps: Deps = defaults()): Promise<void> {
  if (token) await deps.kv.del(sessionKey(token));
}

/** A própria conta, já com partidas terminadas pagas e entradas de salas sumidas devolvidas. */
export async function currentMe(token: string | null, deps: Deps = defaults(), now = Date.now()): Promise<Me | null> {
  const account = await accountForToken(token, deps);
  if (!account) return null;
  return meOf(await settleHolds(account, deps, now), now);
}

export async function claimDailyBonus(token: string | null, deps: Deps = defaults(), now = Date.now()): Promise<Me> {
  const account = await requireAccount(token, deps);
  const { after } = await updateAccount(deps.kv, account.id, (current) => claimBonus(current, now));
  return meOf(after, now);
}

export async function changeAvatar(token: string | null, avatar: unknown, deps: Deps = defaults(), now = Date.now()): Promise<Me> {
  if (!isAvatar(avatar)) throw new RoomError("Retrato inválido.");
  const account = await requireAccount(token, deps);
  const { after } = await updateAccount(deps.kv, account.id, (current) => (current.avatar === avatar ? current : { ...current, avatar }));
  return meOf(after, now);
}

/** Quem está entrando numa sala, se estiver logado. */
export async function identityFor(token: string | null, deps: Deps = defaults()): Promise<Identity | null> {
  const account = await accountForToken(token, deps);
  if (!account) return null;
  return { userId: account.id, nickname: account.nickname, avatar: account.avatar, wins: account.stats.wins, badges: topBadges(account) };
}

export async function publicProfile(nickname: string, deps: Deps = defaults()): Promise<PublicProfile> {
  const id = await deps.kv.get(keys.nickname(nicknameKeyOf(nickname.trim())));
  const account = id ? await readAccount(deps.kv, id) : null;
  if (!account) throw new RoomError("Jogador não encontrado.", 404);
  return profileOf(account);
}

// ---------------------------------------------------------------------------
// Apostas e resultados

const accountSeats = (room: Room) => room.players.filter((player) => player.userId && !player.bot);

/**
 * Separa a entrada de cada conta da mesa ao começar a partida. Se faltar ficha
 * para alguém, devolve o que já tinha sido separado e ninguém é cobrado.
 */
export async function holdStakes(room: Room, deps: Deps = defaults(), now = Date.now()): Promise<void> {
  const match = room.match;
  if (!match) return;
  const done: string[] = [];
  try {
    for (const player of accountSeats(room)) {
      await updateAccount(deps.kv, player.userId!, (account) =>
        placeHold(account, { matchId: match.id, roomCode: room.code, amount: match.stake, at: now }),
      );
      done.push(player.userId!);
    }
  } catch (error) {
    await releaseStakes(match.id, done, deps);
    throw error;
  }
}

export async function releaseStakes(matchId: string, userIds: string[], deps: Deps = defaults()): Promise<void> {
  for (const userId of userIds) {
    await updateAccount(deps.kv, userId, (account) => refundHold(account, matchId)).catch((error) => console.error(error));
  }
}

/** Paga o pote e conta a partida para cada conta. Idempotente. */
export async function settleResult(result: MatchResult, deps: Deps = defaults(), now = Date.now()): Promise<void> {
  for (const seat of result.seats) {
    if (!seat.userId) continue;
    await updateAccount(deps.kv, seat.userId, (account) => applyResult(account, result, now)).catch((error) => console.error(error));
  }
}

/** Liquida retenções pendentes: partida terminada paga; sala sumida devolve a entrada. */
async function settleHolds(account: Account, deps: Deps, now: number): Promise<Account> {
  if (account.holds.length === 0) return account;
  const decisions = new Map<string, MatchResult | "refund">();
  for (const hold of account.holds) {
    const stored = await deps.store.read(hold.roomCode);
    const result = stored?.room.results?.find((item) => item.matchId === hold.matchId);
    if (result) decisions.set(hold.matchId, result);
    else if (!stored || stored.room.match?.id !== hold.matchId) decisions.set(hold.matchId, "refund");
  }
  if (decisions.size === 0) return account;
  const { after } = await updateAccount(deps.kv, account.id, (current) => {
    let next = current;
    for (const [matchId, decision] of decisions) {
      next = decision === "refund" ? refundHold(next, matchId) : applyResult(next, decision, now);
    }
    return next;
  });
  return after;
}
