// Grupos privados, presença, conversa por grupo, acenos, convites e bloqueios.
// Só quem divide um grupo se vê online, conversa e troca acenos e convites.

import { randomBytes, randomInt } from "node:crypto";
import { cardOf, type Account, type PlayerCard } from "@/accounts/account";
import {
  GROUP_CODE_ALPHABET,
  GROUP_CODE_LENGTH,
  MAX_GROUPS_PER_ACCOUNT,
  addMember,
  isMember,
  newGroup,
  normalizeGroupCode,
  normalizeGroupName,
  removeMember,
  type Group,
  type GroupView,
} from "@/accounts/groups";
import type { Notice, OnlineEntry, Plaza, PlazaMessage, Where } from "@/accounts/plaza";
import { GAMES } from "@/games/registry";
import { RoomError } from "@/rooms/room";
import { accountForToken, defaults, limit, readAccount, requireAccount, updateAccount, type Deps } from "./accounts";
import { CHAT_MAX, INBOX_MAX, keys, type Kv } from "./kv";
import { notify } from "./push";

/** Fica online por até 60 s depois do último sinal. */
export const ONLINE_WINDOW_MS = 60_000;
const MAX_TEXT = 200;
const MAX_WRITE_ATTEMPTS = 8;
const LIMITS = {
  chat: { limit: 10, window: 60 },
  social: { limit: 20, window: 600 },
  groups: { limit: 10, window: 3600 },
} as const;

// ---------------------------------------------------------------------------
// Documentos dos grupos

async function readGroup(kv: Kv, id: string): Promise<Group | null> {
  const json = await kv.get(keys.group(id));
  return json ? (JSON.parse(json) as Group) : null;
}

/** Lê, altera e grava com controle de versão. `null` apaga o grupo. */
async function updateGroup(kv: Kv, id: string, change: (group: Group) => Group | null): Promise<Group | null> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const before = await readGroup(kv, id);
    if (!before) throw new RoomError("Grupo não encontrado.", 404);
    const changed = change(before);
    if (changed === before) return before;
    if (changed === null) {
      await kv.del(keys.groupCode(before.code));
      await kv.del(keys.group(id));
      await kv.del(`${keys.group(id)}:v`);
      return null;
    }
    const after = { ...changed, version: before.version + 1 };
    if (await kv.writeDoc(keys.group(id), JSON.stringify(after), before.version, after.version)) return after;
  }
  throw new RoomError("O grupo está ocupado. Tente de novo.", 503);
}

async function groupsOf(kv: Kv, account: Account): Promise<Group[]> {
  const groups = await Promise.all((account.groups ?? []).map((id) => readGroup(kv, id)));
  return groups.filter((group): group is Group => group !== null && isMember(group, account.id));
}

async function viewOf(kv: Kv, group: Group): Promise<GroupView> {
  const cards = await Promise.all(group.members.map((member) => kv.get(keys.card(member.id))));
  return {
    id: group.id,
    name: group.name,
    code: group.code,
    ownerId: group.ownerId,
    members: group.members.map((member, index) => {
      const card = cards[index] ? (JSON.parse(cards[index]!) as PlayerCard) : null;
      return { id: member.id, nickname: card?.nickname ?? "Alguém", avatar: card?.avatar ?? "🙂" };
    }),
  };
}

const newCode = () => Array.from({ length: GROUP_CODE_LENGTH }, () => GROUP_CODE_ALPHABET[randomInt(GROUP_CODE_ALPHABET.length)]).join("");

// ---------------------------------------------------------------------------
// Casos de uso

export async function listGroups(token: string | null, deps: Deps = defaults()): Promise<GroupView[]> {
  const account = await requireAccount(token, deps);
  return Promise.all((await groupsOf(deps.kv, account)).map((group) => viewOf(deps.kv, group)));
}

export async function createGroup(token: string | null, rawName: unknown, deps: Deps = defaults(), now = Date.now()): Promise<GroupView> {
  const account = await requireAccount(token, deps);
  const name = normalizeGroupName(rawName);
  if ((account.groups ?? []).length >= MAX_GROUPS_PER_ACCOUNT) {
    throw new RoomError(`Você já está em ${MAX_GROUPS_PER_ACCOUNT} grupos. Saia de um para criar outro.`, 409);
  }
  await limit(deps.kv, `grupos:${account.id}`, LIMITS.groups, "Muitos grupos criados seguidos. Tente mais tarde.");
  const id = randomBytes(8).toString("hex");
  let code = "";
  for (let attempt = 0; attempt < 8 && !code; attempt += 1) {
    const candidate = newCode();
    if (await deps.kv.setNx(keys.groupCode(candidate), id)) code = candidate;
  }
  if (!code) throw new RoomError("Não foi possível criar o grupo. Tente de novo.", 503);
  const group = { ...newGroup({ id, name, code, ownerId: account.id, now }), version: 1 };
  await deps.kv.writeDoc(keys.group(id), JSON.stringify(group), 0, 1);
  await updateAccount(deps.kv, account.id, (current) => ({ ...current, groups: [...(current.groups ?? []), id] }));
  return viewOf(deps.kv, group);
}

