/**
 * Regras puras da Mochila (filtros, ordenação e "possível melhoria").
 * Só leem o estado; as ações continuam em src/motor/acoes.ts.
 */
import { podeUsar, slotsDoItem } from '../motor/acoes';
import { BASES, RARIDADES } from '../motor/dados/itens';
import { valorDoItem } from '../motor/itens';
import { statsDoItem } from '../motor/status';
import type { Estado, Heroi, Item, PersonagemId, Raridade, Slot, Stat, Stats, TipoSlot } from '../motor/tipos';

export type Espaco = 'arma' | 'armadura' | 'secundaria' | 'acessorio' | 'reliquia';
export type Ordem = 'recentes' | 'raridade' | 'nivel' | 'valor' | 'espaco' | 'melhoria';

export interface FiltroMochila {
  espaco: Espaco | 'todos';
  raridades: Raridade[];
  heroi: PersonagemId | null;
  soMelhorias: boolean;
}

export const FILTRO_PADRAO: FiltroMochila = { espaco: 'todos', raridades: [], heroi: null, soMelhorias: false };

export const NOME_ESPACO: Record<Espaco | 'todos', string> = {
  todos: 'Todos',
  arma: 'Arma',
  armadura: 'Armadura',
  secundaria: 'Mão secundária',
  acessorio: 'Acessório',
  reliquia: 'Relíquia',
};

export const NOME_ORDEM: Record<Ordem, string> = {
  recentes: 'Mais recentes',
  raridade: 'Raridade',
  nivel: 'Nível do item',
  valor: 'Valor',
  espaco: 'Espaço',
  melhoria: 'Melhoria (+N)',
};

const ARMADURAS: TipoSlot[] = ['elmo', 'peitoral', 'manoplas', 'calcas', 'botas'];
const ORDEM_TIPO: TipoSlot[] = ['arma', 'secundaria', 'elmo', 'peitoral', 'manoplas', 'calcas', 'botas', 'acessorio', 'reliquia'];

export function espacoDoItem(item: Item): Espaco | null {
  const t = BASES[item.base]?.slot;
  if (!t) return null;
  if (ARMADURAS.includes(t)) return 'armadura';
  return t as Espaco;
}

/** Filtro de espaço que corresponde a um espaço do herói. */
export function espacoDoSlot(slot: Slot): Espaco {
  if (slot === 'acessorio1' || slot === 'acessorio2') return 'acessorio';
  if (slot === 'arma' || slot === 'secundaria' || slot === 'reliquia') return slot;
  return 'armadura';
}

/** Soma simples dos atributos fixos: a base da heurística de comparação. */
export function somaStats(stats: Partial<Stats>): number {
  return Object.values(stats).reduce((s, v) => s + (v ?? 0), 0);
}

/**
 * Espaço onde o item entraria no herói e a peça que ele substituiria.
 * Acessórios: um espaço vazio, se houver; senão o mais fraco dos dois.
 */
export function espacoAlvo(h: Heroi, item: Item): { slot: Slot; atual?: Item } | null {
  const slots = slotsDoItem(item);
  if (slots.length === 0) return null;
  const vazio = slots.find((s) => !h.equipamento[s]);
  if (vazio) return { slot: vazio };
  const slot = slots.reduce((a, b) => (somaStats(statsDoItem(h.equipamento[b]!)) < somaStats(statsDoItem(h.equipamento[a]!)) ? b : a));
  return { slot, atual: h.equipamento[slot] };
}

/** O item seria uma possível melhoria para este herói? */
export function ehPossivelMelhoria(h: Heroi, item: Item): boolean {
  if (podeUsar(h, item)) return false;
  const alvo = espacoAlvo(h, item);
  if (!alvo) return false;
  if (!alvo.atual) return true;
  return somaStats(statsDoItem(item)) > somaStats(statsDoItem(alvo.atual));
}

/**
 * Heróis para quem o item pode ser melhoria: passa em `podeUsar`, cabe no
 * espaço e o espaço está vazio ou a soma dos atributos supera a da peça
 * equipada. É heurística: na interface, sempre "possível melhoria".
 */
export function heroisParaItem(estado: Estado, item: Item): PersonagemId[] {
  return estado.herois.filter((h) => ehPossivelMelhoria(h, item)).map((h) => h.id);
}

