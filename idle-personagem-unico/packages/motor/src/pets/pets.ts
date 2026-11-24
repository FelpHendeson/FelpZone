/**
 * Pets no personagem (F10): estado, validação, bônus e gasto de Energia/Fome.
 * Os números estão em `dados/pets.ts`.
 */
import { CATALOGO } from "../dados";
import { CATEGORIAS_PET, CONFIG_PETS, ESPECIES_PET, fatorNivelPet, type CategoriaPet, type EspeciePet } from "../dados/pets";
import type { Modificador } from "../modificadores";
import type { Personagem } from "../personagem/conta";

export interface Pet {
  readonly id: string;
  readonly especieId: string;
  readonly nome: string;
  readonly nivel: number;
  readonly xp: number;
  /** Tempo de trabalho que ainda aguenta (ms). */
  readonly energiaMs: number;
  /** Tempo de trabalho até a fome (ms). Espirituais não sentem fome (fica no máximo). */
  readonly saciedadeMs: number;
  /** Espirituais: Sincronia para o modo União (ms de trabalho acumulado). */
  readonly sincroniaMs: number;
}

/** Slots: um por categoria de trabalho, mais o pet que recebe os cuidados. */
export type SlotPet = CategoriaPet | "cuidado";
export const SLOTS_PET: readonly SlotPet[] = [...CATEGORIAS_PET, "cuidado"];

export const ESPECIES = new Map<string, EspeciePet>(ESPECIES_PET.map((e) => [e.id, e]));
export const especieDe = (pet: Pick<Pet, "especieId">): EspeciePet => ESPECIES.get(pet.especieId)!;

export type CamposF10 = Pick<Personagem, "pets" | "petsPorSlot" | "petsCriados" | "uniaoRestanteMs">;

/** Pet novo (cheio de energia e saciado). */
export function novoPet(id: string, especieId: string, nome: string): Pet {
  return { id, especieId, nome, nivel: 1, xp: 0, energiaMs: CONFIG_PETS.energiaMaximaMs, saciedadeMs: CONFIG_PETS.saciedadeMaximaMs, sincroniaMs: 0 };
}

/** Campos iniciais da F10: quem nasce com besta vinculada já a tem, em todos os slots de trabalho. */
export function camposIniciaisF10(bestaVinculadaId?: string): CamposF10 {
  if (!bestaVinculadaId || !ESPECIES.has(bestaVinculadaId)) return { pets: [], petsPorSlot: {}, petsCriados: 0, uniaoRestanteMs: 0 };
  const besta = novoPet("pet-1", bestaVinculadaId, CATALOGO.bestas.get(bestaVinculadaId)?.nome ?? ESPECIES.get(bestaVinculadaId)!.nome);
  const slots: Partial<Record<SlotPet, string>> = {};
  for (const c of CATEGORIAS_PET) slots[c] = besta.id;
  return { pets: [besta], petsPorSlot: slots, petsCriados: 1, uniaoRestanteMs: 0 };
}

/** Categoria de trabalho da atividade atual (ou `null`: cuidados, viagem, Limiar, ocioso). */
export function categoriaAtual(p: Pick<Personagem, "atividade" | "viagem" | "limiar">): CategoriaPet | null {
  if (!p.atividade || p.viagem || p.limiar) return null;
  const a = CATALOGO.atividades.get(p.atividade.id);
  if (!a) return null;
  if (a.tipo === "treino" || a.tipo === "aprendizado") return "treino";
  if (a.tipo === "coleta" || a.tipo === "producao" || a.tipo === "combate") return a.tipo;
  return null;
}

/** O pet consegue trabalhar? (Energia, e Fome nos reais.) */
export function petUtil(pet: Pet): boolean {
  return pet.energiaMs > 0 && (especieDe(pet).tipo === "espiritual" || pet.saciedadeMs > 0);
}

type ComPets = Pick<Personagem, "atividade" | "viagem" | "limiar" | "pets" | "petsPorSlot">;

/** Pet que está trabalhando agora (atribuído à categoria da atividade e com forças). */
export function petTrabalhando(p: ComPets): Pet | null {
  const cat = categoriaAtual(p);
  if (!cat) return null;
  const id = p.petsPorSlot[cat];
  const pet = id ? p.pets.find((x) => x.id === id) : undefined;
  return pet && petUtil(pet) ? pet : null;
}

/** Bônus de um pet (sem a União), com o nível ou o Espírito. */
export function bonusDoPet(pet: Pet, espirito: number, uniao = false): Modificador[] {
  const e = especieDe(pet);
  const f = e.tipo === "espiritual" ? 1 + CONFIG_PETS.espiritoPorPonto * Math.max(0, espirito - 10) : fatorNivelPet(pet.nivel);
  const m = uniao ? CONFIG_PETS.multiplicadorUniao : 1;
  return e.bonus.map((b) => ({ ...b, valor: b.valor * f * m, origem: { tipo: "titulo" as const, id: `pet-${pet.especieId}` } }));
}

