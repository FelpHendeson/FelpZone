"use client";

import { useEffect, useState } from "react";
import type { PublicProfile } from "@/accounts/account";
import { fetchProfile } from "@/client/api";
import { GAMES, GAME_IDS } from "@/games/registry";
import { BadgeShelf } from "./Badges";
import { Sheet } from "./Sheet";

/** Perfil público de outro jogador: vitórias por jogo e selos (sem e-mail nem fichas). */
export function ProfileSheet({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        </>
      )}
    </Sheet>
  );
}
