/** Texto da origem: gerado por modelo (comum) ou escrito à mão (especial). */
import { CATALOGO, obter } from "../dados";
import type { OrigemSorteada } from "../sorteio/cascata";

/** Monta a lore da origem. Sem nome (durante o sorteio), a frase começa pelo verbo. */
export function gerarLoreOrigem(origem: OrigemSorteada, racaId: string, nome: string | null): string {
  if (origem.tipo === "especial") return obter(CATALOGO.origensEspeciais, origem.id).lore;
  const berco = obter(CATALOGO.bercos, origem.bercoId);
  const motivacao = obter(CATALOGO.motivacoes, origem.motivacaoId);
  const raca = obter(CATALOGO.racas, racaId);
  const inicio = nome ? `${nome} vem de` : "Vem de";
  const anos = origem.anosDeEstrada === 1 ? "1 ano" : `${origem.anosDeEstrada} anos`;
  // Para povos longevos, poucos anos de estrada são quase nada (ORIGENS.md §1).
  const longevo = raca.longeva && origem.anosDeEstrada <= 15 ? ", quase nada para um povo tão longevo," : "";
  const marca = origem.marcaId ? ` ${obter(CATALOGO.marcasOrigem, origem.marcaId).frase}` : "";
  return `${inicio} ${berco.frase}. Há ${anos} na estrada${longevo} ${motivacao.frase}.${marca}`;
}
