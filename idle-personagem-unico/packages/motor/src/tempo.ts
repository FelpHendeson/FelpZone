/**
 * Tempo do jogo: relógio injetável, passo da simulação e limite offline.
 * Instantes são milissegundos desde a época Unix (como `Date.now()`).
 */

/** Fonte do instante atual. Injetada para testes e, com conta, pelo servidor. */
export interface Relogio {
  agora(): number;
}

/** Duração de um passo de simulação: 0,5 s. */
export const PASSO_MS = 500;

/** Tempo máximo que o jogo simula com o jogo fechado: 12 h. */
export const LIMITE_OFFLINE_MS = 12 * 60 * 60 * 1000;

/** Quantidade máxima de passos em uma única simulação offline (86.400). */
export const MAX_PASSOS_OFFLINE = LIMITE_OFFLINE_MS / PASSO_MS;

/** Relógio do sistema. Use só nas bordas (interface, servidor); regras recebem o instante. */
export const relogioDoSistema: Relogio = {
  agora: () => Date.now(),
};

/** Relógio parado em um instante, que só anda quando mandado. Útil em testes. */
export interface RelogioManual extends Relogio {
  avancar(ms: number): void;
  definir(instante: number): void;
}

export function criarRelogioManual(inicio: number): RelogioManual {
  let atual = inicio;
  return {
    agora: () => atual,
    avancar: (ms) => {
      atual += ms;
    },
    definir: (instante) => {
      atual = instante;
    },
  };
}

export interface ResultadoPassos {
  /** Passos inteiros a simular (no máximo `MAX_PASSOS_OFFLINE`). */
  readonly passos: number;
  /** Verdadeiro quando o tempo decorrido passou de 12 h e foi cortado. */
  readonly limitado: boolean;
  /** Tempo real decorrido entre os instantes (0 se o relógio voltou). */
  readonly decorridoMs: number;
  /**
   * Novo instante de referência para a próxima conta. Guarda a fração de passo
   * que sobrou e descarta o tempo além do limite.
   */
  readonly novaReferencia: number;
}

/**
 * Calcula quantos passos cabem entre `desde` e `ate`, respeitando o limite de 12 h.
 * Se o relógio voltou no tempo (ou os valores não são finitos), não há passos e a
 * referência fica onde estava.
 */
export function calcularPassos(desde: number, ate: number): ResultadoPassos {
  if (!Number.isFinite(desde) || !Number.isFinite(ate) || ate <= desde) {
    return { passos: 0, limitado: false, decorridoMs: 0, novaReferencia: Number.isFinite(desde) ? desde : ate };
  }
  const decorridoMs = ate - desde;
  const limitado = decorridoMs > LIMITE_OFFLINE_MS;
  const consideradoMs = limitado ? LIMITE_OFFLINE_MS : decorridoMs;
  const passos = Math.floor(consideradoMs / PASSO_MS);
  const restoMs = consideradoMs - passos * PASSO_MS;
  return { passos, limitado, decorridoMs, novaReferencia: ate - restoMs };
}
