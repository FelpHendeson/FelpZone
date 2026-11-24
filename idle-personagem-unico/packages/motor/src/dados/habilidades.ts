/**
 * Habilidades (GDD §12) [Proposta]: técnicas dos cores, ramos e livros.
 * Valores de efeito são os do nível 1 de maestria; a maestria e a evolução
 * os multiplicam (ver `habilidades/maestria.ts`). Números [Calibrar].
 */
import type { Raridade } from "./tipos";

export type NaturezaHabilidade = "fisica" | "magica";
export type ModoHabilidade = "ativa" | "passiva";
export type DuracaoHabilidade = "permanente" | "com-duracao" | "aura";
export type EscopoHabilidade = "combate" | "coleta" | "producao" | "viagem" | "pets" | "geral";
export type AlvoReforco = "ataque" | "defesa" | "esquiva" | "critico" | "velocidade";

/** Efeitos de uma ativa no combate. */
export type EfeitoAtivo =
  | { readonly tipo: "golpe"; readonly multiplicador: number }
  | { readonly tipo: "cura"; readonly fracao: number }
  | { readonly tipo: "reforco"; readonly alvo: AlvoReforco; readonly valor: number; readonly duracaoMs: number }
  | { readonly tipo: "enfraquecer"; readonly alvo: "ataque" | "defesa"; readonly valor: number; readonly duracaoMs: number }
  | { readonly tipo: "atordoar"; readonly ms: number };

/** Modificador de uma passiva (a origem é preenchida na hora de aplicar). */
export interface ModificadorBase {
  readonly alvo: string;
  readonly operacao: "somar" | "percentual";
  readonly valor: number;
}

export type OrigemHabilidade = { readonly tipo: "core"; readonly coreId: string; readonly ramoId?: string } | { readonly tipo: "livro" };

export interface Habilidade {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly raridade: Raridade;
  readonly natureza: NaturezaHabilidade;
  readonly subtipo?: string;
  readonly modo: ModoHabilidade;
  readonly duracao: DuracaoHabilidade;
  readonly escopo: EscopoHabilidade;
  readonly origem: OrigemHabilidade;
  /** Passivas (e auras): modificadores escalados pela maestria. */
  readonly passiva?: {
    readonly modificadores: readonly ModificadorBase[];
    /** Aura: só vale com a vida abaixo desta fração. */
    readonly auraVidaAbaixo?: number;
  };
  /** Ativas: recarga e efeitos; cura só dispara com vida abaixo de `curaAbaixoDe`. */
  readonly ativa?: { readonly recargaMs: number; readonly efeitos: readonly EfeitoAtivo[] };
  /** Efeito que depende de sistema futuro (não aplicado). */
  readonly pendente?: string;
}

export interface RamoCore {
  readonly id: string;
  readonly coreId: string;
  readonly nome: string;
  readonly descricao: string;
  readonly habilidadeId: string;
}

/** Cura só dispara com a vida abaixo desta fração (GDD §7: "curas só quando precisam"). */
export const CURA_ABAIXO_DE = 0.5;

// ---------------------------------------------------------------- Construtores compactos

type Base = Pick<Habilidade, "id" | "nome" | "descricao" | "natureza" | "escopo"> & { raridade?: Raridade; subtipo?: string; pendente?: string };

function passiva(b: Base, origem: OrigemHabilidade, modificadores: readonly ModificadorBase[], aura?: number): Habilidade {
  return {
    ...b,
    raridade: b.raridade ?? "comum",
    modo: "passiva",
    duracao: aura === undefined ? "permanente" : "aura",
    origem,
    passiva: aura === undefined ? { modificadores } : { modificadores, auraVidaAbaixo: aura },
  };
}

function ativa(b: Base, origem: OrigemHabilidade, recargaMs: number, efeitos: readonly EfeitoAtivo[]): Habilidade {
  const comDuracao = efeitos.some((e) => e.tipo === "reforco" || e.tipo === "enfraquecer");
  return { ...b, raridade: b.raridade ?? "comum", modo: "ativa", duracao: comDuracao ? "com-duracao" : "permanente", origem, ativa: { recargaMs, efeitos } };
}

