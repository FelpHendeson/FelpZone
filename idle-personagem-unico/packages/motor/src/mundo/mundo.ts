/**
 * Mundo vivo (F11): relógio do mundo, clima, eventos e Crônica.
 * Tudo é função do instante (o mundo é o mesmo para todos) ou de contadores
 * que só crescem, para que dividir o tempo não mude o resultado.
 */
import { CATALOGO } from "../dados";
import {
  BONUS_TITULOS,
  CLIMAS,
  CONFIG_MUNDO,
  EFEITOS_CLIMA,
  EFEITOS_NOITE,
  EVENTOS,
  MARCOS_CRONICA,
  PESO_CLIMA,
  type Clima,
} from "../dados/mundo";
import { CONFIG_LIMIAR } from "../dados/limiar";
import type { Modificador } from "../modificadores";
import type { Personagem } from "../personagem/conta";
import { Rng } from "../rng";

export interface EstadoMundo {
  readonly noite: boolean;
  readonly clima: Clima;
}

export interface EventoPendente {
  /** Número do evento (sequencial por personagem). */
  readonly n: number;
  readonly eventoId: string;
}

export interface EstadoEventos {
  readonly pendentes: readonly EventoPendente[];
  /** Trabalho acumulado desde o último sorteio de evento (ms). */
  readonly trabalhoMs: number;
  /** Sorteios já feitos (com ou sem evento). */
  readonly sorteios: number;
}

export interface RegistroCronica {
  readonly instante: number;
  readonly texto: string;
}

export interface Cronica {
  /** Marcos atingidos (ids, na ordem de `MARCOS_CRONICA`). */
  readonly marcos: readonly string[];
  /** Escolhas e capítulos (com instante), os mais recentes por último. */
  readonly registros: readonly RegistroCronica[];
}

export type CamposF11 = Pick<Personagem, "mundo" | "eventos" | "cronica">;

/** Hora do relógio do mundo (0 a 23). */
export function horaDoJogo(instante: number): number {
  const d = CONFIG_MUNDO.diaMs;
  return Math.floor((((instante % d) + d) % d) / (d / 24));
}

export function ehNoite(instante: number): boolean {
  const h = horaDoJogo(instante);
  return h >= CONFIG_MUNDO.noiteInicio || h < CONFIG_MUNDO.noiteFim;
}

/** Clima do bloco que contém o instante (mesmo para todos os jogadores). */
export function climaEm(instante: number): Clima {
  const bloco = Math.floor(instante / CONFIG_MUNDO.climaBlocoMs);
  const rng = Rng.daSemente(`clima:${bloco}`);
  return rng.escolhaPonderada(CLIMAS.map((c) => ({ valor: c, peso: PESO_CLIMA[c] })));
}

export function estadoDoMundo(instante: number): EstadoMundo {
  return { noite: ehNoite(instante), clima: climaEm(instante) };
}

/** Quanto falta (ms, ≥ 1) para o dia virar noite (ou o contrário) ou o clima mudar. */
export function proximaMudanca(instante: number): number {
  const horaMs = CONFIG_MUNDO.diaMs / 24;
  const noite = ehNoite(instante);
  // Próxima hora de virada: anda de hora em hora (no máximo 24).
  let t = Math.floor(instante / horaMs) * horaMs + horaMs;
  for (let i = 0; i < 25 && ehNoite(t) === noite; i++) t += horaMs;
  const bloco = (Math.floor(instante / CONFIG_MUNDO.climaBlocoMs) + 1) * CONFIG_MUNDO.climaBlocoMs;
  return Math.max(1, Math.min(t, bloco) - instante);
}

const mods = (lista: readonly Omit<Modificador, "origem">[], id: string): Modificador[] => lista.map((m) => ({ ...m, origem: { tipo: "titulo" as const, id } }));

/** Efeitos do mundo (noite, dia e clima) para um personagem. */
export function modificadoresDoMundo(p: { readonly racaId: string; readonly coreId?: string; readonly mundo?: EstadoMundo }): Modificador[] {
  if (!p.mundo) return [];
  const tags = new Set<string>([...(CATALOGO.racas.get(p.racaId)?.tags ?? []), ...(p.coreId ? (CATALOGO.cores.get(p.coreId)?.tags ?? []) : [])]);
  const lista: Modificador[] = mods(EFEITOS_CLIMA[p.mundo.clima], `clima-${p.mundo.clima}`);
  if (p.mundo.noite) {
    lista.push(...mods(EFEITOS_NOITE.todos, "noite"));
    if (EFEITOS_NOITE.tagsNoturnas.some((t) => tags.has(t))) lista.push(...mods(EFEITOS_NOITE.noturnos, "noite-forte"));
  } else if (EFEITOS_NOITE.tagsDiurnas.some((t) => tags.has(t))) {
    lista.push(...mods(EFEITOS_NOITE.diurnos, "dia-forte"));
  }
  return lista;
}

/** Bônus dos títulos por mortes (F11). */
export function modificadoresDeTitulos(mortes: number): Modificador[] {
  const lista: Modificador[] = [];
  for (const t of CONFIG_LIMIAR.titulos) if (mortes >= t.mortes) lista.push(...mods(BONUS_TITULOS[t.id] ?? [], t.id));
  return lista;
}

/** Campos iniciais da F11 (sem instante: dia de céu limpo, sem efeitos). */
export function camposIniciaisF11(instante?: number): CamposF11 {
  return { mundo: instante === undefined ? { noite: false, clima: "limpo" } : estadoDoMundo(instante), eventos: { pendentes: [], trabalhoMs: 0, sorteios: 0 }, cronica: { marcos: [], registros: [] } };
}

