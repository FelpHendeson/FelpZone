/**
 * Cofre da Conta (GDD §4.1, F9) [Proposta]: o que é da conta e não do
 * personagem. Conquistas (sem poder), Pergaminhos do Novo Destino e o Álbum
 * de Descobertas. Tudo é derivado do estado dos personagens por
 * `atualizarCofre`, que é pura e idempotente.
 */
import { CATALOGO, NOMEADOS, RELIQUIAS } from "../dados";
import type { Personagem } from "./conta";

export interface Descobertas {
  readonly racas: readonly string[];
  readonly cores: readonly string[];
  readonly origens: readonly string[];
  readonly monstros: readonly string[];
}

export interface Cofre {
  /** Pergaminhos do Novo Destino guardados (criam o 2º e o 3º personagem). */
  readonly pergaminhos: number;
  /** Conquistas obtidas (ids, em ordem). Sem instante: assim dividir o tempo não muda o resultado. */
  readonly conquistas: readonly string[];
  /** Marcos que já deram pergaminho (`<personagem>:<marco>`), para não dar duas vezes. */
  readonly marcos: readonly string[];
  readonly descobertas: Descobertas;
}

export const COFRE_VAZIO: Cofre = Object.freeze({
  pergaminhos: 0,
  conquistas: Object.freeze([]),
  marcos: Object.freeze([]),
  descobertas: Object.freeze({ racas: [], cores: [], origens: [], monstros: [] }),
});

/** Ranks da guilda que dão um Pergaminho do Novo Destino (C e A) [Calibrar]. */
export const RANKS_COM_PERGAMINHO: readonly number[] = [3, 5];
export const MAX_PERGAMINHOS = 9;

const NOMEADOS_IDS = new Set([...NOMEADOS, ...RELIQUIAS].map((i) => i.id));
const possui = (p: Personagem, id: string) => (p.mochila[id] ?? 0) > 0 || Object.values(p.equipados).includes(id);

export interface Conquista {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly obtida: (personagens: readonly Personagem[]) => boolean;
}

/** Conquistas da conta [Proposta]: marcos, sem bônus de poder. */
export const CONQUISTAS: readonly Conquista[] = [
  { id: "primeiros-passos", nome: "Primeiros passos", descricao: "Um personagem chegou ao nível 5.", obtida: (ps) => ps.some((p) => p.nivel >= 5) },
  { id: "veterano", nome: "Veterano", descricao: "Um personagem chegou ao nível 25.", obtida: (ps) => ps.some((p) => p.nivel >= 25) },
  { id: "lenda-viva", nome: "Lenda viva", descricao: "Um personagem chegou ao nível 50.", obtida: (ps) => ps.some((p) => p.nivel >= 50) },
  // Condições só sobre o que nunca diminui (nível, mortes, rank, bestiário), para dividir o tempo não mudar nada.
  { id: "primeira-travessia", nome: "Primeira travessia", descricao: "Um personagem atravessou para o Limiar.", obtida: (ps) => ps.some((p) => p.mortes > 0) },
  { id: "rank-c", nome: "Nome no quadro", descricao: "Um personagem chegou ao rank C da guilda.", obtida: (ps) => ps.some((p) => p.guilda.rank >= 3) },
  { id: "rank-s", nome: "Rank S", descricao: "Um personagem chegou ao rank S da guilda.", obtida: (ps) => ps.some((p) => p.guilda.rank >= 6) },
  { id: "cacador", nome: "Caçador", descricao: "Um personagem enfrentou 15 tipos de monstro.", obtida: (ps) => ps.some((p) => Object.keys(p.bestiario).length >= 15) },
  { id: "mao-de-ferreiro", nome: "Mão de ferreiro", descricao: "Um item chegou a +3 pela fusão.", obtida: (ps) => ps.some((p) => [...Object.keys(p.mochila), ...Object.values(p.equipados)].some((id) => !!id && id.endsWith("+3"))) },
  { id: "unico", nome: "Único", descricao: "Um personagem tem um item nomeado.", obtida: (ps) => ps.some((p) => [...NOMEADOS_IDS].some((id) => possui(p, id))) },
  { id: "tres-existencias", nome: "Três existências", descricao: "A conta tem 3 personagens.", obtida: (ps) => ps.length >= 3 },
];

