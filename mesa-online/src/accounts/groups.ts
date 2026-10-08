// Grupos privados: só quem divide um grupo se vê online, conversa, acena e
// convida. Regras puras; o armazenamento fica em src/server/groups.ts.

import { RoomError } from "@/rooms/room";

export const MAX_GROUP_MEMBERS = 30;
export const MAX_GROUPS_PER_ACCOUNT = 5;
export const GROUP_CODE_LENGTH = 6;
/** Sem letras e números que se confundem (0/O, 1/I/L). */
export const GROUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export interface GroupMember {
  id: string;
  joinedAt: number;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: number;
  version: number;
}

/** O que o navegador recebe de um grupo: membros com apelido e retrato. */
export interface GroupView {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: { id: string; nickname: string; avatar: string }[];
}

export function normalizeGroupName(input: unknown): string {
  if (typeof input !== "string") throw new RoomError("Dê um nome ao grupo.");
  const name = input.replace(/[\p{C}]/gu, " ").replace(/\s+/g, " ").trim();
  const length = [...name].length;
  if (length < 3 || length > 30) throw new RoomError("O nome do grupo precisa ter de 3 a 30 caracteres.");
  return name;
}

export function normalizeGroupCode(input: unknown): string {
  const code = typeof input === "string" ? input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (code.length !== GROUP_CODE_LENGTH || [...code].some((char) => !GROUP_CODE_ALPHABET.includes(char))) {
    throw new RoomError("Código de grupo inválido. Confira as 6 letras e números.", 404);
  }
  return code;
}

export function newGroup(params: { id: string; name: string; code: string; ownerId: string; now: number }): Group {
  return {
    id: params.id,
    name: params.name,
    code: params.code,
    ownerId: params.ownerId,
    members: [{ id: params.ownerId, joinedAt: params.now }],
    createdAt: params.now,
    version: 0,
  };
}

export const isMember = (group: Group, userId: string) => group.members.some((member) => member.id === userId);

export function addMember(group: Group, userId: string, now: number): Group {
  if (isMember(group, userId)) return group;
  if (group.members.length >= MAX_GROUP_MEMBERS) throw new RoomError(`O grupo já tem ${MAX_GROUP_MEMBERS} pessoas.`, 409);
  return { ...group, members: [...group.members, { id: userId, joinedAt: now }] };
}

/**
 * Tira alguém do grupo. Se era o dono, o grupo passa para quem está há mais
 * tempo; se ninguém sobrar, devolve `null` (o grupo acaba).
 */
export function removeMember(group: Group, userId: string): Group | null {
  const members = group.members.filter((member) => member.id !== userId);
  if (members.length === 0) return null;
  const ownerId = group.ownerId === userId ? [...members].sort((a, b) => a.joinedAt - b.joinedAt)[0].id : group.ownerId;
  return { ...group, members, ownerId };
}