export async function joinGroup(token: string | null, rawCode: unknown, deps: Deps = defaults(), now = Date.now()): Promise<GroupView> {
  const account = await requireAccount(token, deps);
  const code = normalizeGroupCode(rawCode);
  await limit(deps.kv, `grupos:${account.id}`, LIMITS.groups, "Muitas tentativas seguidas. Tente mais tarde.");
  const id = await deps.kv.get(keys.groupCode(code));
  if (!id) throw new RoomError("Nenhum grupo com esse código.", 404);
  if (!(account.groups ?? []).includes(id) && (account.groups ?? []).length >= MAX_GROUPS_PER_ACCOUNT) {
    throw new RoomError(`Você já está em ${MAX_GROUPS_PER_ACCOUNT} grupos. Saia de um para entrar em outro.`, 409);
  }
  const group = await updateGroup(deps.kv, id, (current) => addMember(current, account.id, now));
  await updateAccount(deps.kv, account.id, (current) =>
    (current.groups ?? []).includes(id) ? current : { ...current, groups: [...(current.groups ?? []), id] },
  );
  return viewOf(deps.kv, group!);
}

export async function leaveGroup(token: string | null, groupId: unknown, deps: Deps = defaults()): Promise<void> {
  const account = await requireAccount(token, deps);
  if (typeof groupId !== "string") throw new RoomError("Grupo inválido.");
  await updateGroup(deps.kv, groupId, (group) => (isMember(group, account.id) ? removeMember(group, account.id) : group)).catch((error) => {
    if (!(error instanceof RoomError && error.status === 404)) throw error;
  });
  await updateAccount(deps.kv, account.id, (current) => ({ ...current, groups: (current.groups ?? []).filter((id) => id !== groupId) }));
}

/** O dono tira alguém do grupo. */
export async function removeFromGroup(token: string | null, groupId: unknown, memberId: unknown, deps: Deps = defaults()): Promise<GroupView> {
  const account = await requireAccount(token, deps);
  if (typeof groupId !== "string" || typeof memberId !== "string") throw new RoomError("Pedido inválido.");
  if (memberId === account.id) throw new RoomError("Para sair, use “Sair do grupo”.");
  const group = await updateGroup(deps.kv, groupId, (current) => {
    if (current.ownerId !== account.id) throw new RoomError("Só quem cuida do grupo pode tirar pessoas.", 403);
    return removeMember(current, memberId);
  });
  await updateAccount(deps.kv, memberId, (current) => ({ ...current, groups: (current.groups ?? []).filter((id) => id !== groupId) })).catch(
    () => undefined,
  );
  return viewOf(deps.kv, group!);
}

export async function setBlocked(token: string | null, targetId: unknown, blocked: boolean, deps: Deps = defaults()) {
  const account = await requireAccount(token, deps);
  if (typeof targetId !== "string" || targetId === account.id) throw new RoomError("Escolha outra pessoa.");
  if (!(await readAccount(deps.kv, targetId))) throw new RoomError("Jogador não encontrado.", 404);
  const { after } = await updateAccount(deps.kv, account.id, (current) => {
    const list = (current.blocked ?? []).filter((id) => id !== targetId);
    return { ...current, blocked: blocked ? [...list, targetId] : list };
  });
  return after.blocked ?? [];
}

// ---------------------------------------------------------------------------
// Presença, conversa, acenos e convites

