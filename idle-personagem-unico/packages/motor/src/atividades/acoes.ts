/**
 * Ações do personagem ativo: atividade (uma por vez [Autor]), viagem, venda e
 * compra. Toda ação primeiro avança o tempo até `agora`.
 */
import { CATALOGO, obter, SLOTS, type Slot } from "../dados";
import type { Personagem, Viagem } from "../personagem/conta";
import { adicionarItens, capacidadeMochila, removerItens } from "../personagem/mochila";
import { fator, modificadoresDoPersonagem } from "../personagem/progressao";
import type { EstadoJogo } from "../save";
import { avancar, duracaoViagemMs, nivelEfetivoOficio, type ResumoAvanco } from "./ciclos";
import { combateInicial, CONFIG_COMBATE } from "./combate";

/** Local onde ficam o Mercado e o Ferreiro. */
export const LOCAL_CIDADE = "pedravau";

export type CodigoErroAtividade =
  | "sem_personagem"
  | "atividade_inexistente"
  | "ja_na_atividade"
  | "ja_ocioso"
  | "nivel_oficio_insuficiente"
  | "local_inexistente"
  | "ja_no_local"
  | "fora_da_cidade"
  | "item_inexistente"
  | "quantidade_invalida"
  | "mochila_vazia"
  | "ferramenta_inexistente"
  | "ferramenta_nao_melhora"
  | "ouro_insuficiente"
  | "nao_e_equipamento"
  | "slot_inexistente"
  | "slot_vazio"
  | "mochila_cheia"
  | "recuo_invalido"
  | "habilidade_inexistente"
  | "habilidade_desconhecida"
  | "habilidade_ja_conhecida"
  | "habilidade_obrigatoria"
  | "slots_cheios"
  | "nao_equipada"
  | "ja_equipada"
  | "ramo_inexistente"
  | "ramo_ja_escolhido"
  | "nivel_insuficiente"
  | "nao_e_livro"
  | "maestria_maxima";

export interface ErroAtividade {
  readonly codigo: CodigoErroAtividade;
  readonly mensagem: string;
}

export type ResultadoAtividade =
  | { readonly ok: true; readonly estado: EstadoJogo; readonly resumo: ResumoAvanco }
  | { readonly ok: false; readonly erro: ErroAtividade };

export function falha(codigo: CodigoErroAtividade, mensagem: string): ResultadoAtividade {
  return { ok: false, erro: { codigo, mensagem } };
}

/** Avança até agora e aplica `mudar` no personagem ativo (ou devolve o erro dele). */
export function comAtivo(
  estado: EstadoJogo,
  agora: number,
  mudar: (p: Personagem) => Personagem | ErroAtividade,
): ResultadoAtividade {
  if (!estado.conta.personagens.some((p) => p.id === estado.conta.personagemAtivoId)) {
    return falha("sem_personagem", "Não há personagem ativo.");
  }
  const { estado: avancado, resumo } = avancar(estado, agora);
  const id = avancado.conta.personagemAtivoId;
  const ativo = avancado.conta.personagens.find((p) => p.id === id)!;
  const novo = mudar(ativo);
  if ("codigo" in novo) return { ok: false, erro: novo };
  return {
    ok: true,
    estado: { ...avancado, conta: { ...avancado.conta, personagens: avancado.conta.personagens.map((p) => (p.id === id ? novo : p)) } },
    resumo,
  };
}

export const erro = (codigo: CodigoErroAtividade, mensagem: string): ErroAtividade => ({ codigo, mensagem });

/**
 * Leva o personagem a (local, subárea). Dentro do mesmo local é instantâneo;
 * entre locais, inicia uma viagem a partir do local onde ele está (durante uma
 * viagem, ele ainda está na origem: mudar o destino recomeça a viagem dali, e
 * voltar à origem cancela a viagem).
 */
export function moverPara(p: Personagem, localId: string, subareaId: string): Pick<Personagem, "localId" | "subareaId" | "viagem"> {
  if (localId === p.localId) return { localId, subareaId, viagem: null };
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const total = duracaoViagemMs(p.localId, localId, mods);
  const viagem: Viagem = { origemLocalId: p.localId, destinoLocalId: localId, destinoSubareaId: subareaId, totalMs: total, restanteMs: total };
  return { localId: p.localId, subareaId: p.subareaId, viagem };
}

