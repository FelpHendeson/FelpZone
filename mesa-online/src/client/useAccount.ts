"use client";

// A conta de quem está usando o site, compartilhada entre as telas. A sessão
// fica num cookie que só o servidor lê; aqui guardamos só o que ele devolve.

import { useEffect, useSyncExternalStore } from "react";
import type { Me } from "@/accounts/account";
import { fetchMe } from "./api";

type State = { me: Me | null; loaded: boolean };

let state: State = { me: null, loaded: false };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function emit(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

/** Atualiza a conta com o que uma resposta da API trouxe. */
export function setMe(me: Me | null) {
  emit({ me, loaded: true });
}

/** Busca a conta de novo (por exemplo, depois de uma partida). */
export function refreshMe(): Promise<void> {
  loading ??= fetchMe()
    .then(({ me }) => setMe(me))
    .catch(() => emit({ ...state, loaded: true }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const SERVER_STATE: State = { me: null, loaded: false };

export function useAccount(): State {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  useEffect(() => {
    if (!state.loaded) void refreshMe();
  }, []);
  return current;
}
