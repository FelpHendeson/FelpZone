/**
 * Mundo vivo (GDD §8.3 e §14, F11) [Proposta; números Calibrar em `docs/CALIBRACAO.md`].
 * Relógio do mundo (dia e noite), clima, eventos com escolhas, marcos da
 * Crônica, bônus dos títulos e marcos do Bestiário.
 */
import type { Modificador } from "../modificadores";

export const CONFIG_MUNDO = Object.freeze({
  /** 1 h real = 1 dia do jogo. */
  diaMs: 3_600_000,
  /** Noite das 19h às 5h (do relógio do jogo). */
  noiteInicio: 19,
  noiteFim: 5,
  /** O clima muda a cada 2 h reais (o Vale de Pedravau é uma região só no Ato I). */
  climaBlocoMs: 2 * 3_600_000,
  /** Eventos: um sorteio a cada hora de trabalho; até 3 esperando resposta. */
  eventoACadaMs: 3_600_000,
  chanceEvento: 0.35,
  eventosPendentesMax: 3,
  registrosCronicaMax: 60,
});

export const CLIMAS = ["limpo", "nublado", "chuva", "neblina"] as const;
export type Clima = (typeof CLIMAS)[number];
export const NOME_CLIMA: Readonly<Record<Clima, string>> = { limpo: "Céu limpo", nublado: "Nublado", chuva: "Chuva", neblina: "Neblina" };
/** Peso de cada clima no sorteio do bloco. */
export const PESO_CLIMA: Readonly<Record<Clima, number>> = { limpo: 4, nublado: 3, chuva: 2, neblina: 1 };

type ModBase = Omit<Modificador, "origem">;
const pct = (alvo: string, valor: number): ModBase => ({ alvo, operacao: "percentual", valor });

/** Efeitos do clima (GDD §8.3: ervas e peixes da chuva, viagem mais lenta, achados na neblina). */
export const EFEITOS_CLIMA: Readonly<Record<Clima, readonly ModBase[]>> = {
  limpo: [],
  nublado: [],
  chuva: [pct("oficio.agricultura.rendimento", 0.15), pct("oficio.pesca.rendimento", 0.15), pct("duracao-viagem", 0.1)],
  neblina: [pct("chance-raro", 0.15), { alvo: "esquiva", operacao: "somar", valor: 0.02 }],
};

/** Efeitos da noite: raças e cores da noite ficam mais fortes; monstros raros e achados aparecem mais. */
export const EFEITOS_NOITE = Object.freeze({
  /** Para quem tem tag de noite (raça ou core): Sangue-Pálido, Lobisomem (lua), Ser das Trevas. */
  tagsNoturnas: ["noite", "trevas", "lua"] as readonly string[],
  noturnos: [pct("ataque", 0.1), pct("defesa", 0.08)] as readonly ModBase[],
  /** Para quem é da luz (Alma da Luz), um pouco mais forte de dia. */
  tagsDiurnas: ["luz"] as readonly string[],
  diurnos: [pct("ataque", 0.05), pct("regeneracao", 0.1)] as readonly ModBase[],
  /** Para todos, à noite. */
  todos: [pct("combate.raro", 1), pct("oficio.pesca.raro", 0.3)] as readonly ModBase[],
});

// ---------------------------------------------------------------- eventos

export interface EscolhaEvento {
  readonly rotulo: string;
  /** Efeito, escalado pelo nível do personagem. */
  readonly efeito:
    | { readonly tipo: "nada" }
    | { readonly tipo: "xp"; readonly porNivel: number }
    | { readonly tipo: "ouro"; readonly porNivel: number }
    | { readonly tipo: "perderOuro"; readonly fracao: number }
    | { readonly tipo: "darComida"; readonly xpPorNivel: number }
    | { readonly tipo: "lutar"; readonly perdaVida: number; readonly ouroPorNivel: number }
    | { readonly tipo: "comprar"; readonly itemId: string; readonly preco: number };
  readonly resultado: string;
}

export interface Evento {
  readonly id: string;
  readonly titulo: string;
  readonly texto: string;
  readonly peso: number;
  readonly escolhas: readonly [EscolhaEvento, EscolhaEvento];
}

