import { describe, expect, it, vi } from "vitest";
import { aplicarAcao, criarArmazenamentoEmMemoria, criarEstadoInicial, serializarSave } from "@idle-pu/motor";
import { lerJornadaLocal } from "./entrada";
import { CHAVE_SAVE } from "./persistencia";

describe("entrada antes do personagem", () => {
  it("abrir apresentação/login não cria save nem sorteia um personagem", async () => {
    const arm = criarArmazenamentoEmMemoria();
    const gravar = vi.spyOn(arm, "gravar");
    expect(await lerJornadaLocal(arm)).toBeNull();
    expect(await lerJornadaLocal(arm)).toBeNull();
    expect(gravar).not.toHaveBeenCalled();
    expect(await arm.ler(CHAVE_SAVE)).toBeNull();
  });
  it("consultar uma criação pendente não devolve tentativas nem consome RNG", async () => {
    let estado = criarEstadoInicial("entrada", 1_800_000_000_000);
    for (const acao of [{ tipo: "iniciarSorteio" }, { tipo: "rerolar" }]) {
      const r = aplicarAcao(estado, acao, estado.ultimoTick);
      if (!r.ok) throw new Error(r.erro.codigo);
      estado = r.estado;
    }
    const save = serializarSave(estado);
    const arm = criarArmazenamentoEmMemoria({ [CHAVE_SAVE]: save });
    expect(await lerJornadaLocal(arm)).toEqual(estado);
    expect(await arm.ler(CHAVE_SAVE)).toBe(save);
  });
  it("um save inválido não é sobrescrito pela tela de entrada", async () => {
    const arm = criarArmazenamentoEmMemoria({ [CHAVE_SAVE]: "{invalido" });
    expect(await lerJornadaLocal(arm)).toBeNull();
    expect(await arm.ler(CHAVE_SAVE)).toBe("{invalido");
  });
});
