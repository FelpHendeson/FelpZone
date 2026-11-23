/**
 * Conta (save v2): até 3 personagens independentes, o ativo e o sorteio em
 * andamento. Inclui a validação de dados vindos do save (entrada não confiável).
 */
import { CATALOGO } from "../dados";
import { ehEstadoRng, type EstadoRng } from "../rng";
import { reproduzirTentativa, type ResultadoTentativa } from "../sorteio/cascata";
import { CONFIG_SORTEIO } from "../sorteio/config";
import { validarNome } from "./nome";

export const MAX_PERSONAGENS = 3;
export const TAMANHO_MAXIMO_LORE = 1000;

export type OrigemPersonagem =
  | {
      readonly tipo: "comum";
      /** Id do berço. */
      readonly id: string;
      readonly motivacaoId: string;
      readonly marcaId?: string;
      readonly anosDeEstrada: number;
      readonly loreGerada: string;
    }
  | { readonly tipo: "especial"; readonly id: string; readonly loreGerada: string };

export interface Aparencia {
  readonly corCabelo: string;
  readonly corRoupa: string;
}

/** Ficha inicial (F1). Status, atividades e inventário chegam da F2 em diante. */
export interface Personagem {
  readonly id: string;
  readonly nome: string;
  readonly nivel: number;
  readonly xp: number;
  readonly racaId: string;
  readonly coreId: string;
  readonly dons: readonly string[];
  readonly origem: OrigemPersonagem;
  readonly bestaVinculadaId?: string;
  readonly marcaAnomaliaId?: string;
  readonly tracoPersonalidadeId: string;
  readonly aparencia: Aparencia;
  readonly criadoEm: number;
}

/** Uma tentativa do sorteio: o estado do RNG no início basta para reproduzi-la. */
export interface RegistroTentativa {
  readonly rngInicio: EstadoRng;
  /** Resumo (raça/core/dom/origem), conferido contra a reprodução ao carregar. */
  readonly resumo: string;
}

export interface EstadoSorteio {
  readonly maxTentativas: number;
  /** Uma entrada por tentativa já feita; a última é a atual. */
  readonly historico: readonly RegistroTentativa[];
  /** Depois de aceitar, falta só escolher nome e aparência. */
  readonly aceito: boolean;
}

export interface Conta {
  readonly personagens: readonly Personagem[];
  readonly personagemAtivoId: string | null;
  readonly sorteio: EstadoSorteio | null;
}

