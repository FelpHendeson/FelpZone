// A criação de personagem (seção 6 de PERSONAGEM.md): as escolhas do jogador, cada uma escrevendo um
// campo da receita. O jogador escolhe só o corpo, nunca a roupa: todo mundo começa com a roupa da Terra,
// em cores escolhidas ou sorteadas. A linhagem não é escolha da criação (o jogo dá), mas a tela tem um
// exemplo para provar a camada. Sem DOM, testável.

import type { Slot } from './camadas.ts';
import { CHANNEL_LABELS, rampsFor, type Channel } from './molde.ts';
import { pecasDoSlot } from './pecas.ts';
import { RECEITA_PADRAO, type Receita } from './receita.ts';

export type GrupoDeCriacao = 'corpo' | 'rosto' | 'cabelo' | 'roupa' | 'linhagem';

export const GRUPOS: { id: GrupoDeCriacao; nome: string }[] = [
  { id: 'corpo', nome: 'Corpo' },
  { id: 'rosto', nome: 'Rosto' },
  { id: 'cabelo', nome: 'Cabelo' },
  { id: 'roupa', nome: 'Roupa' },
  { id: 'linhagem', nome: 'Linhagem' },
];

export interface Opcao {
  /** O valor na receita: o id da peça ou da rampa; '' é "nenhuma". */
  valor: string;
  nome: string;
}

export interface Escolha {
  id: string;
  nome: string;
  grupo: GrupoDeCriacao;
  /** Peça (desenho) ou rampa (cor). */
  tipo: 'peca' | 'rampa';
  /** O canal da rampa (só nas escolhas de cor). */
  canal?: Channel;
  opcoes: Opcao[];
  ler(receita: Receita): string;
  escrever(receita: Receita, valor: string): Receita;
  /** Chance de "nenhuma" ao sortear (barba e marcas não aparecem em todo mundo). */
  nenhumaAoSortear?: number;
}

const NENHUMA: Opcao = { valor: '', nome: 'Nenhuma' };

function pecas(slot: Slot, opcional: boolean): Opcao[] {
  const list = pecasDoSlot(slot).map((peca) => ({ valor: peca.id, nome: peca.nome }));
  return opcional ? [NENHUMA, ...list] : list;
}

function rampas(channel: Channel): Opcao[] {
  return rampsFor(channel).map((ramp) => ({ valor: ramp.id, nome: ramp.label }));
}

/** Uma cor da roupa da Terra: o canal vai no campo "rampas" da receita. */
function corDaRoupa(id: string, nome: string, channel: Channel): Escolha {
  return {
    id,
    nome,
    grupo: 'roupa',
    tipo: 'rampa',
    canal: channel,
    opcoes: rampas(channel),
    ler: (r) => r.rampas[channel] ?? RECEITA_PADRAO.rampas[channel]!,
    escrever: (r, v) => ({ ...r, rampas: { ...r.rampas, [channel]: v } }),
  };
}

