import type { PublicRoom } from "@/rooms/public";
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

export function createRoom(name: string, avatar: string) {
  return post<Seat & { room: PublicRoom }>("/api/rooms", { name, avatar, gameId: "magnata" });
}

export function joinRoom(code: string, name: string, avatar: string) {
  return post<Seat & { room: PublicRoom }>(`/api/rooms/${code}/join`, { name, avatar });
}

export function fetchRoom(code: string, knownVersion: number) {
  return request<{ room?: PublicRoom; unchanged?: true }>(`/api/rooms/${code}?v=${knownVersion}`);
}

export function sendCommand(code: string, token: string, command: RoomCommand | Record<string, unknown>) {
  return post<{ room: PublicRoom }>(`/api/rooms/${code}/commands`, { ...command, commandId: newCommandId() }, token);
}
