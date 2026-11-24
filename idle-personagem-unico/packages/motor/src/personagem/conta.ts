/**
 * Conta (save v2): até 3 personagens independentes, o ativo e o sorteio em
 * andamento. Inclui a validação de dados vindos do save (entrada não confiável).
 */
import { CATALOGO, OFICIOS, SLOTS, STATUS } from "../dados";
import type { OficioId, Slot } from "../dados/coleta";
import { KIT_COMBATE } from "../dados/combate";
import type { StatusId } from "../dados/status";
import { ehEstadoRng, type EstadoRng } from "../rng";
import { reproduzirTentativa, type ResultadoTentativa } from "../sorteio/cascata";
import { CONFIG_SORTEIO } from "../sorteio/config";
import { validarNome } from "./nome";
import {
  CONFIG_OFICIOS,
  CONFIG_PROGRESSAO,
  faixas,
  modificadoresDoPersonagem,
  xpParaProximoNivel,
  xpParaProximoNivelOficio,
  type ValoresStatus,
} from "./progressao";

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

/** Estado de uma luta em andamento (F4). Recargas e vida do monstro podem ter casas decimais. */
export interface EstadoCombate {
  readonly fase: "procurando" | "lutando" | "recuando";
  /** Procurando ou recuando: quanto falta. */
  readonly restanteMs: number;
  readonly monstroId: string | null;
  readonly vidaMonstro: number;
  readonly recargaPersonagemMs: number;
  readonly recargaMonstroMs: number;
  /** Contador do chefe: abates desde que chegou à área, mais 1 a cada fuga do chefe (ele aparece a cada N). */
  readonly abatesNaArea: number;
}

/**
 * Atividade em andamento: id e quanto do ciclo atual já passou (no combate,
 * o que sobra de um passo de 0,5 s) e, no combate, o estado da luta.
 */
export interface AtividadeAtual {
  readonly id: string;
  readonly progressoMs: number;
  readonly combate?: EstadoCombate;
}

/** Viagem entre locais (≤ 10 s). Enquanto dura, o personagem segue no local de origem. */
export interface Viagem {
  readonly origemLocalId: string;
  readonly destinoLocalId: string;
  readonly destinoSubareaId: string;
  readonly totalMs: number;
  readonly restanteMs: number;
}

export interface ProgressoOficio {
  readonly nivel: number;
  readonly xp: number;
}

