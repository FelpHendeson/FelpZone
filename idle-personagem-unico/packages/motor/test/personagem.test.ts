import { describe, expect, it } from "vitest";
import {
  COFRE_VAZIO,
  CATALOGO,
  MIGRACOES,
  Rng,
  aceitarSorteio,
  carregarSave,
  criarEstadoInicial,
  definirNomeEAparencia,
  gerarLoreOrigem,
  iniciarSorteio,
  personagemAtivo,
  rerolar,
  serializarSave,
  sortearTentativa,
  tentativaAtual,
  statusIniciais,
  validarNome,
  type EstadoJogo,
  type ResultadoAcao,
} from "../src/index";

const T0 = 1_700_000_000_000;
function ok(r: ResultadoAcao): EstadoJogo {
  if (!r.ok) throw new Error(`esperava sucesso: ${r.erro.codigo}`);
  return r.estado;
}
function aceito(semente: string): EstadoJogo {
  return ok(aceitarSorteio(ok(iniciarSorteio(criarEstadoInicial(semente, T0)))));
}

describe("nome", () => {
  it.each(["Brenna", "Zéa", "João da Silva", "D'Artagnan", "Ana-Lúcia", "R2-D2", "Ægir Ólafsson", "Mãe d’Água"])(
    "aceita %j",
    (nome) => expect(validarNome(nome)).toEqual({ ok: true, nome: nome.normalize("NFC") }),
  );

  it.each([
    ["Zé", "nome_curto"],
    ["", "nome_curto"],
    ["Abcdefghijklmnopqrstu", "nome_longo"],
    [" Brenna", "nome_espacos_nas_pontas"],
    ["Brenna ", "nome_espacos_nas_pontas"],
    ["Bre<n>a", "nome_caracteres_invalidos"],
    ["Brenna!", "nome_caracteres_invalidos"],
    ["Bren\tna", "nome_caracteres_invalidos"],
    ["🐉🐉🐉", "nome_caracteres_invalidos"],
    ["123", "nome_sem_letra"],
    ["- '", "nome_sem_letra"],
  ])("rejeita %j (%s)", (nome, cod) => {
    const r = validarNome(nome);
    expect(r.ok ? null : r.erro.codigo).toBe(cod);
  });

  it("conta 20 caracteres acentuados como 20, mesmo em NFD", () => {
    const nfd = "é".normalize("NFD").repeat(20);
    expect(validarNome(nfd)).toEqual({ ok: true, nome: "é".repeat(20) });
    expect(validarNome(42)).toMatchObject({ ok: false });
  });
});

