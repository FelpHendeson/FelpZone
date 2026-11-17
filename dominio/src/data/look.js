// Opções de aparência dos avatares (desenhados em src/ui/art.js).

export const SKINS = ['#f6d3b3', '#e9b48a', '#c98b5e', '#a86b43', '#7c4a2d', '#553220'];
export const HAIR_COLORS = ['#1a1a1a', '#3b2416', '#7a4a21', '#c9a227', '#d9d9d9', '#b91c1c', '#2563eb', '#16a34a'];

export const HAIRS = {
  raspado:  'Raspado',
  curto:    'Curto',
  topete:   'Topete',
  moicano:  'Moicano',
  blackpower: 'Black power',
  trancas:  'Tranças',
  comprido: 'Comprido',
  careca:   'Careca',
};
export const BROWS = { neutro: 'Neutro', bravo: 'Bravo', desconfiado: 'Desconfiado' };
export const MOUTHS = { serio: 'Sério', canto: 'Sorriso de canto', rosnando: 'Rosnando' };
export const SCARS = { nenhuma: 'Nenhuma', olho: 'No olho', bochecha: 'Na bochecha', testa: 'Na testa' };
export const ACCESSORIES = { nenhum: 'Nenhum', bandana: 'Bandana', bone: 'Boné', oculos: 'Óculos escuros', corrente: 'Corrente', brinco: 'Brinco' };

export const LOOK_OPTIONS = {
  skin: SKINS.length,
  hair: Object.keys(HAIRS),
  hairColor: HAIR_COLORS.length,
  brows: Object.keys(BROWS),
  mouth: Object.keys(MOUTHS),
  scar: Object.keys(SCARS),
  acc: Object.keys(ACCESSORIES),
};

export const DEFAULT_LOOK = { skin: 2, hair: 'topete', hairColor: 0, brows: 'bravo', mouth: 'canto', scar: 'nenhuma', acc: 'bandana' };
