"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { GroupView } from "@/accounts/groups";
import { createRoom, fetchGroups, fetchRoom, joinRoom, sendCommand } from "@/client/api";
import { useProfile } from "@/client/profile";
import { forgetRoom, saveSeat, useRecentRooms } from "@/client/seats";
import { useAccount } from "@/client/useAccount";
import { usePlaza } from "@/client/usePlaza";
import { DOMINO_MODES, type DominoMode } from "@/games/domino/engine";
import { TRUCO_MODES, type TrucoMode } from "@/games/truco/engine";
import { GAMES, GAME_IDS, type GameId } from "@/games/registry";
import { funcoins, priceLabel } from "@/accounts/funcoins";
import { STAKES } from "@/rooms/room";
import { AccountPanel } from "./AccountPanel";
import { GroupsPanel } from "./GroupsPanel";
import { PushCard } from "./PushCard";
import { DominoRules } from "./domino/DominoRules";
import { HowToPlay } from "./HowToPlay";
import { TrucoRules } from "./truco/TrucoRules";
import { NoticeList, PlazaPanel } from "./PlazaPanel";
import { PrefsForm } from "./PrefsForm";
import { ProfileCard } from "./ProfileCard";
import { Sheet } from "./Sheet";

type Result = { room: { code: string }; playerId: string; token: string };

const DOMINO_MODE_IDS = Object.keys(DOMINO_MODES) as DominoMode[];
const MENU = { status: "menu" } as const;

