"use client";

import { BOARD, GROUP_COLORS, JAIL_FINE, isOwnable, type OwnableTile } from "@/games/magnata/board";
import { tileKindLabel } from "@/games/magnata/describe";
import {
  LOAN_STEP,
  loanLimit,
  money,
  netWorth,
  rentFor,
  type MagnataPlayer,
  type MagnataView,
} from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import type { PublicRoom } from "@/rooms/public";
import type { RoomPlayer } from "@/rooms/room";
import type { Send } from "../RoomScreen";
import { MarketActions, marketNeedsMe } from "./Market";


export function TurnPanel({
  room,
  game,
  mine,
  me,
  avatars,
  send,
  pending,
  onTrade,
}: {
  room: PublicRoom;
  game: MagnataView;
  mine: MagnataPlayer | null;
  me: RoomPlayer | null;
  avatars: Map<string, string>;
  send: Send;
  pending: boolean;
  onTrade: () => void;
}) {
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const theme = themeOf(game.themeId);
  const counter = game.roundLimit ? (
    <p className="turn-counter muted">
      Rodada {game.round} de {game.roundLimit}
    </p>
  ) : game.turnLimit ? (
    <p className="turn-counter muted">
      Turno {game.turnNumber} de {game.turnLimit}
    </p>
  ) : null;

  if (game.phase === "finished") {
    const winner = game.players.find((player) => player.id === game.winnerId);
    return (
      <section className="card turn-card finished">
        <p className="turn-title">
          <span className="avatar" aria-hidden>
            {winner ? avatars.get(winner.id) : "🏆"}
          </span>
          🏆 {winner?.name ?? "Alguém"} venceu!
        </p>
        {game.endReason !== "bankruptcy" && winner && (
          <p className="muted">Acabaram as rodadas: venceu o maior patrimônio ({money(netWorth(game, winner.id))}).</p>
        )}
        {game.endReason === "bankruptcy" && <p className="muted">Todos os outros faliram ou desistiram.</p>}
        {me ? (
          <button className="button primary block" disabled={pending} onClick={() => send({ kind: "rematch" })}>
            Jogar de novo nesta sala
          </button>
        ) : (
          <p className="muted">Quem está na mesa pode abrir uma nova partida nesta sala.</p>
        )}
      </section>
    );
  }

  if (game.phase === "auction" || game.phase === "trade") {
    const playing = mine && !mine.bankrupt ? mine.id : null;
    return (
      <section className={marketNeedsMe(game, playing) ? "card turn-card mine" : "card turn-card"}>
        <p className="turn-title">
          <span className="avatar" style={{ borderColor: current.color }} aria-hidden>
            {avatars.get(current.id)}
          </span>
          {game.phase === "auction" ? "🔨 Leilão" : "🤝 Proposta de troca"}
        </p>
        <MarketActions game={game} room={room} meId={playing} send={send} pending={pending} />
        {mine && !mine.bankrupt && <p className="cash">Seu saldo: {money(mine.cash)}</p>}
        {counter}
      </section>
    );
  }

  const myTurn = mine?.id === current.id;
  const tileName = tileNameIn(theme, current.position);
  const isBot = room.players.some((player) => player.id === current.id && player.bot);
  const isAway = room.away.includes(current.id);

  if (!myTurn) {
    return (
      <section className="card turn-card">
        <p className="turn-title">
          <span className="avatar" style={{ borderColor: current.color }} aria-hidden>
            {avatars.get(current.id)}
          </span>
          Vez de {current.name}
        </p>
        <p className="muted">
          {isBot ? "🤖 Pensando… " : isAway ? "💤 Piloto automático. " : ""}
          {waitingHint(game, current, tileName)}
        </p>
        {mine && !mine.bankrupt && <p className="cash">Seu saldo: {money(mine.cash)}</p>}
        {counter}
      </section>
    );
  }

  return (
    <section className="card turn-card mine">
      <p className="turn-title">
        <span className="avatar" aria-hidden>
          {avatars.get(current.id)}
        </span>
        Sua vez! · {money(current.cash)}
      </p>
      <TurnActions game={game} send={send} pending={pending} onTrade={onTrade} />
      {counter}
    </section>
  );
}

