"use client";

import { BOARD, GROUP_COLORS } from "@/games/magnata/board";
import { cardText } from "@/games/magnata/describe";
import type { MagnataView } from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import { DICE_FACES, gridPosition, tileIcon, tileLabel } from "./tiles";

interface Props {
  game: MagnataView;
  /** Casa exibida de cada peão (anda casa a casa, atrás da posição real). */
  positions: Map<string, number>;
  /** Jogador em foco, destacado. */
  focusId: string | null;
  meId: string | null;
  /** Retrato de cada jogador, para marcar o dono sem depender só da cor. */
  avatars: Map<string, string>;
  onSelect: (index: number) => void;
}

export function Board({ game, positions, focusId, meId, avatars, onSelect }: Props) {
  const theme = themeOf(game.themeId);
  const colorOf = new Map(game.players.map((player) => [player.id, player.color]));
  const current = game.players.find((player) => player.id === game.currentPlayerId);

  return (
    <div className="board" aria-label="Tabuleiro">
      {BOARD.map((tile, index) => {
        const { row, col } = gridPosition(index);
        const property = game.properties[index];
        const ownerColor = property?.owner ? colorOf.get(property.owner) : undefined;
        const ownerAvatar = property?.owner ? avatars.get(property.owner) : undefined;
        const icon = tileIcon(tile);
        const name = tileNameIn(theme, index);
        const here = game.players.filter((player) => !player.bankrupt && player.position === index);
        const ownerName = property?.owner ? game.players.find((player) => player.id === property.owner)?.name : null;
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
            aria-label={`${name}${ownerName ? `, de ${ownerName}` : ""}${property?.mortgaged ? ", hipotecada" : ""}${
              here.length ? `. Aqui: ${here.map((player) => player.name).join(", ")}` : ""
            }`}
          >
            {tile.kind === "street" && <span className="band" style={{ background: GROUP_COLORS[tile.group] }} />}
            {icon ? <span className="tile-icon">{icon}</span> : <span className="tile-label">{tileLabel(tile, name)}</span>}
            {property && property.houses > 0 && (
              <span className="houses">{property.houses === 5 ? "H" : "•".repeat(property.houses)}</span>
            )}
            {ownerAvatar && (
              <span className="owner-mark" aria-hidden>
                {ownerAvatar}
              </span>
            )}
          </button>
        );
      })}

      <Pawns game={game} positions={positions} focusId={focusId} meId={meId} avatars={avatars} />

      <div className="board-center">
        <p className="board-title">MAGNATA</p>
        <p className="board-theme">
          {theme.emoji} {theme.name}
        </p>
        {game.dice && (
          <p className="dice" aria-label={`Dados: ${game.dice[0]} e ${game.dice[1]}`}>
            {DICE_FACES[game.dice[0]]}
            {DICE_FACES[game.dice[1]]}
          </p>
        )}
        {game.lastCard && (
          <p className="last-card">
            <strong>{game.lastCard.deck === "sorte" ? "Sorte" : "Surpresa"}:</strong>{" "}
            {cardText(game.lastCard.deck, game.lastCard.cardId, theme)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Peões numa camada própria, posicionados pela casa exibida: assim eles podem
 * andar casa a casa (transição CSS) em vez de "teleportar".
 */
function Pawns({
  game,
  positions,
  focusId,
  meId,
  avatars,
}: {
  game: MagnataView;
  positions: Map<string, number>;
  focusId: string | null;
  meId: string | null;
  avatars: Map<string, string>;
}) {
  const active = game.players.filter((player) => !player.bankrupt);
  return (
    <div className="pawns" aria-hidden>
      {active.map((player) => {
        const tile = positions.get(player.id) ?? player.position;
        const { row, col } = gridPosition(tile);
        const sharing = active.filter((other) => (positions.get(other.id) ?? other.position) === tile);
        const slot = sharing.findIndex((other) => other.id === player.id);
        // Até 4 peões numa casa: um em cada canto, sem se esconderem.
        const dx = sharing.length > 1 ? (slot % 2 === 0 ? -0.2 : 0.2) : 0;
        const dy = sharing.length > 2 ? (slot < 2 ? -0.18 : 0.18) : sharing.length > 1 ? 0.12 : 0.12;
        return (
          <span
            key={player.id}
            className={`pawn${player.id === game.currentPlayerId ? " turn" : ""}${player.id === focusId ? " focus" : ""}${
              player.id === meId ? " me" : ""
            }`}
            style={{
              left: `${((col - 1 + 0.5 + dx) / 11) * 100}%`,
              top: `${((row - 1 + 0.5 + dy) / 11) * 100}%`,
              borderColor: player.color,
            }}
          >
            {avatars.get(player.id)}
          </span>
        );
      })}
    </div>
  );
}
