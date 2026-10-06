// Identidade do jogador em cada sala, guardada apenas neste navegador.

import { useMemo, useSyncExternalStore } from "react";

export interface Seat {
  playerId: string;
  token: string;
}

const listeners = new Set<() => void>();
const seatKey = (code: string) => `mesa:assento:${code}`;
const NAME_KEY = "mesa:nome";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Navegação privada pode bloquear o armazenamento; a sessão segue sem lembrar.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveSeat(code: string, seat: Seat) {
  writeStorage(seatKey(code), JSON.stringify(seat));
  listeners.forEach((listener) => listener());
}

export function useSeat(code: string): Seat | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => readStorage(seatKey(code)),
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try {
      const seat = JSON.parse(raw) as Seat;
      return typeof seat.playerId === "string" && typeof seat.token === "string" ? seat : null;
    } catch {
      return null;
    }
  }, [raw]);
}

export function rememberedName(): string {
  return readStorage(NAME_KEY) ?? "";
}

export function rememberName(name: string) {
  writeStorage(NAME_KEY, name);
}