export function Home() {
  const router = useRouter();
  const profile = useProfile();
  const recent = useRecentRooms();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"help" | "prefs" | null>(null);
  const [resume, setResume] = useState<{ code: string; label: string; lobby: boolean } | null>(null);
  const [gameId, setGameId] = useState<GameId>("magnata");
  const [mode, setMode] = useState<DominoMode>("bloqueio");
  const [stake, setStake] = useState(0);
  const [trucoMode, setTrucoMode] = useState<TrucoMode>("paulista");
  const [trucoDuplas, setTrucoDuplas] = useState(false);
  const { me, loaded } = useAccount();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);
  const { plaza, notices, dismiss, refresh } = usePlaza(MENU, { full: true, enabled: true, groupId: chatGroupId });

  // Grupos da conta: recarregados ao entrar ou sair.
  const meId = me?.id ?? null;
  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    fetchGroups()
      .then(({ groups: found }) => !cancelled && setGroups(found))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [meId]);
  const game = GAMES[gameId];
  const name = me ? me.nickname : profile.name.trim();
  const avatar = me ? me.avatar : profile.avatar;
  // O preço da jogada é escolhido aqui e não muda depois (quem entra sabe quanto vale).
  const price = me ? stake : 0;
  const options = {
    ...(gameId === "domino" ? { dominoMode: mode } : {}),
    ...(gameId === "truco" ? { trucoMode } : {}),
    stake: price,
  };

  // "Continuar partida": a sala mais recente com assento salvo que ainda existe.
  const latest = recent[0]?.code ?? null;
  useEffect(() => {
    if (!latest) return;
    let cancelled = false;
    fetchRoom(latest, 0)
      .then(({ room }) => {
        if (cancelled || !room) return;
        const label = room.status === "lobby" ? "no lobby" : room.status === "playing" ? "em andamento" : "terminada";
        setResume({ code: latest, label, lobby: room.status === "lobby" });
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

  /** Cria a sala com robôs e já começa: 3 no Magnata e nas Duplas, 2 no dominó individual. */
  function onSolo() {
    run(async () => {
      const created = await createRoom(name, avatar, gameId, options);
      const { code: roomCode } = created.room;
      const bots =
        gameId === "magnata"
          ? ["investidor", "conservador", "colecionador"]
          : gameId === "truco"
            ? trucoDuplas
              ? ["medio", "dificil", "medio"]
              : ["dificil"]
            : mode === "duplas"
              ? ["medio", "dificil", "medio"]
              : ["medio", "dificil"];
      for (const strategy of bots) {
        await sendCommand(roomCode, created.token, { kind: "add-bot", strategy });
      }
      if (gameId === "magnata") await sendCommand(roomCode, created.token, { kind: "set-options", options: { roundLimit: 60 } });
      await sendCommand(roomCode, created.token, { kind: "start" });
      return created;
    });
  }

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    run(() => joinRoom(normalized, name, avatar));
  }

  return (
    <main className="page home">
      <header className="hero">
        <p className="eyebrow">FelpZone</p>
        <h1>Mesa Online</h1>
        <p>Jogos de tabuleiro com a família e os amigos, direto no navegador do celular.</p>
      </header>

      <NoticeList notices={notices} onDismiss={dismiss} onJoin={(roomCode) => router.push(`/sala/${roomCode}`)} />

      <AccountPanel me={me} loaded={loaded} profile={profile} />
      {loaded && !me && <ProfileCard profile={profile} />}

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
        <h2>Novo jogo</h2>
        <div className="game-picker" role="radiogroup" aria-label="Escolha o jogo">
          {GAME_IDS.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={gameId === id}
              className={gameId === id ? "game-option active" : "game-option"}
              onClick={() => setGameId(id)}
            >
              <span className="game-option-art" aria-hidden>
                {GAMES[id].emoji}
              </span>
              <strong>{GAMES[id].name}</strong>
              <span className="muted small">
                {GAMES[id].minPlayers} a {GAMES[id].maxPlayers} jogadores
              </span>
            </button>
          ))}
        </div>
        {gameId === "domino" && (
          <label className="field">
            <span>Modalidade</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as DominoMode)}>
              {DOMINO_MODE_IDS.map((id) => (
                <option key={id} value={id}>
                  {DOMINO_MODES[id].name} — {DOMINO_MODES[id].short}
                </option>
              ))}
            </select>
            <span className="muted hint">{DOMINO_MODES[mode].description}</span>
          </label>
        )}
        {gameId === "truco" && (
          <>
            <label className="field">
              <span>Modalidade</span>
              <select value={trucoMode} onChange={(event) => setTrucoMode(event.target.value as TrucoMode)}>
                {(Object.keys(TRUCO_MODES) as TrucoMode[]).map((id) => (
                  <option key={id} value={id}>
                    Truco {TRUCO_MODES[id].name}
                  </option>
                ))}
              </select>
              <span className="muted hint">{TRUCO_MODES[trucoMode].description}</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={trucoDuplas} onChange={(event) => setTrucoDuplas(event.target.checked)} />
              <span>
                Em duplas contra robôs
                <span className="muted hint">Sem marcar, é 1 contra 1. Com amigos, a sala vira duplas quando tiver 4 pessoas.</span>
              </span>
            </label>
          </>
        )}
        <label className="field">
          <span>Preço da jogada</span>
          <select value={price} disabled={!me} onChange={(event) => setStake(Number(event.target.value))}>
            {STAKES.map((value) => (
              <option key={value} value={value}>
                🪙 {priceLabel(value)}
              </option>
            ))}
          </select>
          <span className="muted hint">
            {me
              ? price
                ? `Cada pessoa entra com ${funcoins(price)}; quem vence leva o pote.`
                : "Grátis: convidados sem conta também podem jogar."
              : "Entre na sua conta para jogar valendo Funcoins."}
          </span>
        </label>
        <p className="muted small">{game.description}</p>
        <div className="main-actions">
          <button className="button primary" disabled={busy || !name} onClick={() => run(() => createRoom(name, avatar, gameId, options))}>
            👥 Jogar com amigos
          </button>
          <button className="button" disabled={busy || !name} onClick={onSolo}>
            🤖 Jogar contra robôs
          </button>
        </div>
        {!name && <p className="muted small">Entre na sua conta ou escreva seu nome para começar.</p>}

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

      {me && <PushCard />}
      {me && (
        <GroupsPanel
          me={me}
          groups={groups}
          onChange={(next) => {
            setGroups(next);
            refresh();
          }}
        />
      )}
      <PlazaPanel
        plaza={plaza}
        me={me}
        groups={me ? groups : []}
        chatGroupId={chatGroupId}
        onChatGroup={setChatGroupId}
        inviteCode={resume?.lobby ? resume.code : null}
        onRefresh={refresh}
      />

      <nav className="link-row" aria-label="Ajuda">
        <button className="link-button light" onClick={() => setSheet("help")}>
          Como jogar
        </button>
        <button className="link-button light" onClick={() => setSheet("prefs")}>
          Preferências
        </button>
      </nav>

      <p className="footnote muted">Conta é opcional: como convidado, quem cria a sala recebe um código para compartilhar.</p>

      {sheet === "help" && (
        <Sheet title={`Como jogar ${game.name}`} onClose={() => setSheet(null)}>
          {gameId === "domino" ? <DominoRules /> : gameId === "truco" ? <TrucoRules /> : <HowToPlay />}
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