/** Ficha do personagem. F1: identidade; F2: status, XP e atividade; F3: lugar, ofícios, ferramentas, mochila e gold. */
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
  /** Valor treinado de cada status (sem os modificadores `status.<id>`). */
  readonly status: ValoresStatus;
  /** `null` = ocioso. */
  readonly atividade: AtividadeAtual | null;
  readonly localId: string;
  readonly subareaId: string;
  readonly viagem: Viagem | null;
  readonly ouro: number;
  /** Itens por id e quantidade (só quantidades > 0). */
  readonly mochila: Readonly<Record<string, number>>;
  readonly oficios: Readonly<Record<OficioId, ProgressoOficio>>;
  /** Ferramenta equipada em cada ofício. */
  readonly ferramentas: Readonly<Record<OficioId, string>>;
  /** Equipamento de combate por slot (F4). */
  readonly equipados: Readonly<Record<Slot, string | null>>;
  /** Vida atual como fração da vida máxima (0 a 1). */
  readonly vida: number;
  /** Recua para a cidade com vida ≤ este percentual (0 = nunca). */
  readonly recuoPercentual: number;
  /** Abates por monstro. */
  readonly bestiario: Readonly<Record<string, number>>;
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
  const { id, nome, nivel, xp, racaId, coreId, dons, origem, bestaVinculadaId, marcaAnomaliaId, tracoPersonalidadeId, aparencia, criadoEm, status, atividade } = v;
  const f3 = validarCamposF3(v);
  if (!f3) return null;
  const f4 = validarCamposF4(v);
  if (!f4) return null;
  if (!ehTexto(id, 64)) return null;
  const n = validarNome(nome);
  if (!n.ok || n.nome !== nome) return null;
  if (!ehInteiro(nivel, 1, CONFIG_PROGRESSAO.nivelMaximo) || !ehInteiro(criadoEm, 0, Number.MAX_SAFE_INTEGER)) return null;
  const xpLimite = xpParaProximoNivel(nivel);
  if (typeof xp !== "number" || !Number.isFinite(xp) || xp < 0 || (xpLimite > 0 ? xp >= xpLimite : xp !== 0)) return null;
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
  // Status: finitos e dentro de piso/teto do nível (com folga de arredondamento).
  if (!ehObjeto(status)) return null;
  const faixa = faixas(racaId, nivel, modificadoresDoPersonagem({ racaId, dons: dons as string[], origem: origemLimpa, equipados: f4.equipados }, nivel));
  const statusLimpo = {} as Record<StatusId, number>;
  for (const s of STATUS) {
    const valor = status[s];
    const { piso, teto } = faixa[s];
    const folga = 1e-9 * Math.max(1, teto);
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < piso - folga || valor > teto + folga) return null;
    statusLimpo[s] = valor;
  }
  let atividadeLimpa: AtividadeAtual | null = null;
  if (atividade !== null) {
    if (!ehObjeto(atividade) || typeof atividade.id !== "string") return null;
    const a = CATALOGO.atividades.get(atividade.id);
    if (!a) return null;
    if (a.tipo === "combate") {
      if (!ehInteiro(atividade.progressoMs, 0, 499)) return null;
      const combate = validarCombate(atividade.combate, a.monstros.map((m) => m.monstroId).concat(a.chefeId));
      if (!combate) return null;
      atividadeLimpa = { id: atividade.id, progressoMs: atividade.progressoMs, combate };
    } else {
      if (!ehInteiro(atividade.progressoMs, 0, a.cicloBaseMs * 10) || atividade.combate !== undefined) return null;
      atividadeLimpa = { id: atividade.id, progressoMs: atividade.progressoMs };
    }
    // A atividade acontece no destino da viagem ou no local atual.
    if ((f3.viagem ? f3.viagem.destinoLocalId : f3.localId) !== a.localId) return null;
  }
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
    status: statusLimpo,
    atividade: atividadeLimpa,
    ...f3,
    ...f4,
  };
}

