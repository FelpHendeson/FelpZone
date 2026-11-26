/**
 * Ações serializáveis (F9): o mesmo formato serve ao cliente (modo local) e ao
 * servidor (`POST /api/v1/jogo/acao`), que aplica a ação no motor com o
 * relógio dele. A entrada é tratada como não confiável.
 */
import { SLOTS, type Slot } from "./dados";
import {
  ampliarMochila,
  comprarEquipamento,
  comprarFerramenta,
  definirRecuo,
  desequipar,
  equipar,
  fundir,
  iniciarAtividade,
  irPara,
  pagarPedagio,
  pararAtividade,
  vender,
  venderTudo,
  type ResultadoAtividade,
} from "./atividades/acoes";
import { avancar, resumoVazio, type ResumoAvanco } from "./atividades/ciclos";
import { comprarLivro, desequiparHabilidade, equiparHabilidade, escolherRamo, iniciarAprendizado, lerLivro, moverPrioridade } from "./habilidades/acoes";
import { abandonarMissao, aceitarMissao, entregarMissao, promover } from "./missoes/missoes";
import { atualizarCofre } from "./personagem/cofre";
import { registrarTutorial } from "./personagem/tutorial";
import type { EstadoJogo } from "./save";
import { inscreverTorneio, lutarArena, resgatarTorneio } from "./competicao/acoes";
import { resolverEvento } from "./mundo/acoes";
import { atualizarCronica } from "./mundo/mundo";
import { ativarUniao, atribuirPet, comprarLaco, comprarPet, nomearPet, soltarPet } from "./pets/acoes";
import { SLOTS_PET, type SlotPet } from "./pets/pets";
import { aceitarSorteio, definirNomeEAparencia, iniciarSorteio, rerolar, type ResultadoAcao } from "./sorteio/acoes";

export type Acao =
  | { readonly tipo: "pularTutorial" }
  | { readonly tipo: "retomarTutorial" }
  | { readonly tipo: "iniciarAtividade"; readonly atividadeId: string }
  | { readonly tipo: "iniciarAprendizado"; readonly habilidadeId: string }
  | { readonly tipo: "pararAtividade" }
  | { readonly tipo: "irPara"; readonly localId: string }
  | { readonly tipo: "vender"; readonly itemId: string; readonly quantidade: number }
  | { readonly tipo: "venderTudo" }
  | { readonly tipo: "comprarFerramenta"; readonly ferramentaId: string }
  | { readonly tipo: "comprarEquipamento"; readonly itemId: string }
  | { readonly tipo: "equipar"; readonly itemId: string }
  | { readonly tipo: "desequipar"; readonly slot: Slot }
  | { readonly tipo: "definirRecuo"; readonly percentual: number }
  | { readonly tipo: "pagarPedagio" }
  | { readonly tipo: "fundir"; readonly itemId: string }
  | { readonly tipo: "ampliarMochila" }
  | { readonly tipo: "comprarLivro"; readonly itemId: string }
  | { readonly tipo: "lerLivro"; readonly itemId: string }
  | { readonly tipo: "equiparHabilidade"; readonly habilidadeId: string }
  | { readonly tipo: "desequiparHabilidade"; readonly habilidadeId: string }
  | { readonly tipo: "moverPrioridade"; readonly habilidadeId: string; readonly direcao: -1 | 1 }
  | { readonly tipo: "escolherRamo"; readonly ramoId: string }
  | { readonly tipo: "aceitarMissao"; readonly missaoId: string }
  | { readonly tipo: "entregarMissao"; readonly missaoId: string }
  | { readonly tipo: "abandonarMissao"; readonly missaoId: string }
  | { readonly tipo: "promover" }
  | { readonly tipo: "trocarPersonagem"; readonly personagemId: string }
  | { readonly tipo: "iniciarSorteio" }
  | { readonly tipo: "rerolar" }
  | { readonly tipo: "aceitarSorteio" }
  | { readonly tipo: "definirNomeEAparencia"; readonly nome: string; readonly corCabelo: string; readonly corRoupa: string }
  | { readonly tipo: "comprarPet"; readonly especieId: string }
  | { readonly tipo: "comprarLaco" }
  | { readonly tipo: "nomearPet"; readonly petId: string; readonly nome: string }
  | { readonly tipo: "atribuirPet"; readonly slot: SlotPet; readonly petId: string | null }
  | { readonly tipo: "soltarPet"; readonly petId: string }
  | { readonly tipo: "ativarUniao" }
  | { readonly tipo: "resolverEvento"; readonly n: number; readonly escolha: 0 | 1 }
  | { readonly tipo: "lutarArena" }
  | { readonly tipo: "inscreverTorneio" }
  | { readonly tipo: "resgatarTorneio" };

