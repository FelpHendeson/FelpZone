/**
 * Gerador pseudoaleatório determinístico (sfc32) com estado serializável.
 *
 * Toda regra que sorteia algo usa este gerador; o estado vai para o save,
 * então a mesma semente (ou o mesmo estado salvo) produz a mesma sequência
 * no navegador, no servidor e no app mobile.
 */

/** Estado do sfc32: quatro inteiros sem sinal de 32 bits. */
export interface EstadoRng {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** Item de uma escolha ponderada. Pesos devem ser finitos e não negativos. */
export interface OpcaoPonderada<T> {
  readonly valor: T;
  readonly peso: number;
}

const DOIS_A_32 = 0x1_0000_0000;
/** Saídas descartadas após semear, como recomenda o autor do sfc32. */
const DESCARTE_INICIAL = 15;
export const TAMANHO_MAXIMO_SEMENTE = 128;

function ehUint32(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor < DOIS_A_32;
}

/** Confere se um valor desconhecido (vindo de um save, por exemplo) é um estado válido. */
export function ehEstadoRng(valor: unknown): valor is EstadoRng {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false;
  const v = valor as Record<string, unknown>;
  return ehUint32(v.a) && ehUint32(v.b) && ehUint32(v.c) && ehUint32(v.d);
}

/** splitmix32: espalha uma semente numérica em palavras de 32 bits. */
function splitmix32(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/** cyrb128: hash de texto em quatro palavras de 32 bits. */
function cyrb128(texto: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < texto.length; i++) {
    const k = texto.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Converte uma semente (inteiro ou texto) no estado inicial do gerador. */
export function estadoDaSemente(semente: number | string): EstadoRng {
  let palavras: [number, number, number, number];
  if (typeof semente === "number") {
    if (!Number.isSafeInteger(semente)) {
      throw new RangeError("A semente numérica precisa ser um inteiro seguro.");
    }
    const proxima = splitmix32(semente ^ Math.floor(semente / DOIS_A_32));
    palavras = [proxima(), proxima(), proxima(), proxima()];
  } else {
    if (semente.length === 0 || semente.length > TAMANHO_MAXIMO_SEMENTE) {
      throw new RangeError(`A semente em texto precisa ter de 1 a ${TAMANHO_MAXIMO_SEMENTE} caracteres.`);
    }
    palavras = cyrb128(semente);
  }
  const rng = Rng.deEstado({ a: palavras[0], b: palavras[1], c: palavras[2], d: palavras[3] });
  for (let i = 0; i < DESCARTE_INICIAL; i++) rng.proximoUint32();
  return rng.estado();
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  private constructor(estado: EstadoRng) {
    this.a = estado.a;
    this.b = estado.b;
    this.c = estado.c;
    this.d = estado.d;
  }

  /** Cria um gerador a partir de uma semente. */
  static daSemente(semente: number | string): Rng {
    return new Rng(estadoDaSemente(semente));
  }

  /** Retoma um gerador a partir de um estado salvo. */
  static deEstado(estado: EstadoRng): Rng {
    if (!ehEstadoRng(estado)) throw new TypeError("Estado do RNG inválido.");
    return new Rng(estado);
  }

  /** Cópia do estado atual, pronta para serializar. */
  estado(): EstadoRng {
    return { a: this.a, b: this.b, c: this.c, d: this.d };
  }

  /** Próximo inteiro sem sinal de 32 bits (sfc32). */
  proximoUint32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = (this.b ^ (this.b >>> 9)) >>> 0;
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** Ponto flutuante em [0, 1). */
  flutuante(): number {
    return this.proximoUint32() / DOIS_A_32;
  }

  /** Inteiro uniforme em [min, max], inclusivo nas duas pontas, sem viés. */
  inteiro(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
      throw new RangeError("Intervalo inteiro inválido.");
    }
    const amplitude = max - min + 1;
    if (amplitude > DOIS_A_32) throw new RangeError("Intervalo maior que 2^32.");
    // Rejeição: descarta o resto que causaria viés no módulo.
    const limite = DOIS_A_32 - (DOIS_A_32 % amplitude);
    let x = this.proximoUint32();
    while (x >= limite) x = this.proximoUint32();
    return min + (x % amplitude);
  }

  /** Escolhe um valor com probabilidade proporcional ao peso. */
  escolhaPonderada<T>(opcoes: readonly OpcaoPonderada<T>[]): T {
    let total = 0;
    for (const opcao of opcoes) {
      if (!Number.isFinite(opcao.peso) || opcao.peso < 0) {
        throw new RangeError("Pesos precisam ser finitos e não negativos.");
      }
      total += opcao.peso;
    }
    if (!(total > 0) || !Number.isFinite(total)) {
      throw new RangeError("A soma dos pesos precisa ser positiva e finita.");
    }
    let alvo = this.flutuante() * total;
    let ultimaComPeso: T | undefined;
    for (const opcao of opcoes) {
      if (opcao.peso === 0) continue;
      ultimaComPeso = opcao.valor;
      if (alvo < opcao.peso) return opcao.valor;
      alvo -= opcao.peso;
    }
    // Arredondamento de ponto flutuante: fica com a última opção de peso > 0.
    return ultimaComPeso as T;
  }

  /** Devolve uma cópia embaralhada (Fisher–Yates); não altera a lista original. */
  embaralhar<T>(lista: readonly T[]): T[] {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = this.inteiro(0, i);
      const tmp = copia[i] as T;
      copia[i] = copia[j] as T;
      copia[j] = tmp;
    }
    return copia;
  }
}
