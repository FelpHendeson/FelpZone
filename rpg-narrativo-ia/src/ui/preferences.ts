import { useState } from 'react';
import { readSoundLevel, writeSoundLevel, type SoundChannel, type SoundLevel } from './audio';
import { readClockFormat, writeClockFormat, type ClockFormat } from './clock';

/** Quanto o Sistema-tutor intervém. Preferência do aparelho, nunca do save. */
export type GuidanceLevel = 'guided' | 'subtle' | 'off';

const GUIDANCE_KEY = 'reset.guidance.level';

export function readGuidanceLevel(): GuidanceLevel {
  try {
    const value = globalThis.localStorage?.getItem(GUIDANCE_KEY);
    return value === 'subtle' || value === 'off' ? value : 'guided';
  } catch {
    return 'guided';
  }
}

function writeGuidanceLevel(level: GuidanceLevel): void {
  try {
    globalThis.localStorage?.setItem(GUIDANCE_KEY, level);
  } catch {
    // Sem armazenamento, vale o padrão "Guiada".
  }
}

export interface Preferences {
  clockFormat: ClockFormat;
  guidanceLevel: GuidanceLevel;
  setClockFormat: (format: ClockFormat) => void;
  setGuidanceLevel: (level: GuidanceLevel) => void;
  sound: Record<SoundChannel, SoundLevel>;
  setSoundLevel: (channel: SoundChannel, level: SoundLevel) => void;
}

export function usePreferences(): Preferences {
  const [clockFormat, setFormat] = useState<ClockFormat>(readClockFormat);
  const [guidanceLevel, setLevel] = useState<GuidanceLevel>(readGuidanceLevel);
  const [soundLevels, setSoundLevels] = useState<Record<SoundChannel, SoundLevel>>(() => ({
    ambience: readSoundLevel('ambience'),
    effects: readSoundLevel('effects'),
  }));
  return {
    clockFormat,
    guidanceLevel,
    setClockFormat: (format) => {
      writeClockFormat(format);
      setFormat(format);
    },
    setGuidanceLevel: (level) => {
      writeGuidanceLevel(level);
      setLevel(level);
    },
    sound: soundLevels,
    setSoundLevel: (channel, level) => {
      writeSoundLevel(channel, level);
      setSoundLevels((current) => ({ ...current, [channel]: level }));
    },
  };
}