export const CONTA_VAZIA: Conta = Object.freeze({ personagens: Object.freeze([]), personagemAtivoId: null, sorteio: null });

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function ehTexto(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function ehInteiro(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
}

/** Resumo curto de uma tentativa, para conferir a reprodução. */
export function resumoTentativa(r: ResultadoTentativa): string {
  const origem = r.origem.tipo === "especial" ? r.origem.id : `comum:${r.origem.bercoId}`;
  return `${r.racaId}/${r.coreId}/${r.domId}/${origem}`;
}

function validarSorteio(v: unknown): EstadoSorteio | null {
  if (!ehObjeto(v)) return null;
  const { maxTentativas, historico, aceito } = v;
  if (!ehInteiro(maxTentativas, 1, 20) || typeof aceito !== "boolean") return null;
  if (!Array.isArray(historico) || historico.length < 1 || historico.length > maxTentativas) return null;
  const limpo: RegistroTentativa[] = [];
  for (const item of historico) {
    if (!ehObjeto(item) || !ehEstadoRng(item.rngInicio) || !ehTexto(item.resumo, 200)) return null;
    const rngInicio = { a: item.rngInicio.a, b: item.rngInicio.b, c: item.rngInicio.c, d: item.rngInicio.d };
    // A tentativa precisa ser reproduzível e bater com o que foi mostrado.
    if (resumoTentativa(reproduzirTentativa(rngInicio, CONFIG_SORTEIO)) !== item.resumo) return null;
    limpo.push({ rngInicio, resumo: item.resumo });
  }
  return { maxTentativas, historico: limpo, aceito };
}

function validarOrigem(v: unknown, racaId: string): OrigemPersonagem | null {
  if (!ehObjeto(v) || !ehTexto(v.loreGerada, TAMANHO_MAXIMO_LORE) || typeof v.id !== "string") return null;
  if (v.tipo === "especial") {
    const o = CATALOGO.origensEspeciais.get(v.id);
    if (!o || (o.racasPermitidas.length > 0 && !o.racasPermitidas.includes(racaId))) return null;
    return { tipo: "especial", id: v.id, loreGerada: v.loreGerada };
  }
  if (v.tipo !== "comum") return null;
  if (!CATALOGO.bercos.has(v.id) || typeof v.motivacaoId !== "string" || !CATALOGO.motivacoes.has(v.motivacaoId)) return null;
  if (!ehInteiro(v.anosDeEstrada, CONFIG_SORTEIO.anosDeEstrada.min, CONFIG_SORTEIO.anosDeEstrada.max)) return null;
  if (v.marcaId !== undefined && (typeof v.marcaId !== "string" || !CATALOGO.marcasOrigem.has(v.marcaId))) return null;
  return {
    tipo: "comum",
    id: v.id,
    motivacaoId: v.motivacaoId,
    ...(typeof v.marcaId === "string" ? { marcaId: v.marcaId } : {}),
    anosDeEstrada: v.anosDeEstrada,
    loreGerada: v.loreGerada,
  };
}

function validarPersonagem(v: unknown): Personagem | null {
  if (!ehObjeto(v)) return null;
  const { id, nome, nivel, xp, racaId, coreId, dons, origem, bestaVinculadaId, marcaAnomaliaId, tracoPersonalidadeId, aparencia, criadoEm } = v;
  if (!ehTexto(id, 64)) return null;
  const n = validarNome(nome);
  if (!n.ok || n.nome !== nome) return null;
  if (!ehInteiro(nivel, 1, 10_000) || !ehInteiro(xp, 0, Number.MAX_SAFE_INTEGER) || !ehInteiro(criadoEm, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (typeof racaId !== "string" || !CATALOGO.racas.has(racaId)) return null;
  if (typeof coreId !== "string" || !CATALOGO.cores.has(coreId)) return null;
  if (!Array.isArray(dons) || dons.length > 32) return null;
  for (const d of dons) if (typeof d !== "string" || CATALOGO.dons.get(d)?.racaId !== racaId) return null;
  if (new Set(dons).size !== dons.length) return null;
  const origemLimpa = validarOrigem(origem, racaId);
  if (!origemLimpa) return null;
  if (bestaVinculadaId !== undefined && (typeof bestaVinculadaId !== "string" || !CATALOGO.bestas.has(bestaVinculadaId))) return null;
  if (marcaAnomaliaId !== undefined) {
    const m = typeof marcaAnomaliaId === "string" ? CATALOGO.marcasAnomalia.get(marcaAnomaliaId) : undefined;
    if (!m || m.racaId !== racaId || m.coreId !== coreId) return null;
  }
  if (typeof tracoPersonalidadeId !== "string" || !CATALOGO.tracos.has(tracoPersonalidadeId)) return null;
  if (!ehObjeto(aparencia)) return null;
  const { corCabelo, corRoupa } = aparencia;
  if (typeof corCabelo !== "string" || !CATALOGO.coresCabelo.has(corCabelo)) return null;
  if (typeof corRoupa !== "string" || !CATALOGO.coresRoupa.has(corRoupa)) return null;
  return {
    id,
    nome,
    nivel,
    xp,
    racaId,
    coreId,
    dons: [...(dons as string[])],
    origem: origemLimpa,
    ...(typeof bestaVinculadaId === "string" ? { bestaVinculadaId } : {}),
    ...(typeof marcaAnomaliaId === "string" ? { marcaAnomaliaId } : {}),
    tracoPersonalidadeId,
    aparencia: { corCabelo, corRoupa },
    criadoEm,
  };
}

/** Valida a conta vinda do save; devolve `null` se algo estiver inválido. */
export function validarConta(v: unknown): Conta | null {
  if (!ehObjeto(v)) return null;
  const { personagens, personagemAtivoId, sorteio } = v;
  if (!Array.isArray(personagens) || personagens.length > MAX_PERSONAGENS) return null;
  const lista: Personagem[] = [];
  for (const p of personagens) {
    const limpo = validarPersonagem(p);
    if (!limpo) return null;
    lista.push(limpo);
  }
  if (new Set(lista.map((p) => p.id)).size !== lista.length) return null;
  let ativo: string | null = null;
  if (personagemAtivoId !== null) {
    if (typeof personagemAtivoId !== "string" || !lista.some((p) => p.id === personagemAtivoId)) return null;
    ativo = personagemAtivoId;
  }
  if (lista.length > 0 && ativo === null) return null;
  let sorteioLimpo: EstadoSorteio | null = null;
  if (sorteio !== null) {
    sorteioLimpo = validarSorteio(sorteio);
    if (!sorteioLimpo || lista.length >= MAX_PERSONAGENS) return null;
  }
  return { personagens: lista, personagemAtivoId: ativo, sorteio: sorteioLimpo };
}
