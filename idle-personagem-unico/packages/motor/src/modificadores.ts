/**
 * Modelo único de modificadores.
 *
 * Habilidades, buffs, passivas, equipamentos, ferramentas, pets, relíquias,
 * títulos, clima e hora do dia produzem `Modificador`es; as regras compõem
 * esses modificadores sobre um valor base. Nenhum conteúdo existe ainda.
 *
 * Composição: (base + Σ somar) × (1 + Σ percentual) × Π multiplicar.
 * O resultado não depende da ordem dos modificadores.
 */

/** De onde vem um modificador. Sistema novo deve entrar aqui. */
export type TipoOrigemModificador =
  | "habilidade"
  | "passiva"
  | "buff"
  | "equipamento"
  | "ferramenta"
  | "pet"
  | "reliquia"
  | "titulo"
  | "clima"
  | "horaDoDia"
  | "raca"
  | "dom"
  | "core"
  | "origem"
  | "anomalia";

/**
 * - `somar`: valor fixo somado à base (ex.: +5).
 * - `percentual`: fração somada com os outros percentuais (0,1 = +10%).
 * - `multiplicar`: fator aplicado no fim, multiplicado com os outros (1,5 = ×1,5).
 */
export type OperacaoModificador = "somar" | "percentual" | "multiplicar";

export interface OrigemModificador {
  readonly tipo: TipoOrigemModificador;
  readonly id: string;
}

export interface Modificador {
  /** Identificador do valor afetado (ex.: um status ou um rendimento). */
  readonly alvo: string;
  readonly operacao: OperacaoModificador;
  readonly valor: number;
  readonly origem: OrigemModificador;
}

export interface ResumoModificadores {
  readonly somar: number;
  readonly percentual: number;
  readonly multiplicar: number;
}

export const RESUMO_NEUTRO: ResumoModificadores = { somar: 0, percentual: 0, multiplicar: 1 };

/** Junta os modificadores de um alvo em três números. */
export function resumirModificadores(modificadores: readonly Modificador[], alvo: string): ResumoModificadores {
  let somar = 0;
  let percentual = 0;
  let multiplicar = 1;
  for (const m of modificadores) {
    if (m.alvo !== alvo) continue;
    if (!Number.isFinite(m.valor)) {
      throw new RangeError(`Modificador com valor inválido (${m.origem.tipo}:${m.origem.id}).`);
    }
    switch (m.operacao) {
      case "somar":
        somar += m.valor;
        break;
      case "percentual":
        percentual += m.valor;
        break;
      case "multiplicar":
        multiplicar *= m.valor;
        break;
    }
  }
  return { somar, percentual, multiplicar };
}

/** Aplica um resumo a um valor base. */
export function aplicarResumo(base: number, resumo: ResumoModificadores): number {
  return (base + resumo.somar) * (1 + resumo.percentual) * resumo.multiplicar;
}

/** Compõe todos os modificadores de `alvo` sobre `base`. */
export function comporModificadores(base: number, modificadores: readonly Modificador[], alvo: string): number {
  return aplicarResumo(base, resumirModificadores(modificadores, alvo));
}
