import { BASES, DADOS_RARIDADE } from '../motor/dados/itens';
import type { Item, Material, Slot } from '../motor/tipos';
import { sprite, type Sprite } from './sprite';
import { ICONES as ICONES_ANTIGOS } from './sprites';

const K = '#1b1b2a';

/** Formas dos itens (10×10). `r` recebe a cor da raridade, `R` uma versão escura. */
const FORMAS: Record<string, string[]> = {
  elmo: ['..kkkkkk..', '.krrrrrrk.', 'krrwrrrrRk', 'krwrrrrrRk', 'krrrrrrrRk', 'krkkkkkkRk', 'krk....kRk', 'krk....kRk', 'kkk....kkk', '..........'],
  peitoral: ['kk.kkkk.kk', 'krkkrrkkrk', 'krrrwrrrRk', '.krrwrrRk.', '.krrrrrRk.', '.krrrrrRk.', '.krrrrrRk.', '.krrrrrRk.', '.kkRRRRkk.', '..kkkkkk..'],
  manoplas: ['..........', '.kk.kk....', 'krkkrrk...', 'krrrrrrk..', 'krwrrrrRk.', 'krrrrrrRk.', '.krrrrRk..', '.kRRRRRk..', '.kkkkkkk..', '..........'],
  calcas: ['.kkkkkkkk.', '.krrwrrRk.', '.krrrrrRk.', '.krrkkrRk.', '.krrkkrRk.', '.krrk.kRk.', '.krrk.kRk.', '.krrk.kRk.', '.kRRk.kRk.', '.kkkk.kkk.'],
  botas: ['..........', '..kkk.....', '..krk.....', '..krk.....', '..krk.kkk.', '..krkkrrk.', '.kkrrrrrk.', 'krwrrrrRk.', 'kRRRRRRRk.', 'kkkkkkkkk.'],
  espada: ['........kk', '.......kwk', '......kwrk', '.....kwrk.', '....kwrk..', '.k.kwrk...', '.kkrrk....', '..kRk.....', '.kRkkk....', 'kkk.......'],
  lanca: ['.......kkk', '......kwwk', '......kwrk', '.....krk..', '....kRk...', '...kRk....', '..kRk.....', '.kRk......', 'kRk.......', 'kk........'],
  adaga: ['..........', '......kk..', '.....kwk..', '....kwrk..', '...kwrk...', '..kwrk....', '.krrk.....', 'kRkRk.....', 'kk.k......', '..........'],
  cajado: ['......kkk.', '.....kwrRk', '.....krrRk', '......kRk.', '.....kRk..', '....kRk...', '...kRk....', '..kRk.....', '.kRk......', '.kk.......'],
  escudo: ['.kkkkkkkk.', 'krrrrrrrRk', 'krrwwrrrRk', 'krrwrrrrRk', 'krrrrrrrRk', '.krrrrrRk.', '.krrrrrRk.', '..krrrRk..', '...kRRk...', '....kk....'],
  orbe: ['...kkkk...', '..krrrrk..', '.krwwrrRk.', '.krwrrrRk.', '.krrrrrRk.', '.krrrrRRk.', '..kRRRRk..', '...kkkk...', '..kkkkkk..', '.kkkkkkkk.'],
  grimorio: ['.kkkkkkk..', '.krrrrrRk.', '.krwwrrRk.', '.krrkkrRk.', '.krrkkrRk.', '.krrrrrRk.', '.krrrrrRk.', '.kRRRRRRk.', '.kwwwwwwk.', '.kkkkkkkk.'],
  anel: ['..........', '...kwwk...', '..kwrrwk..', '...kkkk...', '..kk..kk..', '.kR....Rk.', '.kR....Rk.', '..kk..kk..', '...kkkk...', '..........'],
  amuleto: ['k........k', '.k......k.', '..k....k..', '...k..k...', '....kk....', '...krrk...', '..krwrRk..', '..krrrRk..', '...kRRk...', '....kk....'],
  bracelete: ['..........', '..kkkkkk..', '.krrrrrRk.', 'krk....kRk', 'kwk....kRk', 'krk....kRk', 'krk....kRk', '.krrrrRRk.', '..kkkkkk..', '..........'],
  reliquia: ['....kk....', '...kwrk...', '..kwwrRk..', '.kwrrrRRk.', 'kwrrrrRRRk', '.krrrrRRk.', '..krrRRk..', '...kRRk...', '....kk....', '..........'],
};

