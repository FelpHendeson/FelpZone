"use client";

import { useState, type FormEvent } from "react";
import { joinRoom } from "@/client/api";
import { saveProfile, type Profile } from "@/client/profile";
import { saveSeat } from "@/client/seats";
import { BOTS, BOT_KINDS } from "@/bots/strategies";
import type { BotKind } from "@/bots/types";
import { THEMES, THEME_IDS, tileNameIn } from "@/games/magnata/themes";
import { GAMES } from "@/games/registry";
import type { PublicRoom } from "@/rooms/public";
import { BOT_PACES, ROUND_LIMITS, TURN_TIMEOUTS, type BotPace, type RoomPlayer } from "@/rooms/room";
import { Chat } from "./Chat";
import type { Send } from "./RoomScreen";

interface Props {
  room: PublicRoom;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
  onJoined: (room: PublicRoom) => void;
  profile: Profile;
}

const timeoutLabel = (seconds: number | null) => (seconds ? `${seconds / 60} min` : "Sem prazo");
const PACE_LABELS: Record<BotPace, string> = { fast: "Rápido", normal: "Normal", slow: "Lento" };
const paceLabel = (pace: BotPace) =>
  `${PACE_LABELS[pace]} (${(BOT_PACES[pace] / 1000).toLocaleString("pt-BR")} s entre jogadas)`;

