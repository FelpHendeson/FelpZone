"use client";

import { BOARD, GROUP_COLORS } from "@/games/magnata/board";
import type { MagnataState } from "@/games/magnata/engine";
import { DICE_FACES, gridPosition, tileIcon, tileLabel } from "./tiles";

interface Props {
  game: MagnataState;
  onSelect: (index: number) => void;
}

export function Board({ game, onSelect }: Props) {
  const colorOf = new Map(game.players.map((player) => [player.id, player.color]));
  const current = game.players.find((player) => player.id === game.currentPlayerId);

  return (
    <div className="board" role="grid" aria-label="Tabuleiro">
      {BOARD.map((tile, index) => {
        const { row, col } = gridPosition(index);
        const property = game.properties[index];
        const ownerColor = property?.owner ? colorOf.get(property.owner) : undefined;
        const icon = tileIcon(tile);
        const here = game.players.filter((player) => !player.bankrupt && player.position === index);
        return (
          <button
            key={index}
            className={`tile${property?.mortgaged ? " mortgaged" : ""}${current?.position === index ? " active" : ""}`}
            style={{
              gridRow: row,
              gridColumn: col,
              boxShadow: ownerColor ? `inset 0 -4px 0 ${ownerColor}` : undefined,
            }}
            onClick={() => onSelect(index)}
            aria-label={tile.name}
          >
            {tile.kind === "street" && <span className="band" style={{ background: GROUP_COLORS[tile.group] }} />}
            {icon ? <span className="tile-icon">{icon}</span> : <span className="tile-label">{tileLabel(tile)}</span>}
            {property && property.houses > 0 && (
              <span className="houses">{property.houses === 5 ? "H" : "•".repeat(property.houses)}</span>
            )}
            {here.length > 0 && (
              <span className="tokens">
                {here.map((player) => (
                  <i key={player.id} style={{ background: player.color }} />
                ))}
              </span>
            )}
          </button>
        );
      })}

      <div className="board-center">
        <p className="board-title">MAGNATA</p>
        {game.dice && (
          <p className="dice" aria-label={`Dados: ${game.dice[0]} e ${game.dice[1]}`}>
            {DICE_FACES[game.dice[0]]}
            {DICE_FACES[game.dice[1]]}
          </p>
        )}
        {game.lastCard && (
          <p className="last-card">
            <strong>{game.lastCard.deck === "sorte" ? "Sorte" : "Surpresa"}:</strong> {game.lastCard.text}
          </p>
        )}
      </div>
    </div>
  );
}