/** Decisões da vez de quem está jogando: usadas no painel e na janela de acontecimentos. */
export function TurnActions({ game, send, pending, onTrade }: { game: MagnataView; send: Send; pending: boolean; onTrade?: () => void }) {
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const theme = themeOf(game.themeId);
  const tileName = tileNameIn(theme, current.position);
  const act = (type: string) => send({ kind: "game", action: { type } });
  const price = isOwnable(BOARD[current.position]) ? (BOARD[current.position] as OwnableTile).price : 0;
  const canBorrow = game.credit && loanLimit(game, current.id) >= LOAN_STEP;
  const tradeButton = onTrade && game.players.some((player) => player.id !== current.id && !player.bankrupt) && (
    <button className="button ghost-dark" disabled={pending} onClick={onTrade}>
      🤝 Propor troca
    </button>
  );

  return (
    <div className="turn-actions">
      {game.phase === "roll" && (
        <>
          {current.inJail && <p>Você está na prisão (tentativa {current.jailTurns + 1} de 3).</p>}
          <div className="action-row">
            <button className="button primary" disabled={pending} onClick={() => act("roll")}>
              {current.inJail ? "Tentar dupla" : game.rollAgain ? "🎲 Rolar de novo (dupla!)" : "🎲 Rolar dados"}
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
            {tradeButton}
          </div>
        </>
      )}

      {game.phase === "buy" && (
        <>
          <p>
            Comprar <strong>{tileName}</strong> por {money(price)}? Você tem {money(current.cash)}.
          </p>
          <div className="action-row">
            <button className="button primary" disabled={pending || current.cash < price} onClick={() => act("buy")}>
              Comprar
            </button>
            <button className="button" disabled={pending} onClick={() => act("decline")}>
              Não comprar
            </button>
          </div>
          {current.cash < price && (
            <p className="muted">
              Sem dinheiro suficiente: hipoteque algo em “Meus bens”
              {canBorrow ? " ou peça um empréstimo ao banco lá" : ""}, ou recuse.
            </p>
          )}
        </>
      )}

      {game.phase === "debt" && game.debt && (
        <>
          <p>
            Você deve <strong>{money(game.debt.amount)}</strong>
            {game.debt.creditorId
              ? ` para ${game.players.find((player) => player.id === game.debt!.creditorId)?.name}`
              : ` ao ${theme.bank.toLowerCase()}`}{" "}
            e tem {money(current.cash)}. Venda construções ou hipoteque em “Meus bens”.
          </p>
          <div className="action-row">
            <button className="button primary" disabled={pending || current.cash < game.debt.amount} onClick={() => act("pay-debt")}>
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
        <div className="action-row">
          <button className="button primary" disabled={pending} onClick={() => act("end-turn")}>
            Passar a vez
          </button>
          {tradeButton}
        </div>
      )}
    </div>
  );
}

function waitingHint(game: MagnataView, current: MagnataPlayer, tileName: string): string {
  switch (game.phase) {
    case "buy":
      return `Decidindo se compra ${tileName}…`;
    case "debt":
      return "Tentando pagar uma dívida…";
    case "end":
      return "Terminando a jogada…";
    default:
      return current.inJail ? "Tentando sair da prisão…" : "Vai rolar os dados…";
  }
}

/** Cartão legível da casa onde está quem joga agora (o tabuleiro é pequeno no celular). */
export function CurrentTile({ game, avatars, onOpen }: { game: MagnataView; avatars: Map<string, string>; onOpen: (index: number) => void }) {
  if (game.phase === "finished") return null;
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const index = current.position;
  const tile = BOARD[index];
  const property = game.properties[index];
  const owner = property?.owner ? game.players.find((player) => player.id === property.owner) : null;
  const name = tileNameIn(themeOf(game.themeId), index);
  const diceTotal = game.dice ? game.dice[0] + game.dice[1] : 7;

  let detail = "";
  if (isOwnable(tile)) {
    if (!owner) detail = `À venda por ${money(tile.price)}`;
    else if (property.mortgaged) detail = `De ${owner.name} · hipotecada, não cobra aluguel`;
    else detail = `De ${owner.name} · aluguel agora ${money(rentFor(game, index, diceTotal))}${tile.kind === "utility" ? " (pelos dados)" : ""}`;
  } else if (tile.kind === "tax") {
    detail = `Imposto de ${money(tile.amount)}`;
  } else if (tile.kind === "jail") {
    detail = current.inJail ? "Na prisão" : "Só visitando";
  }

  return (
    <button className="card current-tile" onClick={() => onOpen(index)} aria-label={`${current.name} está em ${name}. ${detail}. Ver detalhes.`}>
      {tile.kind === "street" && <span className="current-tile-band" style={{ background: GROUP_COLORS[tile.group] }} />}
      <span className="muted small">
        {current.name} está em · {tileKindLabel(index)}
      </span>
      <strong>{name}</strong>
      {detail && (
        <span className="muted">
          {owner && <span aria-hidden>{avatars.get(owner.id)} </span>}
          {detail}
        </span>
      )}
    </button>
  );
}
