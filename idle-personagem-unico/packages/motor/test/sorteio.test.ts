import { describe, expect, it } from "vitest";
import {
  CATALOGO,
  CONFIG_SORTEIO,
  OPCAO_ORIGEM_COMUM,
  RACAS,
  Rng,
  aceitarSorteio,
  carregarSave,
  compatibilidade,
  criarEstadoInicial,
  definirNomeEAparencia,
  escolherComOrcamento,
  iniciarSorteio,
  opcoesCore,
  opcoesDom,
  opcoesOrigem,
  opcoesRaca,
  origensEspeciaisDaRaca,
  rerolar,
  serializarSave,
  situacaoSorteio,
  sortearTentativa,
  tentativaAtual,
  type ConfigSorteio,
  type EstadoJogo,
  type ResultadoAcao,
  type ResultadoTentativa,
} from "../src/index";

const T0 = 1_700_000_000_000;

function ok(r: ResultadoAcao): EstadoJogo {
  if (!r.ok) throw new Error(`esperava sucesso: ${r.erro.codigo}`);
  return r.estado;
}
function codigo(r: ResultadoAcao): string {
  if (r.ok) throw new Error("esperava erro");
  return r.erro.codigo;
}
function recarregar(estado: EstadoJogo): EstadoJogo {
  const r = carregarSave(serializarSave(estado));
  if (!r.ok) throw new Error(r.erro.mensagem);
  return r.estado;
}
/** Sequência das 5 tentativas de uma semente, sem recarregar. */
function sequencia(semente: string): ResultadoTentativa[] {
  let e = ok(iniciarSorteio(criarEstadoInicial(semente, T0)));
  const lista = [tentativaAtual(e)!];
  for (let i = 1; i < CONFIG_SORTEIO.tentativas; i++) {
    e = ok(rerolar(e));
    lista.push(tentativaAtual(e)!);
  }
  return lista;
}

describe("determinismo", () => {
  it("mesma semente, mesma sequência de 5 tentativas", () => {
    expect(sequencia("abc")).toEqual(sequencia("abc"));
    expect(sequencia("abc")).not.toEqual(sequencia("abd"));
  });

  it("salvar e recarregar no meio continua a mesma sequência", () => {
    const esperada = sequencia("continua");
    let e = recarregar(ok(iniciarSorteio(criarEstadoInicial("continua", T0))));
    const obtida = [tentativaAtual(e)!];
    for (let i = 1; i < CONFIG_SORTEIO.tentativas; i++) {
      e = recarregar(ok(rerolar(recarregar(e))));
      obtida.push(tentativaAtual(e)!);
    }
    expect(obtida).toEqual(esperada);
  });

  it("cada tentativa é reproduzível pelo estado do RNG guardado", () => {
    let e = ok(iniciarSorteio(criarEstadoInicial("repro", T0)));
    e = ok(rerolar(e));
    const registro = e.conta.sorteio!.historico[0]!;
    expect(sortearTentativa(Rng.deEstado(registro.rngInicio))).toEqual(sequencia("repro")[0]);
  });
});

describe("chances", () => {
  it("são 5 tentativas; a 5ª obriga a aceitar e rerolar depois é erro", () => {
    let e = ok(iniciarSorteio(criarEstadoInicial("chances", T0)));
    expect(situacaoSorteio(e)).toEqual({ tentativa: 1, maxTentativas: 5, restantes: 4, aceito: false });
    for (let i = 0; i < 4; i++) e = ok(rerolar(e));
    expect(situacaoSorteio(e)?.restantes).toBe(0);
    expect(codigo(rerolar(e))).toBe("sem_chances");
    e = ok(aceitarSorteio(e));
    expect(situacaoSorteio(e)?.aceito).toBe(true);
  });

  it("recarregar não devolve chance", () => {
    let e = ok(iniciarSorteio(criarEstadoInicial("recarrega", T0)));
    e = ok(rerolar(ok(rerolar(e))));
    const antes = situacaoSorteio(e);
    const depois = recarregar(e);
    expect(situacaoSorteio(depois)).toEqual(antes);
    expect(tentativaAtual(depois)).toEqual(tentativaAtual(e));
    expect(codigo(iniciarSorteio(depois))).toBe("sorteio_em_andamento");
  });

  it("pode aceitar antes do fim; depois de aceito não rerola nem aceita de novo", () => {
    const e = ok(aceitarSorteio(ok(iniciarSorteio(criarEstadoInicial("cedo", T0)))));
    expect(codigo(rerolar(e))).toBe("ja_aceito");
    expect(codigo(aceitarSorteio(e))).toBe("ja_aceito");
  });

  it("erros sem sorteio e antes de aceitar", () => {
    const vazio = criarEstadoInicial("sem", T0);
    expect(codigo(rerolar(vazio))).toBe("sem_sorteio");
    expect(codigo(aceitarSorteio(vazio))).toBe("sem_sorteio");
    const iniciado = ok(iniciarSorteio(vazio));
    expect(codigo(definirNomeEAparencia(iniciado, { nome: "Brenna", corCabelo: "preto", corRoupa: "linho" }, T0))).toBe("nao_aceito");
  });

  it("depois de criar o primeiro, um novo sorteio exige o Pergaminho (F9)", () => {
    const aceito = ok(aceitarSorteio(ok(iniciarSorteio(criarEstadoInicial("um", T0)))));
    const criado = ok(definirNomeEAparencia(aceito, { nome: "Brenna", corCabelo: "preto", corRoupa: "linho" }, T0 + 5));
    expect(codigo(iniciarSorteio(criado))).toBe("requer_pergaminho");
  });
});

