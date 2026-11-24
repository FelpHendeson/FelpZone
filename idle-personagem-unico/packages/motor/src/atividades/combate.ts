/**
 * Combate por área (GDD §7): passos de 0,5 s, iguais com o jogo aberto ou
 * fechado. O estado da luta fica no save; os sorteios (aparição, crítico,
 * esquiva, drops) usam o RNG do save, sempre na mesma ordem, então dividir o
 * tempo em partes dá o mesmo resultado.
 */
import { CONFIG_PETS, ESPECIES_PET, LACO_DE_DOMA } from "../dados/pets";
import { bonusBestiario } from "../dados/mundo";
import { especieDe, novoPet } from "../pets/pets";
import {
  CATALOGO,
  CHANCE_FRAGMENTO,
  CHEFES_LIMIAR,
  COMUNS_LIMIAR,
  CONFIG_LIMIAR,
  CONSUMIVEIS,
  CURA_ABAIXO_DE,
  DROPS_RELIQUIA,
  EQUIPAMENTOS,
  FRAGMENTO,
  LIVROS,
  monstroDoLimiar,
  obter,
  PECAS_POR_CHEFE,
  type StatusId,
} from "../dados";
import type { AtividadeCombate, Monstro } from "../dados/combate";
import type { Modificador } from "../modificadores";
import { resumirModificadores } from "../modificadores";
import type { EfeitoEmCurso, EstadoCombate, Personagem } from "../personagem/conta";
import { CONFIG_HABILIDADES, fatorMaestria, ganharMaestria, modificadoresDaPassiva, praticarPassivas, type ProgressoHabilidade } from "../habilidades/maestria";
import { adicionarItens, capacidadeMochila, type Mochila } from "../personagem/mochila";
import { aplicarXp, CONFIG_PROGRESSAO, fator, modificadoresDoPersonagem, valorEfetivo, type ConfigProgressao } from "../personagem/progressao";
import type { Rng } from "../rng";
import { duracaoViagemMs } from "./viagem";

export const CONFIG_COMBATE = Object.freeze({
  passoMs: 500,
  /** Tempo procurando o próximo monstro. */
  buscaMs: 3_000,
  /** Recuperação de vida (fração da vida máxima por segundo). */
  regenForaPorSegundo: 0.02,
  regenProcurandoPorSegundo: 0.01,
  vidaBase: 40,
  vidaPorVigor: 8,
  ataqueBase: 2,
  ataquePorForca: 1,
  defesaPorResistencia: 0.5,
  intervaloBaseMs: 2_000,
  velocidadePorAgilidade: 0.01,
  esquivaPorAgilidade: 0.004,
  esquivaMaxima: 0.5,
  criticoPorPercepcao: 0.005,
  criticoMaximo: 0.5,
  multiplicadorCritico: 1.5,
  recuoPadrao: 30,
  recuoMaximo: 90,
  /** Ao desmaiar, acorda em Pedravau com esta fração da vida. */
  vidaAoAcordar: 0.5,
  localDeDesmaio: { localId: "pedravau", subareaId: "praca" },
  /** F8: poção automática. */
  pocaoAbaixoDe: 0.4,
  recargaPocaoMs: 10_000,
});

/** Monstro → espécie de pet que ele vira ao ser domado. */
const DOMAVEIS = new Map(ESPECIES_PET.filter((e) => e.domadoDe).map((e) => [e.domadoDe!, e]));

/** Chave da recarga de poções no estado de combate. */
export const CHAVE_POCAO = "pocao";
/** Poções, da mais forte para a mais fraca. */
const POCOES = [...CONSUMIVEIS].filter((x) => x.consumivel?.tipo === "pocao").sort((a, b) => (b.consumivel!.cura ?? 0) - (a.consumivel!.cura ?? 0));

export interface StatusDeCombate {
  readonly vidaMax: number;
  readonly ataque: number;
  readonly defesa: number;
  readonly intervaloMs: number;
  readonly esquiva: number;
  readonly critico: number;
}