/**
 * Soma trabalho e sorteia eventos a cada hora trabalhada. O sorteio usa uma
 * semente própria (personagem + número do sorteio), separada do RNG das
 * atividades: o resultado não depende de como o tempo foi dividido.
 */
export function acumularEventos(p: Personagem, trabalhoMs: number): Personagem {
  if (trabalhoMs <= 0) return p;
  let { trabalhoMs: acc, sorteios, pendentes } = p.eventos;
  acc += trabalhoMs;
  while (acc >= CONFIG_MUNDO.eventoACadaMs) {
    acc -= CONFIG_MUNDO.eventoACadaMs;
    sorteios++;
    const rng = Rng.daSemente(`evento:${p.id}:${p.criadoEm}:${sorteios}`);
    if (rng.flutuante() < CONFIG_MUNDO.chanceEvento && pendentes.length < CONFIG_MUNDO.eventosPendentesMax) {
      const e = rng.escolhaPonderada(EVENTOS.map((x) => ({ valor: x.id, peso: x.peso })));
      pendentes = [...pendentes, { n: sorteios, eventoId: e }];
    }
  }
  return { ...p, eventos: { pendentes, trabalhoMs: acc, sorteios } };
}

const CHEFES_DE_AREA = new Set([...CATALOGO.monstros.values()].filter((m) => m.tipo === "chefe").map((m) => m.id));

/** Marcos da Crônica a partir do estado (só olham o que nunca diminui). */
export function marcosAtingidos(p: Personagem): string[] {
  const ok: Record<string, boolean> = {
    "nivel-10": p.nivel >= 10,
    "nivel-20": p.nivel >= 20,
    "nivel-30": p.nivel >= 30,
    "nivel-40": p.nivel >= 40,
    "nivel-50": p.nivel >= 50,
    "primeira-morte": p.mortes >= 1,
    "dez-mortes": p.mortes >= 10,
    "primeiro-chefe": Object.keys(p.bestiario).some((id) => CHEFES_DE_AREA.has(id)),
    "primeiro-pet": p.petsCriados > 0,
    "rank-c": p.guilda.rank >= 3,
    "rank-s": p.guilda.rank >= 6,
  };
  return MARCOS_CRONICA.filter((m) => ok[m.id]).map((m) => m.id);
}

/** Atualiza os marcos da Crônica (idempotente; mantém a ordem canônica). */
export function atualizarCronica(p: Personagem): Personagem {
  const novos = marcosAtingidos(p);
  const atuais = new Set(p.cronica.marcos);
  for (const m of novos) atuais.add(m);
  if (atuais.size === p.cronica.marcos.length) return p;
  const marcos = MARCOS_CRONICA.filter((m) => atuais.has(m.id)).map((m) => m.id);
  return { ...p, cronica: { ...p.cronica, marcos } };
}

export function registrarNaCronica(p: Personagem, instante: number, texto: string): Personagem {
  const registros = [...p.cronica.registros, { instante, texto }].slice(-CONFIG_MUNDO.registrosCronicaMax);
  return { ...p, cronica: { ...p.cronica, registros } };
}

// ---------------------------------------------------------------- validação

const ehObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const inteiro = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;

export function validarCamposF11(v: Record<string, unknown>): CamposF11 | null {
  const { mundo, eventos, cronica } = v;
  if (!ehObj(mundo) || typeof mundo.noite !== "boolean" || !(CLIMAS as readonly unknown[]).includes(mundo.clima)) return null;
  if (!ehObj(eventos) || !Array.isArray(eventos.pendentes) || eventos.pendentes.length > CONFIG_MUNDO.eventosPendentesMax) return null;
  if (!inteiro(eventos.trabalhoMs, 0, CONFIG_MUNDO.eventoACadaMs - 1) || !inteiro(eventos.sorteios, 0, 10_000_000)) return null;
  const pendentes: EventoPendente[] = [];
  for (const e of eventos.pendentes) {
    if (!ehObj(e) || !inteiro(e.n, 1, eventos.sorteios) || typeof e.eventoId !== "string" || !EVENTOS.some((x) => x.id === e.eventoId)) return null;
    pendentes.push({ n: e.n, eventoId: e.eventoId });
  }
  if (new Set(pendentes.map((x) => x.n)).size !== pendentes.length) return null;
  if (!ehObj(cronica) || !Array.isArray(cronica.marcos) || !Array.isArray(cronica.registros)) return null;
  const validos = MARCOS_CRONICA.map((m) => m.id);
  const marcos = cronica.marcos.filter((m): m is string => typeof m === "string");
  if (marcos.length !== cronica.marcos.length || new Set(marcos).size !== marcos.length || marcos.some((m) => !validos.includes(m))) return null;
  if (marcos.join() !== validos.filter((m) => marcos.includes(m)).join()) return null;
  if (cronica.registros.length > CONFIG_MUNDO.registrosCronicaMax) return null;
  const registros: RegistroCronica[] = [];
  for (const r of cronica.registros) {
    if (!ehObj(r) || !inteiro(r.instante, 0, Number.MAX_SAFE_INTEGER) || typeof r.texto !== "string" || r.texto.length === 0 || r.texto.length > 300) return null;
    registros.push({ instante: r.instante, texto: r.texto });
  }
  return { mundo: { noite: mundo.noite, clima: mundo.clima as Clima }, eventos: { pendentes, trabalhoMs: eventos.trabalhoMs, sorteios: eventos.sorteios }, cronica: { marcos, registros } };
}
