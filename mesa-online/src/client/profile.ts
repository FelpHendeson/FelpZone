// Perfil de visitante: nome, retrato e preferências, salvos neste navegador.

import { useMemo } from "react";
import { AVATARS } from "@/rooms/avatars";
import { readValue, useStoredValue, writeValue } from "./storage";

/** Como a câmera do tabuleiro se comporta para esta pessoa. */
export type CameraMode = "turn" | "me" | "free" | "all";

export interface Prefs {
  /** "all" mostra tudo; "essential" só o que envolve você. */
  notices: "all" | "essential";
  /** `null` segue a configuração do aparelho. */
  reducedMotion: boolean | null;
  sound: boolean;
  camera: CameraMode;
  /** Quanto tempo as janelas de acontecimento ficam abertas sozinhas. */
  dialogPace: DialogPace;
}

export type DialogPace = "fast" | "normal" | "slow";

/** Multiplicador do tempo das janelas para cada ritmo. */
export const DIALOG_PACES: Record<DialogPace, number> = { fast: 0.6, normal: 1, slow: 1.6 };

export interface Profile {
  name: string;
  avatar: string;
  prefs: Prefs;
}

const PROFILE_KEY = "mesa:perfil";
const LEGACY_NAME_KEY = "mesa:nome";

export const DEFAULT_PREFS: Prefs = { notices: "all", reducedMotion: null, sound: false, camera: "turn", dialogPace: "normal" };

function parseProfile(raw: string | null): Profile {
  const fallback: Profile = { name: readValue(LEGACY_NAME_KEY) ?? "", avatar: AVATARS[0], prefs: DEFAULT_PREFS };
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof value.name === "string" ? value.name : fallback.name,
      avatar: typeof value.avatar === "string" ? value.avatar : fallback.avatar,
      prefs: { ...DEFAULT_PREFS, ...(value.prefs ?? {}) },
    };
  } catch {
    return fallback;
  }
}

export function useProfile(): Profile {
  const raw = useStoredValue(PROFILE_KEY);
  return useMemo(() => parseProfile(raw), [raw]);
}

export function saveProfile(patch: Partial<Omit<Profile, "prefs">> & { prefs?: Partial<Prefs> }) {
  const current = parseProfile(readValue(PROFILE_KEY));
  writeValue(PROFILE_KEY, JSON.stringify({ ...current, ...patch, prefs: { ...current.prefs, ...(patch.prefs ?? {}) } }));
}