function ehNumero(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function validarCombate(v: unknown, monstrosDaArea: readonly string[]): EstadoCombate | null {
  if (!ehObjeto(v)) return null;
  const { fase, restanteMs, monstroId, vidaMonstro, recargaPersonagemMs, recargaMonstroMs, abatesNaArea } = v;
  if (fase !== "procurando" && fase !== "lutando" && fase !== "recuando") return null;
  if (!ehNumero(restanteMs, -1_000, 1_000_000) || !ehInteiro(abatesNaArea, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!ehNumero(recargaPersonagemMs, -1_000, 60_000) || !ehNumero(recargaMonstroMs, -1_000, 60_000)) return null;
  if (fase === "lutando") {
    if (typeof monstroId !== "string" || !monstrosDaArea.includes(monstroId)) return null;
    if (!ehNumero(vidaMonstro, 0, CATALOGO.monstros.get(monstroId)!.vida) || vidaMonstro === 0) return null;
  } else if (monstroId !== null) return null;
  return {
    fase,
    restanteMs,
    monstroId: fase === "lutando" ? (monstroId as string) : null,
    vidaMonstro: fase === "lutando" ? (vidaMonstro as number) : 0,
    recargaPersonagemMs,
    recargaMonstroMs,
    abatesNaArea,
  };
}

type CamposF4 = Pick<Personagem, "equipados" | "vida" | "recuoPercentual" | "bestiario">;

/** Valida equipamento, vida, recuo e bestiário (F4). */
function validarCamposF4(v: Record<string, unknown>): CamposF4 | null {
  const { equipados, vida, recuoPercentual, bestiario } = v;
  if (!ehObjeto(equipados) || !ehObjeto(bestiario)) return null;
  const eq = {} as Record<Slot, string | null>;
  for (const s of SLOTS) {
    const id = equipados[s];
    if (id === null) eq[s] = null;
    else if (typeof id === "string" && CATALOGO.itens.get(id)?.equipamento?.slot === s) eq[s] = id;
    else return null;
  }
  if (!ehNumero(vida, 0, 1) || vida === 0) return null;
  if (!ehInteiro(recuoPercentual, 0, 90)) return null;
  const best: Record<string, number> = {};
  const entradas = Object.entries(bestiario);
  if (entradas.length > CATALOGO.monstros.size) return null;
  for (const [id, n] of entradas) {
    if (!CATALOGO.monstros.has(id) || !ehInteiro(n, 1, Number.MAX_SAFE_INTEGER)) return null;
    best[id] = n;
  }
  return { equipados: eq, vida, recuoPercentual, bestiario: best };
}

/** Campos iniciais da F4: kit básico equipado, vida cheia, recuo de 30% e bestiário vazio. */
export function camposIniciaisF4(): CamposF4 {
  return { equipados: { ...KIT_COMBATE }, vida: 1, recuoPercentual: 30, bestiario: {} };
}

type CamposF3 = Pick<Personagem, "localId" | "subareaId" | "viagem" | "ouro" | "mochila" | "oficios" | "ferramentas">;

function subareaExiste(localId: string, subareaId: unknown): subareaId is string {
  return typeof subareaId === "string" && (CATALOGO.locais.get(localId)?.subareas.some((s) => s.id === subareaId) ?? false);
}

/** Valida lugar, viagem, gold, mochila, ofícios e ferramentas (F3). */
function validarCamposF3(v: Record<string, unknown>): CamposF3 | null {
  const { localId, subareaId, viagem, ouro, mochila, oficios, ferramentas } = v;
  if (typeof localId !== "string" || !CATALOGO.locais.has(localId) || !subareaExiste(localId, subareaId)) return null;
  let viagemLimpa: Viagem | null = null;
  if (viagem !== null) {
    if (!ehObjeto(viagem)) return null;
    const { origemLocalId, destinoLocalId, destinoSubareaId, totalMs, restanteMs } = viagem;
    if (origemLocalId !== localId || typeof destinoLocalId !== "string" || destinoLocalId === localId) return null;
    if (!CATALOGO.locais.has(destinoLocalId) || !subareaExiste(destinoLocalId, destinoSubareaId)) return null;
    if (!ehInteiro(totalMs, 1, 10_000) || !ehInteiro(restanteMs, 1, totalMs)) return null;
    viagemLimpa = { origemLocalId, destinoLocalId, destinoSubareaId, totalMs, restanteMs };
  }
  if (!ehInteiro(ouro, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!ehObjeto(mochila)) return null;
  const mochilaLimpa: Record<string, number> = {};
  const entradas = Object.entries(mochila);
  if (entradas.length > CATALOGO.itens.size) return null;
  for (const [itemId, q] of entradas) {
    if (!CATALOGO.itens.has(itemId) || !ehInteiro(q, 1, 1_000_000)) return null;
    mochilaLimpa[itemId] = q;
  }
  if (!ehObjeto(oficios) || !ehObjeto(ferramentas)) return null;
  const oficiosLimpos = {} as Record<OficioId, ProgressoOficio>;
  const ferramentasLimpas = {} as Record<OficioId, string>;
  for (const o of OFICIOS) {
    const p = oficios[o];
    if (!ehObjeto(p) || !ehInteiro(p.nivel, 1, CONFIG_OFICIOS.nivelMaximo)) return null;
    const limite = xpParaProximoNivelOficio(p.nivel);
    if (typeof p.xp !== "number" || !Number.isFinite(p.xp) || p.xp < 0 || (limite > 0 ? p.xp >= limite : p.xp !== 0)) return null;
    oficiosLimpos[o] = { nivel: p.nivel, xp: p.xp };
    const f = ferramentas[o];
    if (typeof f !== "string" || CATALOGO.ferramentas.get(f)?.oficio !== o) return null;
    ferramentasLimpas[o] = f;
  }
  return { localId, subareaId: subareaId as string, viagem: viagemLimpa, ouro, mochila: mochilaLimpa, oficios: oficiosLimpos, ferramentas: ferramentasLimpas };
}

/** Campos iniciais da F3: na Praça de Pedravau, sem gold, mochila vazia, ofícios no 1 e kit básico. */
export function camposIniciaisF3(): CamposF3 {
  const oficios = {} as Record<OficioId, ProgressoOficio>;
  const ferramentas = {} as Record<OficioId, string>;
  for (const o of OFICIOS) {
    oficios[o] = { nivel: 1, xp: 0 };
    ferramentas[o] = `${o}-basica`;
  }
  return { localId: "pedravau", subareaId: "praca", viagem: null, ouro: 0, mochila: {}, oficios, ferramentas };
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
