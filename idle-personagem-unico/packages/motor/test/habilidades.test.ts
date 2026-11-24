import { describe, expect, it } from "vitest";
import {
  ATIVIDADE_APRENDIZADO,
  CATALOGO,
  CONFIG_HABILIDADES,
  CORES,
  HABILIDADES,
  HABILIDADES_LIVRO,
  RAMOS_CORE,
  Rng,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  carregarSave,
  comprarLivro,
  criarEstadoInicial,
  desequiparHabilidade,
  equiparHabilidade,
  escolherRamo,
  estagio,
  fatorMaestria,
  iniciarAprendizado,
  iniciarAtividade,
  lerLivro,
  modificadoresDeHabilidades,
  modificadoresDoPersonagem,
  moverPrioridade,
  nomeComEstagio,
  rendimentoMedio,
  serializarSave,
  slotsPassivas,
  statusIniciais,
  xpParaProximaMaestria,
  idLivro,
  type AtividadeColeta,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const HORA = 3_600_000;

function personagem(coreId = "ser-das-trevas", extra: Partial<Personagem> = {}): Personagem {
  const racaId = extra.racaId ?? "humano";
  const base = { racaId, dons: [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id], origem: { tipo: "comum" as const, id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." } };
  return {
    id: "personagem-1",
    nome: "Teste",
    nivel: 1,
    xp: 0,
    coreId,
    tracoPersonalidadeId: "calado",
    aparencia: { corCabelo: "preto", corRoupa: "linho" },
    criadoEm: T0,
    ...base,
    status: statusIniciais(base),
    atividade: null,
    ...camposIniciaisF3(),
    ...camposIniciaisF4(),
    ...camposIniciaisF6(),
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...camposIniciaisF5(coreId),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "hab"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null } });
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;
const combateVazio = { fase: "procurando" as const, restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] };
function cacando(p: Personagem, areaId: string, semente = "hab"): EstadoJogo {
  const a = CATALOGO.atividades.get(areaId)!;
  return estadoCom({ ...p, localId: a.localId, subareaId: a.subareaId, atividade: { id: areaId, progressoMs: 0, combate: combateVazio } }, semente);
}

describe("catálogo de habilidades", () => {
  it("as técnicas da F1 viram habilidades com o mesmo nome e modo", () => {
    for (const c of CORES) {
      for (const t of c.tecnicas) {
        const h = CATALOGO.habilidades.get(t.id);
        expect(h, t.id).toBeDefined();
        expect([h!.nome, h!.modo]).toEqual([t.nome, t.modo]);
        expect(h!.origem).toEqual({ tipo: "core", coreId: c.id });
      }
    }
    // O texto do autor continua intacto.
    expect(CATALOGO.habilidades.get("invocacao-do-manto-das-trevas")!.descricao).toBe(CATALOGO.cores.get("ser-das-trevas")!.tecnicas[2]!.descricao);
  });

  it("2 ramos por core, cada um com uma técnica do próprio core", () => {
    expect(RAMOS_CORE).toHaveLength(24);
    for (const c of CORES) expect(RAMOS_CORE.filter((r) => r.coreId === c.id)).toHaveLength(2);
    for (const r of RAMOS_CORE) expect(CATALOGO.habilidades.get(r.habilidadeId)?.origem).toEqual({ tipo: "core", coreId: r.coreId, ramoId: r.id });
  });

  it("ids únicos; ativas com recarga e efeitos; passivas com modificadores; um livro por habilidade de livro", () => {
    expect(new Set(HABILIDADES.map((h) => h.id)).size).toBe(HABILIDADES.length);
    for (const h of HABILIDADES) {
      if (h.modo === "ativa") expect(h.ativa!.recargaMs > 0 && h.ativa!.efeitos.length > 0, h.id).toBe(true);
      else expect((h.passiva?.modificadores.length ?? 0) > 0, h.id).toBe(true);
    }
    for (const h of HABILIDADES_LIVRO) expect(CATALOGO.itens.get(idLivro(h.id))?.livro?.habilidadeId).toBe(h.id);
  });
});

describe("maestria e slots", () => {
  it("curva, estágios e fator", () => {
    expect(xpParaProximaMaestria(1)).toBe(20);
    expect(xpParaProximaMaestria(CONFIG_HABILIDADES.maestriaMaxima)).toBe(0);
    expect([estagio(1), estagio(9), estagio(10), estagio(24), estagio(25)]).toEqual([1, 1, 2, 2, 3]);
    expect(fatorMaestria(1)).toBe(1);
    expect(fatorMaestria(10)).toBeCloseTo(1.18 * 1.25, 9);
    expect(nomeComEstagio(CATALOGO.habilidades.get("bote")!, 25)).toBe("Bote III");
  });

  it("passivas: 3 slots, +1 a cada 10 níveis; Folha em Branco dá +1 só por ser conhecida", () => {
    expect(slotsPassivas(personagem())).toBe(3);
    expect(slotsPassivas({ ...personagem(), nivel: 20 })).toBe(5);
    expect(slotsPassivas(personagem("sem-chama"))).toBe(4);
  });

  it("personagem novo conhece e equipa as técnicas do core", () => {
    const p = personagem("ser-das-trevas");
    expect(Object.keys(p.habilidades).sort()).toEqual(["abraco-das-sombras", "invocacao-do-manto-das-trevas", "sentido-das-sombras"]);
    expect(p.ativasEquipadas).toEqual(["invocacao-do-manto-das-trevas"]);
    expect(p.passivasEquipadas).toEqual(["sentido-das-sombras", "abraco-das-sombras"]);
    // Passivas que dependem de sistemas futuros não são equipadas de saída.
    expect(personagem("domador").passivasEquipadas).toEqual([]);
  });

  it("auras só valem com pouca vida", () => {
    const p = { ...personagem("portador-da-chama"), habilidades: { ...personagem("portador-da-chama").habilidades, "furia-em-brasa": { maestria: 1, xp: 0 } }, passivasEquipadas: ["furia-em-brasa"] };
    expect(modificadoresDeHabilidades(p)).toEqual([]);
    expect(modificadoresDeHabilidades(p, 0.3).map((m) => m.alvo)).toEqual(["ataque"]);
    expect(modificadoresDeHabilidades(p, 0.5)).toEqual([]);
  });
});

describe("equipar, prioridade, ramo e livros", () => {
  it("equipar e desequipar com slots e erros", () => {
    const e = estadoCom(personagem("ser-das-trevas"));
    expect(cod(equiparHabilidade(e, "bote", T0))).toBe("habilidade_desconhecida");
    expect(cod(equiparHabilidade(e, "sentido-das-sombras", T0))).toBe("ja_equipada");
    expect(cod(equiparHabilidade(e, "magia-proibida", T0))).toBe("habilidade_inexistente");
    const sem = ok(desequiparHabilidade(e, "sentido-das-sombras", T0));
    expect(ativo(sem).passivasEquipadas).toEqual(["abraco-das-sombras"]);
    expect(cod(desequiparHabilidade(sem, "sentido-das-sombras", T0))).toBe("nao_equipada");
    const cheio = estadoCom({ ...personagem("ser-das-trevas"), habilidades: { ...personagem().habilidades, "couro-grosso": { maestria: 1, xp: 0 }, "passo-de-viajante": { maestria: 1, xp: 0 } } });
    const tres = ok(equiparHabilidade(cheio, "couro-grosso", T0));
    expect(cod(equiparHabilidade(tres, "passo-de-viajante", T0))).toBe("slots_cheios");
  });

  it("prioridade das ativas", () => {
    const p = personagem("ser-das-trevas", {});
    const e = estadoCom({ ...p, habilidades: { ...p.habilidades, "golpe-firme": { maestria: 1, xp: 0 } }, ativasEquipadas: ["invocacao-do-manto-das-trevas", "golpe-firme"] });
    expect(ativo(ok(moverPrioridade(e, "golpe-firme", -1, T0))).ativasEquipadas).toEqual(["golpe-firme", "invocacao-do-manto-das-trevas"]);
    expect(ativo(ok(moverPrioridade(e, "golpe-firme", 1, T0))).ativasEquipadas).toEqual(["invocacao-do-manto-das-trevas", "golpe-firme"]);
  });

  it("ramo do core: só a partir do nível 10, uma vez, do próprio core", () => {
    const e = estadoCom(personagem("ser-das-trevas"));
    expect(cod(escolherRamo(e, "caminho-do-breu", T0))).toBe("nivel_insuficiente");
    const nivel10 = estadoCom({ ...personagem("ser-das-trevas"), nivel: 10, status: personagem().status });
    expect(cod(escolherRamo(nivel10, "chama-viva", T0))).toBe("ramo_inexistente");
    const escolhido = ok(escolherRamo(nivel10, "caminho-do-breu", T0));
    expect(ativo(escolhido).ramoId).toBe("caminho-do-breu");
    expect(ativo(escolhido).habilidades["passo-sem-sombra"]).toEqual({ maestria: 1, xp: 0 });
    expect(cod(escolherRamo(escolhido, "caminho-do-manto", T0))).toBe("ramo_ja_escolhido");
  });

  it("comprar livro no Mercado, ler e aprender", () => {
    let e = estadoCom(personagem("ser-das-trevas", { ouro: 1_000 }));
    e = ok(comprarLivro(e, idLivro("golpe-firme"), T0));
    expect(ativo(e)).toMatchObject({ ouro: 700, mochila: { "livro-golpe-firme": 1 } });
    e = ok(lerLivro(e, idLivro("golpe-firme"), T0));
    expect(ativo(e).habilidades["golpe-firme"]).toEqual({ maestria: 1, xp: 0 });
    expect(ativo(e).mochila).toEqual({});
    expect(cod(lerLivro(e, idLivro("golpe-firme"), T0))).toBe("quantidade_invalida");
    expect(cod(lerLivro(e, "trigo", T0))).toBe("nao_e_livro");
    expect(cod(comprarLivro(estadoCom(personagem("ser-das-trevas", { ouro: 10 })), idLivro("golpe-firme"), T0))).toBe("ouro_insuficiente");
  });
});

describe("aprendizado e uso", () => {
  it("praticar uma habilidade sobe a maestria (no Campo de Treino)", () => {
    expect(cod(iniciarAtividade(estadoCom(personagem()), ATIVIDADE_APRENDIZADO.id, T0))).toBe("habilidade_obrigatoria");
    const e = ok(iniciarAprendizado(estadoCom(personagem()), "invocacao-do-manto-das-trevas", T0));
    expect(ativo(e)).toMatchObject({ subareaId: "campo-de-treino", atividade: { id: "praticar-habilidade", habilidadeId: "invocacao-do-manto-das-trevas" } });
    const { estado, resumo } = avancar(e, T0 + HORA);
    expect(ativo(estado).habilidades["invocacao-do-manto-das-trevas"]!.maestria).toBeGreaterThan(5);
    expect(resumo.maestria["invocacao-do-manto-das-trevas"]).toBeGreaterThan(4);
    expect(cod(iniciarAprendizado(e, "bote", T0))).toBe("habilidade_desconhecida");
  });

  it("Adaptável (Humano) acelera a maestria em 8%", () => {
    const praticar = (racaId: string) => {
      const e = ok(iniciarAprendizado(estadoCom(personagem("ser-das-trevas", { racaId, dons: [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id], status: statusIniciais({ racaId, dons: [], origem: { tipo: "comum", id: "vila-rural" } }) })), "sentido-das-sombras", T0));
      const p = ativo(avancar(e, T0 + 30_000).estado).habilidades["sentido-das-sombras"]!;
      return p.xp + (p.maestria > 1 ? 20 : 0);
    };
    expect(praticar("humano") / praticar("elfo")).toBeCloseTo(1.08, 2);
  });

  it("habilidades de coleta afetam a coleta", () => {
    const sem = personagem("andarilho", { passivasEquipadas: [] });
    const com = personagem("andarilho");
    expect(com.passivasEquipadas).toContain("olho-de-coletor");
    const a = CATALOGO.atividades.get("colher-trigo") as AtividadeColeta;
    expect(rendimentoMedio(com, a, modificadoresDoPersonagem(com, 1)) / rendimentoMedio(sem, a, modificadoresDoPersonagem(sem, 1))).toBeCloseTo(1.1, 9);
    // E ganham maestria enquanto o personagem coleta.
    const e = avancar(ok(iniciarAtividade(estadoCom(com), "colher-trigo", T0)), T0 + HORA).estado;
    expect(ativo(e).habilidades["olho-de-coletor"]!.maestria).toBeGreaterThan(1);
  });

  it("ativas disparam sozinhas no combate (também offline) e ganham maestria", () => {
    const base = personagem("filho-da-tempestade");
    const com = avancar(cacando(base, "trilha-dos-lobos"), T0 + HORA);
    const sem = avancar(cacando({ ...base, ativasEquipadas: [] }, "trilha-dos-lobos"), T0 + HORA);
    const abates = (r: typeof com) => Object.values(r.resumo.abates).reduce((s, n) => s + n, 0);
    expect(abates(com)).toBeGreaterThan(abates(sem));
    expect(ativo(com.estado).habilidades["lanca-de-raio"]!.maestria).toBeGreaterThan(1);
  });

  it("cura só dispara quando precisa", () => {
    const p = personagem("alma-da-luz");
    const comCura = { ...p, habilidades: { ...p.habilidades, "primeiros-socorros": { maestria: 1, xp: 0 } }, ativasEquipadas: ["primeiros-socorros"] };
    // Vida cheia e luta curta: não cura.
    const curto = avancar(cacando(comCura, "trilha-dos-lobos"), T0 + 6_000).estado;
    expect(ativo(curto).habilidades["primeiros-socorros"]).toEqual({ maestria: 1, xp: 0 });
    // Área perigosa, sem recuo: em algum momento a vida cai abaixo de 50% e a cura dispara.
    const longo = avancar(cacando({ ...comCura, recuoPercentual: 0 }, "galeria-dos-ratos"), T0 + HORA).estado;
    expect(ativo(longo).habilidades["primeiros-socorros"]!.xp > 0 || ativo(longo).habilidades["primeiros-socorros"]!.maestria > 1).toBe(true);
  });

  it("dividir o tempo dá o mesmo resultado com ativas, reforços, enfraquecimentos e atordoamento", () => {
    const configs: Personagem[] = [
      personagem("ser-das-trevas"),
      personagem("mente-lucida"),
      { ...personagem("alma-da-luz"), habilidades: { ...personagem("alma-da-luz").habilidades, "toque-de-aurora": { maestria: 1, xp: 0 } }, ativasEquipadas: ["clarao", "toque-de-aurora"], recuoPercentual: 0 },
      { ...personagem("portador-da-chama"), habilidades: { ...personagem("portador-da-chama").habilidades, "furia-em-brasa": { maestria: 1, xp: 0 } }, passivasEquipadas: ["sangue-quente", "furia-em-brasa"] },
    ];
    for (let s = 0; s < 12; s++) {
      const p = configs[s % configs.length]!;
      const area = ["trilha-dos-lobos", "galeria-dos-ratos", "juncal-escuro"][s % 3]!;
      const rng = Rng.daSemente(`f5-${s}`);
      const inicio = cacando(p, area, `sem-${s}`);
      const total = rng.inteiro(1, 2 * HORA);
      const direto = avancar(inicio, T0 + total).estado;
      let partes = inicio;
      let t = T0;
      while (t < T0 + total) {
        t = Math.min(T0 + total, t + rng.inteiro(1, Math.max(1, Math.floor(total / rng.inteiro(1, 30)))));
        partes = avancar(partes, t).estado;
      }
      expect(partes, `semente ${s}`).toEqual(direto);
    }
  });
});

describe("save v6", () => {
  it("ida e volta no meio de uma luta com efeitos e recargas", () => {
    const e = avancar(cacando(personagem("ser-das-trevas"), "galeria-dos-ratos"), T0 + 9_000).estado;
    const c = ativo(e).atividade!.combate!;
    expect(Object.keys(c.recargas).length + c.efeitos.length).toBeGreaterThan(0);
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v5 → v6: técnicas do core conhecidas e equipadas", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem("guardiao-da-terra")))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 5;
    for (const k of ["habilidades", "ativasEquipadas", "passivasEquipadas", "ramoId"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(5);
    expect(r.ok && r.estado.conta.personagens[0]).toMatchObject(camposIniciaisF5("guardiao-da-terra"));
  });

  it("rejeita habilidades, slots, ramo ou efeitos adulterados", () => {
    const base = () => JSON.parse(serializarSave(avancar(cacando(personagem("ser-das-trevas"), "galeria-dos-ratos"), T0 + 9_000).estado)) as { conta: { personagens: Record<string, unknown>[] } };
    const codigo = (d: unknown) => {
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(codigo(base())).toBe("ok");
    const combate = (p: Record<string, unknown>) => (p.atividade as { combate: Record<string, unknown> }).combate;
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p.habilidades = { ...(p.habilidades as object), "magia-proibida": { maestria: 1, xp: 0 } }),
      (p) => (p.habilidades = { "sentido-das-sombras": { maestria: 1, xp: 0 } }), // esqueceu técnicas do core
      (p) => (p.habilidades = { ...(p.habilidades as object), "sentido-das-sombras": { maestria: 31, xp: 0 } }),
      (p) => (p.ativasEquipadas = ["sentido-das-sombras"]),
      (p) => (p.passivasEquipadas = ["bote"]),
      (p) => (p.passivasEquipadas = ["sentido-das-sombras", "sentido-das-sombras"]),
      (p) => (p.ramoId = "caminho-do-breu"), // nível 1
      (p) => (combate(p).efeitos = [{ habilidadeId: "x", sobre: "monstro", alvo: "ataque", valor: 0.2, restanteMs: 100 }]),
      (p) => (combate(p).recargas = { "sentido-das-sombras": 100 }),
    ];
    for (const altera of casos) {
      const d = base();
      altera(d.conta.personagens[0]!);
      expect(codigo(d), altera.toString()).toBe("formato_invalido");
    }
  });
});
