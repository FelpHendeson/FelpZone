// O molde do personagem: o formato da folha (quadros, linhas, âncora) que todas as camadas seguem,
// e as cores do manequim em tons-índice (canal + tom), prontas para a troca de paleta da parte 2.
// Usa o formato de folha do Lab 04 (`animation.ts`).

import { sheetSize, type Clip, type Direction, type SheetFormat } from '../04-animacao/animation.ts';

export type { Direction };

/** Direções desenhadas na folha. A esquerda é o lado espelhado. */
export const DIRECTIONS: Direction[] = ['down', 'up', 'side'];

/** Direção para onde o personagem olha na tela, incluindo a esquerda (que é o lado espelhado). */
export type Facing = Direction | 'left';
export const FACINGS: Facing[] = ['down', 'up', 'side', 'left'];

export const FACING_LABELS: Record<Facing, string> = {
  down: 'Baixo',
  up: 'Cima',
  side: 'Direita',
  left: 'Esquerda',
};

/** Linha desenhada e espelhamento para cada direção da tela. */
export function facingRow(facing: Facing): { direction: Direction; flip: boolean } {
  return facing === 'left' ? { direction: 'side', flip: true } : { direction: facing, flip: false };
}

/**
 * Ações do molde. As ações de arma entram como famílias de poses; a parte 1 prova só "cortar",
 * em duas linhas (ida e volta) para o combo. As próximas famílias (estocar, golpe pesado, puxar o arco,
 * arremessar, conjurar) acrescentam linhas depois da última, sem mexer nas que já existem.
 */
export type MoldeAction = 'idle' | 'walk' | 'dash' | 'hurt' | 'slash-a' | 'slash-b' | 'death';

export interface ActionInfo {
  action: MoldeAction;
  label: string;
  frames: number;
  fps: number;
  loop: boolean;
  /** Ações sem direção ocupam uma linha só (morrer). */
  directional: boolean;
  /** Quadros em que o golpe acerta. */
  active?: [number, number];
}

/** A tabela de linhas da folha, na ordem em que aparecem. Todas as camadas seguem esta tabela. */
export const MOLDE_ACTIONS: ActionInfo[] = [
  { action: 'idle', label: 'Parado', frames: 4, fps: 3, loop: true, directional: true },
  { action: 'walk', label: 'Andar', frames: 6, fps: 10, loop: true, directional: true },
  { action: 'dash', label: 'Dash', frames: 3, fps: 12, loop: false, directional: true },
  { action: 'hurt', label: 'Levar dano', frames: 2, fps: 10, loop: false, directional: true },
  { action: 'slash-a', label: 'Cortar (ida)', frames: 4, fps: 16, loop: false, directional: true, active: [1, 2] },
  { action: 'slash-b', label: 'Cortar (volta)', frames: 4, fps: 16, loop: false, directional: true, active: [1, 2] },
  { action: 'death', label: 'Morrer', frames: 4, fps: 6, loop: false, directional: false },
];

/** Nome da animação na folha: `ação-direção`; ações sem direção usam só o nome da ação. */
export function moldeClipName(action: MoldeAction, direction: Direction): string {
  const info = MOLDE_ACTIONS.find((entry) => entry.action === action)!;
  return info.directional ? `${action}-${direction}` : action;
}

function buildClips(): Record<string, Clip> {
  const clips: Record<string, Clip> = {};
  let row = 0;
  for (const info of MOLDE_ACTIONS) {
    const clip = (r: number): Clip => ({ row: r, frames: info.frames, fps: info.fps, loop: info.loop, active: info.active });
    if (!info.directional) {
      clips[info.action] = clip(row++);
      continue;
    }
    for (const direction of DIRECTIONS) clips[`${info.action}-${direction}`] = clip(row++);
  }
  return clips;
}

/** Quadros de 32 × 32 com âncora nos pés em (16, 28), como no Lab 04. */
export const MOLDE_FORMAT: SheetFormat = {
  frameWidth: 32,
  frameHeight: 32,
  anchorX: 16,
  anchorY: 28,
  clips: buildClips(),
};

export const MOLDE_SIZE = sheetSize(MOLDE_FORMAT);

// ---- Cores em tons-índice ----

/**
 * Canais de cor (seção 4 de PERSONAGEM.md). Cada pixel de uma camada é um tom de um canal; na montagem,
 * cada canal recebe uma rampa da paleta-mestra. O tom 0 é sempre o mais escuro, o contorno daquela parte.
 */
export const CHANNELS = ['pele', 'olhos', 'cabelo', 'tecido-principal', 'tecido-secundario', 'couro', 'metal', 'eteris'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  pele: 'Pele',
  olhos: 'Olhos',
  cabelo: 'Cabelo',
  'tecido-principal': 'Tecido principal',
  'tecido-secundario': 'Tecido secundário',
  couro: 'Couro',
  metal: 'Metal',
  eteris: 'Etéris',
};

/** Tons por rampa: contorno, sombra, base e luz. Cada peça usa só os tons de que precisa. */
export const TONES = 4;

