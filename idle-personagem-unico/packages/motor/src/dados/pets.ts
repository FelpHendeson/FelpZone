/**
 * Pets (GDD §6.6 e §13, F10) [Proposta; números Calibrar em `docs/CALIBRACAO.md`].
 *
 * - Reais: domados em combate (com Laço de doma) ou comprados no Estábulo;
 *   têm Fome (saciedade) e Energia.
 * - Espirituais: as bestas vinculadas das origens especiais; não sentem fome,
 *   não se perdem, crescem com o Espírito e têm o modo União.
 * - Cada categoria de atividade tem 1 slot de pet; o mesmo pet pode estar em
 *   todas. Ele só trabalha (e só cansa) quando o personagem trabalha ali.
 */
import type { Modificador } from "../modificadores";
import type { Item } from "./coleta";
import type { Raridade } from "./tipos";

export type TipoPet = "real" | "espiritual";
/** Categorias com slot de pet (as atividades de trabalho). */
export const CATEGORIAS_PET = ["treino", "coleta", "producao", "combate"] as const;
export type CategoriaPet = (typeof CATEGORIAS_PET)[number];
export const NOME_CATEGORIA_PET: Readonly<Record<CategoriaPet, string>> = { treino: "Treino", coleta: "Coleta", producao: "Produção", combate: "Combate" };

export interface EspeciePet {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly tipo: TipoPet;
  readonly raridade: Raridade;
  /** Bônus no nível 1 (crescem com o nível do pet, ou com o Espírito nos espirituais). */
  readonly bonus: readonly Omit<Modificador, "origem">[];
  /** Monstro que pode ser domado para virar este pet. */
  readonly domadoDe?: string;
  /** Preço no Estábulo de Pedravau (se vende). */
  readonly preco?: number;
}

export const CONFIG_PETS = Object.freeze({
  /** Pets reais guardados no Estábulo por personagem. */
  maximo: 5,
  /** Reservas (em ms de trabalho) e o máximo de cada uma. */
  energiaMaximaMs: 8 * 3_600_000,
  saciedadeMaximaMs: 12 * 3_600_000,
  /** Laço de doma: chance base por abate de monstro domável. */
  chanceDomar: 0.0007,
  /** Cada nível do pet soma 10% ao bônus do nível 1. */
  bonusPorNivel: 0.1,
  nivelMaximo: 20,
  /** XP do pet por nível: 60 × nível. */
  xpPorNivel: 60,
  /** Espirituais: o bônus cresce 1% por ponto de Espírito efetivo acima de 10. */
  espiritoPorPonto: 0.01,
  /** União: enche a Sincronia com 1 h de trabalho; dura 10 min (`pets.uniao` alonga, até 20 min) e dobra o bônus. */
  sincroniaMaximaMs: 3_600_000,
  uniaoMs: 10 * 60_000,
  uniaoMaximaMs: 20 * 60_000,
  multiplicadorUniao: 2,
});

const especie = (e: EspeciePet): EspeciePet => e;