describe("criação do personagem", () => {
  it("rejeita nome inválido e cores fora da paleta", () => {
    const e = aceito("criar");
    const tenta = (nome: string, corCabelo: string, corRoupa: string) => {
      const r = definirNomeEAparencia(e, { nome, corCabelo, corRoupa }, T0 + 1);
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(tenta("X", "preto", "linho")).toBe("nome_curto");
    expect(tenta("Brenna", "#ff0000", "linho")).toBe("cor_invalida");
    expect(tenta("Brenna", "preto", "neon")).toBe("cor_invalida");
    expect(tenta("Brenna", "linho", "preto")).toBe("cor_invalida");
    expect(tenta("Brenna", "preto", "linho")).toBe("ok");
  });

  it("monta a ficha inicial a partir do resultado aceito", () => {
    let e = ok(iniciarSorteio(criarEstadoInicial("ficha", T0)));
    e = ok(aceitarSorteio(ok(rerolar(e))));
    const r = tentativaAtual(e)!;
    const criado = ok(definirNomeEAparencia(e, { nome: "Brenna", corCabelo: "ruivo", corRoupa: "musgo" }, T0 + 1000));
    const p = personagemAtivo(criado)!;
    expect(criado.conta.sorteio).toBeNull();
    expect(criado.conta.personagens).toHaveLength(1);
    expect(p).toMatchObject({
      id: "personagem-1",
      nome: "Brenna",
      nivel: 1,
      xp: 0,
      racaId: r.racaId,
      coreId: r.coreId,
      dons: [r.domId],
      tracoPersonalidadeId: r.tracoId,
      aparencia: { corCabelo: "ruivo", corRoupa: "musgo" },
      criadoEm: T0 + 1000,
    });
    expect(p.origem.loreGerada).toBe(gerarLoreOrigem(r.origem, r.racaId, "Brenna"));
    // F2: nasce ocioso, com os status no piso do nível 1.
    expect(p.status).toEqual(statusIniciais(p));
    expect(p.atividade).toBeNull();
    // Salvar e recarregar mantém a ficha.
    const lido = carregarSave(serializarSave(criado));
    expect(lido.ok && lido.estado).toEqual(criado);
  });

  it("lore comum usa nome, berço, anos e motivação; especial usa a lore escrita", () => {
    const comum = gerarLoreOrigem({ tipo: "comum", bercoId: "porto-de-pescadores", motivacaoId: "divida", marcaId: null, anosDeEstrada: 9 }, "humano", "Brenna");
    expect(comum).toContain("Brenna vem de um porto de pescadores.");
    expect(comum).toContain("Há 9 anos na estrada atrás de pagar uma dívida que não é sua.");
    expect(comum).toContain("lanterna do cais");
    const elfo = gerarLoreOrigem({ tipo: "comum", bercoId: "vila-rural", motivacaoId: "renome", marcaId: "nome-falso", anosDeEstrada: 1 }, "elfo", null);
    expect(elfo).toContain("Há 1 ano na estrada, quase nada para um povo tão longevo, em busca de renome.");
    expect(elfo).toContain("O nome que usa não é o de nascimento.");
    expect(gerarLoreOrigem({ tipo: "especial", id: "fruto-do-vinculo" }, "elfo", "X")).toBe(CATALOGO.origensEspeciais.get("fruto-do-vinculo")!.lore);
  });

  it("personagem com besta vinculada e marca da anomalia guarda os ids", () => {
    // Procura uma semente que dê origem com besta e outra com par excêntrico.
    let comBesta: string | null = null;
    let comMarca: string | null = null;
    for (let i = 0; i < 5_000 && (!comBesta || !comMarca); i++) {
      const t = sortearTentativa(Rng.daSemente(`busca-${i}`));
      if (t.bestaVinculadaId && !comBesta) comBesta = `busca-${i}`;
      if (t.marcaAnomaliaId && !comMarca) comMarca = `busca-${i}`;
    }
    for (const semente of [comBesta!, comMarca!]) {
      const e = ok(definirNomeEAparencia(aceito(semente), { nome: "Teste", corCabelo: "preto", corRoupa: "linho" }, T0));
      const t = sortearTentativa(Rng.daSemente(semente));
      const p = personagemAtivo(e)!;
      expect(p.bestaVinculadaId ?? null).toBe(t.bestaVinculadaId);
      expect(p.marcaAnomaliaId ?? null).toBe(t.marcaAnomaliaId);
      const lido = carregarSave(serializarSave(e));
      expect(lido.ok && lido.estado).toEqual(e);
    }
  });
});

describe("save v2", () => {
  it("migra v1 → v2 com conta vazia", () => {
    const v1 = { versao: 1, semente: "antiga", rng: criarEstadoInicial("antiga", T0).rng, criadoEm: T0, ultimoTick: T0 };
    const r = carregarSave(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migradoDe).toBe(1);
    expect(r.estado).toEqual(criarEstadoInicial("antiga", T0));
    expect(r.estado.conta).toEqual({ personagens: [], personagemAtivoId: null, sorteio: null, cofre: COFRE_VAZIO });
    expect(MIGRACOES[1]!(Object.freeze(v1))).not.toBe(v1);
  });

  const base = () => JSON.parse(serializarSave(ok(definirNomeEAparencia(aceito("tamper"), { nome: "Brenna", corCabelo: "preto", corRoupa: "linho" }, T0)))) as {
    conta: { personagens: Record<string, unknown>[]; personagemAtivoId: unknown; sorteio: unknown };
  };
  const invalido = (dados: unknown) => {
    const r = carregarSave(JSON.stringify(dados));
    return r.ok ? "ok" : r.erro.codigo;
  };

  it("rejeita personagem adulterado", () => {
    expect(invalido(base())).toBe("ok");
    const casos: ((d: ReturnType<typeof base>) => void)[] = [
      (d) => (d.conta.personagens[0]!.racaId = "goblin"),
      (d) => (d.conta.personagens[0]!.nome = " x"),
      (d) => (d.conta.personagens[0]!.aparencia = { corCabelo: "#fff", corRoupa: "linho" }),
      (d) => (d.conta.personagens[0]!.dons = ["silfo-o-vento-que-nao-volta"]),
      (d) => (d.conta.personagens[0]!.nivel = 0),
      (d) => (d.conta.personagemAtivoId = "outro"),
      (d) => (d.conta.personagens = [d.conta.personagens[0]!, d.conta.personagens[0]!]),
      // Origem especial restrita a outra raça.
      (d) => {
        const p = d.conta.personagens[0]!;
        p.origem = { tipo: "especial", id: p.racaId === "draconato" ? "cria-da-matilha" : "quebra-ovo", loreGerada: "x" };
      },
      (d) => (d.conta.personagens[0]!.marcaAnomaliaId = "anomalia-x"),
    ];
    for (const altera of casos) {
      const d = base();
      altera(d);
      expect(invalido(d), altera.toString()).toBe("formato_invalido");
    }
  });

  it("rejeita sorteio adulterado ou acima do limite de tentativas", () => {
    const e = ok(rerolar(ok(iniciarSorteio(criarEstadoInicial("sorteio-adult", T0)))));
    const dados = JSON.parse(serializarSave(e)) as { conta: { sorteio: { historico: { resumo: string }[]; maxTentativas: number } } };
    expect(invalido(dados)).toBe("ok");
    const trocado = structuredClone(dados);
    trocado.conta.sorteio.historico[1]!.resumo = "draconato/sem-chama/draconato-o-primeiro-fogo/quebra-ovo";
    expect(invalido(trocado)).toBe("formato_invalido");
    const curto = structuredClone(dados);
    curto.conta.sorteio.maxTentativas = 1;
    expect(invalido(curto)).toBe("formato_invalido");
  });
});
