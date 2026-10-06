"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { joinRoom } from "@/client/api";
import { rememberName, saveSeat } from "@/client/seats";
import { BOTS, BOT_KINDS } from "@/bots/strategies";
import type { BotKind } from "@/bots/types";
import { GAMES } from "@/games/registry";
import { ROUND_LIMITS, type Room, type RoomPlayer } from "@/rooms/room";
import { Chat } from "./Chat";
import type { Send } from "./RoomScreen";

interface Props {
  room: Room;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
  onJoined: (room: Room) => void;
}

export function Lobby({ room, me, send, pending, onJoined }: Props) {
  const game = GAMES[room.gameId];
  const isHost = me?.id === room.hostId;
  const full = room.players.length >= game.maxPlayers;
  const [copied, setCopied] = useState(false);
  const [strategy, setStrategy] = useState<BotKind>("investidor");
  const roundLimit = room.options?.roundLimit ?? null;

  async function share() {
    const url = window.location.href;
    const text = `Bora jogar ${game.name}? Sala ${room.code}`;
    if (navigator.share) {
      await navigator.share({ title: "Mesa Online", text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <header className="room-header">
        <Link href="/" className="back">
          ← Início
        </Link>
        <span className="muted">{game.name}</span>
      </header>

      <section className="card code-card">
        <p className="muted">Código da sala</p>
        <p className="room-code">{room.code}</p>
        <button className="button" onClick={share}>
          {copied ? "Link copiado!" : "Compartilhar convite"}
        </button>
      </section>

      <section className="card">
        <h2>
          Jogadores <span className="muted">({room.players.length}/{game.maxPlayers})</span>
        </h2>
        <ul className="player-list">
          {room.players.map((player) => (
            <li key={player.id}>
              <span className="token" style={{ background: player.color }} />
              <span>
                {player.bot && "🤖 "}
                {player.name}
              </span>
              {player.id === room.hostId && <span className="badge">anfitrião</span>}
              {player.id === me?.id && <span className="badge subtle">você</span>}
              {player.bot && isHost && (
                <button
                  className="link-button"
                  disabled={pending}
                  onClick={() => send({ kind: "remove-bot", playerId: player.id })}
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && !full && (
          <div className="join-row">
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as BotKind)}
              aria-label="Estilo do robô"
            >
              {BOT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {BOTS[kind].name}
                </option>
              ))}
            </select>
            <button className="button" disabled={pending} onClick={() => send({ kind: "add-bot", strategy })}>
              + Robô
            </button>
            <p className="muted hint">{BOTS[strategy].description}</p>
          </div>
        )}

        <label className="field inline-field">
          <span>Duração</span>
          {isHost ? (
            <select
              value={roundLimit ?? ""}
              disabled={pending}
              onChange={(event) =>
                send({ kind: "set-options", roundLimit: event.target.value ? Number(event.target.value) : null })
              }
            >
              <option value="">Até alguém falir</option>
              {ROUND_LIMITS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit} rodadas
                </option>
              ))}
            </select>
          ) : (
            <span className="muted">{roundLimit ? `${roundLimit} rodadas` : "Até alguém falir"}</span>
          )}
          {roundLimit && <span className="muted hint">Ao fim das rodadas, vence o maior patrimônio.</span>}
        </label>

        {!me && !full && <JoinForm code={room.code} onJoined={onJoined} />}
        {!me && full && <p className="muted">A sala está cheia.</p>}

        {isHost && (
          <button
            className="button primary block"
            disabled={pending || room.players.length < game.minPlayers}
            onClick={() => send({ kind: "start" })}
          >
            {room.players.length < game.minPlayers ? "Aguardando mais jogadores…" : "Começar partida"}
          </button>
        )}
        {me && !isHost && <p className="muted">Aguardando o anfitrião começar a partida…</p>}
        {me && room.players.length > 1 && (
          <button className="button ghost block" disabled={pending} onClick={() => send({ kind: "leave" })}>
            Sair da sala
          </button>
        )}
      </section>

      <section className="card">
        <h2>Conversa</h2>
        <Chat room={room} me={me} send={send} />
      </section>
    </>
  );
}

function JoinForm({ code, onJoined }: { code: string; onJoined: (room: Room) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await joinRoom(code, name);
      rememberName(name.trim());
      saveSeat(code, { playerId: result.playerId, token: result.token });
      onJoined(result.room);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="join-row" onSubmit={onSubmit}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={20}
        placeholder="Seu nome"
        aria-label="Seu nome"
        autoComplete="nickname"
      />
      <button className="button primary" disabled={busy || !name.trim()}>
        Entrar
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