export const ESPECIES_PET: readonly EspeciePet[] = [
  // Reais, domáveis.
  especie({ id: "lobo", nome: "Lobo", descricao: "Caça em dupla e divide a presa (às vezes).", tipo: "real", raridade: "comum", domadoDe: "lobo-cinzento", bonus: [{ alvo: "ataque", operacao: "percentual", valor: 0.05 }] }),
  especie({ id: "javali", nome: "Javali", descricao: "Teimoso, forte e bom de faro para raízes.", tipo: "real", raridade: "comum", domadoDe: "javali-magro", bonus: [{ alvo: "coleta.rendimento", operacao: "percentual", valor: 0.06 }] }),
  especie({ id: "morcego", nome: "Morcego-de-veio", descricao: "Acha veios de minério pelo eco.", tipo: "real", raridade: "incomum", domadoDe: "morcego-de-veio", bonus: [{ alvo: "chance-raro", operacao: "percentual", valor: 0.15 }] }),
  especie({ id: "sapo-cao", nome: "Sapo-cão", descricao: "Late para o perigo. Ninguém sabe por quê.", tipo: "real", raridade: "incomum", domadoDe: "sapo-cao", bonus: [{ alvo: "defesa", operacao: "percentual", valor: 0.06 }] }),
  especie({ id: "aranha", nome: "Aranha de casca", descricao: "Tece, segura e não reclama do calor da forja.", tipo: "real", raridade: "raro", domadoDe: "aranha-de-casca", bonus: [{ alvo: "producao.velocidade", operacao: "percentual", valor: 0.08 }] }),
  especie({ id: "enguia", nome: "Enguia-navalha", descricao: "Num balde, dá medo. No combate, mais ainda.", tipo: "real", raridade: "raro", domadoDe: "enguia-navalha", bonus: [{ alvo: "critico", operacao: "somar", valor: 0.03 }, { alvo: "ataque", operacao: "percentual", valor: 0.04 }] }),
  // Reais, do Estábulo.
  especie({ id: "cao-de-caca", nome: "Cão de caça", descricao: "Leal, barulhento e sempre com fome.", tipo: "real", raridade: "comum", preco: 300, bonus: [{ alvo: "ataque", operacao: "percentual", valor: 0.04 }, { alvo: "defesa", operacao: "percentual", valor: 0.02 }] }),
  especie({ id: "mula", nome: "Mula", descricao: "Carrega o que você não aguenta e o que ela não quer.", tipo: "real", raridade: "comum", preco: 400, bonus: [{ alvo: "espacos-mochila", operacao: "somar", valor: 4 }, { alvo: "coleta.velocidade", operacao: "percentual", valor: 0.03 }] }),
  especie({ id: "gato-de-celeiro", nome: "Gato de celeiro", descricao: "Caça ratos, julga pessoas, acha coisas.", tipo: "real", raridade: "comum", preco: 250, bonus: [{ alvo: "chance-raro", operacao: "percentual", valor: 0.08 }] }),
  especie({ id: "coruja", nome: "Coruja", descricao: "Fica no ombro e no seu pé durante o estudo.", tipo: "real", raridade: "incomum", preco: 600, bonus: [{ alvo: "ganho-treino", operacao: "percentual", valor: 0.05 }, { alvo: "xp-maestria", operacao: "percentual", valor: 0.05 }] }),
  // Espirituais: as bestas vinculadas das origens especiais.
  especie({ id: "besta-do-estudo", nome: "Besta do Estudo", descricao: "Vinculada ainda bebê, num projeto que ninguém assume.", tipo: "espiritual", raridade: "epico", bonus: [{ alvo: "xp-personagem", operacao: "percentual", valor: 0.05 }, { alvo: "ataque", operacao: "percentual", valor: 0.04 }] }),
  especie({ id: "filhote-do-altar", nome: "Filhote do Altar", descricao: "Um dragão pequeno que eclodiu junto com você.", tipo: "espiritual", raridade: "epico", bonus: [{ alvo: "ataque", operacao: "percentual", valor: 0.07 }, { alvo: "vida", operacao: "percentual", valor: 0.05 }] }),
  especie({ id: "espirito-do-rio", nome: "Espírito do Rio", descricao: "Te devolveu ao mundo e nunca mais foi embora.", tipo: "espiritual", raridade: "epico", bonus: [{ alvo: "regeneracao", operacao: "percentual", valor: 0.2 }, { alvo: "coleta.rendimento", operacao: "percentual", valor: 0.05 }] }),
];

/** Laço de doma (Mercado e Estábulo) e as comidas que o pet aceita. */
export const LACO_DE_DOMA = "laco-de-doma";
export const ITENS_PETS: readonly Item[] = [
  { id: LACO_DE_DOMA, nome: "Laço de doma", categoria: "consumivel", raridade: "incomum", descricao: "Com ele na mochila, há chance de domar monstros domáveis ao vencê-los. Gasta-se ao domar.", preco: 40, pilha: 20 },
];
export const PRECO_LACO = 120;

/** Quanto cada comida enche a saciedade (ms). */
export const COMIDA_PET: Readonly<Record<string, number>> = {
  "racao-de-viagem": 3 * 3_600_000,
  "pao-de-trigo": 3_600_000,
  "ensopado-de-peixe": 4 * 3_600_000,
  "torta-de-abobora": 6 * 3_600_000,
  lambari: 1_800_000,
};

/** Cuidados do pet (GDD §6.6): atividades do personagem, no Estábulo de Pedravau. */
export type Cuidado = "alimentar" | "descansar" | "treinar";
export interface AtividadeCuidado {
  readonly tipo: "cuidado";
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly cuidado: Cuidado;
  readonly localId: string;
  readonly subareaId: string;
  readonly cicloBaseMs: number;
  readonly xpPorCiclo: number;
}

export const CUIDADOS: readonly AtividadeCuidado[] = [
  { tipo: "cuidado", id: "alimentar-pet", nome: "Alimentar o pet", descricao: "Uma porção de comida por ciclo. Ração rende mais.", cuidado: "alimentar", localId: "pedravau", subareaId: "estabulo", cicloBaseMs: 20_000, xpPorCiclo: 2 },
  { tipo: "cuidado", id: "descansar-pet", nome: "Descansar com o pet", descricao: "Recupera 30 min de Energia a cada 5 min.", cuidado: "descansar", localId: "pedravau", subareaId: "estabulo", cicloBaseMs: 5 * 60_000, xpPorCiclo: 2 },
  { tipo: "cuidado", id: "treinar-pet", nome: "Treinar o pet", descricao: "O pet ganha XP e nível (e gasta Energia).", cuidado: "treinar", localId: "pedravau", subareaId: "estabulo", cicloBaseMs: 60_000, xpPorCiclo: 3 },
];

export const CONFIG_CUIDADOS = Object.freeze({
  descansoPorCicloMs: 30 * 60_000,
  xpPetPorTreino: 5,
  energiaPorTreinoMs: 5 * 60_000,
});

/** Nível do pet → fator do bônus. */
export function fatorNivelPet(nivel: number): number {
  return 1 + CONFIG_PETS.bonusPorNivel * (nivel - 1);
}