const pct = (alvo: string, valor: number): ModificadorBase => ({ alvo, operacao: "percentual", valor });
const soma = (alvo: string, valor: number): ModificadorBase => ({ alvo, operacao: "somar", valor });
const core = (coreId: string, ramoId?: string): OrigemHabilidade => (ramoId ? { tipo: "core", coreId, ramoId } : { tipo: "core", coreId });
const LIVRO: OrigemHabilidade = { tipo: "livro" };

// ---------------------------------------------------------------- Técnicas dos cores (texto da F1)

const TECNICAS_CORE: readonly Habilidade[] = [
  // Ser das Trevas (texto do autor).
  passiva({ id: "sentido-das-sombras", nome: "Sentido das Sombras", descricao: "Enxerga e sente através das sombras.", natureza: "magica", subtipo: "trevas", escopo: "combate" }, core("ser-das-trevas"), [soma("critico", 0.05)]),
  passiva({ id: "abraco-das-sombras", nome: "Abraço das Sombras", descricao: "Oculta presença, cheiro, respiração; todos os traços somem.", natureza: "magica", subtipo: "trevas", escopo: "combate" }, core("ser-das-trevas"), [soma("esquiva", 0.05)]),
  ativa(
    { id: "invocacao-do-manto-das-trevas", nome: "Invocação do Manto das Trevas", descricao: "Converte parte da mana em trevas e cobre uma área; debuff no inimigo conforme o tipo, buff em você (+ataque, +esquiva).", natureza: "magica", subtipo: "trevas", escopo: "combate", raridade: "raro" },
    core("ser-das-trevas"),
    20_000,
    [
      { tipo: "enfraquecer", alvo: "ataque", valor: 0.2, duracaoMs: 8_000 },
      { tipo: "reforco", alvo: "ataque", valor: 0.15, duracaoMs: 8_000 },
      { tipo: "reforco", alvo: "esquiva", valor: 0.05, duracaoMs: 8_000 },
    ],
  ),
  // Portador da Chama.
  ativa({ id: "punho-em-brasa", nome: "Punho em Brasa", descricao: "Golpe em brasa: 180% do ataque.", natureza: "magica", subtipo: "elemental", escopo: "combate" }, core("portador-da-chama"), 8_000, [{ tipo: "golpe", multiplicador: 1.8 }]),
  passiva({ id: "sangue-quente", nome: "Sangue Quente", descricao: "Ataques 8% mais rápidos.", natureza: "fisica", escopo: "combate" }, core("portador-da-chama"), [pct("velocidade-ataque", 0.08)]),
  passiva({ id: "fornalha-interior", nome: "Fornalha Interior", descricao: "Forja e culinária mais rápidas.", natureza: "magica", subtipo: "elemental", escopo: "producao" }, core("portador-da-chama"), [pct("producao.velocidade", 0.1)]),
  // Filho da Tempestade.
  ativa({ id: "lanca-de-raio", nome: "Lança de Raio", descricao: "Raio de 200% do ataque.", natureza: "magica", subtipo: "elemental", escopo: "combate" }, core("filho-da-tempestade"), 10_000, [{ tipo: "golpe", multiplicador: 2 }]),
  passiva({ id: "passo-do-trovao", nome: "Passo do Trovão", descricao: "+4% de esquiva.", natureza: "fisica", escopo: "combate" }, core("filho-da-tempestade"), [soma("esquiva", 0.04)]),
  // Guardião da Terra.
  ativa({ id: "muralha-viva", nome: "Muralha Viva", descricao: "Ergue pedra à frente: +40% de defesa por 10 s.", natureza: "magica", subtipo: "elemental", escopo: "combate" }, core("guardiao-da-terra"), 25_000, [{ tipo: "reforco", alvo: "defesa", valor: 0.4, duracaoMs: 10_000 }]),
  passiva({ id: "raizes-firmes", nome: "Raízes Firmes", descricao: "+10% de defesa.", natureza: "fisica", escopo: "combate" }, core("guardiao-da-terra"), [pct("defesa", 0.1)]),
  passiva({ id: "veio-oculto", nome: "Veio Oculto", descricao: "Mineração rende 15% mais.", natureza: "fisica", escopo: "coleta" }, core("guardiao-da-terra"), [pct("oficio.mineracao.rendimento", 0.15)]),
  // Alma da Luz.
  ativa({ id: "clarao", nome: "Clarão", descricao: "Cega o inimigo: −30% de ataque por 6 s.", natureza: "magica", subtipo: "luz", escopo: "combate" }, core("alma-da-luz"), 18_000, [{ tipo: "enfraquecer", alvo: "ataque", valor: 0.3, duracaoMs: 6_000 }]),
  passiva({ id: "chama-mansa", nome: "Chama Mansa", descricao: "Recupera vida 50% mais rápido entre as lutas.", natureza: "magica", subtipo: "luz", escopo: "combate" }, core("alma-da-luz"), [pct("regeneracao", 0.5)]),
  passiva({ id: "voto-de-aurora", nome: "Voto de Aurora", descricao: "+6% de ataque.", natureza: "magica", subtipo: "luz", escopo: "combate" }, core("alma-da-luz"), [pct("ataque", 0.06)]),
  // Predador Nato.
  ativa({ id: "bote", nome: "Bote", descricao: "Salto certeiro: 250% do ataque.", natureza: "fisica", escopo: "combate" }, core("predador-nato"), 15_000, [{ tipo: "golpe", multiplicador: 2.5 }]),
  passiva({ id: "rastro-de-sangue", nome: "Rastro de Sangue", descricao: "+4% de crítico.", natureza: "fisica", escopo: "combate" }, core("predador-nato"), [soma("critico", 0.04)]),
  // Mente Lúcida.
  passiva({ id: "leitura-fria", nome: "Leitura Fria", descricao: "Lê o próximo golpe: +5% de esquiva.", natureza: "magica", subtipo: "mental", escopo: "combate" }, core("mente-lucida"), [soma("esquiva", 0.05)]),
  ativa({ id: "no-mental", nome: "Nó Mental", descricao: "Confunde o alvo e atrasa a próxima ação dele em 2 s.", natureza: "magica", subtipo: "mental", escopo: "combate" }, core("mente-lucida"), 15_000, [{ tipo: "atordoar", ms: 2_000 }]),
  passiva({ id: "foco-absoluto", nome: "Foco Absoluto", descricao: "+25% de XP de maestria.", natureza: "magica", subtipo: "mental", escopo: "geral" }, core("mente-lucida"), [pct("xp-maestria", 0.25)]),
  // Alma Antiga.
  ativa({ id: "eco-dos-antigos", nome: "Eco dos Antigos", descricao: "Um eco repete o golpe: 160% do ataque.", natureza: "magica", subtipo: "espiritual", escopo: "combate" }, core("alma-antiga"), 12_000, [{ tipo: "golpe", multiplicador: 1.6 }]),
  passiva({ id: "memoria-de-sangue", nome: "Memória de Sangue", descricao: "+20% de XP de maestria.", natureza: "magica", subtipo: "espiritual", escopo: "geral" }, core("alma-antiga"), [pct("xp-maestria", 0.2)]),
  // Artífice Nato.
  passiva({ id: "mao-certeira", nome: "Mão Certeira", descricao: "Mais chance de sucesso na fusão.", natureza: "fisica", escopo: "producao" }, core("artifice-nato"), [pct("producao.sucesso", 0.1)]),
  ativa({ id: "improviso", nome: "Improviso", descricao: "Ajusta a arma no meio da luta: +20% de ataque por 10 s.", natureza: "fisica", escopo: "combate" }, core("artifice-nato"), 30_000, [{ tipo: "reforco", alvo: "ataque", valor: 0.2, duracaoMs: 10_000 }]),
  passiva({ id: "olho-de-oficio", nome: "Olho de Ofício", descricao: "Vende 5% mais caro.", natureza: "fisica", escopo: "geral" }, core("artifice-nato"), [pct("preco-venda", 0.05)]),
  // Andarilho.
  passiva({ id: "passo-leve", nome: "Passo Leve", descricao: "Viagens 20% mais curtas.", natureza: "fisica", escopo: "viagem" }, core("andarilho"), [pct("duracao-viagem", -0.2)]),
  passiva({ id: "olho-de-coletor", nome: "Olho de Coletor", descricao: "Coleta rende 10% mais.", natureza: "fisica", escopo: "coleta" }, core("andarilho"), [pct("coleta.rendimento", 0.1)]),
  // Domador.
  passiva({ id: "voz-mansa", nome: "Voz Mansa", descricao: "Mais chance de domar criaturas.", natureza: "magica", subtipo: "espiritual", escopo: "pets", pendente: "Pets (F10)." }, core("domador"), [pct("pets.domar", 0.1)]),
  ativa({ id: "ordem-de-ataque", nome: "Ordem de Ataque", descricao: "Ataque coordenado: 140% do ataque (com pet, mais forte na F10).", natureza: "fisica", escopo: "combate" }, core("domador"), 8_000, [{ tipo: "golpe", multiplicador: 1.4 }]),
  passiva({ id: "laco-firme", nome: "Laço Firme", descricao: "Pets cansam e sentem fome mais devagar.", natureza: "magica", subtipo: "espiritual", escopo: "pets", pendente: "Pets (F10)." }, core("domador"), [pct("pets.cansaco", -0.1)]),
  // Sem Chama.
  passiva({ id: "folha-em-branco", nome: "Folha em Branco", descricao: "Sem afinidade, cabe tudo: +1 slot de passiva.", natureza: "magica", subtipo: "espiritual", escopo: "geral" }, core("sem-chama"), [soma("slots-passivas", 1)]),
  passiva({ id: "teimosia", nome: "Teimosia", descricao: "Ganha 10% mais em todo treino.", natureza: "fisica", escopo: "geral" }, core("sem-chama"), [pct("ganho-treino", 0.1)]),
];