function escurecer(hex: string, fator = 0.62): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * fator);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

const cache = new Map<string, Sprite>();

export function formaDoItem(item: Pick<Item, 'base'>): string {
  const base = BASES[item.base];
  if (!base) return 'reliquia';
  if (base.slot === 'reliquia') return 'reliquia';
  if (base.slot === 'arma' || base.slot === 'secundaria') return base.arma ?? 'espada';
  if (base.slot === 'acessorio') return base.id;
  return base.slot;
}

export function iconeItem(item: Pick<Item, 'base' | 'raridade'>): Sprite {
  const forma = formaDoItem(item);
  const chave = `${forma}:${item.raridade}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const cor = DADOS_RARIDADE[item.raridade].cor;
  const s = sprite(FORMAS[forma] ?? FORMAS.reliquia, { k: K, r: cor, R: escurecer(cor), w: '#ffffff' });
  cache.set(chave, s);
  return s;
}

/** Silhueta apagada para espaços vazios do equipamento. */
export function iconeSlotVazio(slot: Slot): Sprite {
  const forma = slot === 'arma' ? 'espada' : slot === 'secundaria' ? 'escudo' : slot.startsWith('acessorio') ? 'anel' : slot;
  const chave = `vazio:${forma}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const s = sprite(FORMAS[forma] ?? FORMAS.reliquia, { k: '#3a3a5a', r: '#2c2c4a', R: '#26263f', w: '#3a3a5a' });
  cache.set(chave, s);
  return s;
}

export const ICONES_MATERIAIS: Record<Material | 'ouro', Sprite> = {
  ouro: ICONES_ANTIGOS.ouro,
  ferrugem: sprite(
    ['...kkk..', '..krrRk.', '.krrrrRk', 'krRrrrRk', 'krrrRrRk', '.kRrrRk.', '..kRRk..', '...kk...'],
    { k: '#2a1408', r: '#c9783a', R: '#8a4a22' },
  ),
  pena: sprite(
    ['......kk', '.....kwk', '....kwbk', '...kwbk.', '..kwbk..', '.kwbk...', '.kbk....', 'kk......'],
    { k: K, w: '#e9fffc', b: '#5aa0a0' },
  ),
  osso: sprite(
    ['kk....kk', 'kwk..kwk', '.kwkkwk.', '..kwwk..', '..kwwk..', '.kwkkwk.', 'kwk..kwk', 'kk....kk'],
    { k: '#3a3528', w: '#ece6d6' },
  ),
  brasa: sprite(
    ['...y....', '..yoy...', '..ooy.y.', '.oorooy.', '.orrroo.', 'kRRrrRRk', '.kRRRRk.', '..kkkk..'],
    { y: '#ffe36a', o: '#ff9a2e', r: '#e04a2a', R: '#5a2a1a', k: K },
  ),
  nucleo: sprite(
    ['...kk...', '..kbbk..', '.kbwbbk.', 'kbwbbbBk', 'kbbbbbBk', '.kbbbBk.', '..kBBk..', '...kk...'],
    { k: '#1b2233', b: '#5b9bff', B: '#2f4fa0', w: '#e6f2ff' },
  ),
  essencia: sprite(
    ['...kk...', '..kwPk..', '..kwPk..', '.kwpPPk.', '.kwpPPk.', '.kppPPk.', '..kpPk..', '...kk...'],
    { k: '#2f1d55', w: '#f0e4ff', p: '#b48cff', P: '#7a4fd8' },
  ),
};