/** Ids de quem divide algum grupo com a conta, e os grupos em comum. */
function circleOf(account: Account, groups: Group[]): Map<string, string[]> {
  const circle = new Map<string, string[]>();
  for (const group of groups) {
    for (const member of group.members) circle.set(member.id, [...(circle.get(member.id) ?? []), group.id]);
  }
  for (const blocked of account.blocked ?? []) circle.delete(blocked);
  return circle;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Uma atualização do menu: marca presença e devolve online (dos seus grupos), conversa e avisos. */
export async function plazaTick(
  token: string | null,
  where: Where | null,
  takeInbox: boolean,
  chatGroupId: string | null = null,
  deps: Deps = defaults(),
  now = Date.now(),
): Promise<Plaza> {
  const account = await accountForToken(token, deps);
  const groups = account ? await groupsOf(deps.kv, account) : [];
  const chatGroup = groups.find((group) => group.id === chatGroupId) ?? groups[0] ?? null;
  const snapshot = await deps.kv.plaza({
    userId: account?.id ?? null,
    where: where ? JSON.stringify({ ...where, at: now }) : null,
    now,
    windowMs: ONLINE_WINDOW_MS,
    takeInbox,
    chatKey: chatGroup ? keys.groupChat(chatGroup.id) : null,
  });
  if (!account) return { meId: null, online: [], chatGroupId: null, chat: [], inbox: [] };

  const circle = circleOf(account, groups);
  const blocked = new Set(account.blocked ?? []);
  const online: OnlineEntry[] = [];
  for (const [card, place] of snapshot.online) {
    const parsed = parseJson<PlayerCard>(card);
    if (!parsed || !circle.has(parsed.id)) continue;
    const at = parseJson<Where & { at?: number }>(place);
    // O código da sala não sai do servidor.
    const shown: Where | null = at ? (at.status === "menu" ? { status: "menu" } : { status: at.status, gameId: at.gameId }) : null;
    online.push({ ...parsed, where: shown, groups: circle.get(parsed.id)! });
  }
  return {
    meId: account.id,
    online,
    chatGroupId: chatGroup?.id ?? null,
    chat: snapshot.chat
      .map((item) => parseJson<PlazaMessage>(item))
      .filter((item): item is PlazaMessage => item !== null && !blocked.has(item.userId)),
    inbox: snapshot.inbox
      .map((item) => parseJson<Notice>(item))
      .filter((item): item is Notice => item !== null && !blocked.has(item.from.id)),
  };
}

function cleanText(input: unknown): string {
  if (typeof input !== "string") throw new RoomError("Mensagem inválida.");
  const text = input.replace(/[\p{C}]/gu, " ").replace(/\s+/g, " ").trim();
  if (!text) throw new RoomError("Mensagem vazia.");
  if ([...text].length > MAX_TEXT) throw new RoomError(`Use até ${MAX_TEXT} caracteres.`);
  return text;
}

/** Conversa no grupo, aceno ou convite para a própria sala. */
export async function plazaPost(token: string | null, body: Record<string, unknown>, deps: Deps = defaults(), now = Date.now()): Promise<void> {
  const account = await requireAccount(token, deps);
  const id = randomBytes(6).toString("hex");
  const groups = await groupsOf(deps.kv, account);

  if (body.kind === "chat") {
    const text = cleanText(body.text);
    const group = groups.find((item) => item.id === body.groupId);
    if (!group) throw new RoomError("Escolha um grupo seu para conversar.", 403);
    await limit(deps.kv, `praca:${account.id}`, LIMITS.chat, "Muitas mensagens seguidas. Aguarde um pouco.");
    const message: PlazaMessage = { id, groupId: group.id, userId: account.id, nickname: account.nickname, avatar: account.avatar, text, at: now };
    await deps.kv.push(keys.groupChat(group.id), JSON.stringify(message), CHAT_MAX);
    return;
  }
  if (body.kind !== "wave" && body.kind !== "invite") throw new RoomError("Ação inválida.");
  if (typeof body.to !== "string" || body.to === account.id) throw new RoomError("Escolha outra pessoa.");
  const target = await readAccount(deps.kv, body.to);
  if (!target) throw new RoomError("Jogador não encontrado.", 404);
  // Só entre quem divide um grupo; quem bloqueou não recebe nada (sem contar a quem enviou).
  if (!circleOf(account, groups).has(target.id)) throw new RoomError("Vocês não estão no mesmo grupo.", 403);
  await limit(deps.kv, `social:${account.id}`, LIMITS.social, "Muitos convites e acenos seguidos. Aguarde um pouco.");
  if ((target.blocked ?? []).includes(account.id)) return;

  let notice: Notice;
  if (body.kind === "wave") {
    notice = { id, kind: "wave", from: cardOf(account), at: now };
  } else {
    const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
    const stored = code ? await deps.store.read(code) : null;
    if (!stored) throw new RoomError("Sala não encontrada.", 404);
    if (!stored.room.players.some((player) => player.userId === account.id)) throw new RoomError("Você só pode convidar para uma sala em que está.", 403);
    if (stored.room.status !== "lobby") throw new RoomError("A partida dessa sala já começou.", 409);
    notice = { id, kind: "invite", from: cardOf(account), code, gameId: stored.room.gameId, at: now };
  }
  await deps.kv.push(keys.inbox(target.id), JSON.stringify(notice), INBOX_MAX, 60 * 60 * 24);
  notify(
    target.id,
    notice.kind === "wave"
      ? { title: `👋 ${account.nickname} acenou para você`, body: "Abra a Mesa Online para jogar junto.", url: "/", tag: `aceno-${account.id}` }
      : {
          title: `${account.nickname} te chamou para ${GAMES[notice.gameId].name}`,
          body: `Sala ${notice.code}: toque para entrar.`,
          url: `/sala/${notice.code}`,
          tag: `convite-${notice.code}`,
        },
    deps,
  );
}
