import type { Me, PublicProfile } from "@/accounts/account";
import type { GroupView } from "@/accounts/groups";
import type { GameId } from "@/games/registry";
import type { PublicRoom } from "@/rooms/public";
import type { Plaza, Where } from "@/accounts/plaza";
import type { RoomCommand } from "@/rooms/room";
import type { Seat } from "./seats";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("Sem conexão. Verifique a internet.", 0);
  }
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? "Algo deu errado.", response.status);
  return body;
}

function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-player-token": token } : {}) },
    body: JSON.stringify(body),
  });
}

/** Identificador do comando: um reenvio não repete o efeito no servidor. */
function newCommandId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createRoom(name: string, avatar: string, gameId: GameId = "magnata", options: Record<string, unknown> = {}) {
  return post<Seat & { room: PublicRoom }>("/api/rooms", { name, avatar, gameId, options });
}

export function joinRoom(code: string, name: string, avatar: string) {
  return post<Seat & { room: PublicRoom }>(`/api/rooms/${code}/join`, { name, avatar });
}

/** Com o token do assento, a resposta inclui o que só esta pessoa pode ver (a mão no dominó). */
export function fetchRoom(code: string, knownVersion: number, token?: string | null) {
  return request<{ room?: PublicRoom; unchanged?: true }>(`/api/rooms/${code}?v=${knownVersion}`, {
    headers: token ? { "x-player-token": token } : {},
  });
}

export function sendCommand(code: string, token: string, command: RoomCommand | Record<string, unknown>) {
  return post<{ room: PublicRoom }>(`/api/rooms/${code}/commands`, { ...command, commandId: newCommandId() }, token);
}

// ---------------------------------------------------------------------------
// Conta, praça e perfis

export const fetchMe = () => request<{ me: Me | null }>("/api/conta");

export const signUpAccount = (input: { email: string; nickname: string; password: string; avatar: string }) =>
  post<{ me: Me }>("/api/conta", input);

export const logInAccount = (input: { email: string; password: string }) => post<{ me: Me }>("/api/conta/entrar", input);

export const logOutAccount = () => post<{ ok: true }>("/api/conta/sair", {});

export const claimBonus = () => post<{ me: Me }>("/api/conta/bonus", {});

export const changeAccountAvatar = (avatar: string) => post<{ me: Me }>("/api/conta/retrato", { avatar });

export function fetchPlaza(where: Where | null, takeInbox: boolean, groupId: string | null = null) {
  const params = new URLSearchParams();
  if (where) {
    params.set("onde", where.status);
    if (where.status !== "menu") {
      params.set("jogo", where.gameId);
      if (where.code) params.set("sala", where.code);
    }
  }
  if (!takeInbox) params.set("avisos", "0");
  if (groupId) params.set("grupo", groupId);
  return request<Plaza>(`/api/praca?${params}`);
}

export const postPlaza = (
  body: { kind: "chat"; groupId: string; text: string } | { kind: "wave"; to: string } | { kind: "invite"; to: string; code: string },
) => post<{ ok: true }>("/api/praca", body);

export const fetchGroups = () => request<{ groups: GroupView[] }>("/api/grupos");

export const groupAction = (
  body: { kind: "create"; name: string } | { kind: "join"; code: string } | { kind: "leave"; groupId: string } | { kind: "remove"; groupId: string; memberId: string },
) => post<{ groups: GroupView[] }>("/api/grupos", body);

export const setBlockedUser = (userId: string, blocked: boolean) => post<{ blocked: string[] }>("/api/conta/bloqueio", { userId, blocked });

export const fetchPushKey = () => request<{ publicKey: string | null }>("/api/conta/avisos");

export const savePushSubscription = (subscription: unknown) => post<{ devices: number }>("/api/conta/avisos", { subscription });

export const deletePushSubscription = (endpoint: string) =>
  request<{ ok: true }>("/api/conta/avisos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

export const fetchProfile = (nickname: string) => request<{ profile: PublicProfile }>(`/api/jogadores/${encodeURIComponent(nickname)}`);
