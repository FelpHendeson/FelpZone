"use client";

import { useEffect, useRef, useState } from "react";
import { funcoins } from "@/accounts/funcoins";
import { BATIDA_NAMES, describeDominoEvent } from "@/games/domino/describe";
import {
  DOMINO_MODES,
  endsCount,
  legalPlays,
  lineEnds,
  pips,
  type DominoView,
  type Side,
  type Tile,
} from "@/games/domino/engine";
import type { PublicRoom } from "@/rooms/public";
import type { RoomPlayer } from "@/rooms/room";
import { Honors } from "../Badges";
import { Chat } from "../Chat";
import type { Send } from "../RoomScreen";
import { DominoTile } from "./DominoTile";

interface Props {
  room: PublicRoom;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
}

const sameTile = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];

export function DominoTable({ room, me, send, pending }: Props) {
  const game = room.game as DominoView;
  const meId = me?.id ?? null;
  const mine = game.players.find((player) => player.id === meId) ?? null;
  const away = meId ? room.away.includes(meId) : false;
  const people = new Map(room.players.map((player) => [player.id, player]));
  const nameOf = (id: string) => (id === meId ? "Você" : (people.get(id)?.name ?? "Alguém"));
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;
  const myTurn = game.phase === "playing" && game.currentPlayerId === meId && mine !== null && !mine.out;
  const hand = mine?.hand ?? [];
  const plays = myTurn ? legalPlays(game, hand) : [];
  const ends = lineEnds(game.line);
  const [choosing, setChoosing] = useState<Tile | null>(null);
  const [closedHand, setClosedHand] = useState<number | null>(null);
  const [tab, setTab] = useState<"historico" | "conversa">("historico");
  const playRef = useRef<HTMLDivElement>(null);

  // Quando chega a vez da pessoa, a mão entra em foco (útil no celular).
  useEffect(() => {
    if (myTurn) playRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [myTurn, game.eventSeq]);

  const act = (action: Record<string, unknown>) => send({ kind: "game", action });

  function onTile(tile: Tile) {
    const option = plays.find((play) => sameTile(play.tile, tile));
    if (!option || pending) return;
    if (option.sides.length === 2 && ends && ends[0] !== ends[1]) {
      setChoosing(tile);
      return;
    }
    setChoosing(null);
    void act({ type: "play", tile, side: option.sides[option.sides.length - 1] });
  }

  function onSide(side: Side) {
    if (!choosing) return;
    const tile = choosing;
    setChoosing(null);
    void act({ type: "play", tile, side });
  }

  // Última pedra jogada nesta mão: ganha destaque na mesa.
  const lastPlay = [...game.events].reverse().find((event) => event.type === "play" && event.hand === game.hand);
  const freshIndex =
    lastPlay && lastPlay.type === "play" ? (lastPlay.side === "left" ? 0 : game.line.length - 1) : -1;

  const lines = game.events
    .map((event) => describeDominoEvent(event, nameOf))
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const recent = lines.slice(-4).reverse();

  const myTeam = mine?.team ?? null;
  const teamLabel = (team: 0 | 1) => (myTeam === null ? `Dupla ${team === 0 ? "A" : "B"}` : team === myTeam ? "Nós" : "Eles");
  const target = game.target === null ? "mão única" : `${game.target} ${game.mode === "duplas" ? "pontos" : "pts"}`;

  // Resultado da mão atual (uma desistência pode encerrar a partida sem fechar a mão).
  const handResult = game.lastHand && game.lastHand.hand === game.hand ? game.lastHand : null;
  const showHandDialog = game.phase === "hand-over" && handResult !== null && closedHand !== handResult.hand;
  const showFinal = game.phase === "finished" && closedHand !== -1;
  const result = room.results.find((item) => item.matchId === room.match?.id) ?? null;

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

      <section className="card domino-head">
        <p className="muted small">
          🁫 {DOMINO_MODES[game.mode].name} · mão {game.hand} · meta: {target}
          {room.match && room.match.stake > 0 ? ` · pote ${funcoins(room.match.stake * room.players.length)}` : ""}
        </p>
        {game.teamScores && (
          <p className="team-score" aria-label={`Placar: ${teamLabel(0)} ${game.teamScores[0]}, ${teamLabel(1)} ${game.teamScores[1]}`}>
            <span className={myTeam === 0 ? "mine" : ""}>
              {teamLabel(0)} <strong>{game.teamScores[0]}</strong>
            </span>
            <span aria-hidden>×</span>
            <span className={myTeam === 1 ? "mine" : ""}>
              <strong>{game.teamScores[1]}</strong> {teamLabel(1)}
            </span>
          </p>
        )}
        <ul className="domino-seats">
          {game.players.map((player) => {
            const seat = people.get(player.id);
            const turn = game.phase === "playing" && player.id === game.currentPlayerId;
            return (
              <li
                key={player.id}
                className={`${turn ? "turn" : ""}${player.out ? " out" : ""}${player.id === meId ? " me" : ""}`}
                style={{ borderColor: player.color }}
                aria-label={`${nameOf(player.id)}, ${player.handCount} pedras${game.teamScores ? "" : `, ${player.score} pontos`}${turn ? ", jogando agora" : ""}`}
              >
                <span className="avatar" style={{ borderColor: player.color }} aria-hidden>
                  {seat?.avatar}
                </span>
                <span className="seat-name">
                  {nameOf(player.id)}
                  {player.team !== null && myTeam !== null && player.id !== meId && player.team === myTeam ? " 🤝" : ""}
                </span>
                <Honors wins={seat?.wins} badges={seat?.badges} />
                <span className="seat-info">
                  🁢 {player.handCount}
                  {!game.teamScores && <strong> · {player.score}</strong>}
                </span>
                {player.out && <span className="badge subtle">saiu</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="domino-felt" aria-label="Mesa do dominó">
        <div className="domino-ends">
          <span className="end-chip" aria-label={ends ? `Ponta esquerda: ${ends[0]}` : "Mesa vazia"}>
            {ends ? `◀ ${ends[0]}` : "Mesa vazia"}
          </span>
          {game.mode === "pontos" && ends && <span className="muted light small">pontas somam {endsCount(game.line)}</span>}
          {ends && (
            <span className="end-chip" aria-label={`Ponta direita: ${ends[1]}`}>
              {ends[1]} ▶
            </span>
          )}
        </div>
        <div className="domino-line" role="list" aria-label={`Linha com ${game.line.length} pedras`}>
          {game.line.map((placed, index) => (
            <span role="listitem" key={`${game.hand}-${index}-${placed.a}-${placed.b}`} aria-label={`${placed.a} e ${placed.b}`}>
              <DominoTile
                tile={[placed.a, placed.b]}
                horizontal={placed.a !== placed.b}
                size="s"
                className={index === freshIndex ? "fresh" : ""}
              />
            </span>
          ))}
        </div>
        <p className="muted light small domino-stock">
          {game.boneyardCount > 0 ? `Monte: ${game.boneyardCount} pedras` : game.sleeping > 0 ? `${game.sleeping} pedras dormindo` : "Todas as pedras na mesa e nas mãos"}
        </p>
      </section>

      <section className="card domino-status" aria-live="polite">
        <p className="turn-title">
          {game.phase === "finished"
            ? "🏆 Partida encerrada"
            : game.phase === "hand-over"
              ? "Fim da mão"
              : myTurn
                ? "Sua vez!"
                : `Vez de ${nameOf(current.id)}${people.get(current.id)?.bot ? " 🤖" : ""}`}
        </p>
        <ol className="domino-recent">
          {recent.map((line) => (
            <li key={line.seq} className={`tone-${line.tone}`}>
              <span aria-hidden>{line.icon}</span> {line.text}
            </li>
          ))}
        </ol>
      </section>

      {mine && !mine.out && (
        <section className={myTurn ? "card domino-hand my-turn" : "card domino-hand"} ref={playRef} aria-label="Suas pedras">
          <h2>
            Suas pedras <span className="muted small">({hand.length} · {pips(hand)} pontos)</span>
          </h2>
          {myTurn && game.forcedTile && <p className="muted small">Comece com a carroça {game.forcedTile.join("|")}.</p>}
          <div className="hand-tiles">
            {hand.map((tile) => {
              const playable = plays.some((play) => sameTile(play.tile, tile));
              return (
                <button
                  key={`${tile[0]}-${tile[1]}`}
                  className={`hand-tile${playable ? " playable" : ""}${choosing && sameTile(choosing, tile) ? " chosen" : ""}`}
                  disabled={!playable || pending}
                  onClick={() => onTile(tile)}
                  aria-label={`Pedra ${tile[0]} e ${tile[1]}${playable ? ", pode jogar" : ""}`}
                >
                  <DominoTile tile={tile} horizontal={false} size="l" />
                </button>
              );
            })}
          </div>
          {choosing && ends && (
            <div className="action-row side-choice">
              <button className="button primary" disabled={pending} onClick={() => onSide("left")}>
                ◀ Na ponta {ends[0]}
              </button>
              <button className="button primary" disabled={pending} onClick={() => onSide("right")}>
                Na ponta {ends[1]} ▶
              </button>
            </div>
          )}
          {!myTurn && game.phase === "playing" && <p className="muted small">Espere a sua vez. As pedras que servem ficam destacadas.</p>}
        </section>
      )}

      <div className="tabs" role="tablist" aria-label="Painéis da partida">
        {(["historico", "conversa"] as const).map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "tab active" : "tab"} onClick={() => setTab(id)}>
            {id === "historico" ? "Histórico" : `Conversa${room.chat.length ? ` (${room.chat.length})` : ""}`}
          </button>
        ))}
      </div>
      <section className="card" role="tabpanel">
        {tab === "historico" ? (
          <ol className="log">
            {[...lines].reverse().map((line) => (
              <li key={line.seq} className={line.big ? "big" : ""}>
                <span aria-hidden>{line.icon}</span> {line.text}
              </li>
            ))}
          </ol>
        ) : (
          <Chat room={room} me={me} send={send} />
        )}
      </section>

      {mine && !mine.out && game.phase !== "finished" && (
        <button
          className="button ghost block"
          disabled={pending}
          onClick={() => {
            const warning = game.mode === "duplas" ? "Desistir entrega a partida para a outra dupla." : "Suas pedras saem do jogo.";
            if (window.confirm(`Desistir da partida? ${warning}`)) void act({ type: "resign" });
          }}
        >
          Desistir da partida
        </button>
      )}

      {(showHandDialog || showFinal) && (
        <div className="event-backdrop">
          <div className="event-dialog domino-result" role="dialog" aria-modal="true" aria-labelledby="domino-result-title">
            <h2 id="domino-result-title">
              {game.phase === "finished"
                ? `🏆 ${game.winnerIds.map(nameOf).join(" e ")} ${game.winnerIds.length > 1 ? "venceram" : "venceu"}!`
                : `Fim da mão ${handResult!.hand}`}
            </h2>
            {handResult && (
              <p>
                {handResult.reason === "batida"
                  ? `${nameOf(handResult.batedorId!)} bateu${handResult.batida && handResult.batida !== "simples" ? ` de ${BATIDA_NAMES[handResult.batida]}` : ""}.`
                  : "A mão trancou."}{" "}
                {handResult.winnerIds.length
                  ? `${handResult.winnerIds.map(nameOf).join(" e ")} ${handResult.winnerIds.length > 1 ? "marcam" : "marca"} ${handResult.points}.`
                  : "Ninguém marcou."}
              </p>
            )}
            {handResult && (
              <ul className="revealed">
                {game.players
                  .filter((player) => handResult!.hands[player.id])
                  .map((player) => (
                    <li key={player.id}>
                      <span className="revealed-name">
                        {people.get(player.id)?.avatar} {nameOf(player.id)}
                        <span className="muted small">
                          {" "}
                          · {handResult!.pips[player.id]} na mão{game.teamScores ? "" : ` · total ${player.score}`}
                        </span>
                      </span>
                      <span className="revealed-tiles">
                        {handResult!.hands[player.id].map((tile) => (
                          <DominoTile key={`${tile[0]}-${tile[1]}`} tile={tile} horizontal={false} size="s" />
                        ))}
                        {handResult!.hands[player.id].length === 0 && <span className="muted small">bateu</span>}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            {game.teamScores && (
              <p>
                Placar: {teamLabel(0)} {game.teamScores[0]} × {game.teamScores[1]} {teamLabel(1)}
              </p>
            )}
            {game.phase === "finished" && result && result.stake > 0 && (
              <p className="pot-result">
                Pote de {funcoins(result.pot)}:{" "}
                {result.winners.map((id) => `${nameOf(id)} +${result.payouts[id].toLocaleString("pt-BR")}`).join(", ")}
              </p>
            )}
            <footer className="event-footer">
              {game.phase === "hand-over" && mine && !mine.out && (
                <button className="button primary" disabled={pending} onClick={() => act({ type: "next-hand" })}>
                  Próxima mão
                </button>
              )}
              {game.phase === "finished" && me && (
                <button className="button primary" disabled={pending} onClick={() => send({ kind: "rematch" })}>
                  Jogar de novo nesta sala
                </button>
              )}
              <button className="button" onClick={() => setClosedHand(game.phase === "finished" ? -1 : handResult!.hand)}>
                Ver a mesa
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
