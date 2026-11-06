// A receita de um personagem (seção 5 de PERSONAGEM.md): as peças escolhidas e a rampa de cada canal,
// guardadas como dados (JSON). Ler, validar, escrever e dizer o que muda na montagem.

import type { Peca, Slot } from './camadas.ts';
import { CHANNELS, CHANNEL_FAMILY, DEFAULT_RAMPS, RAMP_BY_ID, type Channel } from './molde.ts';
import { PECA_BY_ID } from './pecas.ts';

export interface Receita {
  corpo: string;
  pele: string;
  olhos: { forma: string; cor: string };
  sobrancelhas: string | null;
  cabelo: { estilo: string; cor: string };
  barba: string | null;
  marcas: string | null;
  linhagem: string | null;
  roupa: string | null;
  equipamento: { cabeca?: string };
  /** Rampas dos outros canais (tecidos, couro, metal, Etéris). Pele, olhos e cabelo têm campo próprio. */
  rampas: Partial<Record<Channel, string>>;
}

/** Quem começa o jogo: corpo, roupa da Terra e nada mais. */
export const RECEITA_PADRAO: Receita = {
  corpo: 'corpo-a',
  pele: 'pele-4',
  olhos: { forma: 'olhos-1', cor: 'castanho' },
  sobrancelhas: 'sobrancelhas-1',
  cabelo: { estilo: 'cabelo-curto', cor: 'castanho-2' },
  barba: null,
  marcas: null,
  linhagem: null,
  roupa: 'roupa-da-terra',
  equipamento: {},
  rampas: { 'tecido-principal': 'azul-gasto', 'tecido-secundario': 'jeans', couro: 'lona-clara' },
};

const OWN_FIELD: Partial<Record<Channel, string>> = { pele: 'pele', olhos: 'olhos.cor', cabelo: 'cabelo.cor' };
const EQUIPMENT_SLOTS = ['cabeca'] as const;
const LAB06_SLOTS = ['tronco', 'maos', 'pernas', 'pes', 'costas', 'rosto'];
const KEYS = ['corpo', 'pele', 'olhos', 'sobrancelhas', 'cabelo', 'barba', 'marcas', 'linhagem', 'roupa', 'equipamento', 'rampas'];

/** A receita em JSON, sempre com as chaves na mesma ordem (a ida e volta devolve o mesmo texto). */
export function receitaJSON(receita: Receita): string {
  const rampas = Object.fromEntries(CHANNELS.filter((channel) => receita.rampas[channel]).map((channel) => [channel, receita.rampas[channel]]));
  const equipamento = Object.fromEntries(EQUIPMENT_SLOTS.filter((slot) => receita.equipamento[slot]).map((slot) => [slot, receita.equipamento[slot]]));
  const ordered: Receita = {
    corpo: receita.corpo,
    pele: receita.pele,
    olhos: { forma: receita.olhos.forma, cor: receita.olhos.cor },
    sobrancelhas: receita.sobrancelhas,
    cabelo: { estilo: receita.cabelo.estilo, cor: receita.cabelo.cor },
    barba: receita.barba,
    marcas: receita.marcas,
    linhagem: receita.linhagem,
    roupa: receita.roupa,
    equipamento,
    rampas,
  };
  return JSON.stringify(ordered, null, 2);
}

export interface Leitura {
  receita: Receita | null;
  erros: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lê o texto de uma receita. Campos opcionais que faltam viram `null`; ids e rampas desconhecidos são erro. */
export function lerReceita(text: string): Leitura {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { receita: null, erros: [`JSON inválido: ${(error as Error).message}`] };
  }
  return validarReceita(data);
}

