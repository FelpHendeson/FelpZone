"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoom } from "@/rooms/public";
import { ApiError, fetchRoom } from "./api";

/**
 * Mantém a sala sincronizada por consulta periódica. O intervalo começa curto
 * e cresce quando nada muda, para caber no plano gratuito do Redis.
 */
export function useRoom(code: string) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A última consulta falhou por rede: mostrar "Reconectando…". */
  const [offline, setOffline] = useState(false);
  const versionRef = useRef(0);
  const wakeRef = useRef<() => void>(() => {});

  const applyRoom = useCallback((next: PublicRoom) => {
    if (next.version <= versionRef.current) return;
    versionRef.current = next.version;
    setRoom(next);
    wakeRef.current();
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let quietPolls = 0;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(poll, delay);
    };

    async function poll() {
      if (document.hidden) return schedule(5000);
      try {
        const result = await fetchRoom(code, versionRef.current);
        if (stopped) return;
        setError(null);
        setOffline(false);
        if (result.room) {
          quietPolls = 0;
          applyRoom(result.room);
        } else {
          quietPolls += 1;
        }
      } catch (caught) {
        if (stopped) return;
        const status = caught instanceof ApiError ? caught.status : 0;
        if (status === 0) setOffline(true);
        else setError(caught instanceof ApiError ? caught.message : "Falha ao atualizar a sala.");
        if (status === 404) return;
        quietPolls += 1;
      }
      schedule(quietPolls < 30 ? 1000 : quietPolls < 90 ? 2000 : 4000);
    }

    wakeRef.current = () => {
      quietPolls = 0;
    };
    const onVisible = () => {
      if (!document.hidden) {
        quietPolls = 0;
        schedule(0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    schedule(0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [code, applyRoom]);

  return { room, error, offline, applyRoom };
}
