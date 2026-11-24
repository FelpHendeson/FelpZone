import { describe, expect, it } from "vitest";
import {
  ACESSORIOS,
  AREAS_COMBATE,
  CATALOGO,
  CONFIG_FUSAO,
  CONFIG_MOCHILA_EXTRA,
  DROPS_RELIQUIA,
  NOMEADOS,
  NOMEADOS_DE_ORIGEM,
  RECEITAS,
  RELIQUIAS,
  VARIANTES,
  ampliarMochila,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  capacidadeDe,
  carregarSave,
  criarEstadoInicial,
  equipar,
  fundir,
  infoFusao,
  iniciarAtividade,
  modificadoresDoPersonagem,
  precoAmpliacao,
  proximoAprimoramento,
  serializarSave,
  statusIniciais,
  statusDeCombate,
  vender,
  venderTudo,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HORA = 60 * MIN;

function personagem(extra: Partial<Personagem> = {}): Personagem {
  const origem = extra.origem ?? { tipo: "comum" as const, id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." };
  const base = { racaId: "humano", dons: ["humano-sono-leve"], origem };
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
    ...camposIniciaisF5("andarilho"),
    ativasEquipadas: [],
    passivasEquipadas: [],
    ...camposIniciaisF6(),
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "producao"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null } });
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo + ": " + r.erro.mensagem);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;

describe("catálogo da F8", () => {
  it("receitas com itens, locais e ofícios válidos", () => {
    expect(new Set(RECEITAS.map((r) => r.id)).size).toBe(RECEITAS.length);
    for (const r of RECEITAS) {
      expect(CATALOGO.atividades.get(r.id)).toBe(r);
      expect(CATALOGO.locais.get(r.localId)?.subareas.some((s) => s.id === r.subareaId), r.id).toBe(true);
      expect(CATALOGO.itens.has(r.saida.itemId), r.saida.itemId).toBe(true);
      for (const x of r.entradas) expect(CATALOGO.itens.has(x.itemId), `${r.id} ${x.itemId}`).toBe(true);
      expect(r.nome).not.toContain("-");
    }
  });

  it("variantes +1..+3 para todo equipamento comum, nunca para nomeados", () => {
    for (const v of VARIANTES) {
      const base = CATALOGO.itens.get(v.equipamento!.baseId!)!;
      expect(base.equipamento!.nomeado).toBeUndefined();
      expect(v.equipamento!.aprimoramento).toBeGreaterThanOrEqual(1);
    }
    expect(proximoAprimoramento("espada-de-ferro")).toBe("espada-de-ferro+1");
    expect(proximoAprimoramento("espada-de-ferro+2")).toBe("espada-de-ferro+3");
    expect(proximoAprimoramento("espada-de-ferro+3")).toBeNull();
    for (const n of [...NOMEADOS, ...RELIQUIAS]) expect(CATALOGO.itens.has(`${n.id}+1`)).toBe(false);
  });

  it("acessórios, relíquias, drops e nomeados de origem existem", () => {
    for (const a of ACESSORIOS) expect(a.equipamento!.slot).toBe("acessorio");
    for (const r of RELIQUIAS) expect(r.equipamento!.slot).toBe("reliquia");
    for (const [m, d] of Object.entries(DROPS_RELIQUIA)) {
      expect(CATALOGO.monstros.has(m) || ["o-cobrador", "a-rainha-palida"].includes(m), m).toBe(true);
      expect(CATALOGO.itens.get(d.itemId)?.equipamento?.slot).toBe("reliquia");
    }
    for (const id of Object.values(NOMEADOS_DE_ORIGEM)) expect(CATALOGO.itens.get(id)?.equipamento?.nomeado).toBeDefined();
  });
});

