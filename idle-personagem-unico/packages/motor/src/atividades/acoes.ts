/**
 * Ações do personagem ativo: atividade (uma por vez [Autor]), viagem, venda e
 * compra. Toda ação primeiro avança o tempo até `agora`.
 */
import { CATALOGO, CONFIG_FUSAO, CONFIG_MOCHILA_EXTRA, obter, proximoAprimoramento, SLOTS, type Slot } from "../dados";
import { Rng } from "../rng";
import type { Personagem, Viagem } from "../personagem/conta";
import { adicionarItens, capacidadeMochila, removerItens } from "../personagem/mochila";
import { fator, modificadoresDoPersonagem, valorEfetivo } from "../personagem/progressao";
import type { EstadoJogo } from "../save";
import { avancar, duracaoViagemMs, nivelEfetivoOficio, type ResumoAvanco } from "./ciclos";
import { combateInicial, CONFIG_COMBATE } from "./combate";
import { custoDoPedagio, ehDevedor, sairDoLimiar } from "./limiar";

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
  | "maestria_maxima"
  | "no_limiar"
  | "fora_do_limiar"
  | "essencia_insuficiente"
  | "missao_inexistente"
  | "missao_indisponivel"
  | "missao_inativa"
  | "missao_incompleta"
  | "fora_do_lugar"
  | "rank_maximo"
  | "merito_insuficiente"
  | "prova_pendente"
  | "nao_funde"
  | "personagem_inexistente"
  | "ja_ativo"
  | "ja_tem_nomeado"
  | "nao_vende"
  | "fusao_maxima"
  | "itens_insuficientes"
  | "material_insuficiente"
  | "limite_de_compras"
  | "pet_inexistente"
  | "estabulo_cheio"
  | "nome_invalido"
  | "pet_espiritual"
  | "sincronia_incompleta"
  | "uniao_ativa"
  | "nao_vende_pet"
  | "slot_invalido"
  | "evento_inexistente"
  | "sem_comida"
  | "sem_lutas"
  | "ja_inscrito"
  | "torneio_pendente"
  | "sem_torneio"
  | "torneio_em_andamento";

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
  /** Ações que valem também no Limiar (equipar, habilidades, recuo, pedágio). */
  permitidaNoLimiar = false,
): ResultadoAtividade {
  if (!estado.conta.personagens.some((p) => p.id === estado.conta.personagemAtivoId)) {
    return falha("sem_personagem", "Não há personagem ativo.");
  }
  const { estado: avancado, resumo } = avancar(estado, agora);
  const id = avancado.conta.personagemAtivoId;
  const ativo = avancado.conta.personagens.find((p) => p.id === id)!;
  if (ativo.limiar && !permitidaNoLimiar) return falha("no_limiar", "No Limiar só se combate. Espere o tempo acabar ou pague o Barqueiro.");
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
    if (a.tipo === "coleta" || a.tipo === "producao") {
      const mods = modificadoresDoPersonagem(p, p.nivel);
      if (nivelEfetivoOficio(p, a.oficio, mods) < a.nivelMinimo) {
        return erro("nivel_oficio_insuficiente", `Exige ${a.nivelMinimo} no ofício.`);
      }
    }
    if (a.tipo === "producao" && CATALOGO.itens.get(a.saida.itemId)?.equipamento?.nomeado) {
      const id = a.saida.itemId;
      if ((p.mochila[id] ?? 0) > 0 || Object.values(p.equipados).includes(id)) return erro("ja_tem_nomeado", "Você já tem esse item nomeado.");
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
  if (!vendivel(itemId)) return falha("nao_vende", "Itens nomeados não se vendem.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const tem = p.mochila[itemId] ?? 0;
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > tem) return erro("quantidade_invalida", "Quantidade inválida.");
    return { ...p, mochila: removerItens(p.mochila, itemId, quantidade), ouro: p.ouro + precoDeVenda(p, itemId, quantidade) };
  });
}