function somaAlvo(mods: readonly Modificador[], alvo: string): number {
  const r = resumirModificadores(mods, alvo);
  return r.somar;
}

/** Status de combate derivados dos status efetivos e dos modificadores (equipamento incluso). */
export function statusDeCombate(status: Readonly<Record<StatusId, number>>, mods: readonly Modificador[]): StatusDeCombate {
  const c = CONFIG_COMBATE;
  const ef = (s: StatusId) => valorEfetivo(status[s], s, mods);
  return {
    vidaMax: Math.max(1, (c.vidaBase + c.vidaPorVigor * ef("vigor") + somaAlvo(mods, "vida")) * fator(mods, "vida")),
    ataque: Math.max(1, (c.ataqueBase + c.ataquePorForca * ef("forca") + somaAlvo(mods, "ataque")) * fator(mods, "ataque")),
    defesa: Math.max(0, (c.defesaPorResistencia * ef("resistencia") + somaAlvo(mods, "defesa")) * fator(mods, "defesa")),
    intervaloMs: c.intervaloBaseMs / ((1 + c.velocidadePorAgilidade * ef("agilidade")) * fator(mods, "velocidade-ataque")),
    esquiva: Math.min(c.esquivaMaxima, c.esquivaPorAgilidade * ef("agilidade") + somaAlvo(mods, "esquiva")),
    critico: Math.min(c.criticoMaximo, c.criticoPorPercepcao * ef("percepcao") + somaAlvo(mods, "critico")),
  };
}

/** Dano de um golpe: ataque² ÷ (ataque + defesa), no mínimo 1. */
export function dano(ataque: number, defesa: number): number {
  return Math.max(1, (ataque * ataque) / (ataque + Math.max(0, defesa)));
}

export type Risco = "verde" | "amarelo" | "vermelho";

/**
 * Risco da área pela média dos monstros comuns: fração da vida perdida por luta.
 * Verde < 10%, amarelo < 35%, vermelho a partir disso.
 */
export function riscoDaArea(sc: StatusDeCombate, area: AtividadeCombate): { risco: Risco; perdaPorLuta: number } {
  let soma = 0;
  let pesos = 0;
  for (const { monstroId, peso } of area.monstros) {
    const m = obter(CATALOGO.monstros, monstroId);
    if (m.tipo !== "comum") continue;
    const dps = (dano(sc.ataque, m.defesa) * (1 + sc.critico * (CONFIG_COMBATE.multiplicadorCritico - 1))) / sc.intervaloMs;
    const tempo = m.vida / dps;
    const perda = ((1 - sc.esquiva) * dano(m.ataque, sc.defesa) * (tempo / m.intervaloMs)) / sc.vidaMax;
    soma += perda * peso;
    pesos += peso;
  }
  const perdaPorLuta = soma / pesos;
  return { risco: perdaPorLuta < 0.1 ? "verde" : perdaPorLuta < 0.35 ? "amarelo" : "vermelho", perdaPorLuta };
}

/** Estado de combate ao chegar numa área. */
export function combateInicial(): EstadoCombate {
  return {
    fase: "procurando",
    restanteMs: CONFIG_COMBATE.buscaMs,
    monstroId: null,
    vidaMonstro: 0,
    recargaPersonagemMs: 0,
    recargaMonstroMs: 0,
    abatesNaArea: 0,
    recargas: {},
    efeitos: [],
  };
}

/** O que o combate acumula durante um avanço. */
export interface AcumuladoCombate {
  abates: Record<string, number>;
  itens: Record<string, number>;
  itensPerdidos: number;
  xp: number;
  /** Mortes (cada uma leva ao Limiar). */
  mortes: number;
  recuos: number;
  /** Essência do Limiar ganha. */
  essencia: number;
  /** Níveis de maestria ganhos por habilidade. */
  maestria: Record<string, number>;
  /** F10: espécies domadas (na ordem). */
  domados: string[];
}

