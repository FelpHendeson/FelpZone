/**
 * O Limiar (GDD §10) [Autor: ideia; detalhes: Proposta]: o reino entre a vida
 * e a morte. Monstros acompanham o nível do personagem; o set nomeado
 * O Retornado só cai aqui. Números [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
import type { Item } from "./coleta";
import { criarMonstro, type Monstro, type PerfilMonstro } from "./combate";

export const CONFIG_LIMIAR = Object.freeze({
  /** Duração base da estadia. */
  duracaoBaseMs: 10 * 60_000,
  /** + por nível recomendado da área em que morreu (perigo da área). */
  duracaoPorNivelDaAreaMs: 20_000,
  /** Cada carga do Eco da Morte alonga a estadia e melhora os drops. */
  ecoDuracaoPorCarga: 0.25,
  ecoDropsPorCarga: 0.25,
  ecoMaximo: 5,
  /** Uma morte conta para o Eco durante esta janela. */
  janelaEcoMs: 2 * 60 * 60_000,
  /** Devedor do Barqueiro: o Eco decai mais rápido. */
  janelaEcoDevedorMs: 60 * 60_000,
  /** No Limiar o personagem luta enfraquecido. */
  fatorAtributos: 0.75,
  /** Vida a zero no Limiar não é uma segunda morte: ele se recompõe. */
  recomporMs: 3_000,
  /** Chance de um chefe raro aparecer em cada busca (× 1 + 0,5 por carga). */
  chanceChefe: 0.005,
  /** Pedágio do Barqueiro: Essência por minuto restante (arredonda para cima). */
  essenciaPorMinuto: 3,
  /** Essência por abate (comum, raro, chefe), × Eco. */
  essencia: { comum: 1, raro: 3, chefe: 10 },
  /** Chance de uma peça de O Retornado ao vencer um chefe (se ainda faltar). */
  chancePecaRetornado: 0.2,
  /** Bônus do set: por morte acumulada, com teto. */
  retornadoBonusPorMorte: 0.01,
  retornadoBonusMaximo: 0.25,
  /** Títulos por mortes (só nome; bônus de títulos na F11). */
  titulos: [
    { id: "visitante-frequente", nome: "Visitante Frequente", mortes: 5 },
    { id: "o-que-voltou", nome: "O Que Voltou", mortes: 25 },
    { id: "sem-medo-da-morte", nome: "Sem Medo da Morte", mortes: 100 },
  ],
});

/** Sinergias (GDD §10): menos tempo e mais ataque no Limiar. */
export const SINERGIAS_LIMIAR: readonly { readonly tipo: "raca" | "core"; readonly id: string; readonly duracao: number; readonly ataque: number }[] = [
  { tipo: "raca", id: "sangue-palido", duracao: -0.2, ataque: 0.2 },
  { tipo: "core", id: "ser-das-trevas", duracao: -0.2, ataque: 0.2 },
];

// ---------------------------------------------------------------- Monstros do Limiar

interface Molde {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly perfil: PerfilMonstro;
}

const MOLDES: readonly Molde[] = [
  { id: "alma-penada", nome: "Alma Penada", descricao: "Ainda procura alguma coisa que perdeu. Talvez seja você.", perfil: "agil" },
  { id: "ceifeiro-menor", nome: "Ceifeiro Menor", descricao: "Estagiário da morte. Leva o trabalho a sério demais.", perfil: "tanque" },
  { id: "eco-faminto", nome: "Eco Faminto", descricao: "Repete o último grito de quem morreu aqui. Com fome.", perfil: "raro" },
  { id: "o-cobrador", nome: "O Cobrador", descricao: "Anota tudo. Inclusive o que você ainda não deve.", perfil: "chefe" },
  { id: "a-rainha-palida", nome: "A Rainha Pálida", descricao: "Governa os que não sabem que morreram.", perfil: "chefe" },
];

