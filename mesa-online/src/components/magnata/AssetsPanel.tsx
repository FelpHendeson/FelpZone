"use client";

import { useState } from "react";
import { BOARD, GROUP_COLORS, type OwnableTile } from "@/games/magnata/board";
import {
  LOAN_STEP,
  LOAN_TERM_TURNS,
  loanDue,
  loanLimit,
  money,
  type MagnataPlayer,
  type MagnataView,
} from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import type { Send } from "../RoomScreen";
import { PropertyActions } from "./PropertyActions";


export function BankPanel({ game, player, send, pending }: { game: MagnataView; player: MagnataPlayer; send: Send; pending: boolean }) {
  const theme = themeOf(game.themeId);
  const limit = loanLimit(game, player.id);
  const [amount, setAmount] = useState(LOAN_STEP);
  const chosen = Math.min(amount, limit);
  const myTurn = game.currentPlayerId === player.id;

  return (
    <div className="bank-panel">
      <h3>🏦 {theme.bank}</h3>
      {player.loan ? (
        <>
          <p>
            Empréstimo de {money(player.loan.amount)}: você deve <strong>{money(player.loan.due)}</strong>, cobrados em{" "}
            {player.loan.turnsLeft} {player.loan.turnsLeft === 1 ? "turno seu" : "turnos seus"}.
          </p>
          <button
            className="button small"
            disabled={pending || !myTurn || player.cash < player.loan.due || game.phase === "debt"}
            onClick={() => send({ kind: "game", action: { type: "repay-loan" } })}
          >
            Quitar agora {money(player.loan.due)}
          </button>
        </>
      ) : limit >= LOAN_STEP ? (
        <>
          <label className="field">
            <span>Valor (limite {money(limit)})</span>
            <select value={chosen} onChange={(event) => setAmount(Number(event.target.value))}>
              {Array.from({ length: limit / LOAN_STEP }, (_, index) => (index + 1) * LOAN_STEP).map((value) => (
                <option key={value} value={value}>
                  {money(value)}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            Você recebe {money(chosen)} agora e devolve {money(loanDue(chosen))} no seu {LOAN_TERM_TURNS}º turno a partir de
            agora (ou antes, se quiser). Um empréstimo por vez.
          </p>
          <button
            className="button small"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Pegar ${money(chosen)} e devolver ${money(loanDue(chosen))} em ${LOAN_TERM_TURNS} turnos seus?`)) {
                send({ kind: "game", action: { type: "take-loan", amount: chosen } });
              }
            }}
          >
            Pegar {money(chosen)}
          </button>
        </>
      ) : (
        <p className="muted small">
          {myTurn && game.phase === "debt"
            ? "Não é possível pegar empréstimo durante uma dívida."
            : myTurn
              ? "Sem crédito: o limite é metade do valor das suas propriedades não hipotecadas."
              : "Empréstimos só podem ser pedidos na sua vez."}
        </p>
      )}
    </div>
  );
}

export function MyProperties({
  game,
  player,
  send,
  pending,
  onSelect,
}: {
  game: MagnataView;
  player: MagnataPlayer;
  send: Send;
  pending: boolean;
  onSelect: (index: number) => void;
}) {
  const theme = themeOf(game.themeId);
  const owned = Object.entries(game.properties)
    .filter(([, property]) => property.owner === player.id)
    .map(([index]) => Number(index))
    .sort((a, b) => a - b);

  if (owned.length === 0) return <p className="muted">Você ainda não tem propriedades.</p>;
  const myTurn = game.currentPlayerId === player.id && game.phase !== "finished";

  return (
    <>
      {!myTurn && <p className="muted">Construções e hipotecas ficam disponíveis na sua vez.</p>}
      <ul className="property-list">
        {owned.map((index) => {
          const tile = BOARD[index] as OwnableTile;
          const property = game.properties[index];
          return (
            <li key={index}>
              <button className="property-name" onClick={() => onSelect(index)}>
                <span className="token square" style={{ background: tile.kind === "street" ? GROUP_COLORS[tile.group] : "#888" }} />
                {tileNameIn(theme, index)}
                <span className="muted">
                  {property.mortgaged
                    ? " · hipotecada"
                    : property.houses === 5
                      ? " · hotel"
                      : property.houses > 0
                        ? ` · ${property.houses} casa(s)`
                        : ""}
                </span>
              </button>
              {myTurn && <PropertyActions game={game} playerId={player.id} tile={index} send={send} pending={pending} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