/** Código de um tom numa imagem indexada: 0 é transparente; 1 + canal × 4 + tom. Cabe em 1 byte. */
export function toneCode(channel: Channel, tone: number): number {
  return 1 + CHANNELS.indexOf(channel) * TONES + Math.max(0, Math.min(TONES - 1, tone));
}

/** O canal e o tom de um código (null para o transparente). */
export function decodeTone(code: number): { channel: Channel; tone: number } | null {
  if (code <= 0 || code > CHANNELS.length * TONES) return null;
  return { channel: CHANNELS[Math.floor((code - 1) / TONES)], tone: (code - 1) % TONES };
}

export interface PaletteEntry {
  channel: Channel;
  tone: number;
  color: string;
}

/** Rampas do manequim (o molde da parte 1): contorno, sombra, base e luz (luz sempre do alto à esquerda). */
export const MANEQUIM_RAMPS: Partial<Record<Channel, string[]>> = {
  pele: ['#5c2f2a', '#b06a4c', '#dc9c74', '#f5cfa4'],
  'tecido-secundario': ['#2a2a4a', '#45507a', '#6676a4', '#8fa0c8'],
  olhos: ['#2b1d2e', '#2b1d2e', '#2b1d2e', '#2b1d2e'],
};

/** Paleta indexada a partir de uma rampa (lista de 4 cores) por canal: o índice é o código de tom. */
export function paletteFromRamps(ramps: Partial<Record<Channel, readonly string[]>>): (PaletteEntry | null)[] {
  const palette: (PaletteEntry | null)[] = [null];
  for (const channel of CHANNELS) {
    for (let tone = 0; tone < TONES; tone++) {
      const color = ramps[channel]?.[tone];
      palette.push(color ? { channel, tone, color } : null);
    }
  }
  return palette;
}

/** Paleta indexada do manequim: o índice 0 é transparente; os demais são (canal, tom). */
export const MANEQUIM_PALETTE: (PaletteEntry | null)[] = paletteFromRamps(MANEQUIM_RAMPS);

/** Índice da paleta (o código de tom) para um tom de um canal. */
export function paletteIndex(channel: Channel, tone: number): number {
  return toneCode(channel, tone);
}

// ---- Paleta-mestra ----

/** Famílias de rampa: os dois canais de tecido usam a mesma família. */
export type RampFamily = 'pele' | 'olhos' | 'cabelo' | 'tecido' | 'couro' | 'metal' | 'eteris';

export const CHANNEL_FAMILY: Record<Channel, RampFamily> = {
  pele: 'pele',
  olhos: 'olhos',
  cabelo: 'cabelo',
  'tecido-principal': 'tecido',
  'tecido-secundario': 'tecido',
  couro: 'couro',
  metal: 'metal',
  eteris: 'eteris',
};

export interface Ramp {
  id: string;
  label: string;
  family: RampFamily;
  /** Contorno, sombra, base e luz. */
  colors: [string, string, string, string];
}

