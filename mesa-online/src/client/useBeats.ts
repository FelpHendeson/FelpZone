"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildBeats, type Beat } from "@/games/magnata/beats";
import { themeOf } from "@/games/magnata/themes";
import type { PublicRoom } from "@/rooms/public";
import type { Prefs } from "./profile";
import { playChime } from "./sound";

/** Mais acontecimentos que isso desde a última vez: resumo em vez de fila. */
const RESYNC_AFTER = 14;

/**
 * Fila de lances para narrar a partida em janelas. Guarda o último `seq` e o
 * saldo de cada um para não repetir nada; quem entra ou recarrega começa do
 * estado atual (o passado fica no Histórico).
 */
export function useBeats(room: PublicRoom | null, meId: string | null, prefs: Prefs) {
  const [queue, setQueue] = useState<Beat[]>([]);
  const lastSeq = useRef<number | null>(null);
  const lastCash = useRef(new Map<string, number>());

  const enqueue = useCallback((beats: Beat[], replace: boolean) => {
    setQueue((current) => (replace ? beats : [...current, ...beats]));
  }, []);

  const game = room?.game ?? null;

  useEffect(() => {
    if (!game || !room) {
      lastSeq.current = null;
      return;
    }
    const cashNow = new Map(game.players.map((player) => [player.id, player.cash]));
    if (lastSeq.current === null) {
      lastSeq.current = game.eventSeq;
      lastCash.current = cashNow;
      return;
    }
    const fresh = game.events.filter((event) => event.seq > lastSeq.current!);
    if (fresh.length === 0) return;
    const missed = game.eventSeq - lastSeq.current;
    lastSeq.current = game.eventSeq;

    const people = new Map(room.players.map((player) => [player.id, { name: player.name, avatar: player.avatar }]));
    const ctx = { theme: themeOf(game.themeId), people, meId };
    let beats = buildBeats(fresh, ctx, lastCash.current, cashNow).filter((beat) => !beat.silent);
    lastCash.current = cashNow;

    if (missed > RESYNC_AFTER) {
      // Voltou depois de muito tempo: um resumo e o que importa agora.
      const keep = beats.filter((beat) => beat.level === "result" || (beat.actorId === meId && beat === beats.at(-1)));
      const summary: Beat = {
        key: -game.eventSeq,
        actorId: null,
        lines: [
          {
            seq: game.eventSeq,
            type: "turn-start",
            icon: "🕑",
            title: `${missed} acontecimentos enquanto você estava fora`,
            text: "Os saldos e o tabuleiro já estão atualizados. Veja tudo na aba Histórico.",
            level: "card",
            tone: "info",
            actorId: null,
            involvesMe: true,
          },
        ],
        startsTurn: false,
        cash: [],
        level: "info",
        involvesMe: true,
        silent: false,
      };
      enqueue([summary, ...keep], true);
      return;
    }
    if (prefs.notices === "essential") {
      beats = beats.filter((beat) => beat.level === "result" || beat.involvesMe);
    }
    if (prefs.sound) {
      const loud = beats.find((beat) => beat.level === "result" || (beat.involvesMe && beat.actorId !== meId));
      if (loud) playChime(loud.level === "result" ? "win" : loud.cash.some((c) => c.playerId === meId && c.amount < 0) ? "bad" : "info");
    }
    if (beats.length) enqueue(beats, false);
  }, [game, room, meId, prefs.notices, prefs.sound, enqueue]);

  const next = useCallback(() => setQueue((current) => current.slice(1)), []);
  /** Pula para o mais recente: mantém só o último lance (e um resultado, se houver). */
  const skipAll = useCallback(
    () => setQueue((current) => current.filter((beat, index) => beat.level === "result" || index === current.length - 1)),
    [],
  );

  return { beat: queue[0] ?? null, waiting: Math.max(0, queue.length - 1), next, skipAll };
}
