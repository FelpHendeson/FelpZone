import { useEffect } from 'react';
import { INITIAL_AUDIO, cueForEvent, cueForPose, type AmbienceBed, type AudioEvent } from '../../modules/audio';
import type { ActionPose } from '../../modules/combat';
import { SoundEngine, type SoundChannel, type SoundLevel } from './engine';

export type { SoundChannel, SoundLevel } from './engine';

/** Começa baixo no ambiente e médio nos efeitos; nada toca antes do primeiro toque na tela. */
export const DEFAULT_SOUND_LEVELS: Record<SoundChannel, SoundLevel> = { ambience: 'low', effects: 'mid' };

const KEYS: Record<SoundChannel, string> = { ambience: 'reset.sound.ambience', effects: 'reset.sound.effects' };
const LEVELS: readonly SoundLevel[] = ['off', 'low', 'mid', 'high'];

export function readSoundLevel(channel: SoundChannel): SoundLevel {
  try {
    const value = globalThis.localStorage?.getItem(KEYS[channel]);
    return LEVELS.includes(value as SoundLevel) ? (value as SoundLevel) : DEFAULT_SOUND_LEVELS[channel];
  } catch {
    return DEFAULT_SOUND_LEVELS[channel];
  }
}

export function writeSoundLevel(channel: SoundChannel, level: SoundLevel): void {
  try {
    globalThis.localStorage?.setItem(KEYS[channel], level);
  } catch {
    // Sem armazenamento, o volume vale só até fechar o jogo.
  }
  sound.setLevel(channel, level);
}

export const sound = new SoundEngine({ ambience: readSoundLevel('ambience'), effects: readSoundLevel('effects') });

/** Mantém as camadas de ambiente enquanto a tela estiver aberta; ao sair, o ambiente some aos poucos. */
export function useAmbience(beds: readonly AmbienceBed[]): void {
  const key = beds.join('|');
  useEffect(() => {
    sound.setAmbience(key ? (key.split('|') as AmbienceBed[]) : []);
  }, [key]);
  useEffect(() => () => sound.setAmbience([]), []);
}

export function playPoseCue(pose: ActionPose): void {
  const cue = cueForPose(INITIAL_AUDIO, pose);
  if (cue) sound.play(cue);
}

export function playEventCue(event: AudioEvent): void {
  const cue = cueForEvent(INITIAL_AUDIO, event);
  if (cue) sound.play(cue);
}
