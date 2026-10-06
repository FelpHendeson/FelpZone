"use client";

import { saveProfile, type Prefs } from "@/client/profile";

export function PrefsForm({ prefs }: { prefs: Prefs }) {
  return (
    <div className="prefs">
      <label className="field">
        <span>Avisos da mesa</span>
        <select
          value={prefs.notices}
          onChange={(event) => saveProfile({ prefs: { ...prefs, notices: event.target.value as Prefs["notices"] } })}
        >
          <option value="all">Todos os acontecimentos</option>
          <option value="essential">Só o essencial (o que envolve você)</option>
        </select>
      </label>
      <label className="field">
        <span>Animações</span>
        <select
          value={prefs.reducedMotion === null ? "auto" : prefs.reducedMotion ? "reduce" : "full"}
          onChange={(event) =>
            saveProfile({
              prefs: {
                ...prefs,
                reducedMotion: event.target.value === "auto" ? null : event.target.value === "reduce",
              },
            })
          }
        >
          <option value="auto">Seguir o aparelho</option>
          <option value="reduce">Reduzir movimento</option>
          <option value="full">Animações completas</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={prefs.sound}
          onChange={(event) => saveProfile({ prefs: { ...prefs, sound: event.target.checked } })}
        />
        <span>Sons nos acontecimentos que envolvem você</span>
      </label>
      <p className="muted small">Tudo também fica registrado no Histórico da partida.</p>
    </div>
  );
}