/**
 * Começa (ou troca para) uma atividade. Se ela é em outro local, o personagem
 * viaja até lá e o ciclo só começa ao chegar [Autor]. O ciclo parcial da
 * atividade anterior é descartado [Proposta].
 */
export function iniciarAtividade(estado: EstadoJogo, atividadeId: string, agora: number): ResultadoAtividade {
  const a = CATALOGO.atividades.get(atividadeId);
  if (!a) return falha("atividade_inexistente", "Atividade desconhecida.");
  return comAtivo(estado, agora, (p) => {
    if (a.tipo === "aprendizado") return erro("habilidade_obrigatoria", "Escolha a habilidade para praticar.");
    if (p.atividade?.id === atividadeId) return erro("ja_na_atividade", "O personagem já está nessa atividade.");
    if (a.tipo === "coleta") {
      const mods = modificadoresDoPersonagem(p, p.nivel);
      if (nivelEfetivoOficio(p, a.oficio, mods) < a.nivelMinimo) {
        return erro("nivel_oficio_insuficiente", `Exige ${a.nivelMinimo} no ofício.`);
      }
    }
    const atividade = a.tipo === "combate" ? { id: a.id, progressoMs: 0, combate: combateInicial() } : { id: a.id, progressoMs: 0 };
    return { ...p, ...moverPara(p, a.localId, a.subareaId), atividade };
  });
}

/** Para a atividade atual; o personagem fica ocioso onde está (uma viagem em curso continua). */
export function pararAtividade(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => (p.atividade ? { ...p, atividade: null } : erro("ja_ocioso", "O personagem já está ocioso.")));
}

/** Vai a um local sem atividade (por exemplo, à cidade para vender). Para a atividade atual. */
export function irPara(estado: EstadoJogo, localId: string, agora: number): ResultadoAtividade {
  const local = CATALOGO.locais.get(localId);
  if (!local) return falha("local_inexistente", "Local desconhecido.");
  return comAtivo(estado, agora, (p) => {
    const destinoAtual = p.viagem ? p.viagem.destinoLocalId : p.localId;
    if (destinoAtual === localId && !p.atividade) return erro("ja_no_local", `O personagem já está em ${local.nome}.`);
    return { ...p, ...moverPara(p, localId, local.subareas[0]!.id), atividade: null };
  });
}

export function naCidade(p: Personagem): boolean {
  return p.localId === LOCAL_CIDADE && p.viagem === null;
}

/** Preço de venda de uma quantidade, com `preco-venda`. Arredonda para baixo. */
export function precoDeVenda(p: Personagem, itemId: string, quantidade: number): number {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  return Math.floor(obter(CATALOGO.itens, itemId).preco * quantidade * fator(mods, "preco-venda"));
}

/** Preço de compra, com `preco-compra`. Arredonda para cima. */
export function precoDeCompra(p: Personagem, precoBase: number): number {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  return Math.ceil(precoBase * fator(mods, "preco-compra"));
}

/** Vende itens ao Mercado. Só na cidade (o movimento dentro dela é instantâneo). */
export function vender(estado: EstadoJogo, itemId: string, quantidade: number, agora: number): ResultadoAtividade {
  if (!CATALOGO.itens.has(itemId)) return falha("item_inexistente", "Item desconhecido.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const tem = p.mochila[itemId] ?? 0;
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > tem) return erro("quantidade_invalida", "Quantidade inválida.");
    return { ...p, mochila: removerItens(p.mochila, itemId, quantidade), ouro: p.ouro + precoDeVenda(p, itemId, quantidade) };
  });
}

/** Vende tudo da mochila (venda em lote, GDD §9.3). */
export function venderTudo(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const itens = Object.entries(p.mochila);
    if (itens.length === 0) return erro("mochila_vazia", "A mochila está vazia.");
    let ouro = p.ouro;
    for (const [id, q] of itens) ouro += precoDeVenda(p, id, q);
    return { ...p, mochila: {}, ouro };
  });
}