// ---------------------------------------------------------------- Ramos dos cores (2 por core)

interface DefRamo {
  readonly coreId: string;
  readonly ramoId: string;
  readonly ramo: string;
  readonly descricaoRamo: string;
  readonly habilidade: (origem: OrigemHabilidade) => Habilidade;
}

const R = (coreId: string, ramoId: string, ramo: string, descricaoRamo: string, habilidade: (o: OrigemHabilidade) => Habilidade): DefRamo => ({
  coreId,
  ramoId,
  ramo,
  descricaoRamo,
  habilidade,
});
const inc = "incomum" as const;

const RAMOS_DEF: readonly DefRamo[] = [
  R("ser-das-trevas", "caminho-do-breu", "Caminho do Breu", "Some na sombra e ataca de onde ninguém olha.", (o) =>
    passiva({ id: "passo-sem-sombra", nome: "Passo sem Sombra", descricao: "+6% de esquiva e +6% de crítico.", natureza: "magica", subtipo: "trevas", escopo: "combate", raridade: inc }, o, [soma("esquiva", 0.06), soma("critico", 0.06)])),
  R("ser-das-trevas", "caminho-do-manto", "Caminho do Manto", "As trevas viram arma.", (o) =>
    ativa({ id: "lamina-de-breu", nome: "Lâmina de Breu", descricao: "Corte de trevas: 220% do ataque.", natureza: "magica", subtipo: "trevas", escopo: "combate", raridade: inc }, o, 12_000, [{ tipo: "golpe", multiplicador: 2.2 }])),
  R("portador-da-chama", "chama-viva", "Chama Viva", "O fogo cresce com a raiva.", (o) =>
    passiva({ id: "furia-em-brasa", nome: "Fúria em Brasa", descricao: "Com menos de 40% de vida, +25% de ataque.", natureza: "magica", subtipo: "elemental", escopo: "combate", raridade: inc }, o, [pct("ataque", 0.25)], 0.4)),
  R("portador-da-chama", "chama-mansa-do-ferreiro", "Chama do Ferreiro", "O fogo a serviço das mãos.", (o) =>
    passiva({ id: "calor-de-forja", nome: "Calor de Forja", descricao: "Mineração e lenha rendem 10% mais.", natureza: "magica", subtipo: "elemental", escopo: "coleta", raridade: inc }, o, [pct("oficio.mineracao.rendimento", 0.1), pct("oficio.lenhador.rendimento", 0.1)])),
  R("filho-da-tempestade", "olho-do-furacao", "Olho do Furacão", "Velocidade acima de tudo.", (o) =>
    passiva({ id: "vento-nas-veias", nome: "Vento nas Veias", descricao: "Ataques 12% mais rápidos.", natureza: "magica", subtipo: "elemental", escopo: "combate", raridade: inc }, o, [pct("velocidade-ataque", 0.12)])),
  R("filho-da-tempestade", "trovao-que-cai", "Trovão que Cai", "Um raio, um corpo no chão.", (o) =>
    ativa({ id: "queda-do-trovao", nome: "Queda do Trovão", descricao: "Raio que atordoa: 150% do ataque e 1,5 s parado.", natureza: "magica", subtipo: "elemental", escopo: "combate", raridade: inc }, o, 14_000, [{ tipo: "golpe", multiplicador: 1.5 }, { tipo: "atordoar", ms: 1_500 }])),
  R("guardiao-da-terra", "montanha-viva", "Montanha Viva", "Ninguém passa.", (o) =>
    passiva({ id: "pele-de-granito", nome: "Pele de Granito", descricao: "+15% de defesa e +8% de vida.", natureza: "fisica", escopo: "combate", raridade: inc }, o, [pct("defesa", 0.15), pct("vida", 0.08)])),
  R("guardiao-da-terra", "terra-farta", "Terra Farta", "A terra dá a quem cuida dela.", (o) =>
    passiva({ id: "mao-de-terra", nome: "Mão de Terra", descricao: "Agricultura e mineração rendem 12% mais.", natureza: "fisica", escopo: "coleta", raridade: inc }, o, [pct("oficio.agricultura.rendimento", 0.12), pct("oficio.mineracao.rendimento", 0.12)])),
  R("alma-da-luz", "luz-que-cura", "Luz que Cura", "Fechar feridas, as suas primeiro.", (o) =>
    ativa({ id: "toque-de-aurora", nome: "Toque de Aurora", descricao: "Cura 30% da vida (só quando precisa).", natureza: "magica", subtipo: "luz", escopo: "combate", raridade: inc }, o, 25_000, [{ tipo: "cura", fracao: 0.3 }])),
  R("alma-da-luz", "luz-que-queima", "Luz que Queima", "Luz demais também fere.", (o) =>
    ativa({ id: "lanca-solar", nome: "Lança Solar", descricao: "Raio de luz: 200% do ataque.", natureza: "magica", subtipo: "luz", escopo: "combate", raridade: inc }, o, 11_000, [{ tipo: "golpe", multiplicador: 2 }])),
  R("predador-nato", "cacada-paciente", "Caçada Paciente", "Esperar o momento certo.", (o) =>
    passiva({ id: "olho-do-predador", nome: "Olho do Predador", descricao: "+8% de crítico.", natureza: "fisica", escopo: "combate", raridade: inc }, o, [soma("critico", 0.08)])),
  R("predador-nato", "frenesi", "Frenesi", "Morder até acabar.", (o) =>
    ativa({ id: "frenesi-de-sangue", nome: "Frenesi de Sangue", descricao: "+30% de velocidade de ataque por 8 s.", natureza: "fisica", escopo: "combate", raridade: inc }, o, 22_000, [{ tipo: "reforco", alvo: "velocidade", valor: 0.3, duracaoMs: 8_000 }])),
  R("mente-lucida", "mente-afiada", "Mente Afiada", "Ver a falha antes do golpe.", (o) =>
    ativa({ id: "ponto-fraco", nome: "Ponto Fraco", descricao: "Expõe a defesa do alvo: −40% de defesa por 8 s.", natureza: "magica", subtipo: "mental", escopo: "combate", raridade: inc }, o, 20_000, [{ tipo: "enfraquecer", alvo: "defesa", valor: 0.4, duracaoMs: 8_000 }])),
  R("mente-lucida", "mente-estudiosa", "Mente Estudiosa", "Tudo vira lição.", (o) =>
    passiva({ id: "estudo-constante", nome: "Estudo Constante", descricao: "+10% de XP do personagem.", natureza: "magica", subtipo: "mental", escopo: "geral", raridade: inc }, o, [pct("xp-personagem", 0.1)])),
  R("alma-antiga", "ancestrais-guerreiros", "Ancestrais Guerreiros", "Os mortos lutam ao seu lado.", (o) =>
    ativa({ id: "bencao-dos-mortos", nome: "Bênção dos Mortos", descricao: "+25% de ataque e +25% de defesa por 10 s.", natureza: "magica", subtipo: "espiritual", escopo: "combate", raridade: inc }, o, 30_000, [
      { tipo: "reforco", alvo: "ataque", valor: 0.25, duracaoMs: 10_000 },
      { tipo: "reforco", alvo: "defesa", valor: 0.25, duracaoMs: 10_000 },
    ])),
  R("alma-antiga", "ancestrais-sabios", "Ancestrais Sábios", "Os mortos ensinam.", (o) =>
    passiva({ id: "licao-das-eras", nome: "Lição das Eras", descricao: "+15% no ganho de treino.", natureza: "magica", subtipo: "espiritual", escopo: "geral", raridade: inc }, o, [pct("ganho-treino", 0.15)])),
  R("artifice-nato", "mestre-de-oficina", "Mestre de Oficina", "Ferramenta boa é meio caminho.", (o) =>
    passiva({ id: "ferramenta-afinada", nome: "Ferramenta Afinada", descricao: "Coleta 12% mais rápida.", natureza: "fisica", escopo: "coleta", raridade: inc }, o, [pct("coleta.velocidade", 0.12)])),
  R("artifice-nato", "armeiro", "Armeiro", "Cuidar da arma é cuidar de si.", (o) =>
    passiva({ id: "fio-perfeito", nome: "Fio Perfeito", descricao: "+10% de ataque.", natureza: "fisica", escopo: "combate", raridade: inc }, o, [pct("ataque", 0.1)])),
  R("andarilho", "estrada-longa", "Estrada Longa", "Cada passo rende.", (o) =>
    passiva({ id: "mochila-arrumada", nome: "Mochila Arrumada", descricao: "+6 espaços na mochila.", natureza: "fisica", escopo: "geral", raridade: inc }, o, [soma("espacos-mochila", 6)])),
  R("andarilho", "sobrevivente", "Sobrevivente", "Quem anda muito aprende a não morrer.", (o) =>
    ativa({ id: "fole-de-campanha", nome: "Fôlego de Campanha", descricao: "Cura 25% da vida (só quando precisa).", natureza: "fisica", escopo: "combate", raridade: inc }, o, 25_000, [{ tipo: "cura", fracao: 0.25 }])),
  R("domador", "fera-interior", "Fera Interior", "Lutar como os bichos lutam.", (o) =>
    ativa({ id: "garras-emprestadas", nome: "Garras Emprestadas", descricao: "Dois golpes rápidos: 170% do ataque.", natureza: "fisica", escopo: "combate", raridade: inc }, o, 10_000, [{ tipo: "golpe", multiplicador: 1.7 }])),
  R("domador", "pastor", "Pastor", "Cuidar de tudo o que vive.", (o) =>
    passiva({ id: "mao-de-pastor", nome: "Mão de Pastor", descricao: "Pesca e agricultura rendem 10% mais.", natureza: "fisica", escopo: "coleta", raridade: inc }, o, [pct("oficio.pesca.rendimento", 0.1), pct("oficio.agricultura.rendimento", 0.1)])),
  R("sem-chama", "vazio-que-aprende", "Vazio que Aprende", "Sem chama, mas com fome de tudo.", (o) =>
    passiva({ id: "esponja", nome: "Esponja", descricao: "+30% de XP de maestria.", natureza: "magica", subtipo: "espiritual", escopo: "geral", raridade: inc }, o, [pct("xp-maestria", 0.3)])),
  R("sem-chama", "vazio-que-resiste", "Vazio que Resiste", "Nada para queimar, nada para quebrar.", (o) =>
    passiva({ id: "casca-vazia", nome: "Casca Vazia", descricao: "+12% de vida e +8% de defesa.", natureza: "fisica", escopo: "combate", raridade: inc }, o, [pct("vida", 0.12), pct("defesa", 0.08)])),
];