export const EVENTOS: readonly Evento[] = [
  {
    id: "viajante-faminto",
    titulo: "Viajante faminto",
    texto: "Um viajante magro pede algo para comer. Diz que paga em histórias.",
    peso: 3,
    escolhas: [
      { rotulo: "Dar comida", efeito: { tipo: "darComida", xpPorNivel: 40 }, resultado: "Ele come em silêncio e depois conta uma história que você não vai esquecer." },
      { rotulo: "Seguir caminho", efeito: { tipo: "nada" }, resultado: "Você segue. Ele também." },
    ],
  },
  {
    id: "brilho-na-lama",
    titulo: "Brilho na lama",
    texto: "Algo brilha na lama, perto de onde você trabalha.",
    peso: 3,
    escolhas: [
      { rotulo: "Cavar", efeito: { tipo: "ouro", porNivel: 15 }, resultado: "Moedas antigas, de um reino que ninguém lembra." },
      { rotulo: "Deixar", efeito: { tipo: "nada" }, resultado: "Melhor não mexer no que a lama guardou." },
    ],
  },
  {
    id: "emboscada",
    titulo: "Emboscada",
    texto: "Três sujeitos bloqueiam a trilha e pedem pedágio.",
    peso: 2,
    escolhas: [
      { rotulo: "Lutar", efeito: { tipo: "lutar", perdaVida: 0.3, ouroPorNivel: 30 }, resultado: "Eles fogem. Um deixou a bolsa para trás." },
      { rotulo: "Pagar", efeito: { tipo: "perderOuro", fracao: 0.05 }, resultado: "Você paga. Eles agradecem com uma reverência irônica." },
    ],
  },
  {
    id: "andarilho-sabio",
    titulo: "Andarilho sábio",
    texto: "Um velho de bengala oferece um conselho, de graça. Diz ele.",
    peso: 2,
    escolhas: [
      { rotulo: "Ouvir", efeito: { tipo: "xp", porNivel: 60 }, resultado: "O conselho é bom. Irritantemente bom." },
      { rotulo: "Agradecer e seguir", efeito: { tipo: "nada" }, resultado: "Ele dá de ombros. Já ouviu isso antes." },
    ],
  },
  {
    id: "mercador-perdido",
    titulo: "Mercador perdido",
    texto: "Um mercador perdido quer voltar a Pedravau e oferece um laço de doma por bom preço.",
    peso: 1,
    escolhas: [
      { rotulo: "Comprar (60 g)", efeito: { tipo: "comprar", itemId: "laco-de-doma", preco: 60 }, resultado: "O laço é bom. O mercador, nem tanto." },
      { rotulo: "Recusar", efeito: { tipo: "nada" }, resultado: "Ele resmunga e segue na direção errada." },
    ],
  },
];

// ---------------------------------------------------------------- Crônica

export interface MarcoCronica {
  readonly id: string;
  readonly texto: string;
}

/** Marcos da Crônica, em ordem. Só olham o que nunca diminui. */
export const MARCOS_CRONICA: readonly MarcoCronica[] = [
  { id: "nivel-10", texto: "chegou ao nível 10. Já não é um iniciante." },
  { id: "nivel-20", texto: "chegou ao nível 20. Começaram a contar histórias sobre ele." },
  { id: "nivel-30", texto: "chegou ao nível 30. As histórias exageram pouco." },
  { id: "nivel-40", texto: "chegou ao nível 40. As histórias exageram para menos." },
  { id: "nivel-50", texto: "chegou ao nível 50. Pedravau inteira sabe o nome." },
  { id: "primeira-morte", texto: "morreu pela primeira vez, atravessou para o Limiar e voltou." },
  { id: "dez-mortes", texto: "morreu dez vezes. O Barqueiro já sabe o nome." },
  { id: "primeiro-chefe", texto: "derrubou o primeiro chefe de área." },
  { id: "primeiro-pet", texto: "ganhou o primeiro companheiro de quatro patas (ou de nenhuma)." },
  { id: "rank-c", texto: "chegou ao rank C da Guilda de Aventureiros." },
  { id: "rank-s", texto: "chegou ao rank S. Os recrutas abrem caminho." },
];

/** Bônus dos títulos por mortes (F6 → F11) [Calibrar]. */
export const BONUS_TITULOS: Readonly<Record<string, readonly ModBase[]>> = {
  "visitante-frequente": [pct("duracao-limiar", -0.05)],
  "o-que-voltou": [pct("defesa", 0.03), pct("duracao-limiar", -0.05)],
  "sem-medo-da-morte": [pct("ataque", 0.05)],
};

/** Bestiário: marcos de abates por espécie dão dano extra contra ela (GDD §7). */
export const MARCOS_BESTIARIO: readonly { readonly abates: number; readonly bonus: number }[] = [
  { abates: 100, bonus: 0.05 },
  { abates: 1_000, bonus: 0.1 },
  { abates: 5_000, bonus: 0.15 },
];

/** Bônus de dano contra uma espécie com `abates` no bestiário. */
export function bonusBestiario(abates: number): number {
  let b = 0;
  for (const m of MARCOS_BESTIARIO) if (abates >= m.abates) b = m.bonus;
  return b;
}
