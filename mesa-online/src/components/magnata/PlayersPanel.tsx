"use client";

import { money, netWorth, type MagnataView } from "@/games/magnata/engine";
import type { PublicRoom } from "@/rooms/public";


export function PlayersPanel({ game, room, myId }: { game: MagnataView; room: PublicRoom; myId: string | null }) {
  const people = new Map(room.players.map((player) => [player.id, player]));
  const showWorth = game.roundLimit !== null || game.turnLimit !== null;
  return (
    <ul className="player-list">
      {game.players.map((player) => {
        const owned = Object.values(game.properties).filter((property) => property.owner === player.id).length;
        const seat = people.get(player.id);
        return (
          <li key={player.id} className={player.bankrupt ? "out" : undefined}>
            <span className="avatar" style={{ borderColor: player.color }} aria-hidden>
              {seat?.avatar}
            </span>
            <span>
              {player.name}
              {player.id === myId && <span className="badge subtle">você</span>}
              {seat?.bot && <span className="badge subtle">robô</span>}
              {room.away.includes(player.id) && <span className="badge subtle">ausente</span>}
              {player.id === game.currentPlayerId && game.phase !== "finished" && <span className="badge">vez</span>}
            </span>
            <span className="player-meta">
              {player.bankrupt
                ? "faliu"
                : `${money(player.cash)} · ${owned} prop.${player.inJail ? " · 🔒 na prisão" : ""}${
                    player.jailCards.length ? ` · 🎫${player.jailCards.length}` : ""
                  }${player.loan ? ` · deve ${money(player.loan.due)}` : ""}`}
              {!player.bankrupt && showWorth && (
                <span className="worth">patrimônio {money(netWorth(game, player.id))}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
