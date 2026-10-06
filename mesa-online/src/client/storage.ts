// Armazenamento local com reserva em memória: se o navegador bloquear o
// localStorage (aba privada, cota, política), a sessão atual continua jogável.

import { useSyncExternalStore } from "react";

const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let available: boolean | null = null;

/** O navegador está guardando dados de verdade? */
export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const probe = "mesa:teste";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function readValue(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeValue(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Fica só na memória desta aba; a interface avisa quem estiver jogando.
  }
  listeners.forEach((listener) => listener());
}

export function removeValue(key: string) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nada a fazer.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Valor bruto de uma chave, reativo; `null` no servidor. */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readValue(key), () => null);
}

export function useStorageAvailable(): boolean {
  return useSyncExternalStore(subscribe, storageAvailable, () => true);
}