export const RAMOS_CORE: readonly RamoCore[] = RAMOS_DEF.map((r) => ({
  id: r.ramoId,
  coreId: r.coreId,
  nome: r.ramo,
  descricao: r.descricaoRamo,
  habilidadeId: r.habilidade(core(r.coreId, r.ramoId)).id,
}));

const HABILIDADES_RAMO: readonly Habilidade[] = RAMOS_DEF.map((r) => r.habilidade(core(r.coreId, r.ramoId)));

// ---------------------------------------------------------------- Livros (habilidades gerais)

export const HABILIDADES_LIVRO: readonly Habilidade[] = [
  ativa({ id: "golpe-firme", nome: "Golpe Firme", descricao: "Golpe pesado: 130% do ataque.", natureza: "fisica", escopo: "combate" }, LIVRO, 6_000, [{ tipo: "golpe", multiplicador: 1.3 }]),
  ativa({ id: "primeiros-socorros", nome: "Primeiros Socorros", descricao: "Cura 20% da vida (só quando precisa).", natureza: "fisica", escopo: "combate" }, LIVRO, 30_000, [{ tipo: "cura", fracao: 0.2 }]),
  ativa({ id: "postura-defensiva", nome: "Postura Defensiva", descricao: "+30% de defesa por 8 s.", natureza: "fisica", escopo: "combate" }, LIVRO, 20_000, [{ tipo: "reforco", alvo: "defesa", valor: 0.3, duracaoMs: 8_000 }]),
  ativa({ id: "grito-de-guerra", nome: "Grito de Guerra", descricao: "+20% de ataque por 8 s.", natureza: "fisica", escopo: "combate", raridade: "incomum" }, LIVRO, 20_000, [{ tipo: "reforco", alvo: "ataque", valor: 0.2, duracaoMs: 8_000 }]),
  passiva({ id: "couro-grosso", nome: "Couro Grosso", descricao: "+8% de vida.", natureza: "fisica", escopo: "combate" }, LIVRO, [pct("vida", 0.08)]),
  passiva({ id: "manual-do-lenhador", nome: "Manual do Lenhador", descricao: "Lenha rende 10% mais.", natureza: "fisica", escopo: "coleta" }, LIVRO, [pct("oficio.lenhador.rendimento", 0.1)]),
  passiva({ id: "manual-do-minerador", nome: "Manual do Minerador", descricao: "Minério rende 10% mais.", natureza: "fisica", escopo: "coleta" }, LIVRO, [pct("oficio.mineracao.rendimento", 0.1)]),
  passiva({ id: "manual-do-pescador", nome: "Manual do Pescador", descricao: "Pesca rende 10% mais.", natureza: "fisica", escopo: "coleta" }, LIVRO, [pct("oficio.pesca.rendimento", 0.1)]),
  passiva({ id: "manual-do-fazendeiro", nome: "Manual do Fazendeiro", descricao: "Colheita rende 10% mais.", natureza: "fisica", escopo: "coleta" }, LIVRO, [pct("oficio.agricultura.rendimento", 0.1)]),
  passiva({ id: "passo-de-viajante", nome: "Passo de Viajante", descricao: "Viagens 10% mais curtas.", natureza: "fisica", escopo: "viagem" }, LIVRO, [pct("duracao-viagem", -0.1)]),
  passiva({ id: "olhos-atentos", nome: "Olhos Atentos", descricao: "+25% de chance de achado raro na coleta.", natureza: "fisica", escopo: "coleta", raridade: "incomum" }, LIVRO, [pct("chance-raro", 0.25)]),
];

export const HABILIDADES: readonly Habilidade[] = [...TECNICAS_CORE, ...HABILIDADES_RAMO, ...HABILIDADES_LIVRO];

/** Preço do livro no Mercado por raridade da habilidade [Calibrar]. */
export const PRECO_LIVRO: Readonly<Partial<Record<Raridade, number>>> = { comum: 300, incomum: 900 };

/** Id do item-livro de uma habilidade. */
export function idLivro(habilidadeId: string): string {
  return `livro-${habilidadeId}`;
}