export function Lobby({ room, me, send, pending, onJoined, profile }: Props) {
  const game = GAMES[room.gameId];
  const isHost = me?.id === room.hostId;
  const full = room.players.length >= game.maxPlayers;
  const [share, setShare] = useState<"idle" | "copied" | "manual">("idle");
  const [strategy, setStrategy] = useState<BotKind>("investidor");
  const { options } = room;
  const theme = THEMES[options.themeId] ?? THEMES.classico;
  const otherHumans = room.players.filter((player) => !player.bot && player.id !== me?.id).length;
  const missing = Math.max(0, game.minPlayers - room.players.length);

  const setOption = (patch: Record<string, unknown>) => send({ kind: "set-options", options: patch });

  async function onShare() {
    const url = `${window.location.origin}/sala/${room.code}`;
    const text = `Bora jogar ${game.name}? Sala ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mesa Online", text, url });
        return;
      } catch (caught) {
        // Cancelar o menu nativo não é erro; outras falhas caem na cópia.
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShare("copied");
      setTimeout(() => setShare("idle"), 2500);
    } catch {
      setShare("manual");
    }
  }

  return (
    <>
      <section className="card code-card">
        <p className="muted">
          {game.name} · código da sala
        </p>
        <p className="room-code">{room.code}</p>
        <button className="button" onClick={onShare}>
          {share === "copied" ? "Link copiado!" : "Compartilhar convite"}
        </button>
        {share === "manual" && (
          <>
            <p className="muted small">Não foi possível copiar sozinho. Copie o link:</p>
            <input
              readOnly
              value={`${typeof window === "undefined" ? "" : window.location.origin}/sala/${room.code}`}
              onFocus={(event) => event.target.select()}
              aria-label="Link do convite"
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>
          Jogadores <span className="muted">({room.players.length}/{game.maxPlayers})</span>
        </h2>
        <ul className="player-list">
          {room.players.map((player) => (
            <li key={player.id}>
              <span className="avatar" style={{ borderColor: player.color }} aria-hidden>
                {player.avatar}
              </span>
              <span>{player.name}</span>
              {player.id === room.hostId && <span className="badge">anfitrião</span>}
              {player.id === me?.id && <span className="badge subtle">você</span>}
              {player.bot && <span className="badge subtle">robô</span>}
              {player.bot && isHost && (
                <button className="link-button" disabled={pending} onClick={() => send({ kind: "remove-bot", playerId: player.id })}>
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>

        {!me && !full && <JoinForm code={room.code} profile={profile} onJoined={onJoined} />}
        {!me && full && <p className="muted">A sala está cheia.</p>}

        {isHost && !full && (
          <div className="join-row">
            <select value={strategy} onChange={(event) => setStrategy(event.target.value as BotKind)} aria-label="Estilo do robô">
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
      </section>

      <section className="card">
        <h2>Mesa</h2>
        {isHost ? (
          <div className="options">
            <label className="field">
              <span>Tema do tabuleiro</span>
              <select value={options.themeId} disabled={pending} onChange={(event) => setOption({ themeId: event.target.value })}>
                {THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {THEMES[id].emoji} {THEMES[id].name}
                  </option>
                ))}
              </select>
            </label>
            <ThemePreview themeId={options.themeId} />

            <label className="field">
              <span>Duração</span>
              <select
                value={options.roundLimit ?? ""}
                disabled={pending}
                onChange={(event) => setOption({ roundLimit: event.target.value ? Number(event.target.value) : null })}
              >
                <option value="">Até restar um jogador</option>
                {ROUND_LIMITS.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit} rodadas
                  </option>
                ))}
              </select>
              {options.roundLimit && <span className="muted hint">Ao fim das rodadas, vence o maior patrimônio.</span>}
            </label>

            <label className="field">
              <span>Prazo por jogada</span>
              <select
                value={options.turnTimeout ?? ""}
                disabled={pending}
                onChange={(event) => setOption({ turnTimeout: event.target.value ? Number(event.target.value) : null })}
              >
                <option value="">Sem prazo</option>
                {TURN_TIMEOUTS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {timeoutLabel(seconds)}
                  </option>
                ))}
              </select>
              <span className="muted hint">
                {options.turnTimeout
                  ? `Quem ficar ${timeoutLabel(options.turnTimeout)} sem jogar passa a ser jogado pelo piloto automático até voltar.`
                  : "Ninguém joga por quem sumir: a mesa espera."}
              </span>
            </label>

            <label className="field">
              <span>Ritmo dos robôs</span>
              <select
                value={options.botPace ?? "normal"}
                disabled={pending}
                onChange={(event) => setOption({ botPace: event.target.value })}
              >
                {(Object.keys(BOT_PACES) as BotPace[]).map((pace) => (
                  <option key={pace} value={pace}>
                    {paceLabel(pace)}
                  </option>
                ))}
              </select>
              <span className="muted hint">Vale para os robôs e para o piloto automático de quem estiver ausente.</span>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={options.auctions ?? true}
                disabled={pending}
                onChange={(event) => setOption({ auctions: event.target.checked })}
              />
              <span>
                Leilão ao recusar uma compra
                <span className="muted hint">Quem cai numa casa à venda e não compra abre um leilão de lances secretos para todos.</span>
              </span>
            </label>

            <label className="check">
              <input type="checkbox" checked={options.credit} disabled={pending} onChange={(event) => setOption({ credit: event.target.checked })} />
              <span>
                Empréstimos do banco <span className="badge subtle">variante</span>
                <span className="muted hint">Muda as regras: até metade do valor das propriedades livres, devolvendo +20% em 8 turnos.</span>
              </span>
            </label>
          </div>
        ) : (
          <ul className="summary">
            <li>
              Tema: {theme.emoji} {theme.name}
            </li>
            <li>Duração: {options.roundLimit ? `${options.roundLimit} rodadas` : "até restar um jogador"}</li>
            <li>Prazo por jogada: {timeoutLabel(options.turnTimeout)}</li>
            <li>Ritmo dos robôs: {paceLabel(options.botPace ?? "normal")}</li>
            <li>Leilão ao recusar: {(options.auctions ?? true) ? "ligado" : "desligado"}</li>
            <li>Empréstimos do banco: {options.credit ? "ligados (variante)" : "desligados"}</li>
          </ul>
        )}
      </section>

      <section className="card">
        {missing > 0 ? (
          <p className="muted">
            Falta{missing > 1 ? "m" : ""} {missing} participante{missing > 1 ? "s" : ""}: convide alguém {isHost ? "ou adicione um robô" : ""}.
          </p>
        ) : (
          !isHost && <p className="muted">Tudo pronto. Aguardando o anfitrião começar a partida…</p>
        )}
        {isHost && (
          <button className="button primary block" disabled={pending || missing > 0} onClick={() => send({ kind: "start" })}>
            Começar partida
          </button>
        )}
        {me && otherHumans > 0 && (
          <button className="button ghost block" disabled={pending} onClick={() => send({ kind: "leave" })}>
            Sair da sala
          </button>
        )}
        {me && otherHumans === 0 && room.players.length > 1 && (
          <p className="muted small">Você é a única pessoa aqui. Para desistir desta sala, basta voltar ao início: ela expira sozinha.</p>
        )}
      </section>

      <section className="card">
        <h2>Conversa</h2>
        <Chat room={room} me={me} send={send} />
      </section>
    </>
  );
}

function ThemePreview({ themeId }: { themeId: keyof typeof THEMES }) {
  const theme = THEMES[themeId];
  return (
    <div className="theme-preview" style={{ background: theme.palette.felt }}>
      <span className="theme-emoji" aria-hidden>
        {theme.emoji}
      </span>
      <span>
        <strong>{theme.name}</strong>
        <span>{theme.description}</span>
        <span className="theme-sample">
          {[1, 19, 39].map((index) => tileNameIn(theme, index)).join(" · ")}
        </span>
        <span className="theme-sample">Só muda nomes e cores: preços e regras são os mesmos.</span>
      </span>
    </div>
  );
}

function JoinForm({ code, profile, onJoined }: { code: string; profile: Profile; onJoined: (room: PublicRoom) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await joinRoom(code, profile.name, profile.avatar);
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
      <span className="avatar" aria-hidden>
        {profile.avatar}
      </span>
      <input
        value={profile.name}
        onChange={(event) => saveProfile({ name: event.target.value })}
        maxLength={20}
        placeholder="Seu nome"
        aria-label="Seu nome"
        autoComplete="nickname"
      />
      <button className="button primary" disabled={busy || !profile.name.trim()}>
        Entrar
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
