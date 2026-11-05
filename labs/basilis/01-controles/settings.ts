// Ajustes do lab: tudo que se quer calibrar no celular, salvo no próprio aparelho.

import type { Curve, Directions } from './input.ts';
import type { MovementSettings } from './movement.ts';

export type JoystickMode = 'floating' | 'fixed';
export type ButtonsMode = 'auto' | 'always' | 'never';

export interface Settings {
  speed: number;
  acceleration: number;
  friction: number;
  deadZone: number;
  joystickRadius: number;
  joystickMode: JoystickMode;
  curve: Curve;
  directions: Directions;
  zoom: number;
  dodgeDistance: number;
  dodgeCooldown: number;
  autoAim: boolean;
  vibration: boolean;
  buttons: ButtonsMode;
  debug: boolean;
}

export const DEFAULTS: Settings = {
  speed: 5,
  acceleration: 40,
  friction: 40,
  deadZone: 0.15,
  joystickRadius: 60,
  joystickMode: 'floating',
  curve: 'linear',
  directions: 'free',
  zoom: 48,
  dodgeDistance: 3,
  dodgeCooldown: 0.5,
  autoAim: true,
  vibration: true,
  buttons: 'auto',
  debug: true,
};

interface RangeField {
  key: keyof Settings;
  label: string;
  kind: 'range';
  min: number;
  max: number;
  step: number;
  unit: string;
}

interface ChoiceField {
  key: keyof Settings;
  label: string;
  kind: 'choice';
  options: [string, string][];
}

interface ToggleField {
  key: keyof Settings;
  label: string;
  kind: 'toggle';
}

export type Field = RangeField | ChoiceField | ToggleField;

export const FIELDS: Field[] = [
  { key: 'speed', label: 'Velocidade', kind: 'range', min: 2, max: 10, step: 0.5, unit: 'tiles/s' },
  { key: 'acceleration', label: 'Aceleração', kind: 'range', min: 5, max: 120, step: 5, unit: 'tiles/s²' },
  { key: 'friction', label: 'Frenagem', kind: 'range', min: 5, max: 120, step: 5, unit: 'tiles/s²' },
  { key: 'deadZone', label: 'Zona morta', kind: 'range', min: 0, max: 0.5, step: 0.05, unit: '' },
  { key: 'joystickRadius', label: 'Raio do joystick', kind: 'range', min: 30, max: 110, step: 5, unit: 'px' },
  {
    key: 'joystickMode',
    label: 'Joystick',
    kind: 'choice',
    options: [
      ['floating', 'Flutuante (onde o polegar encosta)'],
      ['fixed', 'Fixo (canto inferior esquerdo)'],
    ],
  },
  {
    key: 'curve',
    label: 'Resposta',
    kind: 'choice',
    options: [
      ['linear', 'Linear'],
      ['smooth', 'Suave (mais precisão perto do centro)'],
    ],
  },
  {
    key: 'directions',
    label: 'Direções',
    kind: 'choice',
    options: [
      ['free', 'Livre'],
      ['8', '8 direções'],
      ['4', '4 direções'],
    ],
  },
  { key: 'zoom', label: 'Zoom', kind: 'range', min: 24, max: 80, step: 4, unit: 'px por tile' },
  { key: 'dodgeDistance', label: 'Distância da esquiva', kind: 'range', min: 1, max: 6, step: 0.5, unit: 'tiles' },
  { key: 'dodgeCooldown', label: 'Recarga da esquiva', kind: 'range', min: 0, max: 2, step: 0.1, unit: 's' },
  { key: 'autoAim', label: 'Mira automática', kind: 'toggle' },
  { key: 'vibration', label: 'Vibração', kind: 'toggle' },
  {
    key: 'buttons',
    label: 'Botões na tela',
    kind: 'choice',
    options: [
      ['auto', 'Automático (só com toque)'],
      ['always', 'Sempre'],
      ['never', 'Nunca'],
    ],
  },
  { key: 'debug', label: 'Mostrar depuração', kind: 'toggle' },
];

const STORAGE_KEY = 'basilis.lab01.settings';

export function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return sanitize({ ...DEFAULTS, ...stored });
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Sem armazenamento (aba privada, por exemplo): os ajustes valem só nesta sessão.
  }
}

/** Descarta valores salvos de versões antigas que não cabem mais nos campos. */
export function sanitize(settings: Settings): Settings {
  const result = { ...settings } as Record<keyof Settings, unknown>;
  for (const field of FIELDS) {
    const value = result[field.key];
    const fallback = DEFAULTS[field.key];
    if (field.kind === 'range') {
      result[field.key] = typeof value === 'number' && value >= field.min && value <= field.max ? value : fallback;
    } else if (field.kind === 'choice') {
      result[field.key] = field.options.some(([option]) => option === value) ? value : fallback;
    } else {
      result[field.key] = typeof value === 'boolean' ? value : fallback;
    }
  }
  return result as unknown as Settings;
}

export function movementSettings(settings: Settings): MovementSettings {
  return {
    speed: settings.speed,
    acceleration: settings.acceleration,
    friction: settings.friction,
    dodgeDistance: settings.dodgeDistance,
    dodgeDuration: 0.18,
    dodgeCooldown: settings.dodgeCooldown,
    attackDuration: 0.2,
    attackCooldown: 0.35,
    attackMoveFactor: 0.4,
  };
}
