/**
 * Tipos do conteúdo do jogo. Conteúdo é dado: as regras ficam fora de `dados/`.
 * Ids são estáveis e em kebab-case; trocar um id exige migração de save.
 */
import type { Modificador } from "../modificadores";

/** Escala única de raridade (GDD §9.1). */
export const RARIDADES = ["comum", "incomum", "raro", "epico", "ancestral", "primordial"] as const;
export type Raridade = (typeof RARIDADES)[number];

export const NOME_RARIDADE: Readonly<Record<Raridade, string>> = {
  comum: "Comum",
  incomum: "Incomum",
  raro: "Raro",
  epico: "Épico",
  ancestral: "Ancestral",
  primordial: "Primordial",
};

/** Raridade de raça: só as três primeiras faixas (GDD §4.2). */
export type RaridadeRaca = "comum" | "incomum" | "raro";

/** Raridades possíveis de um dom de raça. */
export const RARIDADES_DOM = ["incomum", "raro", "epico", "ancestral", "primordial"] as const;
export type RaridadeDom = (typeof RARIDADES_DOM)[number];

/** Tags de afinidade compartilhadas por raças e cores (GDD §3.2). */
export const TAGS_AFINIDADE = [
  "adaptavel",
  "ancestral",
  "arcano",
  "caca",
  "dragao",
  "elemental",
  "espiritual",
  "fera",
  "fisico",
  "fogo",
  "forja",
  "furia",
  "furtivo",
  "lua",
  "luz",
  "mental",
  "natureza",
  "noite",
  "oficio",
  "pedra",
  "sagrado",
  "sangue",
  "sentidos",
  "sombra",
  "tempestade",
  "terra",
  "trevas",
  "vento",
  "viagem",
  "vinculo",
] as const;
export type TagAfinidade = (typeof TAGS_AFINIDADE)[number];

/**
 * Efeito de conteúdo. `modificadores` usa o modelo único da F0 quando o
 * efeito já tem significado; `efeitoPendente` descreve, em texto, o que
 * depende de um sistema que ainda não existe (não é aplicado).
 *
 * Desde a F2 são aplicados os alvos `status.<id>`, `teto`, `teto.<id>`,
 * `ganho-treino`, `xp-personagem` e `velocidade-atividade` (ver
 * `personagem/progressao.ts`). Os demais alvos (ofícios, preços, Limiar...)
 * continuam só como dado até a fatia do sistema deles.
 */
export interface Efeito {
  readonly modificadores?: readonly Modificador[];
  /** Modificadores que só valem até um nível (ex.: O Despertado Tardio). */
  readonly temporario?: { readonly ateNivel: number; readonly modificadores: readonly Modificador[] };
  readonly efeitoPendente?: string;
}

export interface HabilidadeRaca {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly efeito: Efeito;
}

export interface Raca {
  readonly id: string;
  readonly nome: string;
  readonly raridade: RaridadeRaca;
  readonly tags: readonly TagAfinidade[];
  /** Perfil de status em texto; os números chegam na F2. */
  readonly perfil: string;
  readonly habilidadeComum: HabilidadeRaca;
  /** Povos longevos mudam a frase de "anos de estrada" da origem comum. */
  readonly longeva: boolean;
  /** Visual da miniatura de perfil. */
  readonly visual: { readonly pele: string; readonly traco: TracoVisual };
  /** Substantivos usados pelo gerador da Marca da Anomalia. */
  readonly nucleosAnomalia: readonly string[];
}

export type TracoVisual = "nenhum" | "barba" | "orelhas-pontudas" | "presas" | "orelhas-de-lobo" | "caninos" | "chifres" | "antenas";

export interface DomRaca {
  readonly id: string;
  readonly racaId: string;
  readonly nome: string;
  readonly raridade: RaridadeDom;
  readonly descricao: string;
  readonly efeito: Efeito;
}

export type NaturezaTecnica = "fisica" | "magica" | "espiritual" | "mental" | "oficio";
export type ModoTecnica = "passiva" | "ativa";

/** Técnica do core: só texto na F1 (equipar e usar é da F5). */
export interface Tecnica {
  readonly id: string;
  readonly nome: string;
  readonly natureza: NaturezaTecnica;
  readonly modo: ModoTecnica;
  readonly descricao: string;
}

export interface Core {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly tags: readonly TagAfinidade[];
  readonly tecnicas: readonly Tecnica[];
  /** Cor de fundo da miniatura e símbolo do emblema. */
  readonly visual: { readonly cor: string; readonly simbolo: SimboloCore };
  /** Complementos ("sem Luz", "em Brasa") usados pelo gerador da Marca da Anomalia. */
  readonly complementosAnomalia: readonly string[];
  /** Efeito da anomalia, em texto, completando "…" no gerador. */
  readonly efeitoAnomalia: string;
}

export type SimboloCore =
  | "lua-negra"
  | "chama"
  | "raio"
  | "montanha"
  | "sol"
  | "garra"
  | "olho"
  | "espiral"
  | "martelo"
  | "trilha"
  | "pata"
  | "vazio";

export type Compatibilidade = "alta" | "media" | "excentrica";

export interface MarcaAnomalia {
  readonly id: string;
  readonly racaId: string;
  readonly coreId: string;
  readonly nome: string;
  readonly descricao: string;
  /** `true` quando escrita à mão; `false` quando saiu do gerador por modelos. */
  readonly curada: boolean;
  readonly efeito: Efeito;
}

export interface BestaVinculada {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
}

export interface OrigemEspecial {
  readonly id: string;
  readonly numero: number;
  readonly nome: string;
  readonly lore: string;
  readonly efeitoTexto: string;
  readonly efeito: Efeito;
  readonly gancho: string;
  /** Raças permitidas; vazio = qualquer raça. */
  readonly racasPermitidas: readonly string[];
  readonly bestaVinculadaId?: string;
  /** Escrita pelo autor ([Autor]) ou proposta do agente. */
  readonly doAutor: boolean;
}

export interface Berco {
  readonly id: string;
  readonly nome: string;
  /** Frase depois de "vem de" (ex.: "uma vila rural"). */
  readonly frase: string;
  readonly bonusTexto: string;
  readonly efeito: Efeito;
}

export interface Motivacao {
  readonly id: string;
  readonly nome: string;
  /** Frase depois de "na estrada," (ex.: "em busca de renome"). */
  readonly frase: string;
}

export interface MarcaOrigem {
  readonly id: string;
  readonly nome: string;
  readonly frase: string;
}

export interface TracoPersonalidade {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
}

export interface CorPaleta {
  readonly id: string;
  readonly nome: string;
  readonly hex: string;
}
