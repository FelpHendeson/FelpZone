import type { Room, RoomCommand } from "@/rooms/room";
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

export function createRoom(name: string) {
  return post<Seat & { room: Room }>("/api/rooms", { name, gameId: "magnata" });
}

export function joinRoom(code: string, name: string) {
  return post<Seat & { room: Room }>(`/api/rooms/${code}/join`, { name });
}

export function fetchRoom(code: string, knownVersion: number) {
  return request<{ room?: Room; unchanged?: true }>(`/api/rooms/${code}?v=${knownVersion}`);
}

export function sendCommand(code: string, token: string, command: RoomCommand) {
  return post<{ room: Room }>(`/api/rooms/${code}/commands`, command, token);
}
