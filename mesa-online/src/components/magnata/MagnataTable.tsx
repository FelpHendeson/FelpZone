"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { BOARD, GROUP_COLORS, JAIL_FINE, isOwnable, type OwnableTile } from "@/games/magnata/board";
import { describeEvent, tileKindLabel } from "@/games/magnata/describe";
import {
  LOAN_STEP,
  LOAN_TERM_TURNS,
  loanDue,
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
import { Chat } from "../Chat";
import type { Send } from "../RoomScreen";
import { Board } from "./Board";
import { PropertyActions } from "./PropertyActions";
import { TileSheet } from "./TileSheet";

interface Props {
  room: PublicRoom;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
}

type Tab = "jogadores" | "bens" | "historico" | "conversa";
const TABS: [Tab, string][] = [
  ["jogadores", "Jogadores"],
  ["bens", "Meus bens"],
  ["historico", "Histórico"],
  ["conversa", "Conversa"],
];

export function MagnataTable({ room, me, send, pending }: Props) {
  const game = room.game!;
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("jogadores");
  const [zoomed, setZoomed] = useState(false);
  const tabsId = useId();
  const tabRefs = useRef(new Map<Tab, HTMLButtonElement>());
  const mine = me ? (game.players.find((player) => player.id === me.id) ?? null) : null;
  const avatars = new Map(room.players.map((player) => [player.id, player.avatar]));
  const away = me ? room.away.includes(me.id) : false;

  function onTabKey(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = TABS.findIndex(([id]) => id === tab);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    setTab(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <>
      {away && (
        <div className="banner warning away-banner" role="status">
          <span>💤 O piloto automático está jogando por você.</span>
          <button className="button small primary" disabled={pending} onClick={() => send({ kind: "back" })}>
            Voltar a jogar
          </button>
        </div>
      )}

      <div className={zoomed ? "board-wrap zoomed" : "board-wrap"}>
        <Board game={game} avatars={avatars} onSelect={setSelected} />
      </div>
      <div className="board-tools">
        <button className="link-button light" onClick={() => setZoomed((value) => !value)} aria-pressed={zoomed}>
          {zoomed ? "🔍 Tabuleiro normal" : "🔍 Ampliar tabuleiro"}
        </button>
        <span className="muted light small">Os robôs jogam enquanto alguém estiver com a sala aberta.</span>
      </div>

      <TurnPanel room={room} game={game} mine={mine} me={me} avatars={avatars} send={send} pending={pending} />
      <CurrentTile game={game} avatars={avatars} onOpen={setSelected} />

      <div className="tabs" role="tablist" aria-label="Painéis da partida" onKeyDown={onTabKey}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            ref={(node) => {
              if (node) tabRefs.current.set(id, node);
            }}
            id={`${tabsId}-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${tabsId}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "conversa" && room.chat.length > 0 ? ` (${room.chat.length})` : ""}
          </button>
        ))}
      </div>

      <section className="card" role="tabpanel" id={`${tabsId}-panel-${tab}`} aria-labelledby={`${tabsId}-tab-${tab}`}>
        {tab === "jogadores" && <Players game={game} room={room} myId={me?.id ?? null} />}
        {tab === "bens" &&
          (mine && !mine.bankrupt ? (
            <>
              {game.credit && <BankPanel game={game} player={mine} send={send} pending={pending} />}
              <MyProperties game={game} player={mine} send={send} pending={pending} onSelect={setSelected} />
            </>
          ) : (
            <p className="muted">{mine ? "Você saiu desta partida." : "Você está assistindo esta partida."}</p>
          ))}
        {tab === "historico" && <History room={room} game={game} meId={me?.id ?? null} />}
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
          avatars={avatars}
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
  me,
  avatars,
  send,
  pending,
}: {
  room: PublicRoom;
  game: MagnataView;
  mine: MagnataPlayer | null;
  me: RoomPlayer | null;
  avatars: Map<string, string>;
  send: Send;
  pending: boolean;
}) {
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const theme = themeOf(game.themeId);
  const act = (type: string) => send({ kind: "game", action: { type } });
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

  const price = isOwnable(BOARD[current.position]) ? (BOARD[current.position] as OwnableTile).price : 0;
  const canBorrow = game.credit && loanLimit(game, current.id) >= LOAN_STEP;

  return (
    <section className="card turn-card mine">
      <p className="turn-title">
        <span className="avatar" aria-hidden>
          {avatars.get(current.id)}
        </span>
        Sua vez! · {money(current.cash)}
      </p>

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
            Comprar <strong>{tileName}</strong> por {money(price)}?
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
              : ` ao ${theme.bank.toLowerCase()}`}
            . Venda construções ou hipoteque em “Meus bens”.
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
        <button className="button primary block" disabled={pending} onClick={() => act("end-turn")}>
          Passar a vez
        </button>
      )}
      {counter}
    </section>
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
function CurrentTile({ game, avatars, onOpen }: { game: MagnataView; avatars: Map<string, string>; onOpen: (index: number) => void }) {
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

function Players({ game, room, myId }: { game: MagnataView; room: PublicRoom; myId: string | null }) {
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

function BankPanel({ game, player, send, pending }: { game: MagnataView; player: MagnataPlayer; send: Send; pending: boolean }) {
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

function MyProperties({
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

function History({ room, game, meId }: { room: PublicRoom; game: MagnataView; meId: string | null }) {
  const ctx = {
    theme: themeOf(game.themeId),
    people: new Map(room.players.map((player) => [player.id, { name: player.name, avatar: player.avatar }])),
    meId,
  };
  return (
    <ol className="log">
      {[...game.events].reverse().map((event) => {
        const notice = describeEvent(event, ctx);
        return (
          <li key={event.seq} className={`log-${notice.level}`}>
            <span aria-hidden>{notice.icon} </span>
            <strong>{notice.title}</strong>
            {notice.text && <> — {notice.text}</>}
          </li>
        );
      })}
    </ol>
  );
}