export type TipoAcao = Acao["tipo"];

export type ResultadoAplicar =
  | { readonly ok: true; readonly estado: EstadoJogo; readonly resumo: ResumoAvanco; readonly detalhe?: { readonly sucesso?: boolean; readonly colocacao?: number } }
  | { readonly ok: false; readonly erro: { readonly codigo: string; readonly mensagem: string } };

const invalida = (mensagem = "Ação inválida."): ResultadoAplicar => ({ ok: false, erro: { codigo: "acao_invalida", mensagem } });
const texto = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 80;

/** Troca o personagem ativo (o anterior para onde está; só um joga por vez). */
export function trocarPersonagem(estado: EstadoJogo, personagemId: string, agora: number): ResultadoAtividade {
  if (!estado.conta.personagens.some((p) => p.id === personagemId)) return { ok: false, erro: { codigo: "personagem_inexistente", mensagem: "Personagem desconhecido." } };
  const { estado: avancado, resumo } = avancar(estado, agora);
  if (avancado.conta.personagemAtivoId === personagemId) return { ok: false, erro: { codigo: "ja_ativo", mensagem: "Esse personagem já está ativo." } };
  return { ok: true, estado: { ...avancado, conta: { ...avancado.conta, personagemAtivoId: personagemId } }, resumo };
}

/** Converte o resultado das ações de sorteio (sem resumo) para o formato comum. */
function doSorteio(r: ResultadoAcao): ResultadoAplicar {
  return r.ok ? { ok: true, estado: r.estado, resumo: resumoVazio() } : { ok: false, erro: r.erro };
}