export const MATERIAL_LIMIAR = "cinza-de-alma";

/** Monstros do Limiar, nos moldes do nível 1 (para o catálogo e o bestiário). */
export const MONSTROS_LIMIAR: readonly Monstro[] = MOLDES.map((m) => criarMonstro(m.id, m.nome, m.descricao, 1, m.perfil, MATERIAL_LIMIAR));

/** O monstro do Limiar no nível em que o personagem entrou. */
export function monstroDoLimiar(id: string, nivel: number): Monstro {
  const m = MOLDES.find((x) => x.id === id);
  if (!m) throw new RangeError(`Monstro do Limiar desconhecido: ${id}`);
  const base = criarMonstro(m.id, m.nome, m.descricao, Math.max(1, nivel), m.perfil, MATERIAL_LIMIAR);
  // Sem livros nem equipamentos comuns: o Limiar tem drops próprios.
  return { ...base, chanceEquipamento: 0, chanceLivro: 0, drops: [{ itemId: MATERIAL_LIMIAR, chance: base.tipo === "comum" ? 0.5 : 1, quantidade: base.drops[0]!.quantidade }] };
}

export const COMUNS_LIMIAR = [
  { monstroId: "alma-penada", peso: 47.5 },
  { monstroId: "ceifeiro-menor", peso: 47.5 },
  { monstroId: "eco-faminto", peso: 5 },
] as const;
export const CHEFES_LIMIAR = ["o-cobrador", "a-rainha-palida"] as const;

// ---------------------------------------------------------------- Itens

export const ITENS_LIMIAR: readonly Item[] = [
  { id: MATERIAL_LIMIAR, nome: "Cinza de alma", categoria: "material", raridade: "incomum", descricao: "Leve demais para ser só cinza.", preco: 20, pilha: 100 },
];

function peca(id: string, nome: string, descricao: string, slot: "elmo" | "peitoral" | "calcas" | "botas", defesa: number, vida: number): Item {
  const origem = { tipo: "equipamento" as const, id };
  return {
    id,
    nome,
    categoria: "equipamento",
    raridade: "epico",
    descricao,
    preco: 0,
    pilha: 1,
    equipamento: {
      slot,
      tier: 3,
      precoCompra: null,
      modificadores: [
        { alvo: "defesa", operacao: "somar", valor: defesa, origem },
        ...(vida > 0 ? [{ alvo: "vida", operacao: "somar" as const, valor: vida, origem }] : []),
      ],
      nomeado: { conjunto: "o-retornado" },
    },
  };
}

/** O Retornado: quatro peças nomeadas, só no Limiar; o Cobrador deixa as de cima, a Rainha as de baixo. */
export const PECAS_RETORNADO: readonly Item[] = [
  peca("capuz-do-retornado", "Capuz do Retornado", "Cheira a terra recém-mexida.", "elmo", 5, 60),
  peca("mortalha-do-retornado", "Mortalha do Retornado", "Costurada com a linha que segurava o caixão.", "peitoral", 15, 0),
  peca("ceroulas-do-retornado", "Ceroulas do Retornado", "Ninguém pergunta. Ninguém conta.", "calcas", 10, 0),
  peca("passos-do-retornado", "Passos do Retornado", "Deixam pegadas que voltam.", "botas", 5, 40),
];

export const PECAS_POR_CHEFE: Readonly<Record<string, readonly string[]>> = {
  "o-cobrador": ["capuz-do-retornado", "mortalha-do-retornado"],
  "a-rainha-palida": ["ceroulas-do-retornado", "passos-do-retornado"],
};

/** Falas do Barqueiro (sabor; GDD §10: "dá lore e uma escolha"). */
export const FALAS_BARQUEIRO: readonly string[] = [
  "Ninguém atravessa de graça. Nem você, nem eu.",
  "Pode esperar. Eu tenho todo o tempo do mundo. Você não.",
  "Essência por minuto. Os mortos também têm contas.",
];
