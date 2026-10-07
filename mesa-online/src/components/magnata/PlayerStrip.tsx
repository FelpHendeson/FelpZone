"use client";

import { useEffect, useRef, useState } from "react";
import { money, type MagnataView } from "@/games/magnata/engine";
import type { PublicRoom } from "@/rooms/public";

interface Props {
  room: PublicRoom;
  game: MagnataView;
  meId: string | null;
  focusedId: string | null;
  onFocus: (playerId: string) => void;
}

/** Quanto tempo a variação de saldo fica visível ao lado do jogador. */
const DELTA_MS = 3500;

/**
 * Faixa sempre visível com todos os jogadores: de quem é a vez, quanto cada um
 * tem e quanto acabou de ganhar ou perder. Tocar num jogador foca a câmera nele.
 */
export function PlayerStrip({ room, game, meId, focusedId, onFocus }: Props) {
  const people = new Map(room.players.map((player) => [player.id, player]));
  const previous = useRef(new Map(game.players.map((player) => [player.id, player.cash])));
  const [deltas, setDeltas] = useState(new Map<string, { amount: number; key: number }>());

  useEffect(() => {
    const changes = new Map<string, { amount: number; key: number }>();
    for (const player of game.players) {
      const before = previous.current.get(player.id);
      if (before !== undefined && before !== player.cash) changes.set(player.id, { amount: player.cash - before, key: Date.now() });
      previous.current.set(player.id, player.cash);
    }
    if (changes.size === 0) return;
    const apply = (update: (current: Map<string, { amount: number; key: number }>) => Map<string, { amount: number; key: number }>) =>
      setDeltas(update);
    apply((current) => new Map([...current, ...changes]));
    const timer = setTimeout(
      () =>
        apply((current) => {
          const next = new Map(current);
          for (const [id, change] of changes) if (next.get(id)?.key === change.key) next.delete(id);
          return next;
        }),
      DELTA_MS,
    );
    return () => clearTimeout(timer);
  }, [game.players]);

  return (
    <ul className="player-strip" aria-label="Jogadores e saldos">
      {game.players.map((player) => {
        const seat = people.get(player.id);
        const delta = deltas.get(player.id);
        const turn = player.id === game.currentPlayerId && game.phase !== "finished";
        return (
          <li key={player.id}>
            <button
              className={`strip-chip${turn ? " turn" : ""}${player.id === focusedId ? " focused" : ""}${player.bankrupt ? " out" : ""}`}
              style={{ borderColor: player.color }}
              onClick={() => onFocus(player.id)}
              aria-label={`${player.id === meId ? "Você" : player.name}: ${player.bankrupt ? "faliu" : money(player.cash)}${
                turn ? ", jogando agora" : ""
              }. Focar no tabuleiro.`}
            >
              <span className="strip-avatar" aria-hidden>
                {seat?.avatar}
              </span>
              <span className="strip-text">
                <span className="strip-name">
                  {turn && <span aria-hidden>▶ </span>}
                  {player.id === meId ? "Você" : player.name}
                </span>
                <span className="strip-cash">{player.bankrupt ? "faliu" : money(player.cash)}</span>
              </span>
              {delta && (
                <span key={delta.key} className={`strip-delta ${delta.amount >= 0 ? "up" : "down"}`} aria-hidden>
                  {delta.amount >= 0 ? "+" : "−"}
                  {money(Math.abs(delta.amount))}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