/** Valida a forma da ação (entrada não confiável). Devolve a ação limpa ou `null`. */
export function validarAcao(v: unknown): Acao | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const a = v as Record<string, unknown>;
  switch (a.tipo) {
    case "pularTutorial":
    case "retomarTutorial":
    case "pararAtividade":
    case "venderTudo":
    case "pagarPedagio":
    case "ampliarMochila":
    case "promover":
    case "iniciarSorteio":
    case "rerolar":
    case "aceitarSorteio":
    case "comprarLaco":
    case "ativarUniao":
    case "lutarArena":
    case "inscreverTorneio":
    case "resgatarTorneio":
      return { tipo: a.tipo };
    case "comprarPet":
      return texto(a.especieId) ? { tipo: a.tipo, especieId: a.especieId } : null;
    case "nomearPet":
      return texto(a.petId) && typeof a.nome === "string" && a.nome.length <= 60 ? { tipo: a.tipo, petId: a.petId, nome: a.nome } : null;
    case "atribuirPet":
      return typeof a.slot === "string" && (SLOTS_PET as readonly string[]).includes(a.slot) && (a.petId === null || texto(a.petId)) ? { tipo: a.tipo, slot: a.slot as SlotPet, petId: a.petId as string | null } : null;
    case "soltarPet":
      return texto(a.petId) ? { tipo: a.tipo, petId: a.petId } : null;
    case "resolverEvento":
      return typeof a.n === "number" && Number.isSafeInteger(a.n) && (a.escolha === 0 || a.escolha === 1) ? { tipo: a.tipo, n: a.n, escolha: a.escolha } : null;
    case "iniciarAtividade":
      return texto(a.atividadeId) ? { tipo: a.tipo, atividadeId: a.atividadeId } : null;
    case "iniciarAprendizado":
    case "equiparHabilidade":
    case "desequiparHabilidade":
      return texto(a.habilidadeId) ? { tipo: a.tipo, habilidadeId: a.habilidadeId } : null;
    case "moverPrioridade":
      return texto(a.habilidadeId) && (a.direcao === 1 || a.direcao === -1) ? { tipo: a.tipo, habilidadeId: a.habilidadeId, direcao: a.direcao } : null;
    case "irPara":
      return texto(a.localId) ? { tipo: a.tipo, localId: a.localId } : null;
    case "vender":
      return texto(a.itemId) && typeof a.quantidade === "number" && Number.isSafeInteger(a.quantidade) ? { tipo: a.tipo, itemId: a.itemId, quantidade: a.quantidade } : null;
    case "comprarFerramenta":
      return texto(a.ferramentaId) ? { tipo: a.tipo, ferramentaId: a.ferramentaId } : null;
    case "comprarEquipamento":
    case "equipar":
    case "fundir":
    case "comprarLivro":
    case "lerLivro":
      return texto(a.itemId) ? { tipo: a.tipo, itemId: a.itemId } : null;
    case "desequipar":
      return typeof a.slot === "string" && (SLOTS as readonly string[]).includes(a.slot) ? { tipo: a.tipo, slot: a.slot as Slot } : null;
    case "definirRecuo":
      return typeof a.percentual === "number" && Number.isSafeInteger(a.percentual) ? { tipo: a.tipo, percentual: a.percentual } : null;
    case "escolherRamo":
      return texto(a.ramoId) ? { tipo: a.tipo, ramoId: a.ramoId } : null;
    case "aceitarMissao":
    case "entregarMissao":
    case "abandonarMissao":
      return texto(a.missaoId) ? { tipo: a.tipo, missaoId: a.missaoId } : null;
    case "trocarPersonagem":
      return texto(a.personagemId) ? { tipo: a.tipo, personagemId: a.personagemId } : null;
    case "definirNomeEAparencia":
      return typeof a.nome === "string" && a.nome.length <= 60 && texto(a.corCabelo) && texto(a.corRoupa) ? { tipo: a.tipo, nome: a.nome, corCabelo: a.corCabelo, corRoupa: a.corRoupa } : null;
    default:
      return null;
  }
}

