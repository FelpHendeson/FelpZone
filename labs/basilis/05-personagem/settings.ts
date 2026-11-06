// Ajustes do Lab 05, guardados no aparelho como nos labs anteriores.

import { loadStored, saveStored, type Field } from '../01-controles/settings.ts';

export type Background = 'grama' | 'terra' | 'escuro' | 'xadrez';

export interface MoldeSettings {
  showPoints: boolean;
  showWeapon: boolean;
  showShadow: boolean;
  selectiveOutline: boolean;
  innerLines: boolean;
  background: Background;
}

export const MOLDE_DEFAULTS: MoldeSettings = {
  showPoints: true,
  showWeapon: true,
  showShadow: true,
  selectiveOutline: true,
  innerLines: true,
  background: 'grama',
};

export const MOLDE_FIELDS: Field<MoldeSettings>[] = [
  { key: 'showPoints', label: 'Mostrar os pontos', kind: 'toggle' },
  { key: 'showWeapon', label: 'Espada de teste na mão', kind: 'toggle' },
  { key: 'showShadow', label: 'Sombra no chão', kind: 'toggle' },
  { key: 'selectiveOutline', label: 'Contorno mais leve do lado da luz', kind: 'toggle' },
  { key: 'innerLines', label: 'Linhas internas (braço sobre o corpo)', kind: 'toggle' },
  {
    key: 'background',
    label: 'Fundo',
    kind: 'choice',
    options: [
      ['grama', 'Grama'],
      ['terra', 'Terra'],
      ['escuro', 'Escuro'],
      ['xadrez', 'Xadrez (transparente)'],
    ],
  },
];

const STORAGE_KEY = 'basilis.lab05.settings';

export function loadMoldeSettings(): MoldeSettings {
  return loadStored(STORAGE_KEY, MOLDE_FIELDS, MOLDE_DEFAULTS);
}

export function saveMoldeSettings(settings: MoldeSettings): void {
  saveStored(STORAGE_KEY, settings);
}