/** Diferença de cada atributo entre o item e a peça comparada (positivo = melhor). */
export function diferencaStats(item: Item, atual?: Item): Partial<Record<Stat, number>> {
  const novo = statsDoItem(item);
  const antes = atual ? statsDoItem(atual) : {};
  const r: Partial<Record<Stat, number>> = {};
  for (const s of new Set([...Object.keys(novo), ...Object.keys(antes)]) as Set<Stat>) {
    const d = Math.round(((novo[s] ?? 0) - (antes[s] ?? 0)) * 10) / 10;
    if (d !== 0) r[s] = d;
  }
  return r;
}

export function filtrarItens(estado: Estado, itens: Item[], f: FiltroMochila, melhorias?: ReadonlySet<string>): Item[] {
  const heroi = f.heroi ? estado.herois.find((h) => h.id === f.heroi) : undefined;
  return itens.filter((item) => {
    if (f.espaco !== 'todos' && espacoDoItem(item) !== f.espaco) return false;
    if (f.raridades.length > 0 && !f.raridades.includes(item.raridade)) return false;
    if (heroi && podeUsar(heroi, item)) return false;
    if (f.soMelhorias) {
      if (heroi) return ehPossivelMelhoria(heroi, item);
      return melhorias ? melhorias.has(item.uid) : heroisParaItem(estado, item).length > 0;
    }
    return true;
  });
}

const indiceRaridade = (r: Raridade) => RARIDADES.indexOf(r);

/** Ordena sem mexer na lista original. "Recentes": o último guardado vem primeiro. */
export function ordenarItens(itens: Item[], ordem: Ordem): Item[] {
  const recentes = [...itens].reverse();
  const desempate = (a: Item, b: Item) => recentes.indexOf(a) - recentes.indexOf(b);
  const tipo = (i: Item) => ORDEM_TIPO.indexOf(BASES[i.base]?.slot ?? 'reliquia');
  const comparar: Record<Ordem, (a: Item, b: Item) => number> = {
    recentes: () => 0,
    raridade: (a, b) => indiceRaridade(b.raridade) - indiceRaridade(a.raridade) || b.nivel - a.nivel,
    nivel: (a, b) => b.nivel - a.nivel || indiceRaridade(b.raridade) - indiceRaridade(a.raridade),
    valor: (a, b) => valorDoItem(b) - valorDoItem(a),
    espaco: (a, b) => tipo(a) - tipo(b) || indiceRaridade(b.raridade) - indiceRaridade(a.raridade),
    melhoria: (a, b) => b.melhoria - a.melhoria || indiceRaridade(b.raridade) - indiceRaridade(a.raridade),
  };
  return recentes.sort((a, b) => comparar[ordem](a, b) || desempate(a, b));
}

/** Itens que a Loja já oferece vender de uma vez: comuns e incomuns. */
export const itensBaratos = (inventario: Item[]) => inventario.filter((i) => i.raridade === 'comum' || i.raridade === 'incomum');

/** Raro ou melhor: vender ou desmontar pede confirmação. */
export const pedeConfirmacao = (item: Item) => indiceRaridade(item.raridade) >= indiceRaridade('raro');

/* ---------- Preferências (localStorage) ---------- */

export const CHAVE_PREFERENCIAS = 'idle-guilda:ui:mochila';

export interface PreferenciasMochila {
  filtro: FiltroMochila;
  ordem: Ordem;
}

export function lerPreferencias(texto: string | null): PreferenciasMochila {
  const padrao: PreferenciasMochila = { filtro: FILTRO_PADRAO, ordem: 'recentes' };
  if (!texto) return padrao;
  try {
    const p = JSON.parse(texto) as Partial<PreferenciasMochila>;
    const f = (p.filtro ?? {}) as Partial<FiltroMochila>;
    return {
      ordem: p.ordem && p.ordem in NOME_ORDEM ? p.ordem : 'recentes',
      filtro: {
        espaco: f.espaco && f.espaco in NOME_ESPACO ? f.espaco : 'todos',
        raridades: Array.isArray(f.raridades) ? f.raridades.filter((r) => RARIDADES.includes(r)) : [],
        heroi: typeof f.heroi === 'string' ? f.heroi : null,
        soMelhorias: f.soMelhorias === true,
      },
    };
  } catch {
    return padrao;
  }
}
