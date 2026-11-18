import { BASES, CONJUNTOS, DADOS_RARIDADE, INVENTARIO_MAXIMO, MATERIAIS, RARIDADES, RELIQUIAS, STATS_AFIXO } from './dados/itens';
import { aleatorio, sortear, sortearPeso } from './rng';
import type { Estado, Item, Material, Raridade, TipoSlot } from './tipos';

export const PESOS_DROP = [62, 25, 10, 2.6, 0.4];
export const PESOS_CHEFE = [10, 40, 34, 13, 3];

const BASES_COMUNS = Object.values(BASES).filter((b) => b.slot !== 'reliquia');
const ARMADURAS: TipoSlot[] = ['elmo', 'peitoral', 'manoplas', 'calcas', 'botas'];

export interface OpcoesItem {
  nivel: number;
  pesos?: readonly number[];
  raridade?: Raridade;
  /** Raridade mínima (sorteia e sobe até ela). */
  minima?: Raridade;
  base?: string;
  /** Conjunto que pode sair (só em armaduras raras ou melhores do tipo certo). */
  conjunto?: string | null;
  /** Força uma peça de conjunto, se a base combinar. */
  forcarConjunto?: boolean;
  reliquia?: boolean;
}

export function novoUid(e: Estado): string {
  e.proximoUid += 1;
  return `i${e.proximoUid}`;
}

export function gerarItem(e: Estado, op: OpcoesItem): Item {
  const base = op.base
    ? BASES[op.base]
    : op.reliquia
      ? sortear(e, RELIQUIAS)
      : sortear(e, BASES_COMUNS);
  let indice = op.raridade ? RARIDADES.indexOf(op.raridade) : sortearPeso(e, op.pesos ?? PESOS_DROP);
  if (base.slot === 'reliquia') indice = Math.max(indice, 2);
  if (op.minima) indice = Math.max(indice, RARIDADES.indexOf(op.minima));
  const raridade = RARIDADES[indice];

  const afixos = [];
  for (let i = 0; i < DADOS_RARIDADE[raridade].afixos; i++) {
    const pct = Math.round((3 + aleatorio(e) * 5) * (1 + indice * 0.15) * 10) / 10;
    afixos.push({ stat: sortear(e, STATS_AFIXO), pct });
  }

  const item: Item = { uid: novoUid(e), base: base.id, raridade, nivel: Math.max(1, Math.round(op.nivel)), melhoria: 0, afixos };
  const conj = op.conjunto ? CONJUNTOS[op.conjunto] : null;
  if (conj && ARMADURAS.includes(base.slot) && base.armadura === conj.armadura && indice >= 2) {
    if (op.forcarConjunto || aleatorio(e) < 0.4) item.conjunto = conj.id;
  }
  return item;
}

/** Valor de referência: a loja vende por ele e compra por 30%. */
export function valorDoItem(item: Item): number {
  return Math.round((12 + item.nivel * 7) * DADOS_RARIDADE[item.raridade].preco * (1 + item.melhoria * 0.35) * (item.conjunto ? 1.5 : 1));
}

export const precoDeVenda = (item: Item) => Math.max(1, Math.round(valorDoItem(item) * 0.3));

/** Guarda no inventário; se estiver cheio, vende na hora. Devolve se guardou. */
export function guardarItem(e: Estado, item: Item): boolean {
  if (e.inventario.length >= INVENTARIO_MAXIMO) {
    e.ouro += precoDeVenda(item);
    return false;
  }
  e.inventario.push(item);
  return true;
}

export function somarMateriais(e: Estado, ganhos: Partial<Record<Material, number>>): void {
  for (const [m, q] of Object.entries(ganhos) as [Material, number][]) e.materiais[m] += q;
}

export const precoMaterial = (m: Material) => MATERIAIS[m].preco;