/** As escolhas da tela, na ordem em que aparecem. */
export const ESCOLHAS: Escolha[] = [
  {
    id: 'corpo',
    nome: 'Tipo de corpo',
    grupo: 'corpo',
    tipo: 'peca',
    opcoes: pecas('corpo', false),
    ler: (r) => r.corpo,
    escrever: (r, v) => ({ ...r, corpo: v }),
  },
  {
    id: 'pele',
    nome: CHANNEL_LABELS.pele,
    grupo: 'corpo',
    tipo: 'rampa',
    canal: 'pele',
    opcoes: rampas('pele'),
    ler: (r) => r.pele,
    escrever: (r, v) => ({ ...r, pele: v }),
  },
  {
    id: 'olhos-forma',
    nome: 'Olhos',
    grupo: 'rosto',
    tipo: 'peca',
    opcoes: pecas('olhos', false),
    ler: (r) => r.olhos.forma,
    escrever: (r, v) => ({ ...r, olhos: { ...r.olhos, forma: v } }),
  },
  {
    id: 'olhos-cor',
    nome: 'Cor dos olhos',
    grupo: 'rosto',
    tipo: 'rampa',
    canal: 'olhos',
    opcoes: rampas('olhos'),
    ler: (r) => r.olhos.cor,
    escrever: (r, v) => ({ ...r, olhos: { ...r.olhos, cor: v } }),
  },
  {
    id: 'sobrancelhas',
    nome: 'Sobrancelhas',
    grupo: 'rosto',
    tipo: 'peca',
    opcoes: pecas('sobrancelhas', false),
    ler: (r) => r.sobrancelhas ?? '',
    escrever: (r, v) => ({ ...r, sobrancelhas: v || null }),
  },
  {
    id: 'marcas',
    nome: 'Marcas',
    grupo: 'rosto',
    tipo: 'peca',
    opcoes: pecas('marcas', true),
    ler: (r) => r.marcas ?? '',
    escrever: (r, v) => ({ ...r, marcas: v || null }),
    nenhumaAoSortear: 0.6,
  },
  {
    id: 'cabelo-estilo',
    nome: 'Cabelo',
    grupo: 'cabelo',
    tipo: 'peca',
    opcoes: pecas('cabelo', false),
    ler: (r) => r.cabelo.estilo,
    escrever: (r, v) => ({ ...r, cabelo: { ...r.cabelo, estilo: v } }),
  },
  {
    id: 'cabelo-cor',
    nome: 'Cor do cabelo',
    grupo: 'cabelo',
    tipo: 'rampa',
    canal: 'cabelo',
    opcoes: rampas('cabelo'),
    ler: (r) => r.cabelo.cor,
    escrever: (r, v) => ({ ...r, cabelo: { ...r.cabelo, cor: v } }),
  },
  {
    id: 'barba',
    nome: 'Barba',
    grupo: 'cabelo',
    tipo: 'peca',
    opcoes: pecas('barba', true),
    ler: (r) => r.barba ?? '',
    escrever: (r, v) => ({ ...r, barba: v || null }),
    nenhumaAoSortear: 0.6,
  },
  corDaRoupa('camiseta', 'Camiseta', 'tecido-principal'),
  corDaRoupa('calca', 'Calça', 'tecido-secundario'),
  corDaRoupa('tenis', 'Tênis', 'couro'),
  {
    id: 'linhagem',
    nome: 'Linhagem (exemplo)',
    grupo: 'linhagem',
    tipo: 'peca',
    opcoes: pecas('linhagem', true),
    ler: (r) => r.linhagem ?? '',
    escrever: (r, v) => ({ ...r, linhagem: v || null }),
  },
];

export const ESCOLHA_BY_ID: Record<string, Escolha> = Object.fromEntries(ESCOLHAS.map((escolha) => [escolha.id, escolha]));

/**
 * O que a criação permite: a roupa da Terra sempre, nenhum equipamento. O resto da receita fica como
 * está (uma receita vinda da bancada perde o chapéu e ganha a roupa de volta).
 */
export function receitaDeCriacao(receita: Receita): Receita {
  const rampas: Receita['rampas'] = {};
  for (const channel of ['tecido-principal', 'tecido-secundario', 'couro'] as const) {
    rampas[channel] = receita.rampas[channel] ?? RECEITA_PADRAO.rampas[channel];
  }
  return { ...receita, roupa: 'roupa-da-terra', equipamento: {}, rampas };
}

export function escolher(receita: Receita, escolhaId: string, valor: string): Receita {
  const escolha = ESCOLHA_BY_ID[escolhaId];
  if (!escolha.opcoes.some((opcao) => opcao.valor === valor)) throw new Error(`"${escolhaId}": opção desconhecida "${valor}".`);
  return receitaDeCriacao(escolha.escrever(receita, valor));
}

/**
 * Sorteia todas as escolhas do jogador. A linhagem não entra no sorteio (é o jogo que dá): fica a que
 * a receita já tinha. `random` devolve um número em [0, 1), como `Math.random`.
 */
export function sortear(receita: Receita, random: () => number = Math.random): Receita {
  let result = receita;
  for (const escolha of ESCOLHAS) {
    if (escolha.grupo === 'linhagem') continue;
    const comNenhuma = escolha.opcoes[0].valor === '';
    let valor: string;
    if (comNenhuma && escolha.nenhumaAoSortear !== undefined) {
      const roll = random();
      const resto = escolha.opcoes.slice(1);
      valor = roll < escolha.nenhumaAoSortear ? '' : resto[Math.min(resto.length - 1, Math.floor(random() * resto.length))].valor;
    } else valor = escolha.opcoes[Math.min(escolha.opcoes.length - 1, Math.floor(random() * escolha.opcoes.length))].valor;
    result = escolha.escrever(result, valor);
  }
  return receitaDeCriacao(result);
}

/** Todas as combinações de desenho (as escolhas de peça), sem as cores: corpo × olhos × ... × linhagem. */
export function* combinacoesDeForma(base: Receita = RECEITA_PADRAO): Generator<Receita> {
  const escolhas = ESCOLHAS.filter((escolha) => escolha.tipo === 'peca');
  function* walk(i: number, receita: Receita): Generator<Receita> {
    if (i === escolhas.length) {
      yield receitaDeCriacao(receita);
      return;
    }
    for (const opcao of escolhas[i].opcoes) yield* walk(i + 1, escolhas[i].escrever(receita, opcao.valor));
  }
  yield* walk(0, base);
}
