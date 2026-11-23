/**
 * Cascata do sorteio (GDD §4.2): raça → core → dom de raça → origem → detalhes finais.
 *
 * Cada passo sorteia por peso entre as opções cujo custo cabe no saldo do
 * orçamento de raridade (renormalizando os pesos). Se nada couber, fica com a
 * opção de menor custo (`fallback`). Uma tentativa é função pura do estado do
 * RNG no início dela: guardar esse estado basta para reproduzi-la.
 */
import { CATALOGO, compatibilidade, CORES, donsDaRaca, idMarcaAnomalia, obter, ORIGENS_ESPECIAIS, RACAS } from "../dados";
import type { Compatibilidade } from "../dados/tipos";
import { Rng, type EstadoRng } from "../rng";
import { CONFIG_SORTEIO, type ConfigSorteio } from "./config";

export type NomePasso = "raca" | "core" | "dom" | "origem";

/** Registro do orçamento em um passo. */
export interface PassoOrcamento {
  readonly passo: NomePasso;
  readonly escolhaId: string;
  readonly custo: number;
  readonly saldoAntes: number;
  /** Opções com peso que ficaram de fora por não caberem no saldo. */
  readonly cortadas: number;
  /** `true` quando nada cabia e valeu a opção de menor custo. */
  readonly fallback: boolean;
}

export type OrigemSorteada =
  | {
      readonly tipo: "comum";
      readonly bercoId: string;
      readonly motivacaoId: string;
      readonly marcaId: string | null;
      readonly anosDeEstrada: number;
    }
  | { readonly tipo: "especial"; readonly id: string };

export interface ResultadoTentativa {
  readonly racaId: string;
  readonly coreId: string;
  readonly compatibilidade: Compatibilidade;
  readonly domId: string;
  readonly origem: OrigemSorteada;
  readonly marcaAnomaliaId: string | null;
  readonly bestaVinculadaId: string | null;
  readonly tracoId: string;
  readonly orcamento: {
    readonly saldoInicial: number;
    readonly gasto: number;
    readonly passos: readonly PassoOrcamento[];
  };
}

export interface OpcaoComCusto {
  readonly id: string;
  readonly peso: number;
  readonly custo: number;
}

export interface EscolhaComOrcamento {
  readonly id: string;
  readonly custo: number;
  readonly cortadas: number;
  readonly fallback: boolean;
}

/** Escolha ponderada restrita ao saldo, com fallback de menor custo. */
export function escolherComOrcamento(rng: Rng, opcoes: readonly OpcaoComCusto[], saldo: number): EscolhaComOrcamento {
  const comPeso = opcoes.filter((o) => o.peso > 0);
  if (comPeso.length === 0) throw new RangeError("Passo do sorteio sem opções com peso.");
  const cabem = comPeso.filter((o) => o.custo <= saldo);
  if (cabem.length > 0) {
    const id = rng.escolhaPonderada(cabem.map((o) => ({ valor: o.id, peso: o.peso })));
    const escolhida = cabem.find((o) => o.id === id) as OpcaoComCusto;
    return { id, custo: escolhida.custo, cortadas: comPeso.length - cabem.length, fallback: false };
  }
  // Nada cabe: entre as de menor custo, sorteia pelo peso.
  const menor = Math.min(...comPeso.map((o) => o.custo));
  const maisBaratas = comPeso.filter((o) => o.custo === menor);
  const id = rng.escolhaPonderada(maisBaratas.map((o) => ({ valor: o.id, peso: o.peso })));
  return { id, custo: menor, cortadas: comPeso.length - maisBaratas.length, fallback: true };
}

/** Divide o peso de cada grupo igualmente entre os membros (grupos vazios somem e o resto renormaliza). */
function pesosPorGrupo<T, G extends string>(
  itens: readonly T[],
  grupo: (item: T) => G,
  pesoGrupo: Readonly<Record<G, number>>,
): Map<T, number> {
  const contagem = new Map<G, number>();
  for (const item of itens) contagem.set(grupo(item), (contagem.get(grupo(item)) ?? 0) + 1);
  const pesos = new Map<T, number>();
  for (const item of itens) pesos.set(item, pesoGrupo[grupo(item)] / (contagem.get(grupo(item)) as number));
  return pesos;
}

/** Opções do passo de raça. */
export function opcoesRaca(config: ConfigSorteio = CONFIG_SORTEIO): OpcaoComCusto[] {
  const pesos = pesosPorGrupo(RACAS, (r) => r.raridade, config.pesoRaca);
  return RACAS.map((r) => ({ id: r.id, peso: pesos.get(r) as number, custo: config.custoRaca[r.raridade] }));
}

/** Opções do passo de core, dada a raça. */
export function opcoesCore(racaId: string, config: ConfigSorteio = CONFIG_SORTEIO): OpcaoComCusto[] {
  const raca = obter(CATALOGO.racas, racaId);
  const pesos = pesosPorGrupo(CORES, (c) => compatibilidade(raca, c), config.pesoCompatibilidade);
  return CORES.map((c) => ({ id: c.id, peso: pesos.get(c) as number, custo: config.custoCompatibilidade[compatibilidade(raca, c)] }));
}

