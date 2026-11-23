/**
 * Números do sorteio (GDD §4.2). Todos são [Calibrar]: toda mudança vai para
 * `docs/CALIBRACAO.md` e para o GDD, com o antes e o depois.
 */
import type { Compatibilidade, RaridadeDom, RaridadeRaca } from "../dados/tipos";

export interface ConfigSorteio {
  /** Tentativas totais (a primeira + rerolagens). A última é obrigatória. */
  readonly tentativas: number;
  readonly saldoInicial: number;
  readonly pesoRaca: Readonly<Record<RaridadeRaca, number>>;
  readonly custoRaca: Readonly<Record<RaridadeRaca, number>>;
  readonly pesoCompatibilidade: Readonly<Record<Compatibilidade, number>>;
  readonly custoCompatibilidade: Readonly<Record<Compatibilidade, number>>;
  readonly pesoDom: Readonly<Record<RaridadeDom, number>>;
  readonly custoDom: Readonly<Record<RaridadeDom, number>>;
  readonly pesoOrigem: { readonly comum: number; readonly especial: number };
  readonly custoOrigem: { readonly comum: number; readonly especial: number; readonly extraBestaVinculada: number };
  /** Chance de a origem comum ter uma marca opcional (sabor). */
  readonly chanceMarcaOrigem: number;
  readonly anosDeEstrada: { readonly min: number; readonly max: number };
}

export const CONFIG_SORTEIO: ConfigSorteio = Object.freeze({
  tentativas: 5,
  saldoInicial: 100,
  pesoRaca: { comum: 70, incomum: 22, raro: 8 },
  custoRaca: { comum: 0, incomum: 10, raro: 25 },
  pesoCompatibilidade: { alta: 70, media: 25, excentrica: 5 },
  custoCompatibilidade: { alta: 0, media: 5, excentrica: 15 },
  pesoDom: { incomum: 60, raro: 28, epico: 9, ancestral: 2.5, primordial: 0.5 },
  custoDom: { incomum: 5, raro: 15, epico: 30, ancestral: 50, primordial: 80 },
  pesoOrigem: { comum: 92, especial: 8 },
  custoOrigem: { comum: 0, especial: 15, extraBestaVinculada: 15 },
  chanceMarcaOrigem: 0.3,
  anosDeEstrada: { min: 1, max: 25 },
});
