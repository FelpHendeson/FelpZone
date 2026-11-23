import type { Armazenamento } from "@idle-pu/motor";

/** Parte da API `Storage` que usamos; facilita testar sem navegador. */
export type ArmazenamentoWeb = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Implementa a interface `Armazenamento` do motor sobre `localStorage`. */
export function criarArmazenamentoLocal(storage: ArmazenamentoWeb): Armazenamento {
  return {
    ler: async (chave) => storage.getItem(chave),
    gravar: async (chave, valor) => {
      storage.setItem(chave, valor);
    },
    remover: async (chave) => {
      storage.removeItem(chave);
    },
  };
}
