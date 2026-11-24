import { describe, expect, it } from "vitest";
import {
  COFRE_VAZIO,
  ATIVIDADES_COLETA,
  ATIVIDADES_TREINO,
  CATALOGO,
  FERRAMENTAS,
  ITENS,
  LOCAIS,
  OFICIOS,
  REGIOES,
  Rng,
  adicionarItens,
  avancar,
  avancarPersonagem,
  cabeNaMochila,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  capacidadeMochila,
  carregarSave,
  chanceRaro,
  comprarFerramenta,
  criarEstadoInicial,
  duracaoCicloMs,
  duracaoViagemMs,
  espacosUsados,
  iniciarAtividade,
  irPara,
  modificadoresDoPersonagem,
  nivelEfetivoOficio,
  pararAtividade,
  serializarSave,
  statusIniciais,
  vender,
  venderTudo,
  viagemBaseMs,
  type AtividadeCiclica,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const HORA = 3_600_000;

type Base = Pick<Personagem, "racaId" | "dons" | "origem">;
const comum = (berco = "vila-rural") => ({ tipo: "comum" as const, id: berco, motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." });
const especial = (id: string) => ({ tipo: "especial" as const, id, loreGerada: "Lore." });

function personagem(base: Partial<Base> & Partial<Personagem> = {}): Personagem {
  const racaId = base.racaId ?? "humano";
  const b: Base = { racaId, dons: base.dons ?? [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id], origem: base.origem ?? comum() };
  return {
    id: "personagem-1",
    nome: "Teste",
    nivel: 1,
    xp: 0,
    coreId: "andarilho",
    tracoPersonalidadeId: "calado",
    aparencia: { corCabelo: "preto", corRoupa: "linho" },
    criadoEm: T0,
    status: statusIniciais(b),
    atividade: null,
    ...camposIniciaisF3(),
    ...camposIniciaisF4(),
    ...camposIniciaisF6(),
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...camposIniciaisF10(),
    ...semHabilidadesEquipadas(),
    ...base,
    ...b,
  };
}
function estadoCom(p: Personagem): EstadoJogo {
  return { ...criarEstadoInicial("coleta", T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } };
}
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;

describe("catálogo do mapa e da coleta", () => {
  it("1 região, 4 locais, viagens de 3 a 10 s entre todos", () => {
    expect(REGIOES).toHaveLength(1);
    expect(LOCAIS).toHaveLength(4);
    for (const a of LOCAIS) {
      expect(CATALOGO.regioes.has(a.regiaoId)).toBe(true);
      expect(new Set(a.subareas.map((s) => s.id)).size).toBe(a.subareas.length);
      for (const b of LOCAIS) {
        const ms = viagemBaseMs(a.id, b.id);
        if (a.id === b.id) expect(ms).toBe(0);
        else {
          expect(ms).toBeGreaterThanOrEqual(3_000);
          expect(ms).toBeLessThanOrEqual(10_000);
          expect(viagemBaseMs(b.id, a.id)).toBe(ms);
        }
      }
    }
  });

  it("recursos: 3 tiers por ofício (níveis 1, 10, 20), referências válidas", () => {
    for (const o of OFICIOS) {
      const r = ATIVIDADES_COLETA.filter((a) => a.oficio === o);
      expect(r.map((a) => [a.tier, a.nivelMinimo])).toEqual([[1, 1], [2, 10], [3, 20]]);
    }
    for (const a of [...ATIVIDADES_COLETA, ...ATIVIDADES_TREINO]) {
      const local = CATALOGO.locais.get(a.localId);
      expect(local?.subareas.some((s) => s.id === a.subareaId), a.id).toBe(true);
    }
    for (const a of ATIVIDADES_COLETA) {
      expect(CATALOGO.itens.get(a.itemId)?.categoria).toBe("material");
      expect(CATALOGO.itens.get(a.raro.itemId)?.categoria).toBe("raro");
    }
    for (const t of ATIVIDADES_TREINO) expect(t.subareaId).toBe("campo-de-treino");
    for (const i of ITENS) expect(i.preco > 0 && i.pilha > 0).toBe(true);
  });

  it("ferramentas: 3 graus por ofício; a básica é de graça e é o kit inicial", () => {
    for (const o of OFICIOS) {
      const f = FERRAMENTAS.filter((x) => x.oficio === o);
      expect(f.map((x) => x.grau)).toEqual([1, 2, 3]);
      expect(f[0]!.preco).toBe(0);
      expect(camposIniciaisF3().ferramentas[o]).toBe(f[0]!.id);
      expect(f[1]!.eficiencia).toBeGreaterThan(f[0]!.eficiencia);
      expect(f[2]!.velocidade).toBeGreaterThan(f[1]!.velocidade);
    }
  });
});

describe("viagem", () => {
  it("atividade em outro local: viaja primeiro, o ciclo só começa ao chegar", () => {
    const e = ok(iniciarAtividade(estadoCom(personagem()), "cortar-pinho", T0));
    expect(ativo(e).viagem).toEqual({ origemLocalId: "pedravau", destinoLocalId: "bosque-raso", destinoSubareaId: "orla", totalMs: 4_000, restanteMs: 4_000 });
    expect(ativo(e).localId).toBe("pedravau");
    const quase = avancar(e, T0 + 3_999);
    expect(ativo(quase.estado).viagem?.restanteMs).toBe(1);
    expect(quase.resumo.chegouEm).toBeNull();
    const chegou = avancar(quase.estado, T0 + 4_000);
    expect(chegou.resumo.chegouEm).toBe("bosque-raso");
    expect(ativo(chegou.estado)).toMatchObject({ localId: "bosque-raso", subareaId: "orla", viagem: null, atividade: { id: "cortar-pinho", progressoMs: 0 } });
    // Um ciclo depois de chegar (Agilidade acelera um pouco a coleta).
    const dur = duracaoCicloMs(ativo(chegou.estado), CATALOGO.atividades.get("cortar-pinho") as AtividadeCiclica, modificadoresDoPersonagem(ativo(chegou.estado), 1));
    expect(avancar(chegou.estado, T0 + 4_000 + dur - 1).resumo.ciclos).toBe(0);
    expect(avancar(chegou.estado, T0 + 4_000 + dur).resumo.ciclos).toBe(1);
  });

  it("dentro do mesmo local é instantâneo", () => {
    const e = ok(iniciarAtividade(estadoCom(personagem()), "colher-trigo", T0));
    expect(ativo(e)).toMatchObject({ localId: "pedravau", subareaId: "hortas", viagem: null });
  });

  it("mudar de destino no meio recomeça da origem; voltar à origem cancela", () => {
    let e = ok(iniciarAtividade(estadoCom(personagem()), "cortar-pinho", T0));
    e = ok(iniciarAtividade(e, "pescar-lambari", T0 + 2_000));
    expect(ativo(e).viagem).toMatchObject({ origemLocalId: "pedravau", destinoLocalId: "lago-espelho", restanteMs: 5_000 });
    e = ok(iniciarAtividade(e, "colher-trigo", T0 + 3_000));
    expect(ativo(e)).toMatchObject({ localId: "pedravau", subareaId: "hortas", viagem: null });
  });

  it("Passo Silvestre (Elfo) só entre locais naturais; Acampamento nômade em todas", () => {
    const elfo = modificadoresDoPersonagem(personagem({ racaId: "elfo" }), 1);
    expect(duracaoViagemMs("bosque-raso", "lago-espelho", elfo)).toBe(2_800);
    expect(duracaoViagemMs("pedravau", "bosque-raso", elfo)).toBe(4_000);
    const nomade = modificadoresDoPersonagem(personagem({ origem: comum("acampamento-nomade") }), 1);
    expect(duracaoViagemMs("pedravau", "bosque-raso", nomade)).toBe(3_600);
  });

  it("irPara para a atividade e viaja; erro se já está lá ocioso", () => {
    const e0 = ok(iniciarAtividade(estadoCom(personagem()), "meditacao", T0));
    const e = ok(irPara(e0, "lago-espelho", T0));
    expect(ativo(e).atividade).toBeNull();
    expect(ativo(e).viagem?.destinoSubareaId).toBe("margem");
    expect(cod(irPara(estadoCom(personagem()), "pedravau", T0))).toBe("ja_no_local");
    expect(cod(irPara(e, "atlantida", T0))).toBe("local_inexistente");
  });
});

describe("coleta", () => {
  it("rende itens, XP do ofício e do personagem", () => {
    const e = avancar(ok(iniciarAtividade(estadoCom(personagem()), "colher-trigo", T0)), T0 + HORA);
    const p = ativo(e.estado);
    expect(p.mochila.trigo).toBeGreaterThan(100);
    expect(e.resumo.itens.trigo).toBe(p.mochila.trigo);
    expect(p.oficios.agricultura.nivel).toBeGreaterThan(1);
    expect(e.resumo.xp).toBe(e.resumo.ciclos * 5);
    expect(e.resumo.xpOficios.agricultura).toBe(e.resumo.ciclos * 5);
  });

  it("tier acima do nível do ofício é recusado; bônus de berço e de origem contam", () => {
    expect(cod(iniciarAtividade(estadoCom(personagem()), "minerar-ferro", T0))).toBe("nivel_oficio_insuficiente");
    const p = personagem({ origem: comum("vila-de-mineradores") });
    expect(nivelEfetivoOficio(p, "mineracao", modificadoresDoPersonagem(p, 1))).toBe(2);
    const liberto = personagem({ origem: especial("liberto-das-minas-profundas") });
    expect(nivelEfetivoOficio(liberto, "mineracao", modificadoresDoPersonagem(liberto, 1))).toBe(3);
    const veterano = personagem({ oficios: { ...camposIniciaisF3().oficios, mineracao: { nivel: 10, xp: 0 } } });
    expect(cod(iniciarAtividade(estadoCom(veterano), "minerar-ferro", T0))).toBe("ok");
  });

  it("é determinística pela semente do save", () => {
    const e = ok(iniciarAtividade(estadoCom(personagem()), "pescar-lambari", T0));
    expect(avancar(e, T0 + 2 * HORA)).toEqual(avancar(e, T0 + 2 * HORA));
    const outra = { ...e, rng: Rng.daSemente("outra").estado() };
    expect(ativo(avancar(outra, T0 + 2 * HORA).estado).mochila).not.toEqual(ativo(avancar(e, T0 + 2 * HORA).estado).mochila);
  });

  it("rendimento fracionário e achado raro seguem as médias (10 mil ciclos)", () => {
    const comFerro = personagem({ localId: "mina-velha", subareaId: "galeria-alta", ferramentas: { ...camposIniciaisF3().ferramentas, mineracao: "mineracao-de-ferro" }, atividade: { id: "minerar-cobre", progressoMs: 0 } });
    const a = CATALOGO.atividades.get("minerar-cobre")!;
    const mods = modificadoresDoPersonagem(comFerro, 1);
    const dur = duracaoCicloMs(comFerro, a as AtividadeCiclica, mods);
    const r = avancarPersonagem(comFerro, dur * 10_000, Rng.daSemente("medias"));
    const ciclos = r.ciclos;
    expect(ciclos).toBeGreaterThan(9_000);
    const cobre = (r.itens["minerio-de-cobre"] ?? 0);
    // Média por ciclo: 1,25 (picareta de ferro), contando o que se perdeu com a mochila cheia.
    // Raros cabem à parte; os perdidos são quase todos cobre (a mochila enche).
    const gerados = cobre + r.itensPerdidos - 0;
    expect(gerados / ciclos).toBeGreaterThan(1.2);
    expect(gerados / ciclos).toBeLessThan(1.32);
  });

  it("Agilidade acelera a coleta; Lobisomem acha mais raros; Pele de Pedra rende mais", () => {
    const h = personagem();
    const a = CATALOGO.atividades.get("cortar-pinho")!;
    if (a.tipo !== "coleta") throw new Error();
    const mods = modificadoresDoPersonagem(h, 1);
    expect(duracaoCicloMs(h, a, mods)).toBe(Math.round(30_000 / (1 + 0.01 * h.status.agilidade)));
    const lobo = personagem({ racaId: "lobisomem" });
    const pontos = (p: Personagem) => p.status.percepcao + p.status.sorte;
    expect(chanceRaro(lobo, a, modificadoresDoPersonagem(lobo, 1))).toBeCloseTo(0.01 * (1 + 0.01 * pontos(lobo)) * 1.5, 12);
    const anao = personagem({ racaId: "anao" });
    const minerio = CATALOGO.atividades.get("minerar-cobre")!;
    if (minerio.tipo !== "coleta") throw new Error();
    expect(modificadoresDoPersonagem(anao, 1).some((m) => m.alvo === "oficio.mineracao.rendimento")).toBe(true);
  });
});

describe("mochila", () => {
  it("capacidade pela Força; pilhas ocupam espaços", () => {
    const p = personagem();
    expect(capacidadeMochila(p.status.forca, [])).toBe(20 + Math.floor(p.status.forca * 0.5));
    expect(espacosUsados({ trigo: 100, batata: 101, "ambar-antigo": 21 })).toBe(1 + 2 + 2);
    expect(cabeNaMochila({ trigo: 150 }, "trigo", 2)).toBe(50);
  });

  it("o que não cabe é perdido e contado no resumo", () => {
    expect(adicionarItens({ trigo: 199 }, "trigo", 5, 2)).toEqual({ mochila: { trigo: 200 }, aceitos: 1, perdidos: 4 });
    const p = personagem({ mochila: { lambari: 100 * 30 } });
    const e = avancar(ok(iniciarAtividade(estadoCom(p), "colher-trigo", T0)), T0 + HORA);
    expect(e.resumo.itensPerdidos).toBeGreaterThan(0);
    expect(ativo(e.estado).oficios.agricultura.nivel).toBeGreaterThan(1); // o XP continua
  });
});

describe("Mercado e Ferreiro", () => {
  const rico = (extra: Partial<Personagem> = {}) => estadoCom(personagem({ mochila: { trigo: 100, "ambar-antigo": 2 }, ouro: 1_000, ...extra }));

  it("vender exige estar em Pedravau; quantidade válida", () => {
    const longe = ok(irPara(rico(), "lago-espelho", T0));
    expect(cod(vender(longe, "trigo", 1, T0))).toBe("fora_da_cidade");
    expect(cod(vender(rico(), "trigo", 0, T0))).toBe("quantidade_invalida");
    expect(cod(vender(rico(), "trigo", 101, T0))).toBe("quantidade_invalida");
    expect(cod(vender(rico(), "pedra-filosofal", 1, T0))).toBe("item_inexistente");
    const e = ok(vender(rico(), "trigo", 10, T0));
    expect(ativo(e)).toMatchObject({ ouro: 1_020, mochila: { trigo: 90, "ambar-antigo": 2 } });
  });

  it("vender tudo; Cortiço da capital +3% (arredonda para baixo)", () => {
    expect(ativo(ok(venderTudo(rico(), T0)))).toMatchObject({ ouro: 1_000 + 200 + 120, mochila: {} });
    const cortico = estadoCom(personagem({ origem: comum("cortico-da-capital"), mochila: { trigo: 10 } }));
    expect(ativo(ok(venderTudo(cortico, T0))).ouro).toBe(Math.floor(20 * 1.03));
    expect(cod(venderTudo(estadoCom(personagem()), T0))).toBe("mochila_vazia");
  });

  it("comprar ferramenta: nível, gold, só melhora; Náufrago paga 5% menos", () => {
    const nivel5 = { ...camposIniciaisF3().oficios, pesca: { nivel: 5, xp: 0 } };
    expect(cod(comprarFerramenta(rico(), "pesca-de-ferro", T0))).toBe("nivel_oficio_insuficiente");
    expect(cod(comprarFerramenta(rico({ oficios: nivel5, ouro: 10 }), "pesca-de-ferro", T0))).toBe("ouro_insuficiente");
    expect(cod(comprarFerramenta(rico(), "pesca-basica", T0))).toBe("ferramenta_inexistente");
    const e = ok(comprarFerramenta(rico({ oficios: nivel5 }), "pesca-de-ferro", T0));
    expect(ativo(e)).toMatchObject({ ouro: 600, ferramentas: { pesca: "pesca-de-ferro" } });
    expect(cod(comprarFerramenta(e, "pesca-de-ferro", T0))).toBe("ferramenta_nao_melhora");
    const naufrago = rico({ oficios: nivel5, origem: especial("naufrago-das-estrelas") });
    expect(ativo(ok(comprarFerramenta(naufrago, "pesca-de-ferro", T0))).ouro).toBe(1_000 - 380);
  });

  it("parar durante a viagem mantém a viagem", () => {
    const e = ok(pararAtividade(ok(iniciarAtividade(estadoCom(personagem()), "cortar-pinho", T0)), T0 + 1_000));
    expect(ativo(e).viagem?.restanteMs).toBe(3_000);
    expect(ativo(e).atividade).toBeNull();
  });
});

describe("save v4", () => {
  it("ida e volta com viagem, mochila, ofícios e gold", () => {
    let e = avancar(ok(iniciarAtividade(estadoCom(personagem()), "pescar-lambari", T0)), T0 + HORA).estado;
    e = ok(irPara(e, "pedravau", T0 + HORA));
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v3 → v4 (treinando vai ao Campo de Treino)", () => {
    const p = { ...personagem(), atividade: { id: "meditacao", progressoMs: 10 } };
    const d = JSON.parse(serializarSave(estadoCom(p))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 3;
    for (const k of ["localId", "subareaId", "viagem", "ouro", "mochila", "oficios", "ferramentas"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migradoDe).toBe(3);
    expect(r.estado.conta.personagens[0]).toMatchObject({ ...camposIniciaisF3(), subareaId: "campo-de-treino", atividade: { id: "meditacao", progressoMs: 10 } });
  });

  it("rejeita lugar, viagem, mochila, gold, ofício ou ferramenta adulterados", () => {
    const base = () => JSON.parse(serializarSave(ok(iniciarAtividade(estadoCom(personagem({ mochila: { trigo: 5 } })), "cortar-pinho", T0)))) as { conta: { personagens: Record<string, unknown>[] } };
    const codigo = (d: unknown) => {
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(codigo(base())).toBe("ok");
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p.localId = "atlantida"),
      (p) => (p.subareaId = "orla"),
      (p) => (p.viagem = { ...(p.viagem as object), destinoLocalId: "pedravau" }),
      (p) => (p.viagem = { ...(p.viagem as object), restanteMs: 999_999 }),
      (p) => (p.viagem = null), // atividade no bosque, personagem na cidade sem viagem
      (p) => (p.mochila = { "pedra-filosofal": 1 }),
      (p) => (p.mochila = { trigo: 0 }),
      (p) => (p.ouro = -1),
      (p) => (p.ouro = 1.5),
      (p) => (p.ferramentas = { ...(p.ferramentas as object), pesca: "mineracao-basica" }),
      (p) => (p.oficios = { ...(p.oficios as object), pesca: { nivel: 0, xp: 0 } }),
      (p) => (p.oficios = { ...(p.oficios as object), pesca: { nivel: 1, xp: 1e9 } }),
    ];
    for (const altera of casos) {
      const d = base();
      altera(d.conta.personagens[0]!);
      expect(codigo(d), altera.toString()).toBe("formato_invalido");
    }
  });
});

/** Técnicas do core conhecidas, nada equipado (para não mexer no que os testes antigos medem). */
function semHabilidadesEquipadas() {
  return { ...camposIniciaisF5("andarilho"), ativasEquipadas: [], passivasEquipadas: [] };
}
