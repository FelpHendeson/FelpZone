/**
 * Catálogo do conteúdo da F1, com índices por id e a compatibilidade
 * raça × core calculada a partir das tags.
 */
import { CORES_CABELO, CORES_ROUPA } from "./aparencia";
import { CORES } from "./cores";
import { DONS } from "./dons";
import { montarMarcaAnomalia } from "./marcas";
import { BERCOS, BESTAS_VINCULADAS, MARCAS_ORIGEM, MOTIVACOES, ORIGENS_ESPECIAIS, TRACOS_PERSONALIDADE } from "./origens";
import { RACAS } from "./racas";
import { ATIVIDADES_TREINO, type AtividadeTreino } from "./status";
import { ATIVIDADES_COLETA, FERRAMENTAS, ITENS, type AtividadeColeta, type Ferramenta, type Item } from "./coleta";
import { LOCAIS, REGIOES, type Local, type Regiao } from "./mapa";
import { AREAS_COMBATE, EQUIPAMENTOS, MATERIAIS_COMBATE, MONSTROS, type AtividadeCombate, type Monstro } from "./combate";
import { HABILIDADES, HABILIDADES_LIVRO, idLivro, PRECO_LIVRO, RAMOS_CORE, type Habilidade, type RamoCore } from "./habilidades";
import { ATIVIDADE_APRENDIZADO, type AtividadeAprendizado } from "./aprendizado";
import { ITENS_LIMIAR, MONSTROS_LIMIAR, PECAS_RETORNADO } from "./limiar";
import { MISSOES, NPCS, type Missao, type Npc } from "./missoes";
import { ITENS_F8, RECEITAS, type AtividadeProducao } from "./producao";
import { CUIDADOS, ITENS_PETS, type AtividadeCuidado } from "./pets";
import { RELIQUIAS_TEMPORADA } from "./competicao";

/** Livros (F5): um por habilidade de livro, vendidos no Mercado. */
export const LIVROS: readonly Item[] = HABILIDADES_LIVRO.map((h) => {
  const precoCompra = PRECO_LIVRO[h.raridade] ?? 1_500;
  return {
    id: idLivro(h.id),
    nome: `Livro: ${h.nome}`,
    categoria: "livro" as const,
    raridade: h.raridade,
    descricao: `Ensina ${h.nome}. ${h.descricao}`,
    preco: Math.round(precoCompra / 4),
    pilha: 10,
    livro: { habilidadeId: h.id, precoCompra },
  };
});

/** Itens de todas as fontes (coleta, combate e equipamentos). */
const TODOS_ITENS: readonly Item[] = [...ITENS, ...MATERIAIS_COMBATE, ...EQUIPAMENTOS, ...ITENS_LIMIAR, ...PECAS_RETORNADO, ...ITENS_F8, ...ITENS_PETS, ...RELIQUIAS_TEMPORADA];

/** Toda atividade do personagem (uma por vez). Combate também é atividade [Autor]. */
export type Atividade = AtividadeTreino | AtividadeColeta | AtividadeCombate | AtividadeAprendizado | AtividadeProducao | AtividadeCuidado;
/** Atividades por ciclos (treino, coleta e aprendizado). */
export type AtividadeCiclica = AtividadeTreino | AtividadeColeta | AtividadeAprendizado | AtividadeProducao | AtividadeCuidado;
const ATIVIDADES: readonly Atividade[] = [...ATIVIDADES_TREINO, ...ATIVIDADES_COLETA, ...AREAS_COMBATE, ATIVIDADE_APRENDIZADO, ...RECEITAS, ...CUIDADOS];
import type {
  Berco,
  BestaVinculada,
  Compatibilidade,
  Core,
  CorPaleta,
  DomRaca,
  MarcaAnomalia,
  MarcaOrigem,
  Motivacao,
  OrigemEspecial,
  Raca,
  TracoPersonalidade,
} from "./tipos";

export * from "./tipos";
export { RACAS } from "./racas";
export { CORES } from "./cores";
export { DONS } from "./dons";
export { BERCOS, BESTAS_VINCULADAS, MARCAS_ORIGEM, MOTIVACOES, ORIGENS_ESPECIAIS, TRACOS_PERSONALIDADE } from "./origens";
export { CORES_CABELO, CORES_ROUPA } from "./aparencia";
export { MARCAS_CURADAS, gerarMarcaAnomalia, idMarcaAnomalia, montarMarcaAnomalia } from "./marcas";

/** Compatibilidade pela sobreposição de tags: 2+ alta, 1 média, 0 excêntrica. */
export function compatibilidade(raca: Raca, core: Core): Compatibilidade {
  let comuns = 0;
  for (const tag of core.tags) if (raca.tags.includes(tag)) comuns++;
  return comuns >= 2 ? "alta" : comuns === 1 ? "media" : "excentrica";
}

function indice<T extends { readonly id: string }>(lista: readonly T[]): ReadonlyMap<string, T> {
  return new Map(lista.map((item) => [item.id, item]));
}

function gerarMarcas(): MarcaAnomalia[] {
  const marcas: MarcaAnomalia[] = [];
  for (const raca of RACAS) {
    for (const core of CORES) {
      if (compatibilidade(raca, core) === "excentrica") marcas.push(montarMarcaAnomalia(raca, core));
    }
  }
  return marcas;
}

/** Todas as marcas da anomalia, uma por par excêntrico. */
export const MARCAS_ANOMALIA: readonly MarcaAnomalia[] = gerarMarcas();

