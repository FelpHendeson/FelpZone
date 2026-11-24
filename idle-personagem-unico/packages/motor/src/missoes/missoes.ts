/**
 * Missões e Guilda (GDD §11): progresso pelos contadores do personagem,
 * aceitar, entregar, abandonar e promover. O progresso de objetivos de
 * contador é "contador agora − contador quando começou", então avança sozinho
 * enquanto a atividade contribui, igual com o jogo aberto ou fechado.
 */
import { registrarNaCronica } from "../mundo/mundo";
import { comAtivo, erro, falha, type ResultadoAtividade } from "../atividades/acoes";
import { CATALOGO, CONFIG_GUILDA, OFICIOS, RANK_MAXIMO_ATO_I, RANKS, obter, type Missao, type Objetivo } from "../dados";
import type { Personagem } from "../personagem/conta";
import { adicionarItens, capacidadeMochila } from "../personagem/mochila";
import { aplicarXp, fator, modificadoresDoPersonagem } from "../personagem/progressao";
import type { EstadoJogo } from "../save";
import { ganhosZerados } from "../atividades/ciclos";

/** Valor atual do contador de um objetivo (ou o estado, para objetivos de estado). */
export function valorDoObjetivo(p: Personagem, o: Objetivo): number {
  switch (o.tipo) {
    case "abater":
      return o.monstros.length === 0
        ? Object.values(p.bestiario).reduce((s, n) => s + n, 0)
        : o.monstros.reduce((s, id) => s + (p.bestiario[id] ?? 0), 0);
    case "obter":
      return o.itens.reduce((s, id) => s + (p.obtidos[id] ?? 0), 0);
    case "treinar":
      return o.status ? (p.treinos[o.status] ?? 0) : Object.values(p.treinos).reduce((s, n) => s + n, 0);
    case "limiar":
      return p.mortes;
    case "nivel":
      return p.nivel;
    case "oficio":
      return o.oficio ? p.oficios[o.oficio].nivel : Math.max(...OFICIOS.map((x) => p.oficios[x].nivel));
    case "maestria":
      return Math.max(0, ...Object.values(p.habilidades).map((h) => h.maestria));
  }
}

/** Objetivos que contam a partir do momento em que a missão começa. */
export function ehContador(o: Objetivo): boolean {
  return o.tipo === "abater" || o.tipo === "obter" || o.tipo === "treinar" || o.tipo === "limiar";
}

export function alvoDoObjetivo(o: Objetivo): number {
  switch (o.tipo) {
    case "abater":
    case "obter":
      return o.quantidade;
    case "treinar":
      return o.ciclos;
    case "limiar":
      return o.vezes;
    case "nivel":
    case "oficio":
      return o.nivel;
    case "maestria":
      return o.maestria;
  }
}

/** Progresso de uma missão ativa: `atual` de `alvo`. */
export function progressoDaMissao(p: Personagem, id: string): { atual: number; alvo: number; completa: boolean } {
  const m = obter(CATALOGO.missoes, id);
  const ativa = p.missoes.ativas.find((a) => a.id === id);
  const base = ativa?.base ?? 0;
  const alvo = alvoDoObjetivo(m.objetivo);
  const valor = valorDoObjetivo(p, m.objetivo);
  const atual = Math.min(alvo, ehContador(m.objetivo) ? valor - base : valor);
  return { atual, alvo, completa: atual >= alvo };
}

