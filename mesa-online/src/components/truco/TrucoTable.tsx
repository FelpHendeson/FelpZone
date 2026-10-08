"use client";

import { useState } from "react";
import { funcoins } from "@/accounts/funcoins";
import { cardSpeech, describeTrucoEvent } from "@/games/truco/describe";
import {
  CALL_NAMES,
  TRUCO_MODES,
  canCall,
  manilhaRank,
  nextStake,
  type Card,
  type Team,
  type TrucoView,
} from "@/games/truco/engine";
import type { PublicRoom } from "@/rooms/public";
import type { RoomPlayer } from "@/rooms/room";
import { Honors } from "../Badges";
import { Chat } from "../Chat";
import type { Send } from "../RoomScreen";
import { PlayingCard } from "./PlayingCard";

interface Props {
  room: PublicRoom;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
}

export function TrucoTable({ room, me, send, pending }: Props) {
  const game = room.game as TrucoView;
  const meId = me?.id ?? null;
  const mine = game.players.find((player) => player.id === meId) ?? null;
  const myTeam: Team | null = mine?.team ?? null;
  const people = new Map(room.players.map((player) => [player.id, player]));
  const nameOf = (id: string) => (id === meId ? "Você" : (people.get(id)?.name ?? "Alguém"));
  const duplas = game.players.length === 4;
  const teamName = (team: Team) =>
    myTeam === null ? `Dupla ${team === 0 ? "A" : "B"}` : team === myTeam ? (duplas ? "Nós" : "Você") : duplas ? "Eles" : nameOf(game.players.find((player) => player.team === team)!.id);
  const away = meId ? room.away.includes(meId) : false;
  const [covered, setCovered] = useState(false);
  const [closedHand, setClosedHand] = useState<number | null>(null);
  const [tab, setTab] = useState<"historico" | "conversa">("historico");

  const act = (action: Record<string, unknown>) => send({ kind: "game", action });
  const myTurn = game.phase === "playing" && !game.call && game.currentPlayerId === meId && mine !== null;
  const iCanCall = mine !== null && canCall(game, mine.id);
  const callForMe = game.call && myTeam !== null && game.call.fromTeam !== myTeam;
  const elevenForMe = game.phase === "eleven" && myTeam !== null && game.elevenTeam === myTeam;
  const canCover = myTurn && game.rounds.length > 0;
  const hand = mine?.hand ?? [];
  const partner = duplas && mine ? game.players.find((player) => player.team === mine.team && player.id !== mine.id) : null;

  const lines = game.events
    .map((event) => describeTrucoEvent(event, nameOf, teamName))
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const recent = lines.slice(-4).reverse();
  const handResult = game.lastHand && game.lastHand.hand === game.hand ? game.lastHand : null;
  const showHandDialog = game.phase === "hand-over" && handResult !== null && closedHand !== handResult.hand;
  const showFinal = game.phase === "finished" && closedHand !== -1;
  const result = room.results.find((item) => item.matchId === room.match?.id) ?? null;
  const current = game.players.find((player) => player.id === game.currentPlayerId)!;

  function playCard(card: Card) {
    if (!myTurn || pending) return;
    void act({ type: "play", card, covered: canCover && covered });
    setCovered(false);
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

      <section className="card truco-head">
        <p className="muted small">
          🃏 Truco {TRUCO_MODES[game.mode].name} · mão {game.hand} · vale <strong>{game.value}</strong>
          {room.match && room.match.stake > 0 ? ` · pote ${funcoins(room.match.stake * room.players.length)}` : ""}
        </p>
        <p className="team-score" aria-label={`Placar: ${teamName(0)} ${game.scores[0]}, ${teamName(1)} ${game.scores[1]}, até 12`}>
          <span className={myTeam === 0 ? "mine" : ""}>
            {teamName(0)} <strong>{game.scores[0]}</strong>
          </span>
          <span aria-hidden>×</span>
          <span className={myTeam === 1 ? "mine" : ""}>
            <strong>{game.scores[1]}</strong> {teamName(1)}
          </span>
        </p>
        <ul className="domino-seats">
          {game.players.map((player) => {
            const seat = people.get(player.id);
            const turn = game.phase === "playing" && !game.call && player.id === game.currentPlayerId;
            const answering = game.call?.responderId === player.id;
            return (
              <li
                key={player.id}
                className={`${turn || answering ? "turn" : ""}${player.id === meId ? " me" : ""}`}
                style={{ borderColor: player.color }}
                aria-label={`${nameOf(player.id)}, ${player.handCount} cartas${turn ? ", jogando agora" : ""}`}
              >
                <span className="avatar" style={{ borderColor: player.color }} aria-hidden>
                  {seat?.avatar}
                </span>
                <span className="seat-name">
                  {nameOf(player.id)}
                  {partner?.id === player.id ? " 🤝" : ""}
                </span>
                <Honors wins={seat?.wins} badges={seat?.badges} />
                <span className="seat-info">🂠 {player.handCount}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="truco-felt" aria-label="Mesa do truco">
        <div className="truco-top">
          {game.vira ? (
            <span className="vira" aria-label={`Vira: ${cardSpeech(game.vira)}. Manilha: ${manilhaRank(game.vira)}`}>
              <PlayingCard card={game.vira} size="s" />
              <span className="light small">
                vira · manilha <strong>{manilhaRank(game.vira)}</strong>
              </span>
            </span>
          ) : (
            <span className="light small">Manilhas: 4♣ 7♥ A♠ 7♦</span>
          )}
          <ol className="round-dots" aria-label="Rodadas desta mão">
            {[0, 1, 2].map((index) => {
              const round = game.rounds[index];
              const label = !round ? "·" : round.team === null ? "=" : round.team === myTeam ? "✓" : myTeam === null ? (round.team === 0 ? "A" : "B") : "✗";
              return (
                <li key={index} className={!round ? "" : round.team === null ? "tie" : round.team === myTeam ? "won" : "lost"}>
                  {label}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="truco-table" role="list" aria-label="Cartas na rodada">
          {game.table.length === 0 && <span className="light small">Mesa vazia</span>}
          {game.table.map((played) => (
            <span role="listitem" key={played.playerId} className="truco-played">
              <PlayingCard card={played.card} size="m" />
              <span className="light small">{nameOf(played.playerId)}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="card domino-status" aria-live="polite">
        <p className="turn-title">
          {game.phase === "finished"
            ? "🏆 Partida encerrada"
            : game.phase === "hand-over"
              ? "Fim da mão"
              : game.phase === "eleven"
                ? `Mão de onze: ${teamName(game.elevenTeam!)} ${elevenForMe ? "decide" : "decide…"}`
                : game.call
                  ? `${nameOf(game.call.fromId)} pediu ${CALL_NAMES[game.call.value].toUpperCase()}!`
                  : myTurn
                    ? "Sua vez!"
                    : `Vez de ${nameOf(current.id)}${people.get(current.id)?.bot ? " 🤖" : ""}`}
        </p>
        <ol className="domino-recent">
          {recent.map((line) => (
            <li key={line.seq}>
              <span aria-hidden>{line.icon}</span> {line.text}
            </li>
          ))}
        </ol>
      </section>

      {mine && (
        <section className={myTurn ? "card domino-hand my-turn" : "card domino-hand"} aria-label="Suas cartas">
          <h2>Suas cartas</h2>
          <div className="truco-hand">
            {hand.map((card) => (
              <button key={card} className={myTurn ? "hand-card playable" : "hand-card"} disabled={!myTurn || pending} onClick={() => playCard(card)} aria-label={`Jogar ${cardSpeech(card)}`}>
                <PlayingCard card={card} size="l" />
              </button>
            ))}
          </div>
          <div className="action-row">
            {iCanCall && (
              <button className="button danger truco-call" disabled={pending} onClick={() => act({ type: "call" })}>
                {CALL_NAMES[nextStake(game.value)!].toUpperCase()}!
              </button>
            )}
            {canCover && (
              <label className="check cover-toggle">
                <input type="checkbox" checked={covered} onChange={(event) => setCovered(event.target.checked)} />
                <span>Jogar coberta</span>
              </label>
            )}
          </div>
          {game.call && game.call.fromTeam === myTeam && <p className="muted small">Esperando {nameOf(game.call.responderId)} responder…</p>}
          {!myTurn && game.phase === "playing" && !game.call && <p className="muted small">Espere a sua vez.</p>}
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

      {mine && game.phase !== "finished" && (
        <button
          className="button ghost block"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Desistir da partida? ${duplas ? "Sua dupla perde." : "Você perde."}`)) void act({ type: "resign" });
          }}
        >
          Desistir da partida
        </button>
      )}

      {callForMe && (
        <div className="event-backdrop">
          <div className="event-dialog truco-dialog" role="dialog" aria-modal="true" aria-labelledby="truco-call-title">
            <h2 id="truco-call-title">
              📣 {nameOf(game.call!.fromId)} pediu {CALL_NAMES[game.call!.value].toUpperCase()}!
            </h2>
            <p>
              Aceitando, a mão passa a valer <strong>{game.call!.value}</strong>. Correndo, {teamName(game.call!.fromTeam)} ganha {game.value}{" "}
              {game.value === 1 ? "ponto" : "pontos"}.
            </p>
            <div className="truco-hand small-hand">
              {hand.map((card) => (
                <PlayingCard key={card} card={card} size="m" />
              ))}
            </div>
            <footer className="event-footer">
              <button className="button primary" disabled={pending} onClick={() => act({ type: "accept" })}>
                Aceitar
              </button>
              <button className="button" disabled={pending} onClick={() => act({ type: "run" })}>
                Correr
              </button>
              {nextStake(game.call!.value) !== null && (
                <button className="button danger" disabled={pending} onClick={() => act({ type: "raise" })}>
                  {CALL_NAMES[nextStake(game.call!.value)!].toUpperCase()}!
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {elevenForMe && (
        <div className="event-backdrop">
          <div className="event-dialog truco-dialog" role="dialog" aria-modal="true" aria-labelledby="truco-eleven-title">
            <h2 id="truco-eleven-title">🎯 Mão de onze</h2>
            <p>Vocês estão com 11. Jogando, a mão vale 3 (sem truco); correndo, a outra dupla ganha 1.</p>
            {game.players
              .filter((player) => player.team === myTeam && player.hand)
              .map((player) => (
                <div key={player.id}>
                  <p className="muted small">{nameOf(player.id)}</p>
                  <div className="truco-hand small-hand">
                    {player.hand!.map((card) => (
                      <PlayingCard key={card} card={card} size="m" />
                    ))}
                  </div>
                </div>
              ))}
            <footer className="event-footer">
              <button className="button primary" disabled={pending} onClick={() => act({ type: "eleven", play: true })}>
                Jogar (vale 3)
              </button>
              <button className="button" disabled={pending} onClick={() => act({ type: "eleven", play: false })}>
                Correr
              </button>
            </footer>
          </div>
        </div>
      )}

      {(showHandDialog || showFinal) && (
        <div className="event-backdrop">
          <div className="event-dialog domino-result" role="dialog" aria-modal="true" aria-labelledby="truco-result-title">
            <h2 id="truco-result-title">
              {game.phase === "finished"
                ? `🏆 ${game.winnerIds.map(nameOf).join(" e ")} ${game.winnerIds.length > 1 ? "venceram" : "venceu"}!`
                : `Fim da mão ${handResult!.hand}`}
            </h2>
            {handResult && (
              <p>
                {handResult.team === null
                  ? "Mão empatada: ninguém marca."
                  : `${teamName(handResult.team)} ${handResult.points === 1 ? "marca 1 ponto" : `marca ${handResult.points} pontos`}${
                      handResult.reason === "correu" ? " (a outra dupla correu)" : handResult.reason === "mao-de-onze" ? " (correram da mão de onze)" : ""
                    }.`}
              </p>
            )}
            <p className="team-score">
              {teamName(0)} <strong>{game.scores[0]}</strong> × <strong>{game.scores[1]}</strong> {teamName(1)}
            </p>
            {game.phase === "finished" && result && result.stake > 0 && (
              <p className="pot-result">
                Pote de {funcoins(result.pot)}: {result.winners.map((id) => `${nameOf(id)} +${result.payouts[id].toLocaleString("pt-BR")}`).join(", ")}
              </p>
            )}
            <footer className="event-footer">
              {game.phase === "hand-over" && mine && (
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
