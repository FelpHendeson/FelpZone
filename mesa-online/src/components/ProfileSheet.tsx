"use client";

import { useEffect, useState } from "react";
import type { PublicProfile } from "@/accounts/account";
import { fetchProfile, setBlockedUser } from "@/client/api";
import { refreshMe, useAccount } from "@/client/useAccount";
import { GAMES, GAME_IDS } from "@/games/registry";
import { BadgeShelf } from "./Badges";
import { Sheet } from "./Sheet";

/** Perfil público de outro jogador: vitórias por jogo e selos (sem e-mail nem Funcoins). */
export function ProfileSheet({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { me } = useAccount();
  const blocked = profile ? (me?.blocked ?? []).includes(profile.id) : false;

  async function toggleBlock() {
    if (!profile) return;
    setBusy(true);
    try {
      await setBlockedUser(profile.id, !blocked);
      await refreshMe();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchProfile(nickname)
      .then(({ profile: found }) => !cancelled && setProfile(found))
      .catch((caught) => !cancelled && setError(caught instanceof Error ? caught.message : "Não foi possível abrir o perfil."));
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  return (
    <Sheet title={nickname} onClose={onClose}>
      {error && <p className="error">{error}</p>}
      {!profile && !error && <p className="muted">Carregando…</p>}
      {profile && (
        <>
          <p className="profile-head">
            <span className="avatar big" aria-hidden>
              {profile.avatar}
            </span>
            <span>
              <strong>{profile.stats.wins}</strong> vitórias em {profile.stats.played} partidas
              <span className="muted small"> · na mesa desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}</span>
            </span>
          </p>
          <ul className="summary">
            {GAME_IDS.map((id) => {
              const stats = profile.stats.games[id];
              return (
                <li key={id}>
                  {GAMES[id].emoji} {GAMES[id].name}: {stats ? `${stats.wins} de ${stats.played}` : "ainda não jogou"}
                </li>
              );
            })}
            <li>Melhor sequência de vitórias: {profile.stats.bestStreak}</li>
          </ul>
          <BadgeShelf earned={profile.badges} />
          {me && me.id !== profile.id && (
            <>
              <button className={blocked ? "button block" : "button danger block"} disabled={busy} onClick={toggleBlock}>
                {blocked ? "Desbloquear" : `Bloquear ${profile.nickname}`}
              </button>
              <p className="muted small">
                {blocked
                  ? "Bloqueado: não acena, não convida e some da sua lista e da conversa."
                  : "Quem é bloqueado não consegue acenar nem convidar você, e some da sua lista e da conversa."}
              </p>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
