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
