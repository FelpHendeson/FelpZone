"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createRoom, fetchRoom, joinRoom, sendCommand } from "@/client/api";
import { useProfile } from "@/client/profile";
import { forgetRoom, saveSeat, useRecentRooms } from "@/client/seats";
import { GAMES } from "@/games/registry";
import { HowToPlay } from "./HowToPlay";
import { PrefsForm } from "./PrefsForm";
import { ProfileCard } from "./ProfileCard";
import { Sheet } from "./Sheet";

type Result = { room: { code: string }; playerId: string; token: string };

export function Home() {
  const router = useRouter();
  const profile = useProfile();
  const recent = useRecentRooms();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"help" | "prefs" | null>(null);
  const [resume, setResume] = useState<{ code: string; label: string } | null>(null);
  const game = GAMES.magnata;
  const name = profile.name.trim();

  // "Continuar partida": a sala mais recente com assento salvo que ainda existe.
  const latest = recent[0]?.code ?? null;
  useEffect(() => {
    if (!latest) return;
    let cancelled = false;
    fetchRoom(latest, 0)
      .then(({ room }) => {
        if (cancelled || !room) return;
        const label = room.status === "lobby" ? "no lobby" : room.status === "playing" ? "em andamento" : "terminada";
        setResume({ code: latest, label });
      })
      .catch((caught) => {
        if (!cancelled && caught?.status === 404) forgetRoom(latest);
      });
    return () => {
      cancelled = true;
    };
  }, [latest]);

  async function run(task: () => Promise<Result>) {
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      saveSeat(result.room.code, { playerId: result.playerId, token: result.token });
      router.push(`/sala/${result.room.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
      setBusy(false);
    }
  }

  /** Cria a sala com três robôs de estilos diferentes e já começa. */
  function onSolo() {
    run(async () => {
      const created = await createRoom(name, profile.avatar);
      const { code: roomCode } = created.room;
      for (const strategy of ["investidor", "conservador", "colecionador"]) {
        await sendCommand(roomCode, created.token, { kind: "add-bot", strategy });
      }
      await sendCommand(roomCode, created.token, { kind: "set-options", options: { roundLimit: 60 } });
      await sendCommand(roomCode, created.token, { kind: "start" });
      return created;
    });
  }

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    run(() => joinRoom(normalized, name, profile.avatar));
  }

  return (
    <main className="page home">
      <header className="hero">
        <p className="eyebrow">FelpZone</p>
        <h1>Mesa Online</h1>
        <p>Jogos de tabuleiro com a família e os amigos, direto no navegador do celular.</p>
      </header>

      <ProfileCard profile={profile} />

      {resume && (
        <button className="card continue-card" onClick={() => router.push(`/sala/${resume.code}`)}>
          <span className="continue-icon" aria-hidden>
            ↩️
          </span>
          <span>
            <strong>Continuar partida</strong>
            <span className="muted">
              Sala {resume.code} · {resume.label}
            </span>
          </span>
        </button>
      )}

      <section className="card">
        <div className="main-actions">
          <button className="button primary" disabled={busy || !name} onClick={() => run(() => createRoom(name, profile.avatar))}>
            👥 Jogar com amigos
          </button>
          <button className="button" disabled={busy || !name} onClick={onSolo}>
            🤖 Jogar contra robôs
          </button>
        </div>
        {!name && <p className="muted small">Escreva seu nome no perfil para começar.</p>}

        <div className="divider">
          <span>ou entre com um código</span>
        </div>

        <form className="join-row" onSubmit={onJoin}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={5}
            placeholder="CÓDIGO"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Código da sala"
            className="code-input"
          />
          <button className="button" disabled={busy || !name || code.trim().length !== 5}>
            Entrar
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="card game-card">
        <div className="game-card-art" aria-hidden>
          🏙️
        </div>
        <div>
          <h2>{game.name}</h2>
          <p>{game.description}</p>
          <p className="muted">
            {game.minPlayers} a {game.maxPlayers} participantes · pessoas e robôs · 5 temas de tabuleiro
          </p>
        </div>
      </section>

      <nav className="link-row" aria-label="Ajuda">
        <button className="link-button light" onClick={() => setSheet("help")}>
          Como jogar
        </button>
        <button className="link-button light" onClick={() => setSheet("prefs")}>
          Preferências
        </button>
      </nav>

      <p className="footnote muted">Sem cadastro: quem cria a sala recebe um código para compartilhar.</p>

      {sheet === "help" && (
        <Sheet title="Como jogar o Magnata" onClose={() => setSheet(null)}>
          <HowToPlay />
        </Sheet>
      )}
      {sheet === "prefs" && (
        <Sheet title="Preferências" onClose={() => setSheet(null)}>
          <PrefsForm prefs={profile.prefs} />
        </Sheet>
      )}
    </main>
  );
}