/** Opções do combate dentro do Limiar (F6). */
export interface OpcoesLimiar {
  readonly nivel: number;
  readonly cargas: number;
  readonly fatorAtaque: number;
  readonly fatorDefesa: number;
  readonly multiplicadorDrops: number;
  readonly restanteMs: number;
}

export interface SaidaCombate {
  readonly personagem: Personagem;
  readonly combate: EstadoCombate;
  readonly progressoMs: number;
  /** Tempo que sobrou depois de uma morte ou do fim do Limiar (o chamador trata). */
  readonly sobraMs: number;
  /** Instante da morte (fora do Limiar), ou `null`. */
  readonly morteEm: number | null;
  /** No Limiar: quanto falta (0 = acabou). */
  readonly restanteLimiarMs: number;
}

export interface EntradaCombate {
  readonly personagem: Personagem;
  readonly area: AtividadeCombate;
  readonly combate: EstadoCombate;
  readonly progressoMs: number;
  /** Instante (ms) em que este trecho de combate começa. */
  readonly tempoInicio: number;
  readonly limiar?: OpcoesLimiar;
  readonly status: Record<StatusId, number>;
  readonly ganhos: Record<StatusId, number>;
  readonly ms: number;
  readonly rng: Rng;
  readonly acumulado: AcumuladoCombate;
  readonly config?: ConfigProgressao;
}

/** Aplica reforços (personagem) aos status de combate. */
function comReforcos(sc: StatusDeCombate, efeitos: readonly EfeitoEmCurso[]): StatusDeCombate {
  if (efeitos.length === 0) return sc;
  const soma = (alvo: string) => efeitos.reduce((t, e) => (e.sobre === "personagem" && e.alvo === alvo ? t + e.valor : t), 0);
  const c = CONFIG_COMBATE;
  return {
    vidaMax: sc.vidaMax,
    ataque: sc.ataque * (1 + soma("ataque")),
    defesa: sc.defesa * (1 + soma("defesa")),
    intervaloMs: sc.intervaloMs / (1 + soma("velocidade")),
    esquiva: Math.min(c.esquivaMaxima, sc.esquiva + soma("esquiva")),
    critico: Math.min(c.criticoMaximo, sc.critico + soma("critico")),
  };
}

/** Status do monstro com os enfraquecimentos em curso. */
function monstroEnfraquecido(m: Monstro, efeitos: readonly EfeitoEmCurso[]): { ataque: number; defesa: number } {
  const soma = (alvo: string) => Math.min(0.9, efeitos.reduce((t, e) => (e.sobre === "monstro" && e.alvo === alvo ? t + e.valor : t), 0));
  return { ataque: m.ataque * (1 - soma("ataque")), defesa: m.defesa * (1 - soma("defesa")) };
}

/**
 * Simula `ms` de combate a partir do estado salvo. Devolve o personagem novo
 * e quantos ms sobraram depois de um desmaio (para o chamador tratar como
 * tempo ocioso), ou 0.
 *
 * A cada passo: recargas e efeitos andam; na luta, a primeira ativa pronta
 * (na ordem de prioridade) dispara, depois o ataque básico e o do monstro.
 * Curas só disparam com a vida abaixo de 50%.
 */
