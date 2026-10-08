"use client";

import { useEffect, useRef, useState } from "react";
import type { Notice, Plaza, Where } from "@/accounts/plaza";
import { fetchPlaza } from "./api";

/**
 * Sinal de presença e, no menu, quem está online, a praça e os avisos. No
 * menu atualiza a cada 10 s; na sala, só manda o sinal a cada 30 s.
 */
export function usePlaza(where: Where | null, options: { full: boolean; enabled: boolean }) {
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const wake = useRef<() => void>(() => {});
  const whereKey = where ? JSON.stringify(where) : "";

  useEffect(() => {
    if (!options.enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const place = whereKey ? (JSON.parse(whereKey) as Where) : null;
    const interval = options.full ? 10_000 : 30_000;

    async function tick() {
      clearTimeout(timer);
      if (!document.hidden) {
        try {
          const next = await fetchPlaza(place, options.full);
          if (stopped) return;
          setPlaza(next);
          if (next.inbox.length) setNotices((current) => [...next.inbox, ...current].slice(0, 6));
        } catch {
          // Sem rede: tenta de novo no próximo intervalo.
        }
      }
      if (!stopped) timer = setTimeout(tick, interval);
    }
    wake.current = () => void tick();
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [whereKey, options.full, options.enabled]);

  return {
    plaza,
    notices,
    dismiss: (id: string) => setNotices((current) => current.filter((notice) => notice.id !== id)),
    refresh: () => wake.current(),
  };
}
