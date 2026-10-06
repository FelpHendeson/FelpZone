"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeEvent, type Notice } from "@/games/magnata/describe";
import { themeOf } from "@/games/magnata/themes";
import type { PublicRoom } from "@/rooms/public";
import type { Prefs } from "./profile";
import { playChime } from "./sound";

const MAX_VISIBLE = 2;
/** Mais que isso desde a última vez = mostrar um resumo em vez da fila. */
const RESYNC_AFTER = 8;
const DURATION = { quick: 2500, card: 4500 } as const;

export interface ShownNotice extends Notice {
  key: string;
  avatar: string | null;
}

/**
 * Transforma os acontecimentos novos da partida em avisos, sem repetir: guarda
 * o último `seq` exibido. Quem entra ou recarrega começa do estado atual.
 */
export function useNotices(room: PublicRoom | null, meId: string | null, prefs: Prefs) {
  const [visible, setVisible] = useState<ShownNotice[]>([]);
  const queue = useRef<ShownNotice[]>([]);
  const lastSeq = useRef<number | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((key: string) => {
    clearTimeout(timers.current.get(key));
    timers.current.delete(key);
    setVisible((current) => current.filter((notice) => notice.key !== key));
  }, []);

  const pump = useCallback(() => {
    setVisible((current) => {
      const next = [...current];
      while (next.length < MAX_VISIBLE && queue.current.length > 0) {
        const notice = queue.current.shift()!;
        next.push(notice);
        if (notice.level !== "result") {
          timers.current.set(
            notice.key,
            setTimeout(() => {
              timers.current.delete(notice.key);
              setVisible((items) => items.filter((item) => item.key !== notice.key));
            }, DURATION[notice.level]),
          );
        }
      }
      return next;
    });
  }, []);

  const game = room?.game ?? null;
  const code = room?.code ?? "";

  useEffect(() => {
    if (!game) {
      lastSeq.current = null;
      return;
    }
    if (lastSeq.current === null) {
      lastSeq.current = game.eventSeq;
      return;
    }
    const fresh = game.events.filter((event) => event.seq > lastSeq.current!);
    if (fresh.length === 0) return;
    const missed = game.eventSeq - lastSeq.current;
    lastSeq.current = game.eventSeq;

    const people = new Map(room!.players.map((player) => [player.id, { name: player.name, avatar: player.avatar }]));
    const ctx = { theme: themeOf(game.themeId), people, meId };
    let notices = fresh.map((event) => describeEvent(event, ctx));

    if (missed > RESYNC_AFTER) {
      const summary: Notice = {
        seq: game.eventSeq,
        type: "turn-start",
        icon: "🕑",
        title: `${missed} acontecimentos enquanto você estava fora`,
        text: "Veja tudo na aba Histórico.",
        level: "card",
        tone: "info",
        actorId: null,
        involvesMe: true,
      };
      // Do que perdeu, só o resultado final merece aparecer além do resumo.
      notices = [summary, ...notices.filter((notice) => notice.level === "result")];
      queue.current = [];
    } else if (prefs.notices === "essential") {
      notices = notices.filter((notice) => notice.level === "result" || (notice.level === "card" && notice.involvesMe));
    }

    const shown = notices.map((notice) => ({
      ...notice,
      key: `${code}-${notice.seq}-${notice.type}`,
      avatar: notice.actorId ? (people.get(notice.actorId)?.avatar ?? null) : null,
    }));
    // Fila longa de avisos rápidos atrasa o que importa: descarta os rápidos excedentes.
    queue.current = [...queue.current, ...shown].filter(
      (notice, index, all) => notice.level !== "quick" || all.length - index <= 6,
    );
    if (prefs.sound) {
      const loud = shown.find((notice) => notice.level === "result" || (notice.level === "card" && notice.involvesMe));
      if (loud) playChime(loud.level === "result" ? "win" : loud.tone);
    }
    pump();
  }, [game, room, code, meId, prefs.notices, prefs.sound, pump]);

  // Quando um aviso sai, o próximo da fila entra.
  useEffect(() => {
    if (visible.length < MAX_VISIBLE && queue.current.length > 0) pump();
  }, [visible, pump]);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  return { notices: visible, dismiss };
}
