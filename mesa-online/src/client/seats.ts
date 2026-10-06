// Identidade do jogador em cada sala, guardada neste navegador.

import { useMemo } from "react";
import { readValue, removeValue, useStoredValue, writeValue } from "./storage";

export interface Seat {
  playerId: string;
  token: string;
}

const seatKey = (code: string) => `mesa:assento:${code}`;
const RECENT_KEY = "mesa:recentes";
const MAX_RECENT = 5;

export function saveSeat(code: string, seat: Seat) {
  writeValue(seatKey(code), JSON.stringify(seat));
  const recent = recentRooms().filter((item) => item.code !== code);
  writeValue(RECENT_KEY, JSON.stringify([{ code, at: Date.now() }, ...recent].slice(0, MAX_RECENT)));
}

export function forgetRoom(code: string) {
  removeValue(seatKey(code));
  writeValue(RECENT_KEY, JSON.stringify(recentRooms().filter((item) => item.code !== code)));
}

function parseSeat(raw: string | null): Seat | null {
  if (!raw) return null;
  try {
    const seat = JSON.parse(raw) as Seat;
    return typeof seat.playerId === "string" && typeof seat.token === "string" ? seat : null;
  } catch {
    return null;
  }
}

export function readSeat(code: string): Seat | null {
  return parseSeat(readValue(seatKey(code)));
}

export function useSeat(code: string): Seat | null {
  const raw = useStoredValue(seatKey(code));
  return useMemo(() => parseSeat(raw), [raw]);
}

export function recentRooms(): { code: string; at: number }[] {
  try {
    const list = JSON.parse(readValue(RECENT_KEY) ?? "[]") as { code: string; at: number }[];
    return Array.isArray(list) ? list.filter((item) => typeof item.code === "string" && readSeat(item.code)) : [];
  } catch {
    return [];
  }
}

export function useRecentRooms() {
  const raw = useStoredValue(RECENT_KEY);
  // `raw` só serve para reagir a mudanças; a lista é relida com os assentos.
  return useMemo(() => (raw === null ? [] : recentRooms()), [raw]);
}

/** Link que leva o assento para outro aparelho. O fragmento `#` não vai ao servidor. */
export function resumeLink(code: string, seat: Seat): string {
  return `${window.location.origin}/sala/${code}#retomar=${seat.playerId}.${seat.token}`;
}

/** Lê `#retomar=...` da URL, guarda o assento e limpa o fragmento. */
export function claimResumeFragment(code: string): boolean {
  const match = /^#retomar=([0-9a-f]+)\.([\w-]+)$/.exec(window.location.hash);
  if (!match) return false;
  saveSeat(code, { playerId: match[1], token: match[2] });
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}
