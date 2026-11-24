/**
 * Save versionado: serialização, migrações, limite de tamanho e validação.
 *
 * O texto do save é entrada não confiável (pode vir editado à mão, corrompido
 * ou de outra versão). `carregarSave` nunca lança: devolve o estado ou um erro.
 */
import { camposIniciaisF3, camposIniciaisF4, camposIniciaisF5, camposIniciaisF6, validarConta, type Conta } from "./personagem/conta";
import { statusIniciais, type BaseModificadores } from "./personagem/progressao";
import { ehEstadoRng, estadoDaSemente, TAMANHO_MAXIMO_SEMENTE, type EstadoRng } from "./rng";

/** Versão atual do formato do save. Suba junto com uma migração nova. */
export const VERSAO_SAVE_ATUAL = 7;

/** Tamanho máximo do save serializado, em bytes UTF-8 (512 KiB). */
export const TAMANHO_MAXIMO_SAVE_BYTES = 512 * 1024;

/**
 * Estado do jogo. v1 (F0): semente, RNG e tempo. v2 (F1): `conta`, com os
 * personagens, o ativo e o sorteio em andamento. v3 (F2): status e atividade
 * de cada personagem. v4 (F3): lugar, viagem, gold, mochila, ofícios e
 * ferramentas. v5 (F4): equipamento de combate, vida, recuo e bestiário.
 * v6 (F5): habilidades, slots, ramo e o estado das ativas no combate.
 * v7 (F6): Limiar, mortes, Eco da Morte e Essência.
 * Próximas fatias acrescentam campos com migração.
 */
export interface EstadoJogo {
  readonly versao: typeof VERSAO_SAVE_ATUAL;
  /** Semente original, guardada para reproduzir sorteios. */
  readonly semente: string;
  /** Estado atual do RNG (avança a cada sorteio). */
  readonly rng: EstadoRng;
  readonly criadoEm: number;
  readonly ultimoTick: number;
  readonly conta: Conta;
}

/** Dados crus de um save, antes da validação. */
export type DadosSave = Readonly<Record<string, unknown>>;

/** Leva dados da versão `n` para a versão `n + 1`. Não deve alterar a entrada. */
export type Migracao = (dados: DadosSave) => DadosSave;

/** v1 → v2: acrescenta a conta vazia (sem personagens nem sorteio). */
export const migrarV1ParaV2: Migracao = (dados) => ({
  ...dados,
  conta: { personagens: [], personagemAtivoId: null, sorteio: null },
});

/**
 * v2 → v3: cada personagem ganha os status iniciais (piso do nível 1, com os
 * modificadores de raça, dom e origem) e fica ocioso. Dados inválidos fazem a
 * migração lançar, e `migrarSave` transforma isso em erro.
 */
export const migrarV2ParaV3: Migracao = (dados) => {
  const conta = dados.conta as { personagens?: unknown } | undefined;
  const personagens = Array.isArray(conta?.personagens) ? conta.personagens : [];
  return {
    ...dados,
    conta: {
      ...(conta as object),
      personagens: personagens.map((p: Record<string, unknown>) => ({
        ...p,
        status: statusIniciais(p as unknown as BaseModificadores),
        atividade: null,
      })),
    },
  };
};

/**
 * v3 → v4: cada personagem fica em Pedravau (no Campo de Treino, se estava
 * treinando; na Praça, se ocioso), sem gold, com a mochila vazia, ofícios no
 * nível 1 e o kit básico de ferramentas.
 */
export const migrarV3ParaV4: Migracao = (dados) => {
  const conta = dados.conta as { personagens?: unknown } | undefined;
  const personagens = Array.isArray(conta?.personagens) ? conta.personagens : [];
  return {
    ...dados,
    conta: {
      ...(conta as object),
      personagens: personagens.map((p: Record<string, unknown>) => {
        const base = camposIniciaisF3();
        return { ...p, ...base, subareaId: p.atividade ? "campo-de-treino" : base.subareaId };
      }),
    },
  };
};

/** v4 → v5: kit básico de combate equipado, vida cheia, recuo de 30% e bestiário vazio. */
export const migrarV4ParaV5: Migracao = (dados) => {
  const conta = dados.conta as { personagens?: unknown } | undefined;
  const personagens = Array.isArray(conta?.personagens) ? conta.personagens : [];
  return {
    ...dados,
    conta: { ...(conta as object), personagens: personagens.map((p: Record<string, unknown>) => ({ ...p, ...camposIniciaisF4() })) },
  };
};

