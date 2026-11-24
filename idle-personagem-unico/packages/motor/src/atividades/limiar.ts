/**
 * O Limiar (GDD §10): entrar ao morrer, sair quando o tempo acaba (ou pagando
 * o Barqueiro) e retomar a atividade anterior. Números em `CONFIG_LIMIAR`.
 */
import { CATALOGO, CONFIG_LIMIAR, SINERGIAS_LIMIAR } from "../dados";
import type { EstadoLimiar, Personagem } from "../personagem/conta";
import { fator, modificadoresDoPersonagem } from "../personagem/progressao";
import { combateInicial, CONFIG_COMBATE } from "./combate";
import { duracaoViagemMs } from "./viagem";

const DEVEDOR = "devedor-do-barqueiro";

function ehDevedor(p: Pick<Personagem, "origem">): boolean {
  return p.origem.tipo === "especial" && p.origem.id === DEVEDOR;
}

/** Janela do Eco da Morte (o Devedor do Barqueiro esquece mais rápido). */
export function janelaEco(p: Pick<Personagem, "origem">): number {
  return ehDevedor(p) ? CONFIG_LIMIAR.janelaEcoDevedorMs : CONFIG_LIMIAR.janelaEcoMs;
}

/** Cargas do Eco num instante: outras mortes dentro da janela (até 5). */
export function cargasEco(p: Pick<Personagem, "origem" | "mortesRecentes">, agora: number): number {
  const janela = janelaEco(p);
  return Math.min(CONFIG_LIMIAR.ecoMaximo, p.mortesRecentes.filter((t) => t <= agora && agora - t < janela).length);
}

/** Bônus de raça e core no Limiar (Sangue-Pálido, Ser das Trevas). */
export function sinergiaLimiar(p: Pick<Personagem, "racaId" | "coreId">): { duracao: number; ataque: number } {
  let duracao = 0;
  let ataque = 0;
  for (const s of SINERGIAS_LIMIAR) {
    if ((s.tipo === "raca" && s.id === p.racaId) || (s.tipo === "core" && s.id === p.coreId)) {
      duracao += s.duracao;
      ataque += s.ataque;
    }
  }
  return { duracao, ataque };
}

/** Duração da estadia: (base + perigo da área) × (1 + Eco) × reduções. */
export function duracaoDoLimiar(p: Personagem, nivelDaArea: number, cargas: number): number {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const base = CONFIG_LIMIAR.duracaoBaseMs + CONFIG_LIMIAR.duracaoPorNivelDaAreaMs * nivelDaArea;
  const f = (1 + CONFIG_LIMIAR.ecoDuracaoPorCarga * cargas) * fator(mods, "duracao-limiar") * Math.max(0.1, 1 + sinergiaLimiar(p).duracao);
  return Math.max(60_000, Math.round(base * f));
}

/** Morte: o personagem atravessa para o Limiar; a atividade fica guardada para depois. */
export function entrarNoLimiar(p: Personagem, nivelDaArea: number, instante: number): Personagem {
  const cargas = cargasEco(p, instante);
  const janela = janelaEco(p);
  const recentes = [...p.mortesRecentes.filter((t) => t <= instante && instante - t < janela), instante].slice(-10);
  const duracao = duracaoDoLimiar(p, nivelDaArea, cargas);
  const a = p.atividade;
  const limiar: EstadoLimiar = {
    restanteMs: duracao,
    totalMs: duracao,
    nivelEntrada: p.nivel,
    cargasEco: cargas,
    retorno: a ? (a.habilidadeId ? { id: a.id, habilidadeId: a.habilidadeId } : { id: a.id }) : null,
    combate: combateInicial(),
    progressoMs: 0,
  };
  return { ...p, limiar, atividade: null, viagem: null, vida: 1, mortes: p.mortes + 1, mortesRecentes: recentes };
}

/** Opções do combate no Limiar para este personagem. */
export function opcoesDoLimiar(p: Personagem) {
  const l = p.limiar!;
  const s = sinergiaLimiar(p);
  return {
    nivel: l.nivelEntrada,
    cargas: l.cargasEco,
    fatorAtaque: CONFIG_LIMIAR.fatorAtributos * (1 + s.ataque),
    fatorDefesa: CONFIG_LIMIAR.fatorAtributos,
    multiplicadorDrops: 1 + CONFIG_LIMIAR.ecoDropsPorCarga * l.cargasEco,
    restanteMs: l.restanteMs,
  };
}

/**
 * Sai do Limiar: acorda em Pedravau com a vida cheia e retoma a atividade
 * anterior (com viagem, se ela for em outro local).
 */
export function sairDoLimiar(p: Personagem): Personagem {
  const retorno = p.limiar?.retorno ?? null;
  const naCidade: Personagem = { ...p, limiar: null, localId: CONFIG_COMBATE.localDeDesmaio.localId, subareaId: CONFIG_COMBATE.localDeDesmaio.subareaId, viagem: null, vida: 1, atividade: null };
  if (!retorno) return naCidade;
  const a = CATALOGO.atividades.get(retorno.id);
  if (!a) return naCidade;
  const atividade =
    a.tipo === "combate"
      ? { id: a.id, progressoMs: 0, combate: combateInicial() }
      : retorno.habilidadeId
        ? { id: a.id, progressoMs: 0, habilidadeId: retorno.habilidadeId }
        : { id: a.id, progressoMs: 0 };
  if (a.localId === naCidade.localId) return { ...naCidade, subareaId: a.subareaId, atividade };
  const total = duracaoViagemMs(naCidade.localId, a.localId, modificadoresDoPersonagem(p, p.nivel));
  return {
    ...naCidade,
    atividade,
    viagem: { origemLocalId: naCidade.localId, destinoLocalId: a.localId, destinoSubareaId: a.subareaId, totalMs: total, restanteMs: total },
  };
}

/** Pedágio do Barqueiro: Essência por minuto restante. O Devedor sai de graça na primeira vez. */
export function custoDoPedagio(p: Personagem): number {
  if (!p.limiar) return 0;
  if (ehDevedor(p) && !p.pedagioGratisUsado) return 0;
  return Math.ceil(p.limiar.restanteMs / 60_000) * CONFIG_LIMIAR.essenciaPorMinuto;
}

/** Títulos conquistados por mortes (o bônus dos títulos chega na F11). */
export function titulosPorMortes(mortes: number): { id: string; nome: string; mortes: number; conquistado: boolean }[] {
  return CONFIG_LIMIAR.titulos.map((t) => ({ ...t, conquistado: mortes >= t.mortes }));
}

export { ehDevedor };