export function validarReceita(data: unknown): Leitura {
  const erros: string[] = [];
  if (!isObject(data)) return { receita: null, erros: ['A receita tem que ser um objeto { ... }.'] };
  for (const key of Object.keys(data)) if (!KEYS.includes(key)) erros.push(`Chave desconhecida: "${key}".`);

  const piece = (field: string, value: unknown, slot: Slot, optional: boolean): string | null => {
    if (value === undefined || value === null) {
      if (!optional) erros.push(`Falta "${field}".`);
      return null;
    }
    if (typeof value !== 'string') {
      erros.push(`"${field}" tem que ser um texto.`);
      return null;
    }
    const peca = PECA_BY_ID[value];
    if (!peca || peca.slot !== slot) {
      const options = Object.values(PECA_BY_ID).filter((candidate) => candidate.slot === slot).map((candidate) => candidate.id);
      erros.push(`"${field}": "${value}" não existe. Opções: ${options.join(', ')}.`);
      return null;
    }
    return value;
  };
  const rampOf = (field: string, value: unknown, channel: Channel): string => {
    if (typeof value !== 'string') {
      erros.push(`Falta a rampa "${field}".`);
      return DEFAULT_RAMPS[channel];
    }
    const ramp = RAMP_BY_ID[value];
    if (!ramp || ramp.family !== CHANNEL_FAMILY[channel]) {
      erros.push(`"${field}": a rampa "${value}" não serve para ${channel}.`);
      return DEFAULT_RAMPS[channel];
    }
    return value;
  };
  const object = (field: string, value: unknown): Record<string, unknown> => {
    if (value === undefined) return {};
    if (!isObject(value)) {
      erros.push(`"${field}" tem que ser um objeto { ... }.`);
      return {};
    }
    return value;
  };

  const olhos = isObject(data.olhos) ? data.olhos : (erros.push('Falta "olhos": { "forma", "cor" }.'), {});
  const cabelo = isObject(data.cabelo) ? data.cabelo : (erros.push('Falta "cabelo": { "estilo", "cor" }.'), {});
  const equipamentoIn = object('equipamento', data.equipamento);
  const rampasIn = object('rampas', data.rampas);

  const equipamento: Receita['equipamento'] = {};
  for (const [slot, value] of Object.entries(equipamentoIn)) {
    if (slot === 'cabeca') {
      const id = piece('equipamento.cabeca', value, 'equipamento.cabeca', true);
      if (id) equipamento.cabeca = id;
    } else if (LAB06_SLOTS.includes(slot)) erros.push(`"equipamento.${slot}" ainda não tem peças (os equipamentos são do Lab 06).`);
    else erros.push(`Slot de equipamento desconhecido: "${slot}".`);
  }

  const rampas: Receita['rampas'] = {};
  for (const [channel, value] of Object.entries(rampasIn)) {
    if (!(CHANNELS as readonly string[]).includes(channel)) {
      erros.push(`"rampas": canal desconhecido "${channel}".`);
      continue;
    }
    const own = OWN_FIELD[channel as Channel];
    if (own) {
      erros.push(`"rampas.${channel}": use o campo "${own}".`);
      continue;
    }
    rampas[channel as Channel] = rampOf(`rampas.${channel}`, value, channel as Channel);
  }

  const receita: Receita = {
    corpo: piece('corpo', data.corpo, 'corpo', false) ?? RECEITA_PADRAO.corpo,
    pele: rampOf('pele', data.pele, 'pele'),
    olhos: { forma: piece('olhos.forma', olhos.forma, 'olhos', false) ?? RECEITA_PADRAO.olhos.forma, cor: rampOf('olhos.cor', olhos.cor, 'olhos') },
    sobrancelhas: piece('sobrancelhas', data.sobrancelhas, 'sobrancelhas', true),
    cabelo: { estilo: piece('cabelo.estilo', cabelo.estilo, 'cabelo', false) ?? RECEITA_PADRAO.cabelo.estilo, cor: rampOf('cabelo.cor', cabelo.cor, 'cabelo') },
    barba: piece('barba', data.barba, 'barba', true),
    marcas: piece('marcas', data.marcas, 'marcas', true),
    linhagem: piece('linhagem', data.linhagem, 'linhagem', true),
    roupa: piece('roupa', data.roupa, 'roupa', true),
    equipamento,
    rampas,
  };
  return { receita: erros.length ? null : receita, erros };
}

/** As peças da receita, na ordem em que entram em cada camada. */
export function pecasDaReceita(receita: Receita): Peca[] {
  const ids = [
    receita.corpo,
    receita.olhos.forma,
    receita.sobrancelhas,
    receita.marcas,
    receita.linhagem,
    receita.cabelo.estilo,
    receita.barba,
    receita.roupa,
    receita.equipamento.cabeca,
  ];
  return ids.filter((id): id is string => !!id).map((id) => PECA_BY_ID[id]);
}

/** A rampa de cada canal: a da receita, ou a padrão. */
export function rampasDaReceita(receita: Receita): Record<Channel, string> {
  return { ...DEFAULT_RAMPS, ...receita.rampas, pele: receita.pele, olhos: receita.olhos.cor, cabelo: receita.cabelo.cor };
}

/** O que muda o desenho (as peças). Trocar só rampas não muda esta chave: a folha não é redesenhada. */
export function chaveDaForma(receita: Receita): string {
  return pecasDaReceita(receita)
    .map((peca) => peca.id)
    .join('+');
}

/** O que muda a pintura (a rampa de cada canal). */
export function chaveDaPintura(receita: Receita): string {
  const rampas = rampasDaReceita(receita);
  return CHANNELS.map((channel) => `${channel}=${rampas[channel]}`).join(',');
}
