// Ajustes próprios do Lab 02. Velocidade, joystick e esquiva vêm dos ajustes do Lab 01.

import { loadStored, saveStored, type Field } from '../01-controles/settings.ts';
import { SLASH_OPTIONS, type SlashStyle } from './slash.ts';
import type { ScaleMode } from './viewport.ts';

export type CameraMode = 'locked' | 'smooth';
export type ScrollMode = 'subpixel' | 'pixel';

export interface SceneSettings {
  /** Área central com o celular em pé (altura maior que a largura). */
  safeTilesPortrait: number;
  /** Área central com o celular deitado ou no computador. */
  safeTilesLandscape: number;
  scaleMode: ScaleMode;
  scroll: ScrollMode;
  camera: CameraMode;
  slash: SlashStyle;
  showSafeArea: boolean;
  debug: boolean;
}

export const SCENE_DEFAULTS: SceneSettings = {
  safeTilesPortrait: 10,
  safeTilesLandscape: 10,
  scaleMode: 'integer',
  scroll: 'subpixel',
  camera: 'smooth',
  slash: 'cone',
  showSafeArea: true,
  debug: true,
};

export const SCENE_FIELDS: Field<SceneSettings>[] = [
  { key: 'safeTilesPortrait', label: 'Área central em retrato', kind: 'range', min: 6, max: 16, step: 1, unit: 'tiles' },
  { key: 'safeTilesLandscape', label: 'Área central em paisagem', kind: 'range', min: 6, max: 16, step: 1, unit: 'tiles' },
  {
    key: 'scaleMode',
    label: 'Escala',
    kind: 'choice',
    options: [
      ['integer', 'Inteira (pixels sempre iguais)'],
      ['free', 'Livre (área central sempre do mesmo tamanho)'],
    ],
  },
  {
    key: 'scroll',
    label: 'Rolagem',
    kind: 'choice',
    options: [
      ['subpixel', 'Lisa (subpixel na tela)'],
      ['pixel', 'Pixel a pixel (como o GBA)'],
    ],
  },
  {
    key: 'camera',
    label: 'Câmera',
    kind: 'choice',
    options: [
      ['smooth', 'Suave (segue com atraso)'],
      ['locked', 'Presa ao personagem'],
    ],
  },
  { key: 'slash', label: 'Golpe', kind: 'choice', options: SLASH_OPTIONS },
  { key: 'showSafeArea', label: 'Mostrar a área central', kind: 'toggle' },
  { key: 'debug', label: 'Mostrar depuração', kind: 'toggle' },
];

const STORAGE_KEY = 'basilis.lab02.settings';

export function loadSceneSettings(): SceneSettings {
  return loadStored(STORAGE_KEY, SCENE_FIELDS, SCENE_DEFAULTS);
}

export function saveSceneSettings(settings: SceneSettings): void {
  saveStored(STORAGE_KEY, settings);
}