const juntar = (atual: readonly string[], novos: Iterable<string>): readonly string[] => {
  const s = new Set(atual);
  let mudou = false;
  for (const x of novos) {
    if (!s.has(x)) {
      s.add(x);
      mudou = true;
    }
  }
  return mudou ? [...s].sort() : atual;
};

/** Atualiza conquistas, descobertas e pergaminhos a partir dos personagens. Pura e idempotente. */
export function atualizarCofre(cofre: Cofre, personagens: readonly Personagem[]): Cofre {
  const conquistas = juntar(
    cofre.conquistas,
    CONQUISTAS.filter((c) => !cofre.conquistas.includes(c.id) && c.obtida(personagens)).map((c) => c.id),
  );
  let marcos = cofre.marcos;
  let pergaminhos = cofre.pergaminhos;
  for (const p of personagens) {
    for (const r of RANKS_COM_PERGAMINHO) {
      const marco = `${p.id}:rank-${r}`;
      if (p.guilda.rank >= r && !marcos.includes(marco)) {
        marcos = [...marcos, marco];
        pergaminhos = Math.min(MAX_PERGAMINHOS, pergaminhos + 1);
      }
    }
  }
  const d = cofre.descobertas;
  const descobertas: Descobertas = {
    racas: juntar(d.racas, personagens.map((p) => p.racaId)),
    cores: juntar(d.cores, personagens.map((p) => p.coreId)),
    origens: juntar(d.origens, personagens.map((p) => p.origem.id)),
    monstros: juntar(d.monstros, personagens.flatMap((p) => Object.keys(p.bestiario))),
  };
  const igual =
    conquistas === cofre.conquistas && marcos === cofre.marcos && descobertas.racas === d.racas && descobertas.cores === d.cores && descobertas.origens === d.origens && descobertas.monstros === d.monstros;
  return igual ? cofre : { pergaminhos, conquistas, marcos, descobertas };
}

function listaDe(v: unknown, existe: (id: string) => boolean, max: number): string[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const r: string[] = [];
  for (const x of v) {
    if (typeof x !== "string" || !existe(x)) return null;
    r.push(x);
  }
  return new Set(r).size === r.length ? r : null;
}

/** Valida o cofre vindo do save; `null` se algo estiver inválido. */
export function validarCofre(v: unknown): Cofre | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const { pergaminhos, conquistas, marcos, descobertas } = v as Record<string, unknown>;
  if (typeof pergaminhos !== "number" || !Number.isSafeInteger(pergaminhos) || pergaminhos < 0 || pergaminhos > MAX_PERGAMINHOS) return null;
  const ids = new Set(CONQUISTAS.map((c) => c.id));
  const cq = listaDe(conquistas, (id) => ids.has(id), CONQUISTAS.length);
  if (!cq) return null;
  const marcosOk = listaDe(marcos, (m) => /^[a-z0-9-]{1,40}:rank-\d$/.test(m), 3 * RANKS_COM_PERGAMINHO.length * 10);
  if (!marcosOk) return null;
  if (typeof descobertas !== "object" || descobertas === null) return null;
  const dd = descobertas as Record<string, unknown>;
  const racas = listaDe(dd.racas, (id) => CATALOGO.racas.has(id), 100);
  const cores = listaDe(dd.cores, (id) => CATALOGO.cores.has(id), 100);
  const origens = listaDe(dd.origens, (id) => CATALOGO.origensEspeciais.has(id) || CATALOGO.bercos.has(id), 200);
  const monstros = listaDe(dd.monstros, (id) => /^[a-z0-9-]{1,60}$/.test(id), 500);
  if (!racas || !cores || !origens || !monstros) return null;
  return { pergaminhos, conquistas: cq, marcos: marcosOk, descobertas: { racas, cores, origens, monstros } };
}
