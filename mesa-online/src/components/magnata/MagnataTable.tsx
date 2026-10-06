"use client";

import { useState } from "react";
import { BOARD, GROUP_COLORS, JAIL_FINE, type OwnableTile } from "@/games/magnata/board";
import { money, type MagnataPlayer, type MagnataState } from "@/games/magnata/engine";
import type { Room, RoomPlayer } from "@/rooms/room";
import { Chat } from "../Chat";
import type { Send } from "../RoomScreen";
import { Board } from "./Board";
import { PropertyActions } from "./PropertyActions";
import { TileSheet } from "./TileSheet";

interface Props {
  room: Room;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
}

type Tab = "jogadores" | "propriedades" | "historico" | "conversa";

export function MagnataTable({ room, me, send, pending }: Props) {
  const game = room.game!;
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("jogadores");
  const mine = me ? game.players.find((player) => player.id === me.id) ?? null : null;

  return (
    <>
      <Board game={game} onSelect={setSelected} />
      <TurnPanel room={room} game={game} mine={mine} send={send} pending={pending} />

      <nav className="tabs" role="tablist">
        {(
          [
            ["jogadores", "Jogadores"],
            ["propriedades", "Meus bens"],
            ["historico", "Histórico"],
            ["conversa", `Conversa${room.chat.length ? ` (${room.chat.length})` : ""}`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "tab active" : "tab"} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <section className="card">
        {tab === "jogadores" && <Players game={game} myId={me?.id ?? null} />}
        {tab === "propriedades" &&
          (mine ? (
            <MyProperties game={game} player={mine} send={send} pending={pending} onSelect={setSelected} />
          ) : (
            <p className="muted">Você está assistindo esta partida.</p>
          ))}
        {tab === "historico" && (
          <ol className="log">
            {[...game.log].reverse().map((entry) => (
              <li key={entry.id}>{entry.text}</li>
            ))}
          </ol>
        )}
        {tab === "conversa" && <Chat room={room} me={me} send={send} />}
      </section>

      {mine && !mine.bankrupt && game.phase !== "finished" && (
        <button
          className="button ghost block"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Desistir da partida? Seus bens voltam para o banco.")) {
              send({ kind: "game", action: { type: "resign" } });
            }
          }}
        >
          Desistir da partida
        </button>
      )}

      {selected !== null && (
        <TileSheet
          game={game}
          index={selected}
          myId={mine && !mine.bankrupt ? mine.id : null}
          send={send}
          pending={pending}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function TurnPanel({
  room,
  game,
  mine,
  send,
  pending,
}: {
  room: Room;
  game: MagnataState;
  mine: MagnataPlayer | null;
  send: Send;
  pending: boolean;
}) {
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const act = (type: string) => send({ kind: "game", action: { type } });

  if (game.phase === "finished") {
    const winner = game.players.find((player) => player.id === game.winnerId);
    const isHost = mine?.id === room.hostId;
    return (
      <section className="card turn-card finished">
        <p className="turn-title">🏆 {winner?.name ?? "Alguém"} venceu!</p>
        {isHost ? (
          <button className="button primary block" disabled={pending} onClick={() => send({ kind: "rematch" })}>
            Jogar de novo
          </button>
        ) : (
          <p className="muted">O anfitrião pode abrir uma nova partida nesta sala.</p>
        )}
      </section>
    );
  }

  const myTurn = mine?.id === current.id;
  const tile = BOARD[current.position];

  if (!myTurn) {
    return (
      <section className="card turn-card">
        <p className="turn-title">
          <span className="token" style={{ background: current.color }} /> Vez de {current.name}
        </p>
        <p className="muted">{waitingHint(game, current)}</p>
        {mine && <p className="cash">Seu saldo: {money(mine.cash)}</p>}
      </section>
    );
  }

  return (
    <section className="card turn-card mine">
      <p className="turn-title">Sua vez! · {money(current.cash)}</p>

      {game.phase === "roll" && (
        <>
          {current.inJail && <p>Você está na prisão (tentativa {current.jailTurns + 1} de 3).</p>}
          <div className="action-row">
            <button className="button primary" disabled={pending} onClick={() => act("roll")}>
              {current.inJail ? "Tentar dupla" : game.rollAgain ? "Rolar de novo (dupla!)" : "Rolar dados"}
            </button>
            {current.inJail && (
              <button className="button" disabled={pending || current.cash < JAIL_FINE} onClick={() => act("pay-jail-fine")}>
                Pagar {money(JAIL_FINE)}
              </button>
            )}
            {current.inJail && current.jailCards.length > 0 && (
              <button className="button" disabled={pending} onClick={() => act("use-jail-card")}>
                Usar carta
              </button>
            )}
          </div>
        </>
      )}

      {game.phase === "buy" && (
        <>
          <p>
            Comprar <strong>{tile.name}</strong> por {money((tile as OwnableTile).price)}?
          </p>
          <div className="action-row">
            <button
              className="button primary"
              disabled={pending || current.cash < (tile as OwnableTile).price}
              onClick={() => act("buy")}
            >
              Comprar
            </button>
            <button className="button" disabled={pending} onClick={() => act("decline")}>
              Não comprar
            </button>
          </div>
          {current.cash < (tile as OwnableTile).price && (
            <p className="muted">Sem dinheiro suficiente: hipoteque algo em “Meus bens” ou recuse.</p>
          )}
        </>
      )}

      {game.phase === "debt" && game.debt && (
        <>
          <p>
            Você deve <strong>{money(game.debt.amount)}</strong>
            {game.debt.creditorId
              ? ` para ${game.players.find((player) => player.id === game.debt!.creditorId)?.name}`
              : " ao banco"}
            . Venda construções ou hipoteque em “Meus bens”.
          </p>
          <div className="action-row">
            <button
              className="button primary"
              disabled={pending || current.cash < game.debt.amount}
              onClick={() => act("pay-debt")}
            >
              Pagar dívida
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Declarar falência? Você sai da partida.")) act("declare-bankruptcy");
              }}
            >
              Declarar falência
            </button>
          </div>
        </>
      )}

      {game.phase === "end" && (
        <button className="button primary block" disabled={pending} onClick={() => act("end-turn")}>
          Passar a vez
        </button>
      )}
    </section>
  );
}

function waitingHint(game: MagnataState, current: MagnataPlayer): string {
  switch (game.phase) {
    case "buy":
      return `Decidindo se compra ${BOARD[current.position].name}…`;
    case "debt":
      return "Tentando pagar uma dívida…";
    case "end":
      return "Terminando a jogada…";
    default:
      return current.inJail ? "Tentando sair da prisão…" : "Vai rolar os dados…";
  }
}

function Players({ game, myId }: { game: MagnataState; myId: string | null }) {
  return (
    <ul className="player-list">
      {game.players.map((player) => {
        const owned = Object.values(game.properties).filter((property) => property.owner === player.id).length;
        return (
          <li key={player.id} className={player.bankrupt ? "out" : undefined}>
            <span className="token" style={{ background: player.color }} />
            <span>
              {player.name}
              {player.id === myId && <span className="badge subtle">você</span>}
              {player.id === game.currentPlayerId && game.phase !== "finished" && <span className="badge">vez</span>}
            </span>
            <span className="player-meta">
              {player.bankrupt
                ? "faliu"
                : `${money(player.cash)} · ${owned} prop.${player.inJail ? " · 🔒" : ""}${
                    player.jailCards.length ? ` · 🎫${player.jailCards.length}` : ""
                  }`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MyProperties({
  game,
  player,
  send,
  pending,
  onSelect,
}: {
  game: MagnataState;
  player: MagnataPlayer;
  send: Send;
  pending: boolean;
  onSelect: (index: number) => void;
}) {
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
                <span
                  className="token square"
                  style={{ background: tile.kind === "street" ? GROUP_COLORS[tile.group] : "#888" }}
                />
                {tile.name}
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
