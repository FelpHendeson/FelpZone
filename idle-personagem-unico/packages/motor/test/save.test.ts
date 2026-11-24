import { describe, expect, it } from "vitest";
import {
  MIGRACOES,
  Rng,
  TAMANHO_MAXIMO_SAVE_BYTES,
  VERSAO_SAVE_ATUAL,
  carregarSave,
  criarArmazenamentoEmMemoria,
  criarEstadoInicial,
  lerJogo,
  migrarSave,
  migrarV1ParaV2,
  migrarV2ParaV3,
  migrarV3ParaV4,
  salvarJogo,
  serializarSave,
  tamanhoUtf8,
  type DadosSave,
  type Migracao,
} from "../src/index";

const T0 = 1_700_000_000_000;

function falha(resultado: ReturnType<typeof carregarSave>): string {
  if (resultado.ok) throw new Error("esperava falha");
  return resultado.erro.codigo;
}

describe("save", () => {
  it("ida e volta preserva o estado, inclusive a sequência do RNG", () => {
    const estado = criarEstadoInicial("semente-teste", T0);
    const r = carregarSave(serializarSave(estado));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toEqual(estado);
    expect(r.migradoDe).toBeNull();
    expect(Rng.deEstado(r.estado.rng).proximoUint32()).toBe(Rng.daSemente("semente-teste").proximoUint32());
  });

  it("tabela real de migrações: v1 → v2 (F1), v2 → v3 (F2) e v3 → v4 (F3)", () => {
    expect(VERSAO_SAVE_ATUAL).toBe(4);
    expect(Object.keys(MIGRACOES)).toEqual(["1", "2", "3"]);
  });

  describe("migração fictícia", () => {
    // Formato inventado: a "versão 0" guardava a semente como `seed` e o instante como `tick`.
    const deV0: Migracao = (dados) => {
      const { seed, tick, ...resto } = dados;
      const semente = String(seed);
      const base = criarEstadoInicial(semente, Number(tick));
      return { ...resto, semente, rng: base.rng, criadoEm: base.criadoEm, ultimoTick: base.ultimoTick };
    };

    it("carrega um save antigo passando pela migração", () => {
      const r = carregarSave(JSON.stringify({ versao: 0, seed: "antiga", tick: T0 }), { migracoes: { 0: deV0, 1: migrarV1ParaV2, 2: migrarV2ParaV3, 3: migrarV3ParaV4 } });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.migradoDe).toBe(0);
      expect(r.estado).toEqual(criarEstadoInicial("antiga", T0));
    });

    it("encadeia migrações em ordem sem alterar a entrada", () => {
      const chamadas: number[] = [];
      const migracoes: Record<number, Migracao> = {
        1: (d) => (chamadas.push(1), { ...d, ouro: 0 }),
        2: (d) => (chamadas.push(2), { ...d, ouro: (d.ouro as number) + 10 }),
      };
      const entrada: DadosSave = Object.freeze({ versao: 1, nome: "x" });
      const r = migrarSave(entrada, migracoes, 3);
      expect(chamadas).toEqual([1, 2]);
      expect(r).toEqual({ ok: true, dados: { versao: 3, nome: "x", ouro: 10 } });
      expect(entrada).toEqual({ versao: 1, nome: "x" });
    });

    it("falha sem migração para a versão", () => {
      expect(falha(carregarSave(JSON.stringify({ versao: 0, seed: "a", tick: T0 })))).toBe("migracao_ausente");
    });

    it("falha de forma controlada se a migração lançar", () => {
      const r = carregarSave(JSON.stringify({ versao: 0 }), {
        migracoes: {
          0: () => {
            throw new Error("quebrou");
          },
        },
      });
      expect(falha(r)).toBe("migracao_falhou");
    });

    it("não aceita migração herdada do protótipo", () => {
      expect(migrarSave({ versao: 0 }, Object.create({ 0: (d: DadosSave) => d }) as Record<number, Migracao>, 1)).toMatchObject({
        ok: false,
        erro: { codigo: "migracao_ausente" },
      });
    });
  });

  describe("entrada inválida", () => {
    const valido = JSON.parse(serializarSave(criarEstadoInicial("ok", T0))) as Record<string, unknown>;
    const com = (mudancas: Record<string, unknown>) => JSON.stringify({ ...valido, ...mudancas });

    it.each([
      ["", "vazio"],
      ["   ", "vazio"],
      ["{", "json_invalido"],
      ["não é json", "json_invalido"],
      ["null", "formato_invalido"],
      ["[]", "formato_invalido"],
      ["42", "formato_invalido"],
      ['"texto"', "formato_invalido"],
      ["{}", "versao_invalida"],
    ])("rejeita %j (%s)", (texto, codigo) => {
      expect(falha(carregarSave(texto))).toBe(codigo);
    });

    it("rejeita versão inválida ou do futuro", () => {
      expect(falha(carregarSave(com({ versao: "1" })))).toBe("versao_invalida");
      expect(falha(carregarSave(com({ versao: 1.5 })))).toBe("versao_invalida");
      expect(falha(carregarSave(com({ versao: -1 })))).toBe("versao_invalida");
      expect(falha(carregarSave(com({ versao: VERSAO_SAVE_ATUAL + 1 })))).toBe("versao_futura");
    });

    it("rejeita campos ausentes ou com tipo errado", () => {
      expect(falha(carregarSave(com({ semente: 123 })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ semente: "" })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ rng: { a: 1, b: 2, c: 3 } })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ rng: { a: -1, b: 2, c: 3, d: 4 } })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ ultimoTick: "ontem" })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ ultimoTick: T0 - 1 })))).toBe("formato_invalido");
      expect(falha(carregarSave(com({ criadoEm: undefined })))).toBe("formato_invalido");
    });

    it("descarta campos desconhecidos e não se deixa poluir por __proto__", () => {
      const r = carregarSave(com({ extra: 1 }).replace(/^\{/, '{"__proto__":{"poluido":true},'));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(Object.keys(r.estado).sort()).toEqual(["conta", "criadoEm", "rng", "semente", "ultimoTick", "versao"]);
      expect(({} as Record<string, unknown>).poluido).toBeUndefined();
    });
  });

  describe("tamanho máximo", () => {
    it("rejeita save maior que o limite antes de interpretar", () => {
      const grande = JSON.stringify({ versao: 1, lixo: "x".repeat(TAMANHO_MAXIMO_SAVE_BYTES) });
      expect(falha(carregarSave(grande))).toBe("grande_demais");
    });

    it("conta bytes UTF-8, não caracteres", () => {
      expect(tamanhoUtf8("a")).toBe(1);
      expect(tamanhoUtf8("ç")).toBe(2);
      expect(tamanhoUtf8("€")).toBe(3);
      expect(tamanhoUtf8("🐉")).toBe(4);
      const texto = JSON.stringify({ versao: 1, lixo: "ç".repeat(60) });
      expect(texto.length).toBeLessThan(100);
      expect(falha(carregarSave(texto, { tamanhoMaximoBytes: 100 }))).toBe("grande_demais");
    });

    it("serializarSave recusa estado grande demais", () => {
      const estado = { ...criarEstadoInicial("ok", T0), semente: "x".repeat(TAMANHO_MAXIMO_SAVE_BYTES) };
      expect(() => serializarSave(estado)).toThrow();
    });
  });

  describe("armazenamento", () => {
    it("salva e lê pelo armazenamento injetado", async () => {
      const armazenamento = criarArmazenamentoEmMemoria();
      expect(await lerJogo(armazenamento, "save")).toEqual({ ok: false, erro: null });
      const estado = criarEstadoInicial("mem", T0);
      await salvarJogo(armazenamento, "save", estado);
      expect(await lerJogo(armazenamento, "save")).toEqual({ ok: true, estado, migradoDe: null });
    });

    it("informa save corrompido sem lançar", async () => {
      const armazenamento = criarArmazenamentoEmMemoria({ save: "{quebrado" });
      const r = await lerJogo(armazenamento, "save");
      expect(r.ok).toBe(false);
      expect(r.ok ? null : r.erro?.codigo).toBe("json_invalido");
    });
  });
});