/**
 * v5 → v6: o personagem passa a conhecer as técnicas do próprio core (e as da
 * origem), já equipadas; uma luta em andamento ganha recargas e efeitos vazios.
 */
export const migrarV5ParaV6: Migracao = (dados) => {
  const conta = dados.conta as { personagens?: unknown } | undefined;
  const personagens = Array.isArray(conta?.personagens) ? conta.personagens : [];
  return {
    ...dados,
    conta: {
      ...(conta as object),
      personagens: personagens.map((p: Record<string, unknown>) => {
        const origem = p.origem as { tipo?: unknown; id?: unknown } | undefined;
        const f5 = camposIniciaisF5(String(p.coreId), origem?.tipo === "especial" ? String(origem.id) : undefined);
        const atividade = p.atividade as { combate?: object } | null | undefined;
        const novaAtividade = atividade?.combate ? { ...atividade, combate: { ...atividade.combate, recargas: {}, efeitos: [] } } : atividade;
        return { ...p, ...f5, atividade: novaAtividade ?? null };
      }),
    },
  };
};

/** v6 → v7: ninguém está no Limiar; mortes e Essência começam em zero (os desmaios antigos não contam). */
export const migrarV6ParaV7: Migracao = (dados) => {
  const conta = dados.conta as { personagens?: unknown } | undefined;
  const personagens = Array.isArray(conta?.personagens) ? conta.personagens : [];
  return {
    ...dados,
    conta: { ...(conta as object), personagens: personagens.map((p: Record<string, unknown>) => ({ ...p, ...camposIniciaisF6() })) },
  };
};

/** Tabela de migrações, indexada pela versão de origem. */
export const MIGRACOES: Readonly<Record<number, Migracao>> = Object.freeze({
  1: migrarV1ParaV2,
  2: migrarV2ParaV3,
  3: migrarV3ParaV4,
  4: migrarV4ParaV5,
  5: migrarV5ParaV6,
  6: migrarV6ParaV7,
});

export type CodigoErroSave =
  | "vazio"
  | "grande_demais"
  | "json_invalido"
  | "formato_invalido"
  | "versao_invalida"
  | "versao_futura"
  | "migracao_ausente"
  | "migracao_falhou";

export interface ErroSave {
  readonly codigo: CodigoErroSave;
  readonly mensagem: string;
}

export type ResultadoCarga =
  | { readonly ok: true; readonly estado: EstadoJogo; readonly migradoDe: number | null }
  | { readonly ok: false; readonly erro: ErroSave };

export type ResultadoMigracao =
  | { readonly ok: true; readonly dados: DadosSave }
  | { readonly ok: false; readonly erro: ErroSave };

export interface OpcoesCarga {
  readonly migracoes?: Readonly<Record<number, Migracao>>;
  readonly tamanhoMaximoBytes?: number;
}

/** Cria o estado inicial (vazio) a partir de uma semente e do instante atual. */
export function criarEstadoInicial(semente: string, agora: number): EstadoJogo {
  if (!Number.isSafeInteger(agora) || agora < 0) throw new RangeError("Instante inválido.");
  return {
    versao: VERSAO_SAVE_ATUAL,
    semente,
    rng: estadoDaSemente(semente),
    criadoEm: agora,
    ultimoTick: agora,
    conta: { personagens: [], personagemAtivoId: null, sorteio: null },
  };
}