function despachar(estado: EstadoJogo, a: Exclude<Acao, { tipo: "pularTutorial" | "retomarTutorial" }>, agora: number): ResultadoAplicar {
  switch (a.tipo) {
    case "iniciarAtividade":
      return iniciarAtividade(estado, a.atividadeId, agora);
    case "iniciarAprendizado":
      return iniciarAprendizado(estado, a.habilidadeId, agora);
    case "pararAtividade":
      return pararAtividade(estado, agora);
    case "irPara":
      return irPara(estado, a.localId, agora);
    case "vender":
      return vender(estado, a.itemId, a.quantidade, agora);
    case "venderTudo":
      return venderTudo(estado, agora);
    case "comprarFerramenta":
      return comprarFerramenta(estado, a.ferramentaId, agora);
    case "comprarEquipamento":
      return comprarEquipamento(estado, a.itemId, agora);
    case "equipar":
      return equipar(estado, a.itemId, agora);
    case "desequipar":
      return desequipar(estado, a.slot, agora);
    case "definirRecuo":
      return definirRecuo(estado, a.percentual, agora);
    case "pagarPedagio":
      return pagarPedagio(estado, agora);
    case "fundir": {
      const r = fundir(estado, a.itemId, agora);
      return r.ok ? { ok: true, estado: r.estado, resumo: r.resumo, detalhe: { sucesso: r.sucesso ?? false } } : r;
    }
    case "ampliarMochila":
      return ampliarMochila(estado, agora);
    case "comprarLivro":
      return comprarLivro(estado, a.itemId, agora);
    case "lerLivro":
      return lerLivro(estado, a.itemId, agora);
    case "equiparHabilidade":
      return equiparHabilidade(estado, a.habilidadeId, agora);
    case "desequiparHabilidade":
      return desequiparHabilidade(estado, a.habilidadeId, agora);
    case "moverPrioridade":
      return moverPrioridade(estado, a.habilidadeId, a.direcao, agora);
    case "escolherRamo":
      return escolherRamo(estado, a.ramoId, agora);
    case "aceitarMissao":
      return aceitarMissao(estado, a.missaoId, agora);
    case "entregarMissao":
      return entregarMissao(estado, a.missaoId, agora);
    case "abandonarMissao":
      return abandonarMissao(estado, a.missaoId, agora);
    case "promover":
      return promover(estado, agora);
    case "trocarPersonagem":
      return trocarPersonagem(estado, a.personagemId, agora);
    case "iniciarSorteio":
      return doSorteio(iniciarSorteio(estado));
    case "rerolar":
      return doSorteio(rerolar(estado));
    case "aceitarSorteio":
      return doSorteio(aceitarSorteio(estado));
    case "comprarPet":
      return comprarPet(estado, a.especieId, agora);
    case "comprarLaco":
      return comprarLaco(estado, agora);
    case "nomearPet":
      return nomearPet(estado, a.petId, a.nome, agora);
    case "atribuirPet":
      return atribuirPet(estado, a.slot, a.petId, agora);
    case "soltarPet":
      return soltarPet(estado, a.petId, agora);
    case "ativarUniao":
      return ativarUniao(estado, agora);
    case "resolverEvento":
      return resolverEvento(estado, a.n, a.escolha, agora);
    case "lutarArena": {
      const r = lutarArena(estado, agora);
      return r.ok ? { ok: true, estado: r.estado, resumo: r.resumo, detalhe: { sucesso: r.vitoria ?? false } } : r;
    }
    case "inscreverTorneio":
      return inscreverTorneio(estado, agora);
    case "resgatarTorneio": {
      const r = resgatarTorneio(estado, agora);
      return r.ok ? { ok: true, estado: r.estado, resumo: r.resumo, detalhe: { colocacao: r.colocacao ?? 0 } } : r;
    }
    case "definirNomeEAparencia":
      return doSorteio(definirNomeEAparencia(estado, { nome: a.nome, corCabelo: a.corCabelo, corRoupa: a.corRoupa }, agora));
  }
}

/**
 * Aplica uma ação (validada aqui) no instante `agora`. É a porta única usada
 * pelo servidor; o cliente usa a mesma no modo local.
 */
export function aplicarAcao(estado: EstadoJogo, acao: unknown, agora: number): ResultadoAplicar {
  const a = validarAcao(acao);
  if (!a) return invalida();
  if (!Number.isSafeInteger(agora) || agora < 0) return invalida("Instante inválido.");
  if (a.tipo === "pularTutorial" || a.tipo === "retomarTutorial") {
    const ativo = estado.conta.personagens.find((p) => p.id === estado.conta.personagemAtivoId);
    if (!ativo) return invalida("Crie um personagem antes de usar o guia.");
    const modo = a.tipo === "pularTutorial" ? "pulado" : "ativo";
    return { ok: true, resumo: resumoVazio(), estado: { ...estado, conta: { ...estado.conta, personagens: estado.conta.personagens.map((p) => p.id === ativo.id ? { ...p, tutorial: { ...p.tutorial, modo } } : p) } } };
  }
  // Ações de sorteio não avançam o tempo sozinhas: avança antes, para o relógio ficar coerente.
  const base = a.tipo === "iniciarSorteio" || a.tipo === "rerolar" || a.tipo === "aceitarSorteio" ? avancar(estado, agora).estado : estado;
  const r = despachar(base, a, agora);
  if (!r.ok) return r;
  // F11: marcos da Crônica de quem está ativo (promoções contam na hora).
  const personagens = r.estado.conta.personagens.map((p) => (p.id === r.estado.conta.personagemAtivoId ? atualizarCronica(registrarTutorial(estado.conta.personagens.find((antes) => antes.id === p.id), p, a)) : p));
  const cofre = atualizarCofre(r.estado.conta.cofre, personagens);
  return { ...r, estado: { ...r.estado, conta: { ...r.estado.conta, personagens, cofre } } };
}
