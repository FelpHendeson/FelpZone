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

interface RangeField<T> {
  key: keyof T;
  label: string;
  kind: 'range';
  min: number;
  max: number;
  step: number;
  unit: string;
}

interface ChoiceField<T> {
  key: keyof T;
  label: string;
  kind: 'choice';
  options: [string, string][];
}

interface ToggleField<T> {
  key: keyof T;
  label: string;
  kind: 'toggle';
}

export type Field<T> = RangeField<T> | ChoiceField<T> | ToggleField<T>;

export const FIELDS: Field<Settings>[] = [
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
  return loadStored(STORAGE_KEY, FIELDS, DEFAULTS);
}

export function saveSettings(settings: Settings): void {
  saveStored(STORAGE_KEY, settings);
}

export function sanitize(settings: Settings): Settings {
  return sanitizeWith(settings, FIELDS, DEFAULTS);
}

/** Lê ajustes salvos no aparelho; sem armazenamento, volta aos padrões. */
export function loadStored<T extends object>(key: string, fields: Field<T>[], defaults: T): T {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<T>;
    return sanitizeWith({ ...defaults, ...stored }, fields, defaults);
  } catch {
    return { ...defaults };
  }
}

export function saveStored<T extends object>(key: string, settings: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // Sem armazenamento (aba privada, por exemplo): os ajustes valem só nesta sessão.
  }
}

/** Descarta valores salvos de versões antigas que não cabem mais nos campos. */
export function sanitizeWith<T extends object>(settings: T, fields: Field<T>[], defaults: T): T {
  const result = { ...settings } as Record<keyof T, unknown>;
  for (const field of fields) {
    const value = result[field.key];
    const fallback = defaults[field.key];
    if (field.kind === 'range') {
      result[field.key] = typeof value === 'number' && value >= field.min && value <= field.max ? value : fallback;
    } else if (field.kind === 'choice') {
      result[field.key] = field.options.some(([option]) => option === value) ? value : fallback;
    } else {
      result[field.key] = typeof value === 'boolean' ? value : fallback;
    }
  }
  return result as T;
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
