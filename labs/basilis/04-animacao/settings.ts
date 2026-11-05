// Ajustes do Lab 04. Movimento vem do Lab 01, tela do Lab 02 e combate do Lab 03.

import { loadStored, saveStored, type Field } from '../01-controles/settings.ts';
import { SLASH_OPTIONS, type SlashStyle } from '../02-cenario/slash.ts';

export type HitTiming = 'frames' | 'time';

export interface AnimSettings {
  animationSpeed: number;
  hitTiming: HitTiming;
  slashTrail: SlashStyle | 'none';
  showAnchors: boolean;
  debug: boolean;
}

export const ANIM_DEFAULTS: AnimSettings = {
  animationSpeed: 1,
  hitTiming: 'frames',
  slashTrail: 'none',
  showAnchors: false,
  debug: true,
};

export const ANIM_FIELDS: Field<AnimSettings>[] = [
  { key: 'animationSpeed', label: 'Velocidade das animações', kind: 'range', min: 0.25, max: 2, step: 0.25, unit: '×' },
  {
    key: 'hitTiming',
    label: 'Quando o golpe acerta',
    kind: 'choice',
    options: [
      ['frames', 'Nos quadros ativos da animação'],
      ['time', 'Pelo tempo do golpe (como no Lab 03)'],
    ],
  },
  { key: 'slashTrail', label: 'Rastro do golpe', kind: 'choice', options: [['none', 'Nenhum (só a espada)'], ...SLASH_OPTIONS] },
  { key: 'showAnchors', label: 'Mostrar âncoras e quadros', kind: 'toggle' },
  { key: 'debug', label: 'Mostrar depuração', kind: 'toggle' },
];

const STORAGE_KEY = 'basilis.lab04.settings';

export function loadAnimSettings(): AnimSettings {
  return loadStored(STORAGE_KEY, ANIM_FIELDS, ANIM_DEFAULTS);
}

export function saveAnimSettings(settings: AnimSettings): void {
  saveStored(STORAGE_KEY, settings);
}
