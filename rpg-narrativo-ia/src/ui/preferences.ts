import { useState } from 'react';
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
}

export function usePreferences(): Preferences {
  const [clockFormat, setFormat] = useState<ClockFormat>(readClockFormat);
  const [guidanceLevel, setLevel] = useState<GuidanceLevel>(readGuidanceLevel);
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
  };
}
