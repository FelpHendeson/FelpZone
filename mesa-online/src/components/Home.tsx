"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { createRoom, joinRoom } from "@/client/api";
import { rememberName, rememberedName, saveSeat } from "@/client/seats";
import { GAMES } from "@/games/registry";

const noSubscription = () => () => {};

export function Home() {
  const router = useRouter();
  // O nome lembrado só existe no navegador; no servidor o campo começa vazio.
  const storedName = useSyncExternalStore(noSubscription, rememberedName, () => "");
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? storedName;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const game = GAMES.magnata;

  async function run(task: () => Promise<{ room: { code: string }; playerId: string; token: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      rememberName(name.trim());
      saveSeat(result.room.code, { playerId: result.playerId, token: result.token });
      router.push(`/sala/${result.room.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
      setBusy(false);
    }
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    run(() => createRoom(name));
  }

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    run(() => joinRoom(normalized, name));
  }

  return (
    <main className="page home">
      <header className="hero">
        <p className="eyebrow">FelpZone</p>
        <h1>Mesa Online</h1>
        <p>Jogos de tabuleiro com a família e os amigos, direto no navegador do celular.</p>
      </header>

      <section className="card game-card">
        <div className="game-card-art" aria-hidden>
          🏙️
        </div>
        <div>
          <h2>{game.name}</h2>
          <p>{game.description}</p>
          <p className="muted">
            {game.minPlayers} a {game.maxPlayers} jogadores
          </p>
        </div>
      </section>

      <section className="card">
        <label className="field">
          <span>Seu nome</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            autoComplete="nickname"
            placeholder="Como vão te chamar na mesa"
          />
        </label>

        <form onSubmit={onCreate}>
          <button className="button primary block" disabled={busy || !name.trim()}>
            Criar sala de {game.name}
          </button>
        </form>

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
          <button className="button" disabled={busy || !name.trim() || code.trim().length !== 5}>
            Entrar
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </section>

      <p className="footnote muted">
        Sem cadastro: quem cria a sala recebe um código para compartilhar. Cada aparelho lembra quem você é na sala.
      </p>
    </main>
  );
}
