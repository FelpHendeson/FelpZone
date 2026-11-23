/**
 * Interface de armazenamento do save. Cada plataforma implementa a sua
 * (armazenamento local do navegador na web, AsyncStorage ou SQLite no mobile); o motor só
 * conhece a interface. Assíncrona para servir às duas.
 */
import { carregarSave, serializarSave, type EstadoJogo, type ResultadoCarga } from "./save";

export interface Armazenamento {
  ler(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string): Promise<void>;
  remover(chave: string): Promise<void>;
}

/** Armazenamento em memória, para testes e para quando não há persistência. */
export function criarArmazenamentoEmMemoria(inicial: Readonly<Record<string, string>> = {}): Armazenamento {
  const dados = new Map<string, string>(Object.entries(inicial));
  return {
    ler: async (chave) => dados.get(chave) ?? null,
    gravar: async (chave, valor) => {
      dados.set(chave, valor);
    },
    remover: async (chave) => {
      dados.delete(chave);
    },
  };
}

export type ResultadoLeitura = ResultadoCarga | { readonly ok: false; readonly erro: null };

/** Salva o estado serializado na chave indicada. */
export async function salvarJogo(armazenamento: Armazenamento, chave: string, estado: EstadoJogo): Promise<void> {
  await armazenamento.gravar(chave, serializarSave(estado));
}

/**
 * Lê e valida o save. Devolve `{ ok: false, erro: null }` quando não há save,
 * para diferenciar "não existe" de "existe mas é inválido".
 */
export async function lerJogo(armazenamento: Armazenamento, chave: string): Promise<ResultadoLeitura> {
  const texto = await armazenamento.ler(chave);
  if (texto === null) return { ok: false, erro: null };
  return carregarSave(texto);
}
