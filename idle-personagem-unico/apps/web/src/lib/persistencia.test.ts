import { criarEstadoInicial, serializarSave } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { criarArmazenamentoLocal, type ArmazenamentoWeb } from "./armazenamentoLocal";
import { CHAVE_SAVE, CHAVE_SAVE_INVALIDO, gerarSemente, iniciarJogo } from "./persistencia";

const T0 = 1_700_000_000_000;

function storageFalso(inicial: Record<string, string> = {}): ArmazenamentoWeb & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
}

describe("persistência web", () => {
  it("sem save, cria um estado vazio e grava", async () => {
    const storage = storageFalso();
    const r = await iniciarJogo(criarArmazenamentoLocal(storage), T0, () => "semente");
    expect(r.origem).toBe("novo");
    expect(r.estado).toEqual(criarEstadoInicial("semente", T0));
    expect(storage.dados.get(CHAVE_SAVE)).toBe(serializarSave(r.estado));
  });

  it("com save válido, carrega sem trocar a semente", async () => {
    const existente = criarEstadoInicial("antiga", T0);
    const storage = storageFalso({ [CHAVE_SAVE]: serializarSave(existente) });
    const r = await iniciarJogo(criarArmazenamentoLocal(storage), T0 + 1000, () => "nova");
    expect(r.origem).toBe("carregado");
    expect(r.estado).toEqual(existente);
  });

  it("com save inválido, guarda a cópia e recomeça", async () => {
    const storage = storageFalso({ [CHAVE_SAVE]: "{lixo" });
    const r = await iniciarJogo(criarArmazenamentoLocal(storage), T0, () => "nova");
    expect(r.origem).toBe("recuperado");
    expect(r.aviso).toBeTruthy();
    expect(storage.dados.get(CHAVE_SAVE_INVALIDO)).toBe("{lixo");
    expect(r.estado.semente).toBe("nova");
  });

  it("gera sementes hexadecimais de 32 caracteres", () => {
    const s = gerarSemente();
    expect(s).toMatch(/^[0-9a-f]{32}$/);
    expect(gerarSemente()).not.toBe(s);
  });
});