/** Tamanho em bytes UTF-8, sem depender de APIs da plataforma. */
export function tamanhoUtf8(texto: string): number {
  let bytes = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
      const prox = texto.charCodeAt(i + 1);
      if (prox >= 0xdc00 && prox <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

/** Serializa o estado. Lança se o resultado passar do tamanho máximo. */
export function serializarSave(estado: EstadoJogo): string {
  const texto = JSON.stringify(estado);
  if (tamanhoUtf8(texto) > TAMANHO_MAXIMO_SAVE_BYTES) {
    throw new RangeError("O save passou do tamanho máximo.");
  }
  return texto;
}

function erro(codigo: CodigoErroSave, mensagem: string): { ok: false; erro: ErroSave } {
  return { ok: false, erro: { codigo, mensagem } };
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function ehInstante(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0;
}

/**
 * Aplica as migrações, uma versão por vez, até `versaoAlvo`.
 * Exposta para testes e para ferramentas; o jogo usa `carregarSave`.
 */
export function migrarSave(
  dados: DadosSave,
  migracoes: Readonly<Record<number, Migracao>> = MIGRACOES,
  versaoAlvo: number = VERSAO_SAVE_ATUAL,
): ResultadoMigracao {
  const versaoInicial = dados.versao;
  if (typeof versaoInicial !== "number" || !Number.isSafeInteger(versaoInicial) || versaoInicial < 0) {
    return erro("versao_invalida", "O save não tem uma versão válida.");
  }
  if (versaoInicial > versaoAlvo) {
    return erro("versao_futura", `O save é da versão ${versaoInicial}, mais nova que a do jogo (${versaoAlvo}).`);
  }
  let atual = dados;
  for (let v = versaoInicial; v < versaoAlvo; v++) {
    const migracao = Object.prototype.hasOwnProperty.call(migracoes, v) ? migracoes[v] : undefined;
    if (!migracao) return erro("migracao_ausente", `Não há migração da versão ${v} para a ${v + 1}.`);
    let proximo: DadosSave;
    try {
      proximo = migracao(atual);
    } catch {
      return erro("migracao_falhou", `A migração da versão ${v} para a ${v + 1} falhou.`);
    }
    if (!ehObjeto(proximo)) return erro("migracao_falhou", `A migração da versão ${v} não devolveu um objeto.`);
    atual = { ...proximo, versao: v + 1 };
  }
  return { ok: true, dados: atual };
}

/**
 * Valida dados já na versão atual e monta um estado limpo (campos
 * desconhecidos são descartados).
 */
export function validarEstado(dados: DadosSave): EstadoJogo | null {
  if (dados.versao !== VERSAO_SAVE_ATUAL) return null;
  const { semente, rng, criadoEm, ultimoTick, conta } = dados;
  if (typeof semente !== "string" || semente.length === 0 || semente.length > TAMANHO_MAXIMO_SEMENTE) return null;
  if (!ehEstadoRng(rng)) return null;
  if (!ehInstante(criadoEm) || !ehInstante(ultimoTick) || ultimoTick < criadoEm) return null;
  const contaLimpa = validarConta(conta);
  if (!contaLimpa) return null;
  return {
    versao: VERSAO_SAVE_ATUAL,
    semente,
    rng: { a: rng.a, b: rng.b, c: rng.c, d: rng.d },
    criadoEm,
    ultimoTick,
    conta: contaLimpa,
  };
}

/** Lê um save em texto: confere tamanho, JSON, versão, migra e valida. */
export function carregarSave(texto: string, opcoes: OpcoesCarga = {}): ResultadoCarga {
  const migracoes = opcoes.migracoes ?? MIGRACOES;
  const tamanhoMaximo = opcoes.tamanhoMaximoBytes ?? TAMANHO_MAXIMO_SAVE_BYTES;

  if (typeof texto !== "string" || texto.trim().length === 0) return erro("vazio", "O save está vazio.");
  // Compara primeiro o número de caracteres (cada um vale ao menos 1 byte) para
  // não percorrer textos enormes.
  if (texto.length > tamanhoMaximo || tamanhoUtf8(texto) > tamanhoMaximo) {
    return erro("grande_demais", "O save passou do tamanho máximo.");
  }

  let cru: unknown;
  try {
    cru = JSON.parse(texto);
  } catch {
    return erro("json_invalido", "O save não é um JSON válido.");
  }
  if (!ehObjeto(cru)) return erro("formato_invalido", "O save precisa ser um objeto.");

  const migrado = migrarSave(cru, migracoes, VERSAO_SAVE_ATUAL);
  if (!migrado.ok) return migrado;

  const estado = validarEstado(migrado.dados);
  if (!estado) return erro("formato_invalido", "O save tem campos ausentes ou inválidos.");

  const versaoOriginal = cru.versao as number;
  return { ok: true, estado, migradoDe: versaoOriginal === VERSAO_SAVE_ATUAL ? null : versaoOriginal };
}
