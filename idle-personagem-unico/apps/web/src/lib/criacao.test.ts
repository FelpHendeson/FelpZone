import { carregarSave, criarEstadoInicial, rerolar, situacaoSorteio } from "@idle-pu/motor";
import { describe, expect, it } from "vitest";
import { criarArmazenamentoLocal, type ArmazenamentoWeb } from "./armazenamentoLocal";
import { aplicarESalvar, prepararCriacao } from "./criacao";
import { CHAVE_SAVE } from "./persistencia";

const T0 = 1_700_000_000_000;

function storageFalso(): ArmazenamentoWeb & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v), removeItem: (k) => void dados.delete(k) };
}

describe("criação na web", () => {
  it("jogo novo começa o sorteio; sorteio em andamento não é reiniciado", () => {
    const e = prepararCriacao(criarEstadoInicial("web", T0));
    expect(situacaoSorteio(e)?.tentativa).toBe(1);
    const r = rerolar(e);
    if (!r.ok) throw new Error();
    expect(prepararCriacao(r.estado)).toBe(r.estado);
  });

  it("grava cada ação: o save recarregado tem a mesma tentativa", async () => {
    const storage = storageFalso();
    const armazenamento = criarArmazenamentoLocal(storage);
    const e = prepararCriacao(criarEstadoInicial("web2", T0));
    const r = await aplicarESalvar(armazenamento, rerolar(e));
    expect(r.ok).toBe(true);
    const lido = carregarSave(storage.dados.get(CHAVE_SAVE)!);
    expect(lido.ok && situacaoSorteio(lido.estado)).toEqual({ tentativa: 2, maxTentativas: 5, restantes: 3, aceito: false });
  });

  it("ação com erro não grava nada", async () => {
    const storage = storageFalso();
    const r = await aplicarESalvar(criarArmazenamentoLocal(storage), rerolar(criarEstadoInicial("web3", T0)));
    expect(r.ok).toBe(false);
    expect(storage.dados.size).toBe(0);
  });
});