describe("produção", () => {
  const pao = RECEITAS.find((r) => r.id === "assar-pao")!;

  it("consome entradas, guarda a saída, dá XP de ofício e para sem material", () => {
    const p = personagem({ mochila: { trigo: 12 } });
    const e = ok(iniciarAtividade(estadoCom(p), pao.id, T0));
    expect(ativo(e).subareaId).toBe("taverna");
    const depois = avancar(e, T0 + HORA).estado;
    const q = ativo(depois);
    expect(q.mochila["trigo"]).toBeUndefined();
    expect(q.mochila["pao-de-trigo"]).toBe(6);
    expect(q.oficiosProducao.culinaria.xp + q.oficiosProducao.culinaria.nivel).toBeGreaterThan(1);
    expect(q.atividade).toBeNull();
  });

  it("exige nível no ofício de produção", () => {
    const torta = RECEITAS.find((r) => r.id === "assar-torta")!;
    expect(cod(iniciarAtividade(estadoCom(personagem()), torta.id, T0))).toBe("nivel_oficio_insuficiente");
    const p = personagem({ oficiosProducao: { forja: { nivel: 1, xp: 0 }, alquimia: { nivel: 1, xp: 0 }, culinaria: { nivel: torta.nivelMinimo, xp: 0 } } });
    expect(cod(iniciarAtividade(estadoCom(p), torta.id, T0))).toBe("ok");
  });

  it("nomeado produzido é único", () => {
    const r = RECEITAS.find((x) => x.saida.itemId === "presa-da-matriarca")!;
    const p = personagem({ oficiosProducao: { forja: { nivel: 50, xp: 0 }, alquimia: { nivel: 1, xp: 0 }, culinaria: { nivel: 1, xp: 0 } }, mochila: { "presa-da-matriarca": 1 } });
    expect(cod(iniciarAtividade(estadoCom(p), r.id, T0))).toBe("ja_tem_nomeado");
  });

  it("avançar de uma vez = em pedaços (partição)", () => {
    const e = ok(iniciarAtividade(estadoCom(personagem({ mochila: { trigo: 30 } })), pao.id, T0));
    const deUmaVez = avancar(e, T0 + 3 * HORA).estado;
    let aos = e;
    for (let t = T0 + 7_919; t < T0 + 3 * HORA; t += 7_919) aos = avancar(aos, t).estado;
    aos = avancar(aos, T0 + 3 * HORA).estado;
    expect(ativo(aos).mochila).toEqual(ativo(deUmaVez).mochila);
    expect(ativo(aos).oficiosProducao).toEqual(ativo(deUmaVez).oficiosProducao);
  });
});