function hex(h: number, s: number, l: number): string {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const hue = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Aproxima a matiz `h` de `target` em até `amount` graus, pelo caminho mais curto. */
function shiftHue(h: number, target: number, amount: number): number {
  const delta = ((target - h + 540) % 360) - 180;
  return h + Math.sign(delta) * Math.min(Math.abs(delta), amount);
}

/**
 * Uma rampa de 4 tons a partir da cor base (HSL), com a matiz andando como no pixel art:
 * a sombra e o contorno puxam para o violeta e ficam mais saturados, a luz puxa para o amarelo.
 * O contorno nunca chega ao preto.
 */
function ramp(id: string, label: string, family: RampFamily, h: number, s: number, l: number): Ramp {
  return {
    id,
    label,
    family,
    colors: [
      hex(shiftHue(h, 265, 16), s + 4, Math.max(13, l * 0.4)),
      hex(shiftHue(h, 265, 7), s - 8, l * 0.78),
      hex(h, s, l),
      hex(shiftHue(h, 55, 8), s - 6, l + (100 - l) * 0.4),
    ],
  };
}

/** A paleta-mestra: as rampas de todas as famílias. Toda cor é original do Basilis. */
export const MASTER_RAMPS: Ramp[] = [
  // Pele: 8 rampas, da mais clara para a mais escura.
  ramp('pele-1', 'Pele 1', 'pele', 28, 62, 84),
  ramp('pele-2', 'Pele 2', 'pele', 26, 58, 76),
  ramp('pele-3', 'Pele 3', 'pele', 24, 56, 69),
  ramp('pele-4', 'Pele 4', 'pele', 22, 54, 62),
  ramp('pele-5', 'Pele 5', 'pele', 21, 48, 52),
  ramp('pele-6', 'Pele 6', 'pele', 19, 45, 43),
  ramp('pele-7', 'Pele 7', 'pele', 17, 42, 34),
  ramp('pele-8', 'Pele 8', 'pele', 15, 38, 26),
  // Olhos: 8 cores. O olho usa o tom de sombra: escuro para ler, mas ainda com a cor.
  ramp('castanho', 'Castanho', 'olhos', 25, 50, 34),
  ramp('ambar', 'Âmbar', 'olhos', 38, 85, 50),
  ramp('verde', 'Verde', 'olhos', 125, 42, 42),
  ramp('azul', 'Azul', 'olhos', 210, 60, 50),
  ramp('cinza', 'Cinza', 'olhos', 210, 12, 55),
  ramp('avela', 'Avelã', 'olhos', 42, 48, 42),
  ramp('violeta', 'Violeta', 'olhos', 275, 45, 52),
  ramp('vermelho', 'Vermelho', 'olhos', 356, 70, 46),
  // Cabelo: 10 cores. Também pinta sobrancelhas, barba e o pelo das linhagens.
  ramp('preto-azulado', 'Preto azulado', 'cabelo', 228, 24, 22),
  ramp('castanho-1', 'Castanho escuro', 'cabelo', 24, 42, 24),
  ramp('castanho-2', 'Castanho', 'cabelo', 25, 46, 34),
  ramp('castanho-3', 'Castanho claro', 'cabelo', 29, 48, 45),
  ramp('ruivo', 'Ruivo', 'cabelo', 14, 68, 44),
  ramp('acobreado', 'Acobreado', 'cabelo', 24, 70, 52),
  ramp('loiro-escuro', 'Loiro escuro', 'cabelo', 38, 52, 54),
  ramp('loiro', 'Loiro', 'cabelo', 46, 72, 68),
  ramp('grisalho', 'Grisalho', 'cabelo', 220, 8, 64),
  ramp('branco', 'Branco', 'cabelo', 215, 14, 84),
  // Tecido (principal e secundário).
  ramp('azul-gasto', 'Azul gasto', 'tecido', 218, 32, 46),
  ramp('jeans', 'Jeans', 'tecido', 214, 42, 36),
  ramp('vermelho-desbotado', 'Vermelho desbotado', 'tecido', 356, 46, 46),
  ramp('verde-oliva', 'Verde-oliva', 'tecido', 78, 30, 38),
  ramp('mostarda', 'Mostarda', 'tecido', 44, 64, 50),
  ramp('cinza-mescla', 'Cinza mescla', 'tecido', 220, 8, 56),
  ramp('preto-gasto', 'Preto gasto', 'tecido', 232, 12, 24),
  ramp('branco-encardido', 'Branco encardido', 'tecido', 46, 18, 80),
  ramp('marrom-terra', 'Marrom-terra', 'tecido', 26, 34, 36),
  ramp('roxo', 'Roxo', 'tecido', 276, 30, 40),
  // Couro (e o que faz as vezes de couro: a lona e a borracha dos tênis).
  ramp('couro-claro', 'Couro claro', 'couro', 32, 46, 52),
  ramp('couro-escuro', 'Couro escuro', 'couro', 20, 44, 30),
  ramp('lona-clara', 'Lona clara', 'couro', 40, 14, 78),
  // Metal: a mesma peça vira ferro, bronze, aço ou prata trocando esta rampa.
  ramp('ferro', 'Ferro', 'metal', 215, 10, 46),
  ramp('bronze', 'Bronze', 'metal', 30, 56, 46),
  ramp('aco', 'Aço', 'metal', 208, 16, 62),
  ramp('prata', 'Prata', 'metal', 222, 12, 78),
  ramp('ouro', 'Ouro', 'metal', 45, 76, 54),
  // Etéris: do violeta ao ciano.
  ramp('eteris-violeta', 'Etéris violeta', 'eteris', 276, 72, 60),
  ramp('eteris-ciano', 'Etéris ciano', 'eteris', 186, 76, 54),
];

export const RAMP_BY_ID: Record<string, Ramp> = Object.fromEntries(MASTER_RAMPS.map((entry) => [entry.id, entry]));

/** As rampas que servem para um canal. */
export function rampsFor(channel: Channel): Ramp[] {
  return MASTER_RAMPS.filter((entry) => entry.family === CHANNEL_FAMILY[channel]);
}

/** Rampa padrão de cada canal, quando a receita não diz nada. */
export const DEFAULT_RAMPS: Record<Channel, string> = {
  pele: 'pele-4',
  olhos: 'castanho',
  cabelo: 'castanho-2',
  'tecido-principal': 'azul-gasto',
  'tecido-secundario': 'jeans',
  couro: 'lona-clara',
  metal: 'ferro',
  eteris: 'eteris-violeta',
};

/** Paleta de pintura: uma cor CSS por código de tom (null = transparente), com a rampa escolhida para cada canal. */
export function paletteForRamps(choice: Record<Channel, string>): (string | null)[] {
  const colors: Partial<Record<Channel, readonly string[]>> = {};
  for (const channel of CHANNELS) colors[channel] = (RAMP_BY_ID[choice[channel]] ?? RAMP_BY_ID[DEFAULT_RAMPS[channel]]).colors;
  return paletteFromRamps(colors).map((entry) => entry?.color ?? null);
}
