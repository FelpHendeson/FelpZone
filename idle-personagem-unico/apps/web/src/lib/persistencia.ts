import { criarEstadoInicial, lerJogo, salvarJogo, type Armazenamento, type EstadoJogo } from "@idle-pu/motor";

export const CHAVE_SAVE = "idle-pu:save";
/** Cópia de um save que não pôde ser lido, para não perder o original. */
export const CHAVE_SAVE_INVALIDO = "idle-pu:save-invalido";

export type OrigemDoEstado = "carregado" | "migrado" | "novo" | "recuperado";

export interface ResultadoInicio {
  readonly estado: EstadoJogo;
  readonly origem: OrigemDoEstado;
  /** Mensagem do motor quando o save existente era inválido. */
  readonly aviso: string | null;
}

/** Semente aleatória para um jogo novo (fora do motor; o motor só a recebe). */
export function gerarSemente(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Carrega o save; se não houver, cria um estado vazio. Se o save for
 * inválido, guarda uma cópia em `CHAVE_SAVE_INVALIDO` e começa do zero.
 */
export async function iniciarJogo(
  armazenamento: Armazenamento,
  agora: number,
  novaSemente: () => string = gerarSemente,
): Promise<ResultadoInicio> {
  const lido = await lerJogo(armazenamento, CHAVE_SAVE);
  if (lido.ok) {
    if (lido.migradoDe !== null) await salvarJogo(armazenamento, CHAVE_SAVE, lido.estado);
    return { estado: lido.estado, origem: lido.migradoDe === null ? "carregado" : "migrado", aviso: null };
  }

  let aviso: string | null = null;
  if (lido.erro) {
    const original = await armazenamento.ler(CHAVE_SAVE);
    if (original !== null) await armazenamento.gravar(CHAVE_SAVE_INVALIDO, original);
    aviso = lido.erro.mensagem;
  }
  const estado = criarEstadoInicial(novaSemente(), agora);
  await salvarJogo(armazenamento, CHAVE_SAVE, estado);
  return { estado, origem: aviso ? "recuperado" : "novo", aviso };
}