describe("orçamento de raridade", () => {
  it("com a configuração padrão o fallback é impossível (prova pelos custos)", () => {
    const c = CONFIG_SORTEIO;
    const maxAteCore = Math.max(...Object.values(c.custoRaca)) + Math.max(...Object.values(c.custoCompatibilidade));
    const minDom = Math.min(...Object.values(c.custoDom));
    // Raça e core sempre cabem; o dom mais barato cabe depois do pior caso;
    // a origem comum custa 0. Logo, em todo passo há ao menos uma opção que cabe.
    expect(Math.max(...Object.values(c.custoRaca))).toBeLessThanOrEqual(c.saldoInicial);
    expect(maxAteCore + minDom + c.custoOrigem.comum).toBeLessThanOrEqual(c.saldoInicial);
  });

  it("nenhuma tentativa gasta mais que o saldo (20 mil sementes)", () => {
    for (let i = 0; i < 20_000; i++) {
      const r = sortearTentativa(Rng.daSemente(i));
      const fallback = r.orcamento.passos.some((p) => p.fallback);
      expect(fallback).toBe(false);
      expect(r.orcamento.gasto).toBeLessThanOrEqual(CONFIG_SORTEIO.saldoInicial);
      expect(r.orcamento.gasto).toBe(r.orcamento.passos.reduce((s, p) => s + p.custo, 0));
    }
  });

  it("com saldo zero, o fallback escolhe sempre a opção de menor custo e só quando nada cabe", () => {
    const pobre: ConfigSorteio = { ...CONFIG_SORTEIO, saldoInicial: 0 };
    for (let i = 0; i < 2_000; i++) {
      const r = sortearTentativa(Rng.daSemente(`pobre-${i}`), pobre);
      for (const p of r.orcamento.passos) {
        if (p.fallback) {
          // Inevitável: o saldo era menor que o custo de todas as opções.
          const opcoes =
            p.passo === "raca" ? opcoesRaca(pobre) : p.passo === "core" ? opcoesCore(r.racaId, pobre) : p.passo === "dom" ? opcoesDom(r.racaId, pobre) : opcoesOrigem(r.racaId, pobre);
          const menor = Math.min(...opcoes.filter((o) => o.peso > 0).map((o) => o.custo));
          expect(menor).toBeGreaterThan(p.saldoAntes);
          expect(p.custo).toBe(menor);
        } else expect(p.custo).toBeLessThanOrEqual(p.saldoAntes);
      }
      expect(r.racaId).toSatisfy((id: string) => CATALOGO.racas.get(id)!.raridade === "comum");
      expect(r.compatibilidade).toBe("alta");
      expect(CATALOGO.dons.get(r.domId)!.raridade).toBe("incomum");
      expect(r.origem.tipo).toBe("comum");
    }
  });

  it("escolherComOrcamento corta o que não cabe e renormaliza", () => {
    const rng = Rng.daSemente("corte");
    const opcoes = [
      { id: "barata", peso: 1, custo: 0 },
      { id: "cara", peso: 1000, custo: 50 },
    ];
    for (let i = 0; i < 100; i++) expect(escolherComOrcamento(rng, opcoes, 10)).toEqual({ id: "barata", custo: 0, cortadas: 1, fallback: false });
    expect(escolherComOrcamento(rng, [{ id: "x", peso: 1, custo: 30 }, { id: "y", peso: 1, custo: 20 }], 10)).toEqual({
      id: "y",
      custo: 20,
      cortadas: 1,
      fallback: true,
    });
  });

  it("dom de raridade alta é cortado quando o saldo não comporta", () => {
    // Raça rara (25) + core excêntrico (15) = 40 gastos: Primordial (80) não cabe.
    const opcoes = opcoesDom("draconato").filter((o) => o.custo <= 60);
    expect(opcoes.some((o) => o.custo === 80)).toBe(false);
    const rng = Rng.daSemente("primordial");
    for (let i = 0; i < 5_000; i++) expect(escolherComOrcamento(rng, opcoesDom("draconato"), 60).custo).toBeLessThanOrEqual(60);
  });
});

