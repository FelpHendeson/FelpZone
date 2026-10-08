"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { sendCommand } from "@/client/api";
import { useProfile } from "@/client/profile";
import { claimResumeFragment, resumeLink, useSeat } from "@/client/seats";
import { useStorageAvailable } from "@/client/storage";
import { refreshMe, useAccount } from "@/client/useAccount";
import { usePlaza } from "@/client/usePlaza";
import { useRoom } from "@/client/useRoom";
import { themeOf } from "@/games/magnata/themes";
import { isMagnata } from "@/games/modules";
import type { PublicRoom } from "@/rooms/public";
import type { RoomCommand } from "@/rooms/room";
import { DominoRules } from "./domino/DominoRules";
import { DominoTable } from "./domino/DominoTable";
import { HowToPlay } from "./HowToPlay";
import { Lobby } from "./Lobby";
import { MagnataTable } from "./magnata/MagnataTable";
import { PrefsForm } from "./PrefsForm";
import { Sheet } from "./Sheet";

export type Send = (command: RoomCommand | Record<string, unknown>) => Promise<boolean>;

export function RoomScreen() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();
  const seat = useSeat(code);
  const { room, error, offline, applyRoom } = useRoom(code, seat?.token ?? null);
  const { me: account } = useAccount();
  const profile = useProfile();
  const storageOk = useStorageAvailable();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [menu, setMenu] = useState<"menu" | "help" | "prefs" | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  const me = (seat && room?.players.find((player) => player.id === seat.playerId)) || null;

  // Sinal de presença para a lista de online (só para quem tem conta).
  usePlaza(room ? { status: room.status === "lobby" ? "lobby" : "playing", gameId: room.gameId } : null, {
    full: false,
    enabled: Boolean(account),
  });

  // Partida terminada: fichas, vitórias e selos mudaram.
  const finished = room?.status === "finished";
  useEffect(() => {
    if (finished && account) void refreshMe();
  }, [finished, account]);

  // Link de retomada: "#retomar=..." vira assento salvo e some da barra de endereço.
  useEffect(() => {
    claimResumeFragment(code);
  }, [code]);

  // Cores do tema escolhido na sala.
  const themeId = room && isMagnata(room.game) ? room.game.themeId : room?.options.themeId;
  useEffect(() => {
    const palette = themeOf(themeId).palette;
    const root = document.documentElement.style;
    root.setProperty("--felt", palette.felt);
    root.setProperty("--felt-dark", palette.feltDark);
    root.setProperty("--accent", palette.accent);
    return () => {
      root.removeProperty("--felt");
      root.removeProperty("--felt-dark");
      root.removeProperty("--accent");
    };
  }, [themeId]);

  // Movimento reduzido: preferência do perfil ou do aparelho.
  useEffect(() => {
    const reduce = profile.prefs.reducedMotion;
    document.documentElement.classList.toggle("reduce-motion", reduce === true);
    document.documentElement.classList.toggle("full-motion", reduce === false);
  }, [profile.prefs.reducedMotion]);

  const send = useCallback<Send>(
    async (command) => {
      if (!seat) return false;
      setPending(true);
      setNotice(null);
      try {
        const result = await sendCommand(code, seat.token, command);
        applyRoom(result.room);
        return true;
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Algo deu errado.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [code, seat, applyRoom],
  );

  async function copyResume() {
    if (!seat) return;
    try {
      await navigator.clipboard.writeText(resumeLink(code, seat));
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  if (!room) {
    return (
      <main className="page center">
        {error ? (
          <>
            <p className="error">{error}</p>
            <Link className="button" href="/">
              Voltar ao início
            </Link>
          </>
        ) : (
          <p className="muted">Abrindo a sala {code}…</p>
        )}
      </main>
    );
  }

  return (
    <main className={room.status === "lobby" ? "page" : "page table-page"}>
      <header className="room-header">
        <Link href="/" className="back">
          ← Início
        </Link>
        <span className="room-header-right">
          {offline && (
            <span className="status-pill" role="status">
              Reconectando…
            </span>
          )}
          <button className="menu-button" onClick={() => setMenu("menu")} aria-label="Menu da sala">
            ⋯
          </button>
        </span>
      </header>

      {me && !storageOk && (
        <p className="banner warning">
          Este navegador não está guardando dados. Se recarregar a página, você pode perder seu lugar: use “Continuar em
          outro aparelho” no menu ⋯ para guardar um link de retomada.
        </p>
      )}
      {error && <p className="banner warning">{error}</p>}
      {notice && (
        <button className="banner error-banner" onClick={() => setNotice(null)} role="alert">
          {notice} <span aria-hidden>✕</span>
        </button>
      )}

      {room.status === "lobby" ? (
        <Lobby room={room} me={me} send={send} pending={pending} onJoined={applyRoom} profile={profile} />
      ) : room.gameId === "domino" ? (
        <DominoTable room={room} me={me} send={send} pending={pending} />
      ) : (
        <>
          <MatchResultBanner room={room} />
          <MagnataTable room={room} me={me} send={send} pending={pending} prefs={profile.prefs} />
        </>
      )}


      {menu === "menu" && (
        <Sheet title={`Sala ${room.code}`} onClose={() => setMenu(null)}>
          <div className="menu-list">
            {seat && me && (
              <div>
                <button className="button block" onClick={copyResume}>
                  📲 Continuar em outro aparelho
                </button>
                <p className="muted small">
                  {copied === "ok"
                    ? "Link copiado. Abra no outro aparelho. Não compartilhe: ele dá acesso ao seu lugar."
                    : copied === "fail"
                      ? "Não foi possível copiar. Copie o link abaixo manualmente (não compartilhe com outras pessoas):"
                      : "Copia um link pessoal que leva seu lugar na mesa para outro aparelho."}
                </p>
                {copied === "fail" && (
                  <input readOnly value={resumeLink(code, seat)} onFocus={(event) => event.target.select()} aria-label="Link de retomada" />
                )}
              </div>
            )}
            <button className="button block" onClick={() => setMenu("help")}>
              📖 Como jogar
            </button>
            <button className="button block" onClick={() => setMenu("prefs")}>
              ⚙️ Preferências
            </button>
            <button className="button block" onClick={() => router.push("/")}>
              🏠 Voltar ao início (sem sair da partida)
            </button>
          </div>
        </Sheet>
      )}
      {menu === "help" && (
        <Sheet title={room.gameId === "domino" ? "Como jogar dominó" : "Como jogar o Magnata"} onClose={() => setMenu(null)}>
          {room.gameId === "domino" ? <DominoRules /> : <HowToPlay />}
        </Sheet>
      )}
      {menu === "prefs" && (
        <Sheet title="Preferências" onClose={() => setMenu(null)}>
          <PrefsForm prefs={profile.prefs} />
        </Sheet>
      )}
    </main>
  );
}

/** Fim de partida com aposta: quanto cada vencedor levou do pote. */
function MatchResultBanner({ room }: { room: PublicRoom }) {
  const result = room.status === "finished" ? room.results.find((item) => item.matchId === room.match?.id) : null;
  if (!result || result.stake === 0) return null;
  const names = new Map(result.seats.map((seat) => [seat.playerId, seat.name]));
  return (
    <p className="banner pot-banner" role="status">
      🪙 Pote de {result.pot.toLocaleString("pt-BR")} fichas:{" "}
      {result.winners.map((id) => `${names.get(id)} +${result.payouts[id].toLocaleString("pt-BR")}`).join(", ")}
    </p>
  );
}
