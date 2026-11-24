/**
 * Ações de habilidades (F5): equipar, prioridade, ramo do core, livros e
 * Aprendizado. Como as outras ações, avançam o tempo até `agora` antes.
 */
import { comAtivo, erro, falha, moverPara, naCidade, precoDeCompra, type ResultadoAtividade } from "../atividades/acoes";
import { ATIVIDADE_APRENDIZADO, CATALOGO } from "../dados";
import { adicionarItens, capacidadeMochila, removerItens } from "../personagem/mochila";
import { modificadoresDoPersonagem } from "../personagem/progressao";
import type { EstadoJogo } from "../save";
import { CONFIG_HABILIDADES, slotsPassivas } from "./maestria";

/** Equipa uma habilidade conhecida no fim da lista (menor prioridade). */
export function equiparHabilidade(estado: EstadoJogo, habilidadeId: string, agora: number): ResultadoAtividade {
  const h = CATALOGO.habilidades.get(habilidadeId);
  if (!h) return falha("habilidade_inexistente", "Habilidade desconhecida.");
  return comAtivo(estado, agora, (p) => {
    if (!p.habilidades[habilidadeId]) return erro("habilidade_desconhecida", "O personagem não sabe essa habilidade.");
    if (h.modo === "ativa") {
      if (p.ativasEquipadas.includes(habilidadeId)) return erro("ja_equipada", "Já está equipada.");
      if (p.ativasEquipadas.length >= CONFIG_HABILIDADES.slotsAtivas) return erro("slots_cheios", `São ${CONFIG_HABILIDADES.slotsAtivas} slots de ativa.`);
      return { ...p, ativasEquipadas: [...p.ativasEquipadas, habilidadeId] };
    }
    if (p.passivasEquipadas.includes(habilidadeId)) return erro("ja_equipada", "Já está equipada.");
    const slots = slotsPassivas(p);
    if (p.passivasEquipadas.length >= slots) return erro("slots_cheios", `São ${slots} slots de passiva neste nível.`);
    return { ...p, passivasEquipadas: [...p.passivasEquipadas, habilidadeId] };
  });
}

/** Tira a habilidade do slot. A recarga dela continua correndo. */
export function desequiparHabilidade(estado: EstadoJogo, habilidadeId: string, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    if (p.ativasEquipadas.includes(habilidadeId)) return { ...p, ativasEquipadas: p.ativasEquipadas.filter((x) => x !== habilidadeId) };
    if (p.passivasEquipadas.includes(habilidadeId)) return { ...p, passivasEquipadas: p.passivasEquipadas.filter((x) => x !== habilidadeId) };
    return erro("nao_equipada", "Essa habilidade não está equipada.");
  });
}

/** Sobe (−1) ou desce (+1) uma ativa na ordem de prioridade. */
export function moverPrioridade(estado: EstadoJogo, habilidadeId: string, direcao: -1 | 1, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const i = p.ativasEquipadas.indexOf(habilidadeId);
    if (i < 0) return erro("nao_equipada", "Essa ativa não está equipada.");
    const j = i + direcao;
    if (j < 0 || j >= p.ativasEquipadas.length) return p;
    const lista = [...p.ativasEquipadas];
    [lista[i], lista[j]] = [lista[j]!, lista[i]!];
    return { ...p, ativasEquipadas: lista };
  });
}

/** Escolhe o ramo do core (uma vez, a partir do nível 10) e aprende a técnica dele. */
export function escolherRamo(estado: EstadoJogo, ramoId: string, agora: number): ResultadoAtividade {
  const r = CATALOGO.ramos.get(ramoId);
  if (!r) return falha("ramo_inexistente", "Ramo desconhecido.");
  return comAtivo(estado, agora, (p) => {
    if (r.coreId !== p.coreId) return erro("ramo_inexistente", "Esse ramo é de outro core.");
    if (p.ramoId) return erro("ramo_ja_escolhido", "O ramo já foi escolhido.");
    if (p.nivel < CONFIG_HABILIDADES.nivelRamo) return erro("nivel_insuficiente", `Os ramos se abrem no nível ${CONFIG_HABILIDADES.nivelRamo}.`);
    return { ...p, ramoId: r.id, habilidades: { ...p.habilidades, [r.habilidadeId]: { maestria: 1, xp: 0 } } };
  });
}

/** Lê um livro da mochila: aprende a habilidade e o livro some. */
export function lerLivro(estado: EstadoJogo, itemId: string, agora: number): ResultadoAtividade {
  const livro = CATALOGO.itens.get(itemId)?.livro;
  if (!livro) return falha("nao_e_livro", "Isso não é um livro.");
  return comAtivo(estado, agora, (p) => {
    if ((p.mochila[itemId] ?? 0) < 1) return erro("quantidade_invalida", "O livro não está na mochila.");
    if (p.habilidades[livro.habilidadeId]) return erro("habilidade_ja_conhecida", "O personagem já sabe essa habilidade.");
    return { ...p, mochila: removerItens(p.mochila, itemId, 1), habilidades: { ...p.habilidades, [livro.habilidadeId]: { maestria: 1, xp: 0 } } };
  });
}

/** Compra um livro no Mercado (vai para a mochila). */
export function comprarLivro(estado: EstadoJogo, itemId: string, agora: number): ResultadoAtividade {
  const livro = CATALOGO.itens.get(itemId)?.livro;
  if (!livro) return falha("nao_e_livro", "O Mercado não vende isso.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const preco = precoDeCompra(p, livro.precoCompra);
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    const r = adicionarItens(p.mochila, itemId, 1, capacidadeMochila(p.status.forca, modificadoresDoPersonagem(p, p.nivel)));
    if (r.aceitos === 0) return erro("mochila_cheia", "A mochila está cheia.");
    return { ...p, ouro: p.ouro - preco, mochila: r.mochila };
  });
}

/** Começa a praticar uma habilidade (atividade de Aprendizado, no Campo de Treino). */
export function iniciarAprendizado(estado: EstadoJogo, habilidadeId: string, agora: number): ResultadoAtividade {
  if (!CATALOGO.habilidades.has(habilidadeId)) return falha("habilidade_inexistente", "Habilidade desconhecida.");
  return comAtivo(estado, agora, (p) => {
    const prog = p.habilidades[habilidadeId];
    if (!prog) return erro("habilidade_desconhecida", "O personagem não sabe essa habilidade.");
    if (prog.maestria >= CONFIG_HABILIDADES.maestriaMaxima) return erro("maestria_maxima", "Essa habilidade já está na maestria máxima.");
    if (p.atividade?.id === ATIVIDADE_APRENDIZADO.id && p.atividade.habilidadeId === habilidadeId) {
      return erro("ja_na_atividade", "O personagem já está praticando essa habilidade.");
    }
    const a = ATIVIDADE_APRENDIZADO;
    return { ...p, ...moverPara(p, a.localId, a.subareaId), atividade: { id: a.id, progressoMs: 0, habilidadeId } };
  });
}
