import { describe, expect, it } from "vitest";
import {
  AREAS_COMBATE,
  CATALOGO,
  CONFIG_COMBATE,
  EQUIPAMENTOS,
  KIT_COMBATE,
  LIMITE_OFFLINE_MS,
  MONSTROS,
  Rng,
  SLOTS,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  carregarSave,
  comprarEquipamento,
  criarEstadoInicial,
  dano,
  faixas,
  definirRecuo,
  desequipar,
  equipar,
  iniciarAtividade,
  modificadoresDoPersonagem,
  riscoDaArea,
  serializarSave,
  statusDeCombate,
  statusIniciais,
  valorEfetivo,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const HORA = 3_600_000;

function personagem(extra: Partial<Personagem> = {}): Personagem {
  const racaId = extra.racaId ?? "humano";
  const base = { racaId, dons: [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id], origem: { tipo: "comum" as const, id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." } };
  return {
    id: "personagem-1",
    nome: "Teste",
    nivel: 1,
    xp: 0,
    coreId: "andarilho",
    tracoPersonalidadeId: "calado",
    aparencia: { corCabelo: "preto", corRoupa: "linho" },
    criadoEm: T0,
    ...base,
    status: statusIniciais(base),
    atividade: null,
    ...camposIniciaisF3(),
    ...camposIniciaisF4(),
    ...semHabilidadesEquipadas(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "combate"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null } });
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;
/** Personagem já na área, caçando (sem viagem). */
function cacando(areaId: string, extra: Partial<Personagem> = {}, semente = "combate"): EstadoJogo {
  const a = CATALOGO.atividades.get(areaId)!;
  return estadoCom(personagem({ localId: a.localId, subareaId: a.subareaId, atividade: { id: areaId, progressoMs: 0, combate: { fase: "procurando", restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] } }, ...extra }), semente);
}

describe("catálogo de combate", () => {
  it("6 áreas em subáreas de combate, com 2 comuns, 1 raro (5%) e 1 chefe", () => {
    expect(AREAS_COMBATE).toHaveLength(6);
    for (const a of AREAS_COMBATE) {
      expect(CATALOGO.locais.get(a.localId)?.subareas.find((s) => s.id === a.subareaId)?.tipo).toBe("combate");
      const tipos = a.monstros.map((m) => CATALOGO.monstros.get(m.monstroId)!.tipo);
      expect(tipos).toEqual(["comum", "comum", "raro"]);
      expect(a.monstros[2]!.peso / a.monstros.reduce((s, m) => s + m.peso, 0)).toBeCloseTo(0.05, 9);
      expect(CATALOGO.monstros.get(a.chefeId)?.tipo).toBe("chefe");
      for (const s of SLOTS) expect(EQUIPAMENTOS.some((i) => i.equipamento?.slot === s && i.equipamento.tier === a.tierEquipamento), `${a.id} ${s}`).toBe(true);
    }
    expect(MONSTROS).toHaveLength(24);
    for (const m of MONSTROS) for (const d of m.drops) expect(CATALOGO.itens.has(d.itemId)).toBe(true);
  });

  it("kit básico existe; Ferreiro vende só tiers 1 e 2", () => {
    for (const s of SLOTS) {
      const id = KIT_COMBATE[s];
      if (id) expect(CATALOGO.itens.get(id)?.equipamento?.slot).toBe(s);
    }
    for (const i of EQUIPAMENTOS) {
      const t = i.equipamento!.tier;
      expect(i.equipamento!.precoCompra === null, i.id).toBe(t === 0 || t === 3);
    }
  });
});

describe("status de combate", () => {
  it("derivados dos status e do equipamento", () => {
    const p = personagem();
    const mods = modificadoresDoPersonagem(p, 1);
    const sc = statusDeCombate(p.status, mods);
    const ef = (s: Parameters<typeof valorEfetivo>[1]) => valorEfetivo(p.status[s], s, mods);
    expect(sc.vidaMax).toBeCloseTo(40 + 8 * ef("vigor"), 9);
    expect(sc.ataque).toBeCloseTo(2 + ef("forca") + 2, 9); // porrete +2
    expect(sc.defesa).toBeCloseTo(0.5 * ef("resistencia") + 1, 9); // gibão +1
    expect(sc.intervaloMs).toBeCloseTo(2_000 / (1 + 0.01 * ef("agilidade")), 9);
    const comElmo = { ...p, equipados: { ...p.equipados, elmo: "elmo-de-ferro" } };
    expect(statusDeCombate(p.status, modificadoresDoPersonagem(comElmo, 1)).vidaMax).toBeCloseTo(sc.vidaMax + 25, 9);
  });

  it("dano: ataque² ÷ (ataque + defesa), mínimo 1", () => {
    expect(dano(10, 0)).toBe(10);
    expect(dano(10, 10)).toBe(5);
    expect(dano(1, 100)).toBe(1);
  });

  it("risco: área inicial tranquila, última área perigosa para o nível 1", () => {
    const sc = statusDeCombate(personagem().status, modificadoresDoPersonagem(personagem(), 1));
    expect(riscoDaArea(sc, CATALOGO.atividades.get("trilha-dos-lobos") as never).risco).not.toBe("vermelho");
    expect(riscoDaArea(sc, CATALOGO.atividades.get("poco-sem-fundo") as never).risco).toBe("vermelho");
  });
});

describe("caçar", () => {
  it("começar a caçar viaja até a área e procura o primeiro monstro", () => {
    const e = ok(iniciarAtividade(estadoCom(personagem()), "trilha-dos-lobos", T0));
    expect(ativo(e).viagem?.destinoSubareaId).toBe("trilha-dos-lobos");
    const chegou = avancar(e, T0 + 4_000).estado;
    expect(ativo(chegou).atividade?.combate?.fase).toBe("procurando");
    const luta = avancar(chegou, T0 + 4_000 + 3_000).estado;
    expect(ativo(luta).atividade?.combate?.fase).toBe("lutando");
  });

  it("uma hora na Trilha dos Lobos: abates, XP, drops e bestiário", () => {
    const { estado, resumo } = avancar(cacando("trilha-dos-lobos"), T0 + HORA);
    const p = ativo(estado);
    const abates = Object.values(resumo.abates).reduce((s, n) => s + n, 0);
    expect(abates).toBeGreaterThan(30);
    expect(resumo.xp).toBeGreaterThan(0);
    expect(p.mochila["couro-de-lobo"]).toBeGreaterThan(0);
    expect(p.bestiario).toEqual(resumo.abates);
    expect(resumo.desmaios).toBe(0);
  });

  it("o chefe aparece a cada 50 abates na área", () => {
    // Veterano: nível 20, status no piso do nível e equipamento de ferro.
    const ferro = { arma: "espada-de-ferro", elmo: "elmo-de-ferro", peitoral: "cota-de-malha", calcas: "grevas-de-ferro", botas: "botas-ferradas" };
    const base = personagem({ equipados: ferro });
    const f = faixas("humano", 20, modificadoresDoPersonagem(base, 20));
    const status = Object.fromEntries(Object.entries(f).map(([s, x]) => [s, x.piso])) as Personagem["status"];
    const { estado } = avancar(cacando("trilha-dos-lobos", { nivel: 20, status, equipados: ferro }), T0 + 6 * HORA);
    expect(ativo(estado).bestiario["velha-matriarca"] ?? 0).toBeGreaterThan(0);
    const total = Object.values(ativo(estado).bestiario).reduce((s, n) => s + n, 0);
    expect(Math.floor(total / 50)).toBe(ativo(estado).bestiario["velha-matriarca"]);
  });

  it("fugir do chefe faz ele ir embora (não trava a caça)", () => {
    const chefe = CATALOGO.monstros.get("velha-matriarca")!;
    const e = cacando("trilha-dos-lobos", {
      recuoPercentual: 90,
      vida: 0.91,
      atividade: {
        id: "trilha-dos-lobos",
        progressoMs: 0,
        combate: { fase: "lutando", restanteMs: 0, monstroId: chefe.id, vidaMonstro: chefe.vida, recargaPersonagemMs: 99_999, recargaMonstroMs: 500, abatesNaArea: 49, recargas: {}, efeitos: [] },
      },
    });
    const c = ativo(avancar(e, T0 + 500).estado).atividade!.combate!;
    expect(c.fase).toBe("recuando");
    expect(c.abatesNaArea).toBe(50);
    // Depois de se curar, o próximo monstro não é o chefe.
    const depois = ativo(avancar(e, T0 + c.restanteMs + 1_000 + 3_000).estado).atividade!.combate!;
    expect(depois.fase).toBe("lutando");
    expect(CATALOGO.monstros.get(depois.monstroId!)!.tipo).not.toBe("chefe");
  });

  it("recuo automático: com 90%, recua, se cura e volta", () => {
    const { estado, resumo } = avancar(cacando("galeria-dos-ratos", { recuoPercentual: 90 }), T0 + HORA);
    expect(resumo.recuos).toBeGreaterThan(0);
    expect(resumo.desmaios).toBe(0);
    expect(ativo(estado).atividade?.id).toBe("galeria-dos-ratos");
  });

  it("desmaio sem recuo: acorda em Pedravau, ocioso, sem perder nada", () => {
    const e = cacando("poco-sem-fundo", { recuoPercentual: 0, mochila: { trigo: 10 }, ouro: 50 });
    const { estado, resumo } = avancar(e, T0 + HORA);
    const p = ativo(estado);
    expect(resumo.desmaios).toBe(1);
    expect(p).toMatchObject({ atividade: null, localId: "pedravau", subareaId: "praca", ouro: 50 });
    expect(p.mochila.trigo).toBe(10);
    expect(p.vida).toBe(1); // acordou com 50% e se recuperou no resto da hora
  });

  it("vida se recupera fora do combate", () => {
    const e = estadoCom(personagem({ vida: 0.2 }));
    expect(ativo(avancar(e, T0 + 10_000).estado).vida).toBeCloseTo(0.4, 9);
    expect(ativo(avancar(e, T0 + HORA).estado).vida).toBe(1);
  });

  it("dividir o tempo dá o mesmo resultado (propriedade, com recuo e desmaio)", () => {
    for (let s = 0; s < 18; s++) {
      const area = AREAS_COMBATE[s % AREAS_COMBATE.length]!;
      const rng = Rng.daSemente(`part-${s}`);
      const inicio = cacando(area.id, { recuoPercentual: [0, 30, 60][s % 3]! }, `sem-${s}`);
      const total = rng.inteiro(1, 3 * HORA);
      const direto = avancar(inicio, T0 + total).estado;
      let partes = inicio;
      let t = T0;
      while (t < T0 + total) {
        t = Math.min(T0 + total, t + rng.inteiro(1, Math.max(1, Math.floor(total / rng.inteiro(1, 40)))));
        partes = avancar(partes, t).estado;
      }
      expect(partes, `semente ${s} (${area.id})`).toEqual(direto);
    }
  });

  it("desempenho: 12 h de combate em menos de 1 s", () => {
    const e = cacando("trilha-dos-lobos");
    const t = performance.now();
    avancar(e, T0 + LIMITE_OFFLINE_MS);
    expect(performance.now() - t).toBeLessThan(1_000);
  });
});

describe("equipamento e recuo", () => {
  it("comprar no Ferreiro, equipar (o antigo volta para a mochila) e desequipar", () => {
    let e = estadoCom(personagem({ ouro: 500 }));
    expect(cod(comprarEquipamento(e, "espada-de-aco-escuro", T0))).toBe("item_inexistente");
    e = ok(comprarEquipamento(e, "espada-curta", T0));
    expect(ativo(e)).toMatchObject({ ouro: 380, mochila: { "espada-curta": 1 } });
    e = ok(equipar(e, "espada-curta", T0));
    expect(ativo(e).equipados.arma).toBe("espada-curta");
    expect(ativo(e).mochila).toEqual({ "porrete-de-carvalho": 1 });
    e = ok(desequipar(e, "arma", T0));
    expect(ativo(e).equipados.arma).toBeNull();
    expect(cod(desequipar(e, "arma", T0))).toBe("slot_vazio");
    expect(cod(equipar(e, "trigo", T0))).toBe("nao_e_equipamento");
    expect(cod(equipar(e, "elmo-de-ferro", T0))).toBe("quantidade_invalida");
    expect(cod(comprarEquipamento(estadoCom(personagem({ ouro: 10 })), "espada-curta", T0))).toBe("ouro_insuficiente");
  });

  it("recuo de 0 a 90%", () => {
    expect(ativo(ok(definirRecuo(estadoCom(personagem()), 50, T0))).recuoPercentual).toBe(50);
    expect(cod(definirRecuo(estadoCom(personagem()), 95, T0))).toBe("recuo_invalido");
    expect(cod(definirRecuo(estadoCom(personagem()), 1.5, T0))).toBe("recuo_invalido");
    expect(CONFIG_COMBATE.recuoMaximo).toBe(90);
  });
});

describe("save v5", () => {
  it("ida e volta no meio de uma luta", () => {
    const e = avancar(cacando("juncal-escuro"), T0 + 7_250).estado;
    expect(ativo(e).atividade?.combate?.fase).toBe("lutando");
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v4 → v5 com kit básico e vida cheia", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem()))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 4;
    for (const k of ["equipados", "vida", "recuoPercentual", "bestiario"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(4);
    expect(r.ok && r.estado.conta.personagens[0]).toMatchObject(camposIniciaisF4());
  });

  it("rejeita equipamento, vida, recuo, bestiário ou luta adulterados", () => {
    const base = () => JSON.parse(serializarSave(avancar(cacando("trilha-dos-lobos"), T0 + 7_250).estado)) as { conta: { personagens: Record<string, unknown>[] } };
    const codigo = (d: unknown) => {
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(codigo(base())).toBe("ok");
    const combate = (p: Record<string, unknown>) => (p.atividade as { combate: Record<string, unknown> }).combate;
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p.equipados = { ...(p.equipados as object), arma: "gibao-de-viagem" }),
      (p) => (p.equipados = { ...(p.equipados as object), elmo: "trigo" }),
      (p) => (p.vida = 0),
      (p) => (p.vida = 1.5),
      (p) => (p.recuoPercentual = 91),
      (p) => (p.bestiario = { dragao: 1 }),
      (p) => (combate(p).monstroId = "o-que-cava"),
      (p) => (combate(p).vidaMonstro = 99_999),
      (p) => (combate(p).fase = "dancando"),
      (p) => ((p.atividade as Record<string, unknown>).progressoMs = 600),
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