/** Modificadores do pet que está trabalhando (vazio se nenhum). */
export function modificadoresDePets(p: Partial<Pick<Personagem, "atividade" | "viagem" | "limiar" | "pets" | "petsPorSlot" | "uniaoRestanteMs" | "status">>): Modificador[] {
  if (!p.pets || !p.petsPorSlot || p.atividade === undefined) return [];
  const pet = petTrabalhando({ atividade: p.atividade, viagem: p.viagem ?? null, limiar: p.limiar ?? null, pets: p.pets, petsPorSlot: p.petsPorSlot });
  if (!pet) return [];
  const uniao = especieDe(pet).tipo === "espiritual" && (p.uniaoRestanteMs ?? 0) > 0;
  return bonusDoPet(pet, p.status?.espirito ?? 0, uniao);
}

/**
 * Até quando os bônus ficam iguais: o menor entre a Energia/Fome do pet que
 * trabalha e o tempo de União. `Infinity` se nada acaba.
 */
export function limiteDoTrecho(p: Personagem): number {
  let lim = Number.POSITIVE_INFINITY;
  const pet = petTrabalhando(p);
  if (pet) {
    lim = Math.min(lim, pet.energiaMs);
    if (especieDe(pet).tipo === "real") lim = Math.min(lim, pet.saciedadeMs);
  }
  if (p.uniaoRestanteMs > 0) lim = Math.min(lim, p.uniaoRestanteMs);
  return lim;
}

/** Depois de um trecho: o pet que trabalhou gasta `trabalhoMs`; a União corre `ms`. */
export function gastarPet(p: Personagem, petId: string | null, trabalhoMs: number, ms: number): Personagem {
  let pets = p.pets;
  if (petId && trabalhoMs > 0) {
    pets = pets.map((x) => {
      if (x.id !== petId) return x;
      const espiritual = especieDe(x).tipo === "espiritual";
      return {
        ...x,
        energiaMs: Math.max(0, x.energiaMs - trabalhoMs),
        saciedadeMs: espiritual ? x.saciedadeMs : Math.max(0, x.saciedadeMs - trabalhoMs),
        sincroniaMs: espiritual ? Math.min(CONFIG_PETS.sincroniaMaximaMs, x.sincroniaMs + trabalhoMs) : 0,
      };
    });
  }
  const uniao = Math.max(0, p.uniaoRestanteMs - ms);
  return pets === p.pets && uniao === p.uniaoRestanteMs ? p : { ...p, pets, uniaoRestanteMs: uniao };
}

/** XP do pet para subir do nível. */
export function xpParaProximoNivelPet(nivel: number): number {
  return nivel >= CONFIG_PETS.nivelMaximo ? 0 : CONFIG_PETS.xpPorNivel * nivel;
}

// ---------------------------------------------------------------- validação

const ehObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const inteiro = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;

/** Valida os campos de pets (F10); `null` se algo estiver inválido. */
export function validarCamposF10(v: Record<string, unknown>, bestaVinculadaId: string | undefined): CamposF10 | null {
  const { pets, petsPorSlot, petsCriados, uniaoRestanteMs } = v;
  if (!Array.isArray(pets) || pets.length > CONFIG_PETS.maximo + 1) return null;
  if (!inteiro(petsCriados, 0, 1_000_000)) return null;
  const lista: Pet[] = [];
  let espirituais = 0;
  for (const x of pets) {
    if (!ehObj(x)) return null;
    const { id, especieId, nome, nivel, xp, energiaMs, saciedadeMs, sincroniaMs } = x;
    if (typeof id !== "string" || !/^pet-\d{1,7}$/.test(id) || Number(id.slice(4)) > petsCriados) return null;
    const e = typeof especieId === "string" ? ESPECIES.get(especieId) : undefined;
    if (!e) return null;
    if (e.tipo === "espiritual") {
      espirituais++;
      if (especieId !== bestaVinculadaId) return null;
    }
    if (typeof nome !== "string" || nome.trim().length === 0 || nome.length > 24 || nome !== nome.trim()) return null;
    if (!inteiro(nivel, 1, CONFIG_PETS.nivelMaximo)) return null;
    const lim = xpParaProximoNivelPet(nivel);
    if (!inteiro(xp, 0, Math.max(0, lim - 1))) return null;
    if (!inteiro(energiaMs, 0, CONFIG_PETS.energiaMaximaMs) || !inteiro(saciedadeMs, 0, CONFIG_PETS.saciedadeMaximaMs)) return null;
    if (!inteiro(sincroniaMs, 0, CONFIG_PETS.sincroniaMaximaMs) || (e.tipo === "real" && sincroniaMs !== 0)) return null;
    lista.push({ id, especieId: e.id, nome, nivel, xp, energiaMs, saciedadeMs, sincroniaMs });
  }
  if (espirituais > 1 || lista.length - espirituais > CONFIG_PETS.maximo) return null;
  if (new Set(lista.map((x) => x.id)).size !== lista.length) return null;
  if (!ehObj(petsPorSlot)) return null;
  const slots: Partial<Record<SlotPet, string>> = {};
  for (const [s, id] of Object.entries(petsPorSlot)) {
    if (!(SLOTS_PET as readonly string[]).includes(s) || typeof id !== "string" || !lista.some((x) => x.id === id)) return null;
    slots[s as SlotPet] = id;
  }
  if (!inteiro(uniaoRestanteMs, 0, CONFIG_PETS.uniaoMaximaMs)) return null;
  return { pets: lista, petsPorSlot: slots, petsCriados, uniaoRestanteMs };
}
