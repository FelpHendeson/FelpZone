/**
 * Conta (save v2): até 3 personagens independentes, o ativo e o sorteio em
 * andamento. Inclui a validação de dados vindos do save (entrada não confiável).
 */
import { cabeNoSlot, CATALOGO, CONFIG_GUILDA, CONFIG_MOCHILA_EXTRA, monstroDoLimiar, NOMEADOS_DE_ORIGEM, OFICIOS, OFICIOS_PRODUCAO, PRIMEIRA_META, RANK_MAXIMO_ATO_I, SLOTS, STATUS } from "../dados";
import type { OficioId, Slot } from "../dados/coleta";
import type { OficioProducaoId } from "../dados/producao";
import { KIT_COMBATE } from "../dados/combate";
import {
  CONFIG_HABILIDADES,
  slotsPassivas,
  tecnicasDoCore,
  xpParaProximaMaestria,
  type Habilidades,
  type ProgressoHabilidade,
} from "../habilidades/maestria";
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
  /** "recompondo": só no Limiar, depois de a vida chegar a zero; volta a lutar contra o mesmo monstro. */
  readonly fase: "procurando" | "lutando" | "recuando" | "recompondo";
  /** Procurando ou recuando: quanto falta. */
  readonly restanteMs: number;
  readonly monstroId: string | null;
  readonly vidaMonstro: number;
  readonly recargaPersonagemMs: number;
  readonly recargaMonstroMs: number;
  /** Contador do chefe: abates desde que chegou à área, mais 1 a cada fuga do chefe (ele aparece a cada N). */
  readonly abatesNaArea: number;
  /** F5: recarga restante de cada ativa (ms; ausente = pronta). */
  readonly recargas: Readonly<Record<string, number>>;
  /** F5: reforços (no personagem) e enfraquecimentos (no monstro) em curso. */
  readonly efeitos: readonly EfeitoEmCurso[];
}

/** Estadia no Limiar (F6): o personagem só combate até o tempo acabar ou pagar o Barqueiro. */
export interface EstadoLimiar {
  readonly restanteMs: number;
  readonly totalMs: number;
  /** Nível em que entrou: os monstros do Limiar acompanham. */
  readonly nivelEntrada: number;
  /** Cargas do Eco da Morte na entrada (0 a 5). */
  readonly cargasEco: number;
  /** Atividade a retomar ao sair. */
  readonly retorno: { readonly id: string; readonly habilidadeId?: string } | null;
  readonly combate: EstadoCombate;
  /** O que sobra de um passo de 0,5 s. */
  readonly progressoMs: number;
}

export interface EfeitoEmCurso {
  readonly habilidadeId: string;
  readonly sobre: "personagem" | "monstro";
  readonly alvo: string;
  readonly valor: number;
  readonly restanteMs: number;
}

/**
 * Atividade em andamento: id e quanto do ciclo atual já passou (no combate,
 * o que sobra de um passo de 0,5 s) e, no combate, o estado da luta.
 */
export interface AtividadeAtual {
  readonly id: string;
  readonly progressoMs: number;
  readonly combate?: EstadoCombate;
  /** Aprendizado (F5): habilidade sendo praticada. */
  readonly habilidadeId?: string;
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
  /** F5: habilidades conhecidas com maestria. */
  readonly habilidades: Habilidades;
  /** F5: ativas equipadas, em ordem de prioridade (máx. 5). */
  readonly ativasEquipadas: readonly string[];
  /** F5: passivas equipadas (máx. pelos slots do nível). */
  readonly passivasEquipadas: readonly string[];
  /** F5: ramo do core escolhido (a partir do nível 10). */
  readonly ramoId: string | null;
  /** F6: estadia no Limiar, ou `null`. */
  readonly limiar: EstadoLimiar | null;
  /** F6: mortes no total (O Retornado e títulos). */
  readonly mortes: number;
  /** F6: instantes das mortes recentes (Eco da Morte). */
  readonly mortesRecentes: readonly number[];
  /** F6: Essência do Limiar (moeda do pedágio). */
  readonly essencia: number;
  /** F6: Devedor do Barqueiro já usou a saída de graça. */
  readonly pedagioGratisUsado: boolean;
  /** F7: itens obtidos em atividades (contador para missões). */
  readonly obtidos: Readonly<Record<string, number>>;
  /** F7: ciclos de treino por status (contador para missões). */
  readonly treinos: Readonly<Record<string, number>>;
  /** F7: missões ativas (com o contador no momento em que começaram), concluídas e esperas. */
  readonly missoes: EstadoMissoes;
  /** F7: rank (0 = F) e Mérito na Guilda de Aventureiros. */
  readonly guilda: { readonly rank: number; readonly merito: number };
  /** F8: ofícios de produção (forja, alquimia, culinária). */
  readonly oficiosProducao: Readonly<Record<OficioProducaoId, ProgressoOficio>>;
  /** F8: espaços de mochila comprados no Mercado. */
  readonly espacosExtras: number;
  /** F8: falhas seguidas de fusão por item (garantia). */
  readonly pityFusao: Readonly<Record<string, number>>;
}

