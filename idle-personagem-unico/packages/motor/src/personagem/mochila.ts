/** Mochila (GDD §9.3): espaços, pilhas e capacidade pela Força. */
import { CATALOGO, obter } from "../dados";
import type { Modificador } from "../modificadores";
import { CONFIG_MOCHILA, valorEfetivo } from "./progressao";

export type Mochila = Readonly<Record<string, number>>;

/** Espaços ocupados: cada pilha (até `item.pilha` unidades) ocupa um. */
export function espacosUsados(mochila: Mochila): number {
  let total = 0;
  for (const [id, q] of Object.entries(mochila)) total += Math.ceil(q / obter(CATALOGO.itens, id).pilha);
  return total;
}

/** Capacidade em espaços, pela Força efetiva. */
export function capacidadeMochila(forcaTreinada: number, mods: readonly Modificador[]): number {
  let extra = 0;
  for (const m of mods) if (m.alvo === "espacos-mochila" && m.operacao === "somar") extra += m.valor;
  return CONFIG_MOCHILA.espacosBase + Math.floor(valorEfetivo(forcaTreinada, "forca", mods) * CONFIG_MOCHILA.espacosPorForca + extra);
}

/** Quantas unidades do item ainda cabem. */
export function cabeNaMochila(mochila: Mochila, itemId: string, capacidade: number): number {
  const pilha = obter(CATALOGO.itens, itemId).pilha;
  const atual = mochila[itemId] ?? 0;
  const sobraNaPilha = atual % pilha === 0 ? 0 : pilha - (atual % pilha);
  const livres = Math.max(0, capacidade - espacosUsados(mochila));
  return sobraNaPilha + livres * pilha;
}

/** Adiciona o que couber; devolve a mochila nova e quantos foram perdidos. */
export function adicionarItens(mochila: Mochila, itemId: string, quantidade: number, capacidade: number): { mochila: Mochila; aceitos: number; perdidos: number } {
  if (quantidade <= 0) return { mochila, aceitos: 0, perdidos: 0 };
  const aceitos = Math.min(quantidade, cabeNaMochila(mochila, itemId, capacidade));
  if (aceitos === 0) return { mochila, aceitos: 0, perdidos: quantidade };
  return { mochila: { ...mochila, [itemId]: (mochila[itemId] ?? 0) + aceitos }, aceitos, perdidos: quantidade - aceitos };
}

/** Remove unidades (a quantidade precisa existir). */
export function removerItens(mochila: Mochila, itemId: string, quantidade: number): Mochila {
  const atual = mochila[itemId] ?? 0;
  if (quantidade > atual) throw new RangeError("Quantidade maior que a da mochila.");
  const nova = { ...mochila };
  if (atual === quantidade) delete nova[itemId];
  else nova[itemId] = atual - quantidade;
  return nova;
}