/** Opções do passo de dom, dada a raça. */
export function opcoesDom(racaId: string, config: ConfigSorteio = CONFIG_SORTEIO): OpcaoComCusto[] {
  const dons = donsDaRaca(racaId);
  const pesos = pesosPorGrupo(dons, (d) => d.raridade, config.pesoDom);
  return dons.map((d) => ({ id: d.id, peso: pesos.get(d) as number, custo: config.custoDom[d.raridade] }));
}

/** Id da opção "origem comum" no passo de origem. */
export const OPCAO_ORIGEM_COMUM = "comum";

/** Origens especiais compatíveis com a raça (restrição vazia = qualquer raça). */
export function origensEspeciaisDaRaca(racaId: string) {
  return ORIGENS_ESPECIAIS.filter((o) => o.racasPermitidas.length === 0 || o.racasPermitidas.includes(racaId));
}

/** Opções do passo de origem: comum ou uma especial compatível com a raça. */
export function opcoesOrigem(racaId: string, config: ConfigSorteio = CONFIG_SORTEIO): OpcaoComCusto[] {
  const especiais = origensEspeciaisDaRaca(racaId);
  const opcoes: OpcaoComCusto[] = [{ id: OPCAO_ORIGEM_COMUM, peso: config.pesoOrigem.comum, custo: config.custoOrigem.comum }];
  for (const o of especiais) {
    opcoes.push({
      id: o.id,
      peso: config.pesoOrigem.especial / especiais.length,
      custo: config.custoOrigem.especial + (o.bestaVinculadaId ? config.custoOrigem.extraBestaVinculada : 0),
    });
  }
  return opcoes;
}

function sortearUniforme<T>(rng: Rng, lista: readonly T[]): T {
  return lista[rng.inteiro(0, lista.length - 1)] as T;
}

/**
 * Sorteia uma tentativa completa. Consome o `rng` (que avança); para
 * reproduzir, basta repetir com o mesmo estado inicial.
 */
export function sortearTentativa(rng: Rng, config: ConfigSorteio = CONFIG_SORTEIO): ResultadoTentativa {
  let saldo = config.saldoInicial;
  const passos: PassoOrcamento[] = [];
  const passo = (nome: NomePasso, opcoes: readonly OpcaoComCusto[]): string => {
    const e = escolherComOrcamento(rng, opcoes, saldo);
    passos.push({ passo: nome, escolhaId: e.id, custo: e.custo, saldoAntes: saldo, cortadas: e.cortadas, fallback: e.fallback });
    saldo -= e.custo;
    return e.id;
  };

  // 1. Raça.
  const racaId = passo("raca", opcoesRaca(config));
  const raca = obter(CATALOGO.racas, racaId);
  // 2. Core.
  const coreId = passo("core", opcoesCore(racaId, config));
  const compat = compatibilidade(raca, obter(CATALOGO.cores, coreId));
  // 3. Dom de raça.
  const domId = passo("dom", opcoesDom(racaId, config));
  // 4. Origem.
  const origemId = passo("origem", opcoesOrigem(racaId, config));
  let origem: OrigemSorteada;
  let bestaVinculadaId: string | null = null;
  if (origemId === OPCAO_ORIGEM_COMUM) {
    const berco = sortearUniforme(rng, [...CATALOGO.bercos.keys()]);
    const motivacao = sortearUniforme(rng, [...CATALOGO.motivacoes.keys()]);
    const temMarca = rng.flutuante() < config.chanceMarcaOrigem;
    const marca = temMarca ? sortearUniforme(rng, [...CATALOGO.marcasOrigem.keys()]) : null;
    const anos = rng.inteiro(config.anosDeEstrada.min, config.anosDeEstrada.max);
    origem = { tipo: "comum", bercoId: berco, motivacaoId: motivacao, marcaId: marca, anosDeEstrada: anos };
  } else {
    origem = { tipo: "especial", id: origemId };
    bestaVinculadaId = obter(CATALOGO.origensEspeciais, origemId).bestaVinculadaId ?? null;
  }
  // 5. Detalhes finais: traço de personalidade (narrativo).
  const tracoId = sortearUniforme(rng, [...CATALOGO.tracos.keys()]);

  return {
    racaId,
    coreId,
    compatibilidade: compat,
    domId,
    origem,
    marcaAnomaliaId: compat === "excentrica" ? idMarcaAnomalia(racaId, coreId) : null,
    bestaVinculadaId,
    tracoId,
    orcamento: { saldoInicial: config.saldoInicial, gasto: config.saldoInicial - saldo, passos },
  };
}

/** Reproduz a tentativa que começou no estado de RNG indicado. */
export function reproduzirTentativa(rngInicio: EstadoRng, config: ConfigSorteio = CONFIG_SORTEIO): ResultadoTentativa {
  return sortearTentativa(Rng.deEstado(rngInicio), config);
}
