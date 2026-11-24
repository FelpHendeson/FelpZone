/**
 * Combate por área (GDD §7): passos de 0,5 s, iguais com o jogo aberto ou
 * fechado. O estado da luta fica no save; os sorteios (aparição, crítico,
 * esquiva, drops) usam o RNG do save, sempre na mesma ordem, então dividir o
 * tempo em partes dá o mesmo resultado.
 */
import { CATALOGO, EQUIPAMENTOS, obter, type StatusId } from "../dados";
import type { AtividadeCombate, Monstro } from "../dados/combate";
import type { Modificador } from "../modificadores";
import { resumirModificadores } from "../modificadores";
import type { EstadoCombate, Personagem } from "../personagem/conta";
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
});

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
    esquiva: Math.min(c.esquivaMaxima, c.esquivaPorAgilidade * ef("agilidade")),
    critico: Math.min(c.criticoMaximo, c.criticoPorPercepcao * ef("percepcao")),
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
  return { fase: "procurando", restanteMs: CONFIG_COMBATE.buscaMs, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0 };
}

/** O que o combate acumula durante um avanço. */
export interface AcumuladoCombate {
  abates: Record<string, number>;
  itens: Record<string, number>;
  itensPerdidos: number;
  xp: number;
  desmaios: number;
  recuos: number;
}

export interface EntradaCombate {
  readonly personagem: Personagem;
  readonly area: AtividadeCombate;
  readonly status: Record<StatusId, number>;
  readonly ganhos: Record<StatusId, number>;
  readonly ms: number;
  readonly rng: Rng;
  readonly acumulado: AcumuladoCombate;
  readonly config?: ConfigProgressao;
}

/**
 * Simula `ms` de combate a partir do estado salvo. Devolve o personagem novo
 * e quantos ms sobraram depois de um desmaio (para o chamador tratar como
 * tempo ocioso), ou 0.
 */
export function avancarCombate(e: EntradaCombate): { personagem: Personagem; sobraMs: number } {
  const config = e.config ?? CONFIG_PROGRESSAO;
  const c = CONFIG_COMBATE;
  const p0 = e.personagem;
  const atividade = p0.atividade!;
  const area = e.area;
  const { status, ganhos, rng, acumulado } = e;
  // Cópia mutável durante a simulação; vira `EstadoCombate` (somente leitura) ao sair.
  let estado: { -readonly [K in keyof EstadoCombate]: EstadoCombate[K] } = { ...(atividade.combate ?? combateInicial()) };
  let vida = p0.vida;
  let nivel = p0.nivel;
  let xp = p0.xp;
  let mochila: Mochila = p0.mochila;
  const bestiario: Record<string, number> = { ...p0.bestiario };
  const total = atividade.progressoMs + Math.floor(e.ms);
  const passos = Math.floor(total / c.passoMs);
  const resto = total % c.passoMs;

  let mods: Modificador[] = [];
  let sc!: StatusDeCombate;
  let capacidade = 0;
  let monstro: Monstro | null = estado.monstroId ? obter(CATALOGO.monstros, estado.monstroId) : null;
  const recalcular = () => {
    mods = modificadoresDoPersonagem(p0, nivel);
    sc = statusDeCombate(status, mods);
    capacidade = capacidadeMochila(status.forca, mods);
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
  const recuar = () => {
    acumulado.recuos++;
    // Fugir do chefe faz ele ir embora: só volta depois de mais N abates.
    if (monstro?.tipo === "chefe") estado.abatesNaArea++;
    const curaMs = Math.ceil(((1 - vida) / c.regenForaPorSegundo) * 1000);
    estado = { ...estado, fase: "recuando", restanteMs: 2 * viagemCidade + curaMs, monstroId: null, vidaMonstro: 0 };
    monstro = null;
  };
  const deveRecuar = () => recuoFracao > 0 && vida <= recuoFracao;

  for (let i = 0; i < passos; i++) {
    if (estado.fase === "procurando") {
      vida = Math.min(1, vida + (c.regenProcurandoPorSegundo * c.passoMs) / 1000);
      estado.restanteMs -= c.passoMs;
      if (estado.restanteMs <= 0) {
        const chefe = (estado.abatesNaArea + 1) % area.abatesParaChefe === 0;
        const id = chefe ? area.chefeId : rng.escolhaPonderada(area.monstros.map((m) => ({ valor: m.monstroId, peso: m.peso })));
        monstro = obter(CATALOGO.monstros, id);
        estado = { ...estado, fase: "lutando", restanteMs: 0, monstroId: id, vidaMonstro: monstro.vida, recargaPersonagemMs: c.passoMs, recargaMonstroMs: monstro.intervaloMs };
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
    // Lutando.
    const m = monstro!;
    estado.recargaPersonagemMs -= c.passoMs;
    if (estado.recargaPersonagemMs <= 0) {
      estado.recargaPersonagemMs += sc.intervaloMs;
      const critico = rng.flutuante() < sc.critico;
      estado.vidaMonstro -= dano(sc.ataque, m.defesa) * (critico ? c.multiplicadorCritico : 1);
      if (estado.vidaMonstro <= 0) {
        // Abate: XP, drops e bestiário.
        estado.abatesNaArea++;
        acumulado.abates[m.id] = (acumulado.abates[m.id] ?? 0) + 1;
        bestiario[m.id] = (bestiario[m.id] ?? 0) + 1;
        const ganhoXp = m.xp * fator(mods, "xp-personagem");
        if (nivel < config.nivelMaximo) acumulado.xp += ganhoXp;
        const r = aplicarXp(p0, nivel, xp, ganhoXp, status, ganhos, config);
        nivel = r.nivel;
        xp = r.xp;
        if (r.subiu) recalcular();
        for (const d of m.drops) if (rng.flutuante() < d.chance) guardar(d.itemId, d.quantidade);
        if (rng.flutuante() < m.chanceEquipamento) guardar(equipamentosDoTier[rng.inteiro(0, equipamentosDoTier.length - 1)]!.id, 1);
        estado = { ...estado, fase: "procurando", restanteMs: c.buscaMs, monstroId: null, vidaMonstro: 0 };
        monstro = null;
        if (deveRecuar()) recuar();
        continue;
      }
    }
    estado.recargaMonstroMs -= c.passoMs;
    if (estado.recargaMonstroMs <= 0) {
      estado.recargaMonstroMs += m.intervaloMs;
      if (rng.flutuante() >= sc.esquiva) vida -= dano(m.ataque, sc.defesa) / sc.vidaMax;
      if (vida <= 0) {
        // Desmaio (o Limiar chega na F6): acorda em Pedravau, ocioso, sem perder nada.
        acumulado.desmaios++;
        const sobra = (passos - i - 1) * c.passoMs + resto;
        return {
          personagem: {
            ...p0,
            nivel,
            xp,
            status,
            mochila,
            bestiario,
            vida: c.vidaAoAcordar,
            atividade: null,
            localId: c.localDeDesmaio.localId,
            subareaId: c.localDeDesmaio.subareaId,
            viagem: null,
          },
          sobraMs: sobra,
        };
      }
      if (deveRecuar()) recuar();
    }
  }

  return {
    personagem: { ...p0, nivel, xp, status, mochila, bestiario, vida, atividade: { ...atividade, progressoMs: resto, combate: estado } },
    sobraMs: 0,
  };
}