describe("fusão", () => {
  const naCidade = (mochila: Record<string, number>, extra: Partial<Personagem> = {}) => estadoCom(personagem({ mochila, ouro: 100_000, ...extra }));

  it("3 iguais + gold + material → +1 (ou perde 1 na falha), determinístico", () => {
    const e = naCidade({ "espada-de-ferro": 3, "minerio-de-ferro": 10 });
    const a = fundir(e, "espada-de-ferro", T0);
    const b = fundir(e, "espada-de-ferro", T0);
    expect(a).toEqual(b);
    const q = ativo(ok(a));
    expect(q.mochila["minerio-de-ferro"]).toBeUndefined();
    if (a.ok && a.sucesso) {
      expect(q.mochila["espada-de-ferro+1"]).toBe(1);
      expect(q.mochila["espada-de-ferro"]).toBeUndefined();
    } else {
      expect(q.mochila["espada-de-ferro"]).toBe(2);
      expect(q.pityFusao["espada-de-ferro"]).toBe(1);
    }
    expect(q.ouro).toBeLessThan(100_000);
  });

  it("garante o sucesso depois de N falhas seguidas", () => {
    const e = naCidade({ "espada-de-ferro+2": 3, "cinza-de-alma": 10 }, { pityFusao: { "espada-de-ferro+2": CONFIG_FUSAO.pity } });
    const r = fundir(e, "espada-de-ferro+2", T0);
    expect(r.ok && r.sucesso).toBe(true);
    expect(ativo(ok(r)).mochila["espada-de-ferro+3"]).toBe(1);
    expect(ativo(ok(r)).pityFusao["espada-de-ferro+2"]).toBeUndefined();
  });

  it("a taxa de sucesso bate com a chance (muitas sementes)", () => {
    let sucessos = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const r = fundir(estadoCom(personagem({ mochila: { "espada-de-ferro": 3, "minerio-de-ferro": 10 }, ouro: 10_000 }), `f${i}`), "espada-de-ferro", T0);
      if (r.ok && r.sucesso) sucessos++;
    }
    const chance = infoFusao(personagem(), "espada-de-ferro")!.chance;
    expect(sucessos / n).toBeGreaterThan(chance - 0.08);
    expect(sucessos / n).toBeLessThan(chance + 0.08);
  });

  it("recusa nomeado, máximo, poucos itens, falta de gold/material e fora da cidade", () => {
    expect(cod(fundir(naCidade({ "lamina-desperta": 1 }), "lamina-desperta", T0))).toBe("nao_funde");
    expect(cod(fundir(naCidade({ "espada-de-ferro+3": 3 }), "espada-de-ferro+3", T0))).toBe("fusao_maxima");
    expect(cod(fundir(naCidade({ "espada-de-ferro": 2, "minerio-de-ferro": 10 }), "espada-de-ferro", T0))).toBe("itens_insuficientes");
    expect(cod(fundir(naCidade({ "espada-de-ferro": 3 }), "espada-de-ferro", T0))).toBe("material_insuficiente");
    expect(cod(fundir(naCidade({ "espada-de-ferro": 3, "minerio-de-ferro": 10 }, { ouro: 0 }), "espada-de-ferro", T0))).toBe("ouro_insuficiente");
    expect(cod(fundir(naCidade({ "espada-de-ferro": 3, "minerio-de-ferro": 10 }, { localId: "bosque-raso", subareaId: "orla" }), "espada-de-ferro", T0))).toBe("fora_da_cidade");
  });

  it("o item aprimorado dá mais bônus", () => {
    const sc = (id: string) => statusDeCombate(statusIniciais(personagem()), modificadoresDoPersonagem(personagem({ equipados: { ...camposIniciaisF4().equipados, arma: id } }), 1)).ataque;
    expect(sc("espada-de-ferro+3")).toBeGreaterThan(sc("espada-de-ferro+1"));
    expect(sc("espada-de-ferro+1")).toBeGreaterThan(sc("espada-de-ferro"));
  });
});

describe("mochila, acessórios, nomeados e poções", () => {
  it("ampliação: +5 espaços por compra, preço crescente, com limite", () => {
    let e = estadoCom(personagem({ ouro: 10_000_000 }));
    const cap0 = capacidadeDe(ativo(e));
    const precos: number[] = [];
    for (let i = 0; i < CONFIG_MOCHILA_EXTRA.maximoCompras; i++) {
      precos.push(precoAmpliacao(ativo(e))!);
      e = ok(ampliarMochila(e, T0));
    }
    expect(capacidadeDe(ativo(e))).toBe(cap0 + CONFIG_MOCHILA_EXTRA.maximoCompras * CONFIG_MOCHILA_EXTRA.espacosPorCompra);
    expect(precos).toEqual([...precos].sort((a, b) => a - b));
    expect(cod(ampliarMochila(e, T0))).toBe("limite_de_compras");
  });

  it("dois acessórios ocupam os dois slots; nomeado não se repete nem se vende", () => {
    let e = estadoCom(personagem({ mochila: { "anel-de-cobre": 2, "bussola-quebrada": 1 } }));
    e = ok(equipar(e, "anel-de-cobre", T0));
    e = ok(equipar(e, "anel-de-cobre", T0));
    expect(ativo(e).equipados.acessorio1).toBe("anel-de-cobre");
    expect(ativo(e).equipados.acessorio2).toBe("anel-de-cobre");
    e = ok(equipar(e, "bussola-quebrada", T0));
    expect(ativo(e).equipados.acessorio1).toBe("bussola-quebrada");
    expect(ativo(e).mochila["anel-de-cobre"]).toBe(1);
    expect(cod(vender(estadoCom(personagem({ mochila: { "bussola-quebrada": 1 } })), "bussola-quebrada", 1, T0))).toBe("nao_vende");
    const lote = ok(venderTudo(estadoCom(personagem({ mochila: { "bussola-quebrada": 1, trigo: 5, "pocao-de-vida": 2 } })), T0));
    expect(ativo(lote).mochila).toEqual({ "bussola-quebrada": 1, "pocao-de-vida": 2 });
  });

  it("a Lâmina Desperta cresce com o nível", () => {
    const at = (nivel: number) =>
      statusDeCombate(statusIniciais(personagem()), modificadoresDoPersonagem(personagem({ nivel, equipados: { ...camposIniciaisF4().equipados, arma: "lamina-desperta" } }), nivel)).ataque;
    expect(at(30)).toBeGreaterThan(at(1) + 10);
  });

  it("poções são usadas sozinhas no combate com pouca vida", () => {
    const area = AREAS_COMBATE[AREAS_COMBATE.length - 1]!;
    const p = personagem({
      localId: area.localId,
      subareaId: area.subareaId,
      mochila: { "pocao-de-vida": 5 },
      recuoPercentual: 0,
      atividade: { id: area.id, progressoMs: 0, combate: { fase: "procurando", restanteMs: 1_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] } },
    });
    const depois = avancar(estadoCom(p), T0 + 10 * MIN).estado;
    expect(ativo(depois).mochila["pocao-de-vida"] ?? 0).toBeLessThan(5);
  });
});