/** A missão pode ser aceita agora (requisitos, rank, repetição)? */
export function podeAceitar(p: Personagem, m: Missao, agora: number): { ok: boolean; motivo?: string } {
  if (p.missoes.ativas.some((a) => a.id === m.id)) return { ok: false, motivo: "Já está ativa." };
  const vezes = p.missoes.concluidas[m.id] ?? 0;
  if (vezes > 0 && !m.repetivel) return { ok: false, motivo: "Já concluída." };
  const espera = p.missoes.disponivelEm[m.id] ?? 0;
  if (espera > agora) return { ok: false, motivo: "Volta ao quadro mais tarde." };
  for (const req of m.requisitos.missoes ?? []) if (!p.missoes.concluidas[req]) return { ok: false, motivo: "Exige uma missão anterior." };
  if (m.requisitos.nivel && p.nivel < m.requisitos.nivel) return { ok: false, motivo: `Exige nível ${m.requisitos.nivel}.` };
  if (m.tipo === "guilda" && m.rank !== undefined && m.rank > p.guilda.rank) return { ok: false, motivo: `Exige rank ${RANKS[m.rank]}.` };
  if (m.tipo === "guilda" && m.rank !== undefined && m.rank < p.guilda.rank - 1) return { ok: false, motivo: "Abaixo do seu rank." };
  if (m.tipo === "prova" && m.rank !== p.guilda.rank) return { ok: false, motivo: "Não é a prova do seu rank." };
  if (m.tipo === "meta") return { ok: false, motivo: "Metas começam sozinhas." };
  if (m.tipo === "arco" && p.origem.id !== m.requisitos.origemId) return { ok: false, motivo: "Não é a sua história." };
  if (p.missoes.ativas.length >= CONFIG_GUILDA.maximoAtivas) return { ok: false, motivo: `No máximo ${CONFIG_GUILDA.maximoAtivas} missões ativas.` };
  return { ok: true };
}

/** O personagem está onde a missão é dada/entregue? NPC: no local dele; guilda e prova: em Pedravau. */
export function estaNoLugar(p: Personagem, m: Missao): boolean {
  if (p.viagem) return false;
  if (m.tipo === "npc") return p.localId === obter(CATALOGO.npcs, m.npcId!).localId;
  if (m.tipo === "guilda" || m.tipo === "prova") return p.localId === "pedravau";
  return true;
}

function nomeDoLugar(m: Missao): string {
  if (m.tipo === "npc") {
    const n = obter(CATALOGO.npcs, m.npcId!);
    return `${n.nome} fica em ${obter(CATALOGO.locais, n.localId).nome}`;
  }
  return "A Guilda fica em Pedravau";
}

/** Aceita uma missão de NPC, da guilda ou uma prova. */
export function aceitarMissao(estado: EstadoJogo, missaoId: string, agora: number): ResultadoAtividade {
  const m = CATALOGO.missoes.get(missaoId);
  if (!m) return falha("missao_inexistente", "Missão desconhecida.");
  return comAtivo(estado, agora, (p) => {
    const pode = podeAceitar(p, m, agora);
    if (!pode.ok) return erro("missao_indisponivel", pode.motivo ?? "Indisponível.");
    if (!estaNoLugar(p, m)) return erro("fora_do_lugar", `${nomeDoLugar(m)}.`);
    const base = ehContador(m.objetivo) ? valorDoObjetivo(p, m.objetivo) : 0;
    return { ...p, missoes: { ...p.missoes, ativas: [...p.missoes.ativas, { id: m.id, base }] } };
  });
}

/** Desiste de uma missão (metas não se abandonam). */
export function abandonarMissao(estado: EstadoJogo, missaoId: string, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const m = CATALOGO.missoes.get(missaoId);
    if (!m || !p.missoes.ativas.some((a) => a.id === missaoId)) return erro("missao_inativa", "Essa missão não está ativa.");
    if (m.tipo === "meta") return erro("missao_indisponivel", "Metas não se abandonam.");
    return { ...p, missoes: { ...p.missoes, ativas: p.missoes.ativas.filter((a) => a.id !== missaoId) } };
  });
}