/** Compra uma ferramenta melhor no Ferreiro e a equipa (a antiga fica com ele). */
export function comprarFerramenta(estado: EstadoJogo, ferramentaId: string, agora: number): ResultadoAtividade {
  const f = CATALOGO.ferramentas.get(ferramentaId);
  if (!f || f.preco === 0) return falha("ferramenta_inexistente", "O Ferreiro não vende isso.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Ferreiro fica em Pedravau.");
    const atual = obter(CATALOGO.ferramentas, p.ferramentas[f.oficio]);
    if (f.grau <= atual.grau) return erro("ferramenta_nao_melhora", "Você já tem uma ferramenta igual ou melhor.");
    const mods = modificadoresDoPersonagem(p, p.nivel);
    if (nivelEfetivoOficio(p, f.oficio, mods) < f.nivelMinimo) return erro("nivel_oficio_insuficiente", `Exige ${f.nivelMinimo} no ofício.`);
    const preco = precoDeCompra(p, f.preco);
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    return { ...p, ouro: p.ouro - preco, ferramentas: { ...p.ferramentas, [f.oficio]: f.id } };
  });
}

// ------------------------------------------------------------ Equipamento de combate (F4)

function capacidadeDe(p: Personagem): number {
  return capacidadeMochila(p.status.forca, modificadoresDoPersonagem(p, p.nivel));
}

/** Equipa um item da mochila; o que estava no slot volta para a mochila. Vale em qualquer lugar. */
export function equipar(estado: EstadoJogo, itemId: string, agora: number): ResultadoAtividade {
  const item = CATALOGO.itens.get(itemId);
  if (!item) return falha("item_inexistente", "Item desconhecido.");
  const dados = item.equipamento;
  if (!dados) return falha("nao_e_equipamento", "Isso não se equipa.");
  return comAtivo(estado, agora, (p) => {
    if ((p.mochila[itemId] ?? 0) < 1) return erro("quantidade_invalida", "O item não está na mochila.");
    let mochila = removerItens(p.mochila, itemId, 1);
    const anterior = p.equipados[dados.slot];
    if (anterior) {
      const r = adicionarItens(mochila, anterior, 1, capacidadeDe(p));
      if (r.aceitos === 0) return erro("mochila_cheia", "Não há espaço na mochila para o item que sai.");
      mochila = r.mochila;
    }
    return { ...p, mochila, equipados: { ...p.equipados, [dados.slot]: itemId } };
  });
}

/** Tira o item de um slot e o guarda na mochila. */
export function desequipar(estado: EstadoJogo, slot: Slot, agora: number): ResultadoAtividade {
  if (!(SLOTS as readonly string[]).includes(slot)) return falha("slot_inexistente", "Slot desconhecido.");
  return comAtivo(estado, agora, (p) => {
    const atual = p.equipados[slot];
    if (!atual) return erro("slot_vazio", "Não há nada nesse slot.");
    const r = adicionarItens(p.mochila, atual, 1, capacidadeDe(p));
    if (r.aceitos === 0) return erro("mochila_cheia", "A mochila está cheia.");
    return { ...p, mochila: r.mochila, equipados: { ...p.equipados, [slot]: null } };
  });
}

/** Compra um equipamento no Ferreiro; ele vai para a mochila. */
export function comprarEquipamento(estado: EstadoJogo, itemId: string, agora: number): ResultadoAtividade {
  const item = CATALOGO.itens.get(itemId);
  const precoBase = item?.equipamento?.precoCompra;
  if (!item || precoBase === null || precoBase === undefined) return falha("item_inexistente", "O Ferreiro não vende isso.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Ferreiro fica em Pedravau.");
    const preco = precoDeCompra(p, precoBase);
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    const r = adicionarItens(p.mochila, itemId, 1, capacidadeDe(p));
    if (r.aceitos === 0) return erro("mochila_cheia", "A mochila está cheia.");
    return { ...p, ouro: p.ouro - preco, mochila: r.mochila };
  });
}

/** Define o recuo automático: recua para a cidade com vida ≤ percentual (0 = nunca recuar). */
export function definirRecuo(estado: EstadoJogo, percentual: number, agora: number): ResultadoAtividade {
  if (!Number.isSafeInteger(percentual) || percentual < 0 || percentual > CONFIG_COMBATE.recuoMaximo) {
    return falha("recuo_invalido", `O recuo vai de 0 a ${CONFIG_COMBATE.recuoMaximo}%.`);
  }
  return comAtivo(estado, agora, (p) => ({ ...p, recuoPercentual: percentual }));
}
