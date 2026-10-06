"use client";

import { useState } from "react";
import { saveProfile, type Profile } from "@/client/profile";
import { AVATARS } from "@/rooms/avatars";

/** Cartão do perfil de visitante: retrato e nome, salvos neste navegador. */
export function ProfileCard({ profile }: { profile: Profile }) {
  const [picking, setPicking] = useState(false);
  return (
    <section className="card profile-card" aria-label="Seu perfil">
      <div className="profile-row">
        <button
          className="avatar-button"
          onClick={() => setPicking((value) => !value)}
          aria-expanded={picking}
          aria-label={`Trocar retrato (atual: ${profile.avatar})`}
        >
          <span className="avatar big">{profile.avatar}</span>
          <span className="avatar-edit">trocar</span>
        </button>
        <label className="field grow">
          <span>Seu nome</span>
          <input
            value={profile.name}
            onChange={(event) => saveProfile({ name: event.target.value })}
            maxLength={20}
            autoComplete="nickname"
            placeholder="Como vão te chamar na mesa"
          />
        </label>
      </div>
      {picking && (
        <div className="avatar-grid" role="group" aria-label="Escolha um retrato">
          {AVATARS.map((avatar) => (
            <button
              key={avatar}
              className={avatar === profile.avatar ? "avatar-option selected" : "avatar-option"}
              aria-pressed={avatar === profile.avatar}
              onClick={() => {
                saveProfile({ avatar });
                setPicking(false);
              }}
            >
              {avatar}
            </button>
          ))}
        </div>
      )}
      <p className="muted small">Seu perfil fica salvo neste navegador.</p>
    </section>
  );
}