/** Entrega uma missão completa e recebe a recompensa. A próxima meta começa sozinha. */
export function entregarMissao(estado: EstadoJogo, missaoId: string, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const m = CATALOGO.missoes.get(missaoId);
    if (!m || !p.missoes.ativas.some((a) => a.id === missaoId)) return erro("missao_inativa", "Essa missão não está ativa.");
    if (!progressoDaMissao(p, missaoId).completa) return erro("missao_incompleta", "A missão ainda não foi cumprida.");
    if (!estaNoLugar(p, m)) return erro("fora_do_lugar", `${nomeDoLugar(m)}.`);
    // Itens primeiro: se não couberem, nada é entregue.
    let mochila = p.mochila;
    const capacidade = capacidadeMochila(p.status.forca, modificadoresDoPersonagem(p, p.nivel));
    for (const it of m.recompensa.itens) {
      const r = adicionarItens(mochila, it.itemId, it.quantidade, capacidade);
      if (r.perdidos > 0) return erro("mochila_cheia", "Abra espaço na mochila para a recompensa.");
      mochila = r.mochila;
    }
    const status = { ...p.status };
    const xp = m.recompensa.xp * fator(modificadoresDoPersonagem(p, p.nivel), "xp-personagem");
    const r = aplicarXp(p, p.nivel, p.xp, xp, status, ganhosZerados());
    const concluidas = { ...p.missoes.concluidas, [m.id]: (p.missoes.concluidas[m.id] ?? 0) + 1 };
    let ativas = p.missoes.ativas.filter((a) => a.id !== m.id);
    const disponivelEm = { ...p.missoes.disponivelEm };
    if (m.repetivel) disponivelEm[m.id] = agora + CONFIG_GUILDA.esperaRepetivelMs;
    let novo: Personagem = {
      ...p,
      nivel: r.nivel,
      xp: r.xp,
      status,
      mochila,
      ouro: p.ouro + m.recompensa.ouro,
      guilda: { ...p.guilda, merito: p.guilda.merito + m.recompensa.merito },
      missoes: { ativas, concluidas, disponivelEm },
    };
    // F11: capítulos de arco entram na Crônica.
    if (m.tipo === "arco") novo = registrarNaCronica(novo, agora, `Capítulo concluído: ${m.titulo}.`);
    // A próxima meta começa sozinha (com o contador de agora).
    if (m.tipo === "meta") {
      const proxima = [...CATALOGO.missoes.values()].find((x) => x.tipo === "meta" && x.requisitos.missoes?.[0] === m.id);
      if (proxima) {
        ativas = [...ativas, { id: proxima.id, base: ehContador(proxima.objetivo) ? valorDoObjetivo(novo, proxima.objetivo) : 0 }];
        novo = { ...novo, missoes: { ...novo.missoes, ativas } };
      }
    }
    return novo;
  });
}

/** Mérito para subir do rank atual (ou `null` no topo do Ato I). */
export function meritoParaSubir(rank: number): number | null {
  return rank >= RANK_MAXIMO_ATO_I ? null : (CONFIG_GUILDA.meritoParaSubir[rank] ?? null);
}

/** Promove na guilda: exige Mérito e a prova de promoção do rank concluída. */
export function promover(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const custo = meritoParaSubir(p.guilda.rank);
    if (custo === null) return erro("rank_maximo", "Rank máximo do Ato I.");
    if (p.localId !== "pedravau" || p.viagem) return erro("fora_do_lugar", "A Guilda fica em Pedravau.");
    if (p.guilda.merito < custo) return erro("merito_insuficiente", `Faltam ${custo - p.guilda.merito} de Mérito.`);
    const prova = `prova-${RANKS[p.guilda.rank]}`;
    if (!p.missoes.concluidas[prova]) return erro("prova_pendente", "Falta a prova de promoção.");
    return { ...p, guilda: { rank: p.guilda.rank + 1, merito: p.guilda.merito - custo } };
  });
}

/** Missões que o personagem pode ver agora, por tipo (para a interface). */
export function missoesVisiveis(p: Personagem, tipo: Missao["tipo"] | "guilda-e-prova", agora: number): { missao: Missao; ativa: boolean; pode: { ok: boolean; motivo?: string } }[] {
  return [...CATALOGO.missoes.values()]
    .filter((m) => (tipo === "guilda-e-prova" ? m.tipo === "guilda" || m.tipo === "prova" : m.tipo === tipo))
    // Arcos: só os da origem do personagem.
    .filter((m) => m.tipo !== "arco" || m.requisitos.origemId === p.origem.id)
    .map((m) => ({ missao: m, ativa: p.missoes.ativas.some((a) => a.id === m.id), pode: podeAceitar(p, m, agora) }));
}