describe("save v9", () => {
  it("ida e volta com produção, pity e espaços extras", () => {
    const e = avancar(ok(iniciarAtividade(estadoCom(personagem({ mochila: { trigo: 30 }, espacosExtras: 5, pityFusao: { "espada-de-ferro": 2 } })), "assar-pao", T0)), T0 + 20 * MIN).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("rejeita ofício, espaços, pity, slot ou nomeado adulterados", () => {
    const base = JSON.parse(serializarSave(estadoCom(personagem({ mochila: { "bussola-quebrada": 1 } })))) as { conta: { personagens: Record<string, unknown>[] } };
    const com = (mudar: (p: Record<string, unknown>) => void) => {
      const d = structuredClone(base);
      mudar(d.conta.personagens[0]!);
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(com(() => {})).toBe("ok");
    expect(com((p) => ((p.oficiosProducao as Record<string, unknown>).forja = { nivel: 0, xp: 0 }))).toBe("formato_invalido");
    expect(com((p) => (p.espacosExtras = 3))).toBe("formato_invalido");
    expect(com((p) => (p.espacosExtras = 1_000))).toBe("formato_invalido");
    expect(com((p) => (p.pityFusao = { "item-falso": 1 }))).toBe("formato_invalido");
    expect(com((p) => ((p.equipados as Record<string, unknown>).acessorio1 = "espada-de-ferro"))).toBe("formato_invalido");
    expect(com((p) => ((p.equipados as Record<string, unknown>).acessorio1 = "bussola-quebrada"))).toBe("formato_invalido");
    expect(com((p) => ((p.mochila as Record<string, number>)["bussola-quebrada"] = 2))).toBe("formato_invalido");
  });

  it("migra v8 → v9 (com o nomeado da origem na mochila)", () => {
    const origem = { tipo: "especial" as const, id: "naufrago-das-estrelas", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." };
    const d = JSON.parse(serializarSave(estadoCom(personagem({ origem })))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 8;
    const p0 = d.conta.personagens[0]!;
    for (const k of ["oficiosProducao", "espacosExtras", "pityFusao"]) delete p0[k];
    const eq = p0.equipados as Record<string, unknown>;
    delete eq.acessorio1;
    delete eq.acessorio2;
    delete eq.reliquia;
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(8);
    const p = r.ok ? r.estado.conta.personagens[0]! : null;
    expect(p).toMatchObject(camposIniciaisF8());
    expect(p?.mochila["bussola-quebrada"]).toBe(1);
    expect(p?.equipados.reliquia).toBeNull();
  });
});