describe("restrições", () => {
  it("origens com restrição de raça nunca saem para raça incompatível", () => {
    for (const r of RACAS) {
      const ids = opcoesOrigem(r.id).map((o) => o.id).filter((id) => id !== OPCAO_ORIGEM_COMUM);
      for (const id of ids) {
        const o = CATALOGO.origensEspeciais.get(id)!;
        expect(o.racasPermitidas.length === 0 || o.racasPermitidas.includes(r.id), `${r.id}: ${id}`).toBe(true);
      }
    }
    expect(origensEspeciaisDaRaca("elfo").some((o) => o.id === "quebra-ovo")).toBe(false);
    for (let i = 0; i < 50_000; i++) {
      const t = sortearTentativa(Rng.daSemente(`restr-${i}`));
      if (t.origem.tipo !== "especial") continue;
      const o = CATALOGO.origensEspeciais.get(t.origem.id)!;
      expect(o.racasPermitidas.length === 0 || o.racasPermitidas.includes(t.racaId)).toBe(true);
      expect(t.bestaVinculadaId).toBe(o.bestaVinculadaId ?? null);
    }
  });

  it("todo resultado excêntrico resolve uma marca; os outros não têm marca", () => {
    for (let i = 0; i < 20_000; i++) {
      const t = sortearTentativa(Rng.daSemente(`marca-${i}`));
      if (t.compatibilidade === "excentrica") expect(CATALOGO.marcasAnomalia.has(t.marcaAnomaliaId!)).toBe(true);
      else expect(t.marcaAnomaliaId).toBeNull();
    }
  });
});

describe("estatística de passo isolado (200 mil amostras, semente fixa)", () => {
  // Desvio-padrão de uma proporção p em n = 200.000: sqrt(p(1-p)/n) ≤ 0,112 p.p.
  // A tolerância de ±0,5 p.p. é mais de 4 desvios: falso alarme < 1 em 100 mil,
  // e como a semente é fixa o teste é estável.
  const N = 200_000;
  const TOL = 0.005;

  function frequencias(opcoes: ReturnType<typeof opcoesRaca>, grupo: (id: string) => string, semente: string, saldo = 100) {
    const rng = Rng.daSemente(semente);
    const contagem = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const g = grupo(escolherComOrcamento(rng, opcoes, saldo).id);
      contagem.set(g, (contagem.get(g) ?? 0) + 1);
    }
    return (g: string) => (contagem.get(g) ?? 0) / N;
  }

  it("raça por raridade: 70 / 22 / 8", () => {
    const f = frequencias(opcoesRaca(), (id) => CATALOGO.racas.get(id)!.raridade, "estat-raca");
    expect(Math.abs(f("comum") - 0.7)).toBeLessThan(TOL);
    expect(Math.abs(f("incomum") - 0.22)).toBeLessThan(TOL);
    expect(Math.abs(f("raro") - 0.08)).toBeLessThan(TOL);
  });

  it("core por compatibilidade (Humano): 70 / 25 / 5", () => {
    const humano = CATALOGO.racas.get("humano")!;
    const f = frequencias(opcoesCore("humano"), (id) => compatibilidade(humano, CATALOGO.cores.get(id)!), "estat-core");
    expect(Math.abs(f("alta") - 0.7)).toBeLessThan(TOL);
    expect(Math.abs(f("media") - 0.25)).toBeLessThan(TOL);
    expect(Math.abs(f("excentrica") - 0.05)).toBeLessThan(TOL);
  });

  it("dom por raridade com saldo cheio: 60 / 28 / 9 / 2,5 / 0,5", () => {
    const f = frequencias(opcoesDom("elfo"), (id) => CATALOGO.dons.get(id)!.raridade, "estat-dom");
    expect(Math.abs(f("incomum") - 0.6)).toBeLessThan(TOL);
    expect(Math.abs(f("raro") - 0.28)).toBeLessThan(TOL);
    expect(Math.abs(f("epico") - 0.09)).toBeLessThan(TOL);
    expect(Math.abs(f("ancestral") - 0.025)).toBeLessThan(TOL);
    expect(Math.abs(f("primordial") - 0.005)).toBeLessThan(TOL);
  });

  it("origem com saldo cheio: 92 comum / 8 especial", () => {
    const f = frequencias(opcoesOrigem("humano"), (id) => (id === OPCAO_ORIGEM_COMUM ? "comum" : "especial"), "estat-origem");
    expect(Math.abs(f("comum") - 0.92)).toBeLessThan(TOL);
  });

  it("categoria vazia some e as outras renormalizam", () => {
    for (const r of RACAS) {
      const presentes = new Set(motor_compat(r.id));
      const esperado = [...presentes].reduce((s, c) => s + CONFIG_SORTEIO.pesoCompatibilidade[c], 0);
      expect(opcoesCore(r.id).reduce((s, o) => s + o.peso, 0), r.id).toBeCloseTo(esperado, 9);
    }
  });
});

function motor_compat(racaId: string) {
  const raca = CATALOGO.racas.get(racaId)!;
  return [...CATALOGO.cores.values()].map((c) => compatibilidade(raca, c));
}
