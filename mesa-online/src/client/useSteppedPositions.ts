"use client";

import { useEffect, useState } from "react";

/** Intervalo entre um passo e outro do peão. */
const STEP_MS = 140;
/** Acima disso (ou indo para a prisão) o peão vai direto, sem andar. */
const MAX_WALK = 24;
const BOARD_SIZE = 40;

/**
 * Posição exibida de cada peão. Quando a posição real muda, o peão anda uma
 * casa por vez até lá, para todo mundo ver o caminho. Prisão, voltas para trás
 * e movimento reduzido vão direto.
 */
export function useSteppedPositions(
  players: { id: string; position: number; inJail: boolean }[],
  reduceMotion: boolean,
): Map<string, number> {
  const [shown, setShown] = useState(() => new Map(players.map((player) => [player.id, player.position])));

  useEffect(() => {
    const step = () =>
      setShown((previous) => {
        let changed = false;
        const next = new Map(previous);
        for (const player of players) {
          const current = previous.get(player.id);
          if (current === player.position) continue;
          changed = true;
          const forward = current === undefined ? 0 : (player.position - current + BOARD_SIZE) % BOARD_SIZE;
          const jump = current === undefined || reduceMotion || forward > MAX_WALK || player.inJail;
          next.set(player.id, jump ? player.position : (current + 1) % BOARD_SIZE);
        }
        return changed ? next : previous;
      });
    const timer = setInterval(step, STEP_MS);
    return () => clearInterval(timer);
  }, [players, reduceMotion]);

  return shown;
}

/** Movimento reduzido: preferência do perfil ou, se "automático", a do aparelho. */
export function prefersReducedMotion(pref: boolean | null): boolean {
  if (pref !== null) return pref;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