export const CATALOGO = {
  racas: indice<Raca>(RACAS),
  cores: indice<Core>(CORES),
  dons: indice<DomRaca>(DONS),
  origensEspeciais: indice<OrigemEspecial>(ORIGENS_ESPECIAIS),
  bestas: indice<BestaVinculada>(BESTAS_VINCULADAS),
  bercos: indice<Berco>(BERCOS),
  motivacoes: indice<Motivacao>(MOTIVACOES),
  marcasOrigem: indice<MarcaOrigem>(MARCAS_ORIGEM),
  tracos: indice<TracoPersonalidade>(TRACOS_PERSONALIDADE),
  marcasAnomalia: indice<MarcaAnomalia>(MARCAS_ANOMALIA),
  coresCabelo: indice<CorPaleta>(CORES_CABELO),
  coresRoupa: indice<CorPaleta>(CORES_ROUPA),
  atividades: indice<Atividade>(ATIVIDADES),
  itens: indice<Item>([...TODOS_ITENS, ...LIVROS]),
  habilidades: indice<Habilidade>(HABILIDADES),
  missoes: indice<Missao>(MISSOES),
  npcs: indice<Npc>(NPCS),
  ramos: indice<RamoCore>(RAMOS_CORE),
  monstros: indice<Monstro>([...MONSTROS, ...MONSTROS_LIMIAR]),
  ferramentas: indice<Ferramenta>(FERRAMENTAS),
  locais: indice<Local>(LOCAIS),
  regioes: indice<Regiao>(REGIOES),
} as const;

/** Busca que lança: para ids que já foram validados. */
export function obter<T>(mapa: ReadonlyMap<string, T>, id: string): T {
  const item = mapa.get(id);
  if (item === undefined) throw new RangeError(`Id desconhecido no catálogo: ${id}`);
  return item;
}

/** Dons de uma raça. */
export function donsDaRaca(racaId: string): readonly DomRaca[] {
  return DONS.filter((d) => d.racaId === racaId);
}

export { ATIVIDADES_TREINO, NOME_STATUS, PERFIS_RACA, STATUS } from "./status";
export type { AtividadeTreino, PerfilRaca, StatusId } from "./status";
export { ATIVIDADES };

export { ATIVIDADES_COLETA, FERRAMENTAS, ITENS, NOME_OFICIO, OFICIOS } from "./coleta";
export type { AtividadeColeta, CategoriaItem, Ferramenta, Item, OficioId } from "./coleta";
export { LOCAIS, LOCAL_INICIAL, REGIOES, viagemBaseMs } from "./mapa";
export type { Local, Regiao, Subarea, TipoSubarea } from "./mapa";
export { AREAS_COMBATE, EQUIPAMENTOS, KIT_COMBATE, MATERIAIS_COMBATE, MONSTROS } from "./combate";
export type { AtividadeCombate, Drop, Monstro, TipoMonstro } from "./combate";
export { NOME_SLOT, SLOTS } from "./coleta";
export type { DadosEquipamento, Slot } from "./coleta";
export { CURA_ABAIXO_DE, HABILIDADES, HABILIDADES_LIVRO, idLivro, PRECO_LIVRO, RAMOS_CORE } from "./habilidades";
export type {
  AlvoReforco,
  DuracaoHabilidade,
  EfeitoAtivo,
  EscopoHabilidade,
  Habilidade,
  ModificadorBase,
  ModoHabilidade,
  NaturezaHabilidade,
  OrigemHabilidade,
  RamoCore,
} from "./habilidades";
export { ATIVIDADE_APRENDIZADO } from "./aprendizado";
export type { AtividadeAprendizado } from "./aprendizado";
export {
  CHEFES_LIMIAR,
  COMUNS_LIMIAR,
  CONFIG_LIMIAR,
  FALAS_BARQUEIRO,
  ITENS_LIMIAR,
  MATERIAL_LIMIAR,
  MONSTROS_LIMIAR,
  PECAS_POR_CHEFE,
  PECAS_RETORNADO,
  SINERGIAS_LIMIAR,
  monstroDoLimiar,
} from "./limiar";
export { criarMonstro } from "./combate";
export type { PerfilMonstro } from "./combate";
export { CONFIG_GUILDA, MISSOES, NPCS, PRIMEIRA_META, RANK_MAXIMO_ATO_I, RANKS } from "./missoes";
export type { Missao, Npc, Objetivo, Recompensa, TipoMissao } from "./missoes";
export {
  ACESSORIOS,
  CHANCE_FRAGMENTO,
  CONFIG_FUSAO,
  CONFIG_MOCHILA_EXTRA,
  CONFIG_PRODUCAO,
  CONSUMIVEIS,
  DROPS_RELIQUIA,
  FRAGMENTO,
  NOME_OFICIO_PRODUCAO,
  NOMEADOS,
  NOMEADOS_DE_ORIGEM,
  OFICIOS_PRODUCAO,
  RECEITAS,
  RELIQUIAS,
  VARIANTES,
  proximoAprimoramento,
} from "./producao";
export type { AtividadeProducao, OficioProducaoId } from "./producao";
export { cabeNoSlot } from "./coleta";
export type { SlotItem } from "./coleta";
export {
  CATEGORIAS_PET,
  COMIDA_PET,
  CONFIG_CUIDADOS,
  CONFIG_PETS,
  CUIDADOS,
  ESPECIES_PET,
  LACO_DE_DOMA,
  NOME_CATEGORIA_PET,
  PRECO_LACO,
  fatorNivelPet,
} from "./pets";
export type { AtividadeCuidado, CategoriaPet, Cuidado, EspeciePet, TipoPet } from "./pets";
export { ARQUETIPOS, CONFIG_COMPETICAO, RELIQUIAS_TEMPORADA, TEMAS } from "./competicao";
export type { Arquetipo, TemaTemporada } from "./competicao";