/** Nomeados (e relíquias) não se vendem: são únicos. */
export function vendivel(itemId: string): boolean {
  return !CATALOGO.itens.get(itemId)?.equipamento?.nomeado;
}
/** O lote não leva poções (o combate as usa sozinho). */
function vaiNoLote(itemId: string): boolean {
  return vendivel(itemId) && CATALOGO.itens.get(itemId)?.consumivel?.tipo !== "pocao";
}

/** Vende tudo da mochila (venda em lote, GDD §9.3), menos nomeados e poções. */
export function venderTudo(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const itens = Object.entries(p.mochila).filter(([id]) => vaiNoLote(id));
    if (itens.length === 0) return erro("mochila_vazia", "Não há nada para vender no lote.");
    let ouro = p.ouro;
    let mochila = p.mochila;
    for (const [id, q] of itens) {
      ouro += precoDeVenda(p, id, q);
      mochila = removerItens(mochila, id, q);
    }
    return { ...p, mochila, ouro };
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

export function capacidadeDe(p: Personagem): number {
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
    // Nomeados: uma unidade por personagem (não dá para usar dois iguais nos dois slots de acessório).
    if (dados.nomeado && Object.values(p.equipados).includes(itemId)) return erro("ja_equipada", "Esse item nomeado já está equipado.");
    // Acessórios: o primeiro slot livre; com os dois ocupados, troca o primeiro.
    const slot: Slot = dados.slot === "acessorio" ? (!p.equipados.acessorio1 ? "acessorio1" : !p.equipados.acessorio2 ? "acessorio2" : "acessorio1") : dados.slot;
    let mochila = removerItens(p.mochila, itemId, 1);
    const anterior = p.equipados[slot];
    if (anterior) {
      const r = adicionarItens(mochila, anterior, 1, capacidadeDe(p));
      if (r.aceitos === 0) return erro("mochila_cheia", "Não há espaço na mochila para o item que sai.");
      mochila = r.mochila;
    }
    return { ...p, mochila, equipados: { ...p.equipados, [slot]: itemId } };
  }, true);
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
  }, true);
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
  return comAtivo(estado, agora, (p) => ({ ...p, recuoPercentual: percentual }), true);
}

// ------------------------------------------------------------ O Limiar (F6)

/** Paga o Barqueiro para sair do Limiar antes do tempo (Essência por minuto restante). */
export function pagarPedagio(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(
    estado,
    agora,
    (p) => {
      if (!p.limiar) return erro("fora_do_limiar", "O personagem não está no Limiar.");
      const custo = custoDoPedagio(p);
      if (p.essencia < custo) return erro("essencia_insuficiente", `O Barqueiro quer ${custo} de Essência.`);
      const gratis = custo === 0 && ehDevedor(p);
      return sairDoLimiar({ ...p, essencia: p.essencia - custo, pedagioGratisUsado: p.pedagioGratisUsado || gratis });
    },
    true,
  );
}

// ------------------------------------------------------------ Fusão e ampliação de mochila (F8)

/** Custo e chance de fundir 3 cópias do item no próximo aprimoramento. */
export function infoFusao(p: Personagem, itemId: string): { proximo: string; ouro: number; material: { itemId: string; quantidade: number }; chance: number; garantida: boolean } | null {
  const item = CATALOGO.itens.get(itemId);
  const d = item?.equipamento;
  if (!item || !d || d.nomeado || d.tier === 0) return null;
  const proximo = proximoAprimoramento(itemId);
  if (!proximo || !CATALOGO.itens.has(proximo)) return null;
  const n = d.aprimoramento ?? 0;
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const sorte = Math.min(CONFIG_FUSAO.sorteMaxima, CONFIG_FUSAO.sortePorPonto * valorEfetivo(p.status.sorte, "sorte", mods));
  const chance = Math.min(1, (CONFIG_FUSAO.chance[n]! + sorte) * fator(mods, "producao.sucesso"));
  const garantida = (p.pityFusao[itemId] ?? 0) >= CONFIG_FUSAO.pity;
  const baseItem = CATALOGO.itens.get(d.baseId ?? itemId)!;
  return { proximo, ouro: baseItem.preco * CONFIG_FUSAO.fatorOuro[n]!, material: CONFIG_FUSAO.material[n]!, chance: garantida ? 1 : chance, garantida };
}