export interface MissaoAtiva {
  readonly id: string;
  /** Valor do contador quando a missão começou (0 para objetivos de estado). */
  readonly base: number;
}

export interface EstadoMissoes {
  readonly ativas: readonly MissaoAtiva[];
  /** Vezes que cada missão foi entregue. */
  readonly concluidas: Readonly<Record<string, number>>;
  /** Repetíveis: instante em que voltam ao quadro. */
  readonly disponivelEm: Readonly<Record<string, number>>;
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
  const f5 = typeof coreId === "string" && typeof nivel === "number" ? validarCamposF5(v, coreId, nivel) : null;
  if (!f5) return null;
  const f6 = validarCamposF6(v, f5.habilidades);
  if (!f6) return null;
  const f7 = validarCamposF7(v);
  if (!f7) return null;
  const f8 = validarCamposF8(v);
  if (!f8) return null;
  // Itens nomeados: uma unidade de cada por personagem (mochila + equipados).
  for (const item of CATALOGO.itens.values()) {
    if (!item.equipamento?.nomeado) continue;
    const naMochila = f3.mochila[item.id] ?? 0;
    const equipado = Object.values(f4.equipados).filter((x) => x === item.id).length;
    if (naMochila + equipado > 1) return null;
  }
  // No Limiar não há atividade nem viagem (a atividade fica guardada em `retorno`).
  if (f6.limiar && (atividade !== null || f3.viagem !== null)) return null;
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
  const faixa = faixas(racaId, nivel, modificadoresDoPersonagem({ racaId, dons: dons as string[], origem: origemLimpa, equipados: f4.equipados, ...f5 }, nivel));
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
      if (!combate || atividade.habilidadeId !== undefined) return null;
      atividadeLimpa = { id: atividade.id, progressoMs: atividade.progressoMs, combate };
    } else if (a.tipo === "aprendizado") {
      if (!ehInteiro(atividade.progressoMs, 0, a.cicloBaseMs * 10) || atividade.combate !== undefined) return null;
      if (typeof atividade.habilidadeId !== "string" || !f5.habilidades[atividade.habilidadeId]) return null;
      atividadeLimpa = { id: atividade.id, progressoMs: atividade.progressoMs, habilidadeId: atividade.habilidadeId };
    } else {
      if (!ehInteiro(atividade.progressoMs, 0, a.cicloBaseMs * 10) || atividade.combate !== undefined || atividade.habilidadeId !== undefined) return null;
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
    ...f5,
    ...f6,
    ...f7,
    ...f8,
  };
}

