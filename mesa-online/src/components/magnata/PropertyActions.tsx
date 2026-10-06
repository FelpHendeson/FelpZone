"use client";

import { BOARD, mortgageValue, unmortgageCost, type OwnableTile } from "@/games/magnata/board";
import { money, ownsWholeGroup, tileActionError, type MagnataState } from "@/games/magnata/engine";
import type { Send } from "../RoomScreen";

interface Props {
  game: MagnataState;
  playerId: string;
  tile: number;
  send: Send;
  pending: boolean;
}

/** Botões de construir, vender, hipotecar e quitar para uma propriedade própria. */
export function PropertyActions({ game, playerId, tile, send, pending }: Props) {
  const info = BOARD[tile] as OwnableTile;
  const property = game.properties[tile];
  const buttons: { type: "build" | "sell-building" | "mortgage" | "unmortgage"; label: string }[] = [];

  if (info.kind === "street" && property.houses < 5 && ownsWholeGroup(game, playerId, tile) && !property.mortgaged) {
    buttons.push({ type: "build", label: `${property.houses === 4 ? "Hotel" : "Casa"} ${money(info.houseCost)}` });
  }
  if (info.kind === "street" && property.houses > 0) {
    buttons.push({ type: "sell-building", label: `Vender +${money(info.houseCost / 2)}` });
  }
  if (property.mortgaged) {
    buttons.push({ type: "unmortgage", label: `Quitar ${money(unmortgageCost(info))}` });
  } else if (property.houses === 0) {
    buttons.push({ type: "mortgage", label: `Hipotecar +${money(mortgageValue(info))}` });
  }

  return (
    <div className="property-actions">
      {buttons.map((button) => {
        const error = tileActionError(game, playerId, { type: button.type, tile });
        return (
          <button
            key={button.type}
            className="button small"
            disabled={pending || error !== null}
            title={error ?? undefined}
            onClick={() => send({ kind: "game", action: { type: button.type, tile } })}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}