/**
 * Fusão (GDD §9.4): 3 iguais → 1 aprimorado. Falha parcial: perde 1 dos 3. Sorte
 * aumenta a chance; depois de 3 falhas seguidas, a próxima é garantida. O sorteio
 * usa o RNG do save. Só no Ferreiro, em Pedravau.
 */
export function fundir(estado: EstadoJogo, itemId: string, agora: number): ResultadoAtividade & { sucesso?: boolean } {
  const item = CATALOGO.itens.get(itemId);
  if (!item?.equipamento) return falha("nao_funde", "Só equipamentos se fundem.");
  if (item.equipamento.nomeado) return falha("nao_funde", "Itens nomeados não entram em fusão.");
  let sucesso = false;
  const r = comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "A fusão é no Ferreiro, em Pedravau.");
    const info = infoFusao(p, itemId);
    if (!info) return erro("fusao_maxima", "Esse item já está no máximo.");
    if ((p.mochila[itemId] ?? 0) < 3) return erro("itens_insuficientes", "A fusão pede 3 itens iguais na mochila.");
    if (p.ouro < info.ouro) return erro("ouro_insuficiente", `Custa ${info.ouro} de gold.`);
    if ((p.mochila[info.material.itemId] ?? 0) < info.material.quantidade) return erro("material_insuficiente", `Pede ${info.material.quantidade} de ${CATALOGO.itens.get(info.material.itemId)!.nome}.`);
    return p;
  });
  if (!r.ok) return r;
  // Sorteio com o RNG do save (o estado avançado pelo `comAtivo`).
  const rng = Rng.deEstado(r.estado.rng);
  const id = r.estado.conta.personagemAtivoId;
  const p = r.estado.conta.personagens.find((x) => x.id === id)!;
  const info = infoFusao(p, itemId)!;
  sucesso = info.garantida || rng.flutuante() < info.chance;
  let mochila = removerItens(p.mochila, info.material.itemId, info.material.quantidade);
  if (sucesso) {
    mochila = removerItens(mochila, itemId, 3);
    mochila = { ...mochila, [info.proximo]: (mochila[info.proximo] ?? 0) + 1 };
  } else {
    mochila = removerItens(mochila, itemId, 1);
  }
  const pity = { ...p.pityFusao };
  if (sucesso) delete pity[itemId];
  else pity[itemId] = (pity[itemId] ?? 0) + 1;
  const novo = { ...p, mochila, ouro: p.ouro - info.ouro, pityFusao: pity };
  return {
    ok: true,
    estado: { ...r.estado, rng: rng.estado(), conta: { ...r.estado.conta, personagens: r.estado.conta.personagens.map((x) => (x.id === id ? novo : x)) } },
    resumo: r.resumo,
    sucesso,
  };
}

/** Preço da próxima ampliação de mochila (ou `null` no limite). */
export function precoAmpliacao(p: Personagem): number | null {
  const c = CONFIG_MOCHILA_EXTRA;
  const compras = p.espacosExtras / c.espacosPorCompra;
  return compras >= c.maximoCompras ? null : c.precoBase * c.fator ** compras;
}

/** Amplia a mochila (+5 espaços) no Mercado, com preço crescente. */
export function ampliarMochila(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Mercado fica em Pedravau.");
    const preco = precoAmpliacao(p);
    if (preco === null) return erro("limite_de_compras", "A mochila já está no tamanho máximo.");
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    return { ...p, ouro: p.ouro - preco, espacosExtras: p.espacosExtras + CONFIG_MOCHILA_EXTRA.espacosPorCompra };
  });
}