function ehNumero(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function validarCombate(v: unknown, monstrosDaArea: readonly string[], nivelLimiar?: number): EstadoCombate | null {
  if (!ehObjeto(v)) return null;
  const { fase, restanteMs, monstroId, vidaMonstro, recargaPersonagemMs, recargaMonstroMs, abatesNaArea, recargas, efeitos } = v;
  if (!ehObjeto(recargas) || !Array.isArray(efeitos) || efeitos.length > 32) return null;
  const recargasLimpas: Record<string, number> = {};
  for (const [id, ms] of Object.entries(recargas)) {
    if ((id !== "pocao" && !CATALOGO.habilidades.get(id)?.ativa) || !ehNumero(ms, -1_000, 600_000)) return null;
    recargasLimpas[id] = ms;
  }
  const efeitosLimpos: EfeitoEmCurso[] = [];
  for (const e of efeitos) {
    if (!ehObjeto(e) || typeof e.habilidadeId !== "string" || !CATALOGO.habilidades.get(e.habilidadeId)?.ativa) return null;
    if ((e.sobre !== "personagem" && e.sobre !== "monstro") || typeof e.alvo !== "string" || e.alvo.length > 32) return null;
    if (!ehNumero(e.valor, 0, 10) || !ehNumero(e.restanteMs, 1, 600_000)) return null;
    efeitosLimpos.push({ habilidadeId: e.habilidadeId, sobre: e.sobre, alvo: e.alvo, valor: e.valor, restanteMs: e.restanteMs });
  }
  if (fase !== "procurando" && fase !== "lutando" && fase !== "recuando" && fase !== "recompondo") return null;
  if (fase === "recompondo" && nivelLimiar === undefined) return null;
  if (!ehNumero(restanteMs, -1_000, 1_000_000) || !ehInteiro(abatesNaArea, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (!ehNumero(recargaPersonagemMs, -1_000, 60_000) || !ehNumero(recargaMonstroMs, -1_000, 60_000)) return null;
  if (fase === "lutando" || fase === "recompondo") {
    if (typeof monstroId !== "string" || !monstrosDaArea.includes(monstroId)) return null;
    const vidaMax = nivelLimiar !== undefined ? monstroDoLimiar(monstroId, nivelLimiar).vida : CATALOGO.monstros.get(monstroId)!.vida;
    if (!ehNumero(vidaMonstro, 0, vidaMax) || vidaMonstro === 0) return null;
  } else if (monstroId !== null) return null;
  return {
    fase,
    restanteMs,
    monstroId: fase === "lutando" || fase === "recompondo" ? (monstroId as string) : null,
    vidaMonstro: fase === "lutando" || fase === "recompondo" ? (vidaMonstro as number) : 0,
    recargaPersonagemMs,
    recargaMonstroMs,
    abatesNaArea,
    recargas: recargasLimpas,
    efeitos: efeitosLimpos,
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
    else if (typeof id === "string" && CATALOGO.itens.get(id)?.equipamento && cabeNoSlot(CATALOGO.itens.get(id)!.equipamento!.slot, s)) eq[s] = id;
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

type CamposF5 = Pick<Personagem, "habilidades" | "ativasEquipadas" | "passivasEquipadas" | "ramoId">;

/** Valida habilidades, slots e ramo (F5). */
function validarCamposF5(v: Record<string, unknown>, coreId: string, nivel: number): CamposF5 | null {
  const { habilidades, ativasEquipadas, passivasEquipadas, ramoId } = v;
  if (!ehObjeto(habilidades) || !Array.isArray(ativasEquipadas) || !Array.isArray(passivasEquipadas)) return null;
  const hab: Record<string, ProgressoHabilidade> = {};
  const entradas = Object.entries(habilidades);
  if (entradas.length > CATALOGO.habilidades.size) return null;
  for (const [id, p] of entradas) {
    if (!CATALOGO.habilidades.has(id) || !ehObjeto(p) || !ehInteiro(p.maestria, 1, CONFIG_HABILIDADES.maestriaMaxima)) return null;
    const limite = xpParaProximaMaestria(p.maestria);
    if (!ehNumero(p.xp, 0, Number.MAX_SAFE_INTEGER) || (limite > 0 ? p.xp >= limite : p.xp !== 0)) return null;
    hab[id] = { maestria: p.maestria, xp: p.xp };
  }
  // O core sempre ensina as próprias técnicas.
  for (const t of tecnicasDoCore(coreId)) if (!hab[t.id]) return null;
  const lista = (arr: unknown[], modo: "ativa" | "passiva", max: number): string[] | null => {
    if (arr.length > max || new Set(arr).size !== arr.length) return null;
    for (const id of arr) if (typeof id !== "string" || !hab[id] || CATALOGO.habilidades.get(id)!.modo !== modo) return null;
    return arr as string[];
  };
  const ativas = lista(ativasEquipadas, "ativa", CONFIG_HABILIDADES.slotsAtivas);
  const passivas = lista(passivasEquipadas, "passiva", slotsPassivas({ nivel, habilidades: hab }));
  if (!ativas || !passivas) return null;
  let ramo: string | null = null;
  if (ramoId !== null) {
    const r = typeof ramoId === "string" ? CATALOGO.ramos.get(ramoId) : undefined;
    if (!r || r.coreId !== coreId || nivel < CONFIG_HABILIDADES.nivelRamo || !hab[r.habilidadeId]) return null;
    ramo = r.id;
  }
  return { habilidades: hab, ativasEquipadas: [...ativas], passivasEquipadas: [...passivas], ramoId: ramo };
}

/**
 * Campos iniciais da F5: o personagem conhece as técnicas do próprio core
 * (e as que a origem ensinar), com as ativas e até 3 passivas úteis equipadas.
 */
export function camposIniciaisF5(coreId: string, origemId?: string): CamposF5 {
  const conhecidas = [...tecnicasDoCore(coreId)];
  const extra = origemId ? (CATALOGO.origensEspeciais.get(origemId)?.habilidadesIniciais ?? []) : [];
  for (const id of extra) if (!conhecidas.some((h) => h.id === id)) conhecidas.push(CATALOGO.habilidades.get(id)!);
  const habilidades: Record<string, ProgressoHabilidade> = {};
  for (const h of conhecidas) habilidades[h.id] = { maestria: 1, xp: 0 };
  const ativas = conhecidas.filter((h) => h.modo === "ativa").slice(0, CONFIG_HABILIDADES.slotsAtivas).map((h) => h.id);
  const passivas = conhecidas
    .filter((h) => h.modo === "passiva" && !h.pendente)
    .slice(0, CONFIG_HABILIDADES.slotsPassivasBase)
    .map((h) => h.id);
  return { habilidades, ativasEquipadas: ativas, passivasEquipadas: passivas, ramoId: null };
}

type CamposF6 = Pick<Personagem, "limiar" | "mortes" | "mortesRecentes" | "essencia" | "pedagioGratisUsado">;

/** Valida o Limiar, mortes, Eco e Essência (F6). */
function validarCamposF6(v: Record<string, unknown>, habilidades: Habilidades): CamposF6 | null {
  const { limiar, mortes, mortesRecentes, essencia, pedagioGratisUsado } = v;
  if (!ehInteiro(mortes, 0, Number.MAX_SAFE_INTEGER) || !ehInteiro(essencia, 0, Number.MAX_SAFE_INTEGER) || typeof pedagioGratisUsado !== "boolean") return null;
  if (!Array.isArray(mortesRecentes) || mortesRecentes.length > 10 || mortesRecentes.length > mortes) return null;
  for (const t of mortesRecentes) if (!ehInteiro(t, 0, Number.MAX_SAFE_INTEGER)) return null;
  let limiarLimpo: EstadoLimiar | null = null;
  if (limiar !== null) {
    if (!ehObjeto(limiar)) return null;
    const { restanteMs, totalMs, nivelEntrada, cargasEco, retorno, combate, progressoMs } = limiar;
    if (!ehInteiro(totalMs, 1, 24 * 3_600_000) || !ehNumero(restanteMs, 1, totalMs)) return null;
    if (!ehInteiro(nivelEntrada, 1, CONFIG_PROGRESSAO.nivelMaximo) || !ehInteiro(cargasEco, 0, 5) || !ehInteiro(progressoMs, 0, 499)) return null;
    let retornoLimpo: EstadoLimiar["retorno"] = null;
    if (retorno !== null) {
      if (!ehObjeto(retorno) || typeof retorno.id !== "string") return null;
      const a = CATALOGO.atividades.get(retorno.id);
      if (!a) return null;
      if (a.tipo === "aprendizado") {
        if (typeof retorno.habilidadeId !== "string" || !habilidades[retorno.habilidadeId]) return null;
        retornoLimpo = { id: retorno.id, habilidadeId: retorno.habilidadeId };
      } else {
        if (retorno.habilidadeId !== undefined) return null;
        retornoLimpo = { id: retorno.id };
      }
    }
    const combateLimpo = validarCombate(combate, ["alma-penada", "ceifeiro-menor", "eco-faminto", "o-cobrador", "a-rainha-palida"], nivelEntrada);
    if (!combateLimpo) return null;
    limiarLimpo = { restanteMs, totalMs, nivelEntrada, cargasEco, retorno: retornoLimpo, combate: combateLimpo, progressoMs };
  }
  return { limiar: limiarLimpo, mortes, mortesRecentes: [...(mortesRecentes as number[])], essencia, pedagioGratisUsado };
}

/** Campos iniciais da F6: nunca morreu, sem Essência, fora do Limiar. */
export function camposIniciaisF6(): CamposF6 {
  return { limiar: null, mortes: 0, mortesRecentes: [], essencia: 0, pedagioGratisUsado: false };
}

type CamposF7 = Pick<Personagem, "obtidos" | "treinos" | "missoes" | "guilda">;

function contadorLimpo(v: unknown, chaveValida: (k: string) => boolean): Record<string, number> | null {
  if (!ehObjeto(v)) return null;
  const r: Record<string, number> = {};
  const entradas = Object.entries(v);
  if (entradas.length > 500) return null;
  for (const [k, n] of entradas) {
    if (!chaveValida(k) || !ehInteiro(n, 1, Number.MAX_SAFE_INTEGER)) return null;
    r[k] = n;
  }
  return r;
}

/** Valida contadores, missões e guilda (F7). */
function validarCamposF7(v: Record<string, unknown>): CamposF7 | null {
  const obtidos = contadorLimpo(v.obtidos, (k) => CATALOGO.itens.has(k));
  const treinos = contadorLimpo(v.treinos, (k) => (STATUS as readonly string[]).includes(k));
  if (!obtidos || !treinos) return null;
  const m = v.missoes;
  if (!ehObjeto(m) || !Array.isArray(m.ativas) || m.ativas.length > CONFIG_GUILDA.maximoAtivas) return null;
  const ativas: MissaoAtiva[] = [];
  for (const a of m.ativas) {
    if (!ehObjeto(a) || typeof a.id !== "string" || !CATALOGO.missoes.has(a.id) || !ehInteiro(a.base, 0, Number.MAX_SAFE_INTEGER)) return null;
    if (ativas.some((x) => x.id === a.id)) return null;
    ativas.push({ id: a.id, base: a.base });
  }
  const concluidas = contadorLimpo(m.concluidas, (k) => CATALOGO.missoes.has(k));
  if (!concluidas) return null;
  if (!ehObjeto(m.disponivelEm)) return null;
  const disponivelEm: Record<string, number> = {};
  for (const [k, t] of Object.entries(m.disponivelEm)) {
    if (!CATALOGO.missoes.get(k)?.repetivel || !ehInteiro(t, 0, Number.MAX_SAFE_INTEGER)) return null;
    disponivelEm[k] = t;
  }
  const g = v.guilda;
  if (!ehObjeto(g) || !ehInteiro(g.rank, 0, RANK_MAXIMO_ATO_I) || !ehInteiro(g.merito, 0, Number.MAX_SAFE_INTEGER)) return null;
  return { obtidos, treinos, missoes: { ativas, concluidas, disponivelEm }, guilda: { rank: g.rank, merito: g.merito } };
}

/** Campos iniciais da F7: a primeira meta já ativa; rank F (ou o da origem). */
export function camposIniciaisF7(origemId?: string): CamposF7 {
  const rank = origemId ? (CATALOGO.origensEspeciais.get(origemId)?.rankInicial ?? 0) : 0;
  return { obtidos: {}, treinos: {}, missoes: { ativas: [{ id: PRIMEIRA_META, base: 0 }], concluidas: {}, disponivelEm: {} }, guilda: { rank, merito: 0 } };
}

type CamposF8 = Pick<Personagem, "oficiosProducao" | "espacosExtras" | "pityFusao">;

/** Valida ofícios de produção, espaços comprados e garantia de fusão (F8). */
function validarCamposF8(v: Record<string, unknown>): CamposF8 | null {
  const { oficiosProducao, espacosExtras, pityFusao } = v;
  if (!ehObjeto(oficiosProducao)) return null;
  const of = {} as Record<OficioProducaoId, ProgressoOficio>;
  for (const o of OFICIOS_PRODUCAO) {
    const p = oficiosProducao[o];
    if (!ehObjeto(p) || !ehInteiro(p.nivel, 1, CONFIG_OFICIOS.nivelMaximo)) return null;
    const limite = xpParaProximoNivelOficio(p.nivel);
    if (typeof p.xp !== "number" || !Number.isFinite(p.xp) || p.xp < 0 || (limite > 0 ? p.xp >= limite : p.xp !== 0)) return null;
    of[o] = { nivel: p.nivel, xp: p.xp };
  }
  const max = CONFIG_MOCHILA_EXTRA.espacosPorCompra * CONFIG_MOCHILA_EXTRA.maximoCompras;
  if (!ehInteiro(espacosExtras, 0, max) || espacosExtras % CONFIG_MOCHILA_EXTRA.espacosPorCompra !== 0) return null;
  const pity = contadorLimpo(pityFusao, (k) => CATALOGO.itens.get(k)?.equipamento !== undefined);
  if (!pity) return null;
  return { oficiosProducao: of, espacosExtras, pityFusao: pity };
}

/** Campos iniciais da F8: ofícios de produção no nível 1, sem espaços extras. */
export function camposIniciaisF8(): CamposF8 {
  const of = {} as Record<OficioProducaoId, ProgressoOficio>;
  for (const o of OFICIOS_PRODUCAO) of[o] = { nivel: 1, xp: 0 };
  return { oficiosProducao: of, espacosExtras: 0, pityFusao: {} };
}

/** Nomeado que a origem dá de saída (vai para a mochila). */
export function nomeadoDaOrigem(origemId?: string): string | null {
  return origemId ? (NOMEADOS_DE_ORIGEM[origemId] ?? null) : null;
}