export function avancarCombate(e: EntradaCombate): SaidaCombate {
  const config = e.config ?? CONFIG_PROGRESSAO;
  const c = CONFIG_COMBATE;
  const p0 = e.personagem;
  const area = e.area;
  const limiar = e.limiar;
  const { status, ganhos, rng, acumulado } = e;
  const inicial = e.combate;
  // Cópia mutável durante a simulação; vira `EstadoCombate` (somente leitura) ao sair.
  let estado: { -readonly [K in keyof EstadoCombate]: EstadoCombate[K] } = { ...inicial };
  const recargas: Record<string, number> = { ...inicial.recargas };
  let efeitos: EfeitoEmCurso[] = [...inicial.efeitos];
  const hab: Record<string, ProgressoHabilidade> = { ...p0.habilidades };
  const base = { ...p0, habilidades: hab };
  let vida = p0.vida;
  let nivel = p0.nivel;
  let xp = p0.xp;
  let essencia = p0.essencia;
  let mochila: Mochila = p0.mochila;
  let pets = p0.pets;
  let petsCriados = p0.petsCriados;
  const bestiario: Record<string, number> = { ...p0.bestiario };
  const total = e.progressoMs + Math.floor(e.ms);
  const passos = Math.floor(total / c.passoMs);
  const resto = total % c.passoMs;
  let restanteLimiar = limiar?.restanteMs ?? 0;
  const monstroPorId = (id: string): Monstro => (limiar ? monstroDoLimiar(id, limiar.nivel) : obter(CATALOGO.monstros, id));
  /** No Limiar o personagem luta enfraquecido (com as sinergias de raça e core). */
  const ajustar = (sc: StatusDeCombate): StatusDeCombate => (limiar ? { ...sc, ataque: sc.ataque * limiar.fatorAtaque, defesa: sc.defesa * limiar.fatorDefesa } : sc);

  let mods: Modificador[] = [];
  let scBase!: StatusDeCombate;
  let capacidade = 0;
  let regen = 1;
  let xpMaestria = 1;
  // Auras (passivas que só valem com pouca vida): status de combate por combinação ativa.
  const auras = p0.passivasEquipadas
    .map((id) => ({ id, limite: CATALOGO.habilidades.get(id)?.passiva?.auraVidaAbaixo }))
    .filter((a): a is { id: string; limite: number } => a.limite !== undefined);
  let cacheAura = new Map<string, StatusDeCombate>();
  const statusComAura = (): StatusDeCombate => {
    if (auras.length === 0) return scBase;
    const ativas = auras.filter((a) => vida < a.limite);
    if (ativas.length === 0) return scBase;
    const chave = ativas.map((a) => a.id).join("|");
    let sc = cacheAura.get(chave);
    if (!sc) {
      const extra = ativas.flatMap((a) => modificadoresDaPassiva(obter(CATALOGO.habilidades, a.id), hab[a.id]?.maestria ?? 1));
      sc = statusDeCombate(status, [...mods, ...extra]);
      cacheAura.set(chave, sc);
    }
    return sc;
  };
  let monstro: Monstro | null = estado.monstroId ? monstroPorId(estado.monstroId) : null;
  const recalcular = () => {
    mods = modificadoresDoPersonagem(base, nivel);
    scBase = statusDeCombate(status, mods);
    capacidade = capacidadeMochila(status.forca, mods);
    regen = fator(mods, "regeneracao");
    xpMaestria = fator(mods, "xp-maestria");
    cacheAura = new Map();
  };
  recalcular();
  const viagemCidade = duracaoViagemMs(area.localId, c.localDeDesmaio.localId, mods);
  const recuoFracao = p0.recuoPercentual / 100;
  const equipamentosDoTier = EQUIPAMENTOS.filter((i) => i.equipamento?.tier === area.tierEquipamento);

  const guardar = (itemId: string, q: number) => {
    const r = adicionarItens(mochila, itemId, q, capacidade);
    mochila = r.mochila;
    acumulado.itensPerdidos += r.perdidos;
    if (r.aceitos > 0) acumulado.itens[itemId] = (acumulado.itens[itemId] ?? 0) + r.aceitos;
  };
  const semEfeitosNoMonstro = () => {
    efeitos = efeitos.filter((x) => x.sobre !== "monstro");
  };
  const recuar = () => {
    acumulado.recuos++;
    // Fugir do chefe faz ele ir embora: só volta depois de mais N abates.
    if (monstro?.tipo === "chefe") estado.abatesNaArea++;
    const curaMs = Math.ceil(((1 - vida) / (c.regenForaPorSegundo * regen)) * 1000);
    estado = { ...estado, fase: "recuando", restanteMs: 2 * viagemCidade + curaMs, monstroId: null, vidaMonstro: 0 };
    monstro = null;
    semEfeitosNoMonstro();
  };
  const deveRecuar = () => !limiar && recuoFracao > 0 && vida <= recuoFracao;
  /** F11: marcos do Bestiário dão dano extra contra a espécie (fora do Limiar). */
  const contra = (m: Monstro) => (limiar ? 1 : 1 + bonusBestiario(bestiario[m.id] ?? 0));
  const tem = (id: string) => (mochila[id] ?? 0) > 0 || Object.values(p0.equipados).includes(id);
  const abater = (m: Monstro) => {
    estado.abatesNaArea++;
    acumulado.abates[m.id] = (acumulado.abates[m.id] ?? 0) + 1;
    bestiario[m.id] = (bestiario[m.id] ?? 0) + 1;
    const ganhoXp = m.xp * fator(mods, "xp-personagem");
    if (nivel < config.nivelMaximo) acumulado.xp += ganhoXp;
    const r = aplicarXp(base, nivel, xp, ganhoXp, status, ganhos, config);
    nivel = r.nivel;
    xp = r.xp;
    const maestriaSubiu = praticarPassivas(hab, p0.passivasEquipadas, ["combate", "geral"], xpMaestria, acumulado.maestria);
    if (r.subiu || maestriaSubiu) recalcular();
    for (const d of m.drops) if (rng.flutuante() < d.chance) guardar(d.itemId, d.quantidade);
    if (limiar) {
      // Essência (× Eco) e, dos chefes, uma peça de O Retornado que ainda falte.
      const q = CONFIG_LIMIAR.essencia[m.tipo] * limiar.multiplicadorDrops;
      const inteiro = Math.floor(q);
      const ganho = inteiro + (rng.flutuante() < q - inteiro ? 1 : 0);
      essencia += ganho;
      acumulado.essencia += ganho;
      if (m.tipo === "chefe") {
        const faltam = (PECAS_POR_CHEFE[m.id] ?? []).filter((id) => !tem(id));
        if (rng.flutuante() < CONFIG_LIMIAR.chancePecaRetornado && faltam.length > 0) guardar(faltam[rng.inteiro(0, faltam.length - 1)]!, 1);
      }
    } else {
      if (rng.flutuante() < m.chanceEquipamento) guardar(equipamentosDoTier[rng.inteiro(0, equipamentosDoTier.length - 1)]!.id, 1);
      if (rng.flutuante() < m.chanceLivro) guardar(LIVROS[rng.inteiro(0, LIVROS.length - 1)]!.id, 1);
      // F8: chefes de área deixam fragmentos (receitas de nomeados).
      if (m.tipo === "chefe" && rng.flutuante() < CHANCE_FRAGMENTO) guardar(FRAGMENTO, 1);
    }
    // F10: domar (com Laço de doma na mochila e vaga no Estábulo).
    const domavel = DOMAVEIS.get(m.id);
    if (domavel && !limiar && (mochila[LACO_DE_DOMA] ?? 0) > 0 && pets.filter((x) => especieDe(x).tipo === "real").length < CONFIG_PETS.maximo) {
      if (rng.flutuante() < CONFIG_PETS.chanceDomar * fator(mods, "pets.domar")) {
        mochila = { ...mochila, [LACO_DE_DOMA]: mochila[LACO_DE_DOMA]! - 1 };
        if (mochila[LACO_DE_DOMA] === 0) delete (mochila as Record<string, number>)[LACO_DE_DOMA];
        petsCriados++;
        pets = [...pets, novoPet(`pet-${petsCriados}`, domavel.id, domavel.nome)];
        acumulado.domados.push(domavel.id);
      }
    }
    // F8: relíquias (nomeadas, uma de cada).
    const reliquia = DROPS_RELIQUIA[m.id];
    if (reliquia && rng.flutuante() < reliquia.chance && !tem(reliquia.itemId)) guardar(reliquia.itemId, 1);
    estado = { ...estado, fase: "procurando", restanteMs: c.buscaMs, monstroId: null, vidaMonstro: 0 };
    monstro = null;
    semEfeitosNoMonstro();
    if (deveRecuar()) recuar();
  };
  /** Tenta disparar a primeira ativa pronta. Devolve `true` se o monstro morreu. */
  const usarAtiva = (m: Monstro): boolean => {
    for (const id of p0.ativasEquipadas) {
      if ((recargas[id] ?? 0) > 0) continue;
      const h = obter(CATALOGO.habilidades, id);
      const def = h.ativa!;
      const soCura = def.efeitos.every((x) => x.tipo === "cura");
      if (soCura && vida >= CURA_ABAIXO_DE) continue;
      const f = fatorMaestria(hab[id]?.maestria ?? 1);
      const sc = comReforcos(ajustar(statusComAura()), efeitos);
      for (const ef of def.efeitos) {
        if (ef.tipo === "golpe") {
          const critico = rng.flutuante() < sc.critico;
          estado.vidaMonstro -= dano(sc.ataque * ef.multiplicador * f * contra(m), monstroEnfraquecido(m, efeitos).defesa) * (critico ? c.multiplicadorCritico : 1);
        } else if (ef.tipo === "cura") {
          vida = Math.min(1, vida + ef.fracao * f);
        } else if (ef.tipo === "reforco") {
          efeitos.push({ habilidadeId: id, sobre: "personagem", alvo: ef.alvo, valor: ef.valor * f, restanteMs: ef.duracaoMs });
        } else if (ef.tipo === "enfraquecer") {
          efeitos.push({ habilidadeId: id, sobre: "monstro", alvo: ef.alvo, valor: ef.valor * f, restanteMs: ef.duracaoMs });
        } else {
          estado.recargaMonstroMs += ef.ms * f;
        }
      }
      recargas[id] = def.recargaMs;
      const n = ganharMaestria(hab, id, CONFIG_HABILIDADES.xpPorUsoAtiva * xpMaestria);
      if (n > 0) {
        acumulado.maestria[id] = (acumulado.maestria[id] ?? 0) + n;
        recalcular();
      }
      return estado.vidaMonstro <= 0;
    }
    return false;
  };

  const fim = (i: number) => (passos - i - 1) * c.passoMs + resto;
  const saida = (sobraMs: number, morteEm: number | null): SaidaCombate => ({
    personagem: { ...p0, nivel, xp, status, mochila, bestiario, habilidades: hab, vida, essencia, pets, petsCriados },
    combate: { ...estado, recargas, efeitos },
    progressoMs: sobraMs > 0 ? 0 : resto,
    sobraMs,
    morteEm,
    restanteLimiarMs: Math.max(0, restanteLimiar),
  });

  for (let i = 0; i < passos; i++) {
    // O tempo do Limiar corre a cada passo; acabou, sai (o passo i não acontece).
    if (limiar) {
      if (restanteLimiar <= 0) return saida(fim(i) + c.passoMs, null);
      restanteLimiar -= c.passoMs;
    }
    // Recargas e efeitos andam sempre.
    for (const id of Object.keys(recargas)) {
      const r = recargas[id]! - c.passoMs;
      if (r <= 0) delete recargas[id];
      else recargas[id] = r;
    }
    if (efeitos.length > 0) efeitos = efeitos.map((x) => ({ ...x, restanteMs: x.restanteMs - c.passoMs })).filter((x) => x.restanteMs > 0);

    if (estado.fase === "procurando") {
      vida = Math.min(1, vida + (c.regenProcurandoPorSegundo * regen * c.passoMs) / 1000);
      estado.restanteMs -= c.passoMs;
      if (estado.restanteMs <= 0) {
        let id: string;
        if (limiar) {
          // No Limiar os chefes são raros e aleatórios (mais prováveis com o Eco).
          const chefe = rng.flutuante() < CONFIG_LIMIAR.chanceChefe * (1 + 0.5 * limiar.cargas);
          id = chefe ? CHEFES_LIMIAR[rng.inteiro(0, CHEFES_LIMIAR.length - 1)]! : rng.escolhaPonderada(COMUNS_LIMIAR.map((m) => ({ valor: m.monstroId, peso: m.peso })));
        } else {
          const chefe = (estado.abatesNaArea + 1) % area.abatesParaChefe === 0;
          // F11: à noite os raros aparecem mais (`combate.raro`).
          const fRaro = fator(mods, "combate.raro");
          id = chefe ? area.chefeId : rng.escolhaPonderada(area.monstros.map((m) => ({ valor: m.monstroId, peso: CATALOGO.monstros.get(m.monstroId)?.tipo === "raro" ? m.peso * fRaro : m.peso })));
        }
        monstro = monstroPorId(id);
        estado = { ...estado, fase: "lutando", restanteMs: 0, monstroId: id, vidaMonstro: monstro.vida, recargaPersonagemMs: c.passoMs, recargaMonstroMs: monstro.intervaloMs };
      }
      continue;
    }
    if (estado.fase === "recompondo") {
      estado.restanteMs -= c.passoMs;
      if (estado.restanteMs <= 0) {
        vida = 1;
        estado = { ...estado, fase: "lutando", restanteMs: 0, recargaPersonagemMs: c.passoMs, recargaMonstroMs: monstro!.intervaloMs };
      }
      continue;
    }
    if (estado.fase === "recuando") {
      estado.restanteMs -= c.passoMs;
      if (estado.restanteMs <= 0) {
        vida = 1;
        estado = { ...estado, fase: "procurando", restanteMs: c.buscaMs };
      }
      continue;
    }
    // Lutando: ativas, ataque básico, ataque do monstro.
    const m = monstro!;
    if (usarAtiva(m)) {
      abater(m);
      continue;
    }
    const sc = comReforcos(ajustar(statusComAura()), efeitos);
    estado.recargaPersonagemMs -= c.passoMs;
    if (estado.recargaPersonagemMs <= 0) {
      estado.recargaPersonagemMs += sc.intervaloMs;
      const critico = rng.flutuante() < sc.critico;
      estado.vidaMonstro -= dano(sc.ataque * contra(m), monstroEnfraquecido(m, efeitos).defesa) * (critico ? c.multiplicadorCritico : 1);
      if (estado.vidaMonstro <= 0) {
        abater(m);
        continue;
      }
    }
    // F8: poção automática com a vida abaixo de 40% (a melhor que houver na mochila; recarga de 10 s).
    if (vida < CONFIG_COMBATE.pocaoAbaixoDe && (recargas[CHAVE_POCAO] ?? 0) <= 0) {
      const pocao = POCOES.find((x) => (mochila[x.id] ?? 0) > 0);
      if (pocao) {
        mochila = { ...mochila, [pocao.id]: mochila[pocao.id]! - 1 };
        if (mochila[pocao.id] === 0) delete (mochila as Record<string, number>)[pocao.id];
        vida = Math.min(1, vida + pocao.consumivel!.cura!);
        recargas[CHAVE_POCAO] = CONFIG_COMBATE.recargaPocaoMs;
      }
    }
    estado.recargaMonstroMs -= c.passoMs;
    if (estado.recargaMonstroMs <= 0) {
      estado.recargaMonstroMs += m.intervaloMs;
      if (rng.flutuante() >= sc.esquiva) vida -= dano(monstroEnfraquecido(m, efeitos).ataque, sc.defesa) / sc.vidaMax;
      if (vida <= 0) {
        if (limiar) {
          // No Limiar não há segunda morte: o personagem se recompõe e volta a lutar
          // contra o mesmo monstro, que continua ferido.
          estado = { ...estado, fase: "recompondo", restanteMs: CONFIG_LIMIAR.recomporMs };
          vida = 0.01;
          continue;
        }
        // Morte: o chamador leva o personagem ao Limiar.
        acumulado.mortes++;
        return saida(fim(i), e.tempoInicio - e.progressoMs + (i + 1) * c.passoMs);
      }
      if (deveRecuar()) recuar();
    }
  }

  if (limiar && restanteLimiar <= 0) return saida(resto, null);
  return saida(0, null);
}
