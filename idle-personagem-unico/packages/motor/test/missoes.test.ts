import { describe, expect, it } from "vitest";
import {
  COFRE_VAZIO,
  CATALOGO,
  CONFIG_GUILDA,
  MISSOES,
  NPCS,
  PRIMEIRA_META,
  RANKS,
  avancar,
  abandonarMissao,
  aceitarMissao,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  camposIniciaisF11,
  carregarSave,
  criarEstadoInicial,
  entregarMissao,
  iniciarAtividade,
  irPara,
  modificadoresDoPersonagem,
  precoDeCompra,
  progressoDaMissao,
  promover,
  serializarSave,
  statusIniciais,
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
    ...camposIniciaisF7(origem.tipo === "especial" ? origem.id : undefined),
    ...camposIniciaisF8(),
    ...camposIniciaisF10(),
    ...camposIniciaisF11(),
    ...extra,
  };
}
const estadoCom = (p: Personagem): EstadoJogo => ({ ...criarEstadoInicial("missoes", T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo + ": " + r.erro.mensagem);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;

describe("catálogo de missões", () => {
  it("referências válidas: NPCs, itens, monstros e recompensas", () => {
    expect(new Set(MISSOES.map((m) => m.id)).size).toBe(MISSOES.length);
    for (const n of NPCS) expect(CATALOGO.locais.get(n.localId)?.subareas.some((s) => s.id === n.subareaId), n.id).toBe(true);
    for (const m of MISSOES) {
      if (m.npcId) expect(CATALOGO.npcs.has(m.npcId), m.id).toBe(true);
      const o = m.objetivo;
      if (o.tipo === "abater") for (const x of o.monstros) expect(CATALOGO.monstros.has(x), `${m.id}: ${x}`).toBe(true);
      if (o.tipo === "obter") for (const x of o.itens) expect(CATALOGO.itens.has(x), `${m.id}: ${x}`).toBe(true);
      for (const it of m.recompensa.itens) expect(CATALOGO.itens.has(it.itemId), `${m.id}: ${it.itemId}`).toBe(true);
      for (const req of m.requisitos.missoes ?? []) expect(CATALOGO.missoes.has(req), `${m.id}: ${req}`).toBe(true);
    }
  });

  it("metas só dão XP; guilda dá Mérito; 3 contratos por rank (F a S) e 6 provas", () => {
    for (const m of MISSOES.filter((x) => x.tipo === "meta")) expect([m.recompensa.ouro, m.recompensa.merito, m.recompensa.itens.length]).toEqual([0, 0, 0]);
    for (const m of MISSOES.filter((x) => x.tipo === "guilda")) expect(m.recompensa.merito > 0 && m.repetivel === true, m.id).toBe(true);
    for (let r = 0; r <= 6; r++) expect(MISSOES.filter((x) => x.tipo === "guilda" && x.rank === r)).toHaveLength(3);
    expect(MISSOES.filter((x) => x.tipo === "prova").map((x) => x.id)).toEqual(["F", "E", "D", "C", "B", "A"].map((r) => `prova-${r}`));
    expect(RANKS).toHaveLength(13);
  });
});

describe("metas", () => {
  it("a primeira já começa; avança sozinha; entregar dá XP e começa a próxima", () => {
    let e = ok(iniciarAtividade(estadoCom(personagem()), "meditacao", T0));
    expect(ativo(e).missoes.ativas).toEqual([{ id: PRIMEIRA_META, base: 0 }]);
    expect(cod(entregarMissao(e, PRIMEIRA_META, T0))).toBe("missao_incompleta");
    e = avancar(e, T0 + 5 * MIN).estado;
    expect(progressoDaMissao(ativo(e), PRIMEIRA_META)).toEqual({ atual: 10, alvo: 10, completa: true });
    const xpAntes = ativo(e).xp + ativo(e).nivel * 1_000;
    e = ok(entregarMissao(e, PRIMEIRA_META, T0 + 5 * MIN));
    expect(ativo(e).xp + ativo(e).nivel * 1_000).toBeGreaterThan(xpAntes);
    expect(ativo(e).missoes.ativas.map((a) => a.id)).toEqual(["meta-nivel-3"]);
    expect(cod(abandonarMissao(e, "meta-nivel-3", T0))).toBe("missao_indisponivel");
  });
});

describe("NPCs", () => {
  it("aceitar e entregar no local do NPC; só conta o que vem depois de aceitar", () => {
    // Colhe trigo antes de aceitar: não conta.
    let e = avancar(ok(iniciarAtividade(estadoCom(personagem()), "colher-trigo", T0)), T0 + HORA).estado;
    expect(ativo(e).obtidos.trigo).toBeGreaterThan(50);
    e = ok(aceitarMissao(e, "iolanda-1", T0 + HORA));
    expect(progressoDaMissao(ativo(e), "iolanda-1").atual).toBe(0);
    e = avancar(e, T0 + 2 * HORA).estado;
    expect(progressoDaMissao(ativo(e), "iolanda-1").completa).toBe(true);
    const ouro = ativo(e).ouro;
    e = ok(entregarMissao(e, "iolanda-1", T0 + 2 * HORA));
    expect(ativo(e).ouro).toBe(ouro + 150);
    expect(cod(aceitarMissao(e, "iolanda-1", T0 + 2 * HORA))).toBe("missao_indisponivel");
    // A cadeia libera a próxima, que dá item.
    e = ok(aceitarMissao(e, "iolanda-2", T0 + 2 * HORA));
    expect(ativo(e).missoes.ativas.some((a) => a.id === "iolanda-2")).toBe(true);
  });

  it("NPC fora do lugar; requisito de nível; cadeia trancada", () => {
    const e = estadoCom(personagem());
    expect(cod(aceitarMissao(e, "pescador-1", T0))).toBe("fora_do_lugar");
    expect(cod(aceitarMissao(e, "iolanda-2", T0))).toBe("missao_indisponivel");
    expect(cod(aceitarMissao(e, "brom-1", T0))).toBe("missao_indisponivel");
    const noLago = ok(irPara(e, "lago-espelho", T0));
    expect(cod(aceitarMissao(avancar(noLago, T0 + 10_000).estado, "pescador-1", T0 + 10_000))).toBe("ok");
  });
});

describe("Guilda", () => {
  it("quadro filtrado por rank; repetível volta depois da espera; Mérito", () => {
    let e = estadoCom(personagem());
    expect(cod(aceitarMissao(e, "guilda-E-caca", T0))).toBe("missao_indisponivel");
    e = ok(aceitarMissao(e, "guilda-F-treino", T0));
    e = avancar(ok(iniciarAtividade(e, "meditacao", T0)), T0 + 30 * MIN).estado;
    e = ok(entregarMissao(e, "guilda-F-treino", T0 + 30 * MIN));
    expect(ativo(e).guilda.merito).toBe(15);
    expect(cod(aceitarMissao(e, "guilda-F-treino", T0 + 30 * MIN))).toBe("missao_indisponivel");
    expect(cod(aceitarMissao(e, "guilda-F-treino", T0 + 30 * MIN + CONFIG_GUILDA.esperaRepetivelMs))).toBe("ok");
  });

  it("promover exige Mérito e prova; o rank dá desconto", () => {
    const sem = estadoCom(personagem({ guilda: { rank: 0, merito: 50 } }));
    expect(cod(promover(sem, T0))).toBe("merito_insuficiente");
    const semProva = estadoCom(personagem({ guilda: { rank: 0, merito: 100 } }));
    expect(cod(promover(semProva, T0))).toBe("prova_pendente");
    const pronto = estadoCom(personagem({ guilda: { rank: 0, merito: 120 }, missoes: { ativas: [], concluidas: { "prova-F": 1 }, disponivelEm: {} } }));
    const e = ok(promover(pronto, T0));
    expect(ativo(e).guilda).toEqual({ rank: 1, merito: 20 });
    const p = ativo(e);
    expect(precoDeCompra(p, 100)).toBe(98);
    expect(modificadoresDoPersonagem(p, 1).some((m) => m.alvo === "coleta.rendimento")).toBe(true);
    expect(cod(promover(estadoCom(personagem({ guilda: { rank: 6, merito: 99_999 } })), T0))).toBe("rank_maximo");
  });

  it("prova de promoção conta o chefe abatido depois de aceitar", () => {
    let e = ok(aceitarMissao(estadoCom(personagem()), "prova-F", T0));
    const p = ativo(e);
    e = { ...e, conta: { ...e.conta, personagens: [{ ...p, bestiario: { "velha-matriarca": 1 } }] } };
    expect(progressoDaMissao(ativo(e), "prova-F").completa).toBe(true);
    expect(ativo(ok(entregarMissao(e, "prova-F", T0))).missoes.concluidas["prova-F"]).toBe(1);
  });

  it("Soldado de uma Guerra Perdida começa no rank E", () => {
    const p = personagem({ origem: { tipo: "especial", id: "soldado-de-uma-guerra-perdida", loreGerada: "x" } });
    expect(p.guilda.rank).toBe(1);
  });
});

describe("save v8", () => {
  it("ida e volta com missões e contadores", () => {
    const e = avancar(ok(aceitarMissao(ok(iniciarAtividade(estadoCom(personagem()), "colher-trigo", T0)), "iolanda-1", T0)), T0 + 20 * MIN).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v7 → v8", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem()))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 7;
    for (const k of ["obtidos", "treinos", "missoes", "guilda"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(7);
    expect(r.ok && r.estado.conta.personagens[0]).toMatchObject(camposIniciaisF7());
  });

  it("rejeita missões, contadores ou guilda adulterados", () => {
    const base = () => JSON.parse(serializarSave(estadoCom(personagem()))) as { conta: { personagens: Record<string, unknown>[] } };
    const codigo = (d: unknown) => {
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(codigo(base())).toBe("ok");
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p.missoes = { ativas: [{ id: "missao-fantasma", base: 0 }], concluidas: {}, disponivelEm: {} }),
      (p) => (p.missoes = { ativas: [{ id: PRIMEIRA_META, base: -1 }], concluidas: {}, disponivelEm: {} }),
      (p) => (p.missoes = { ativas: [], concluidas: {}, disponivelEm: { "iolanda-1": 5 } }),
      (p) => (p.guilda = { rank: 7, merito: 0 }),
      (p) => (p.obtidos = { "pedra-filosofal": 1 }),
      (p) => (p.treinos = { coragem: 3 }),
    ];
    for (const altera of casos) {
      const d = base();
      altera(d.conta.personagens[0]!);
      expect(codigo(d), altera.toString()).toBe("formato_invalido");
    }
  });
});
