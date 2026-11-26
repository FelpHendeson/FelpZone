import { tutorialInicial } from "../src/index";
import { describe, expect, it } from "vitest";
import {
  ARQUETIPOS,
  COFRE_VAZIO,
  CONFIG_COMPETICAO,
  TEMAS,
  aplicarAcao,
  botDeArena,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  camposIniciaisF11,
  camposIniciaisF12,
  campoDeProvas,
  carregarSave,
  criarEstadoInicial,
  duelo,
  emDia,
  inicioDaSemana,
  novoPet,
  rankingDaTemporada,
  resolverTorneio,
  retratoDe,
  semanaDe,
  serializarSave,
  statusIniciais,
  temaDaTemporada,
  temporadaDe,
  type EstadoJogo,
  type Personagem,
  type Retrato,
} from "../src/index";

const T0 = 1_700_000_000_000;

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
    ...camposIniciaisF10(),
    ...camposIniciaisF11(),
    ...camposIniciaisF12(),
    tutorial: tutorialInicial(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "competicao"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;


const aplicar = (e: EstadoJogo, acao: unknown, t = T0) => {
  const r = aplicarAcao(e, acao, t);
  if (!r.ok) throw new Error(r.erro.codigo + ": " + r.erro.mensagem);
  return r.estado;
};
const codA = (e: EstadoJogo, acao: unknown, t = T0) => {
  const r = aplicarAcao(e, acao, t);
  return r.ok ? "ok" : r.erro.codigo;
};
const DIA = 86_400_000;
const comCompeticao = (extra: Partial<Personagem> = {}) => personagem({ ...camposIniciaisF12(T0), ...extra });
const mais = (r: Retrato, f: number): Retrato => ({ ...r, sc: { ...r.sc, ataque: r.sc.ataque * f, vidaMax: r.sc.vidaMax * f } });

describe("duelo e bots", () => {
  it("o duelo é reproduzível pela semente", () => {
    const a = botDeArena("x", 10);
    const b = botDeArena("y", 10);
    expect(duelo(a, b, "s1")).toEqual(duelo(a, b, "s1"));
    const r = duelo(a, b, "s1");
    expect(["a", "b"]).toContain(r.vencedor);
    expect(r.duracaoMs).toBeLessThanOrEqual(CONFIG_COMPETICAO.duracaoMaximaMs);
  });

  it("bots saem do arquétipo e do nível pela semente; nível maior, mais forte", () => {
    expect(botDeArena("abc", 12)).toEqual(botDeArena("abc", 12));
    expect(ARQUETIPOS.some((a) => a.id === botDeArena("abc", 12).arquetipoId)).toBe(true);
    let soma1 = 0;
    let soma30 = 0;
    for (let i = 0; i < 20; i++) {
      soma1 += botDeArena(`b${i}`, 1).sc.ataque;
      soma30 += botDeArena(`b${i}`, 30).sc.ataque;
    }
    expect(soma30).toBeGreaterThan(soma1 * 2);
  });

  it("Campo de Provas: igual contra igual fica perto de 50%; mais forte vence quase sempre", () => {
    const a = botDeArena("igual", 15);
    const igual = campoDeProvas(a, a, 300, "cp");
    expect(igual.taxa).toBeGreaterThan(0.35);
    expect(igual.taxa).toBeLessThan(0.65);
    expect(campoDeProvas(mais(a, 1.5), a, 200, "cp").taxa).toBeGreaterThan(0.85);
  });

  it("o tema da temporada favorece quem combina", () => {
    const lua = TEMAS.find((t) => t.id === "lua-negra")!;
    const sombra: Retrato = { ...botDeArena("t", 15), racaId: "sangue-palido", coreId: "ser-das-trevas" };
    const outro: Retrato = { ...sombra, racaId: "humano", coreId: "andarilho" };
    expect(campoDeProvas(sombra, outro, 300, "tema", lua).taxa).toBeGreaterThan(campoDeProvas(sombra, outro, 300, "tema").taxa + 0.1);
  });

  it("o retrato ignora pets e mundo (só o personagem conta na Arena)", () => {
    const p = personagem();
    const comPet = { ...p, pets: [novoPet("pet-1", "lobo", "Lobo")], petsPorSlot: { combate: "pet-1" }, petsCriados: 1, mundo: { noite: true, clima: "neblina" as const } };
    expect(retratoDe(comPet)).toEqual(retratoDe(p));
  });
});

describe("calendário", () => {
  it("semanas começam na segunda; temporadas têm 8 semanas e temas em rodízio", () => {
    const s = semanaDe(T0);
    expect(new Date(inicioDaSemana(s)).getUTCDay()).toBe(1);
    expect(semanaDe(inicioDaSemana(s))).toBe(s);
    expect(semanaDe(inicioDaSemana(s) - 1)).toBe(s - 1);
    expect(temporadaDe(inicioDaSemana(16))).toBe(2);
    expect(temaDaTemporada(0)).toBe(TEMAS[0]);
    expect(temaDaTemporada(TEMAS.length)).toBe(TEMAS[0]);
  });

  it("virada de temporada guarda os pontos e reinicia", () => {
    const c = { ...camposIniciaisF12(T0).competicao, pontos: 420, rating: 1_400 };
    const depois = emDia(c, T0 + 9 * CONFIG_COMPETICAO.semanaMs);
    expect(depois.pontos).toBe(0);
    expect(depois.rating).toBe(1_200);
    expect(depois.historico).toEqual([{ temporada: c.temporada, pontos: 420 }]);
  });
});

describe("Arena", () => {
  it("10 lutas por dia; rating, pontos, gold e replays reproduzíveis", () => {
    let e = estadoCom(comCompeticao());
    for (let i = 0; i < CONFIG_COMPETICAO.lutasPorDia; i++) e = aplicar(e, { tipo: "lutarArena" }, T0 + i);
    expect(codA(e, { tipo: "lutarArena" }, T0 + 20)).toBe("sem_lutas");
    const c = ativo(e).competicao;
    expect(c.totalLutas).toBe(10);
    expect(c.replays).toHaveLength(CONFIG_COMPETICAO.replays);
    expect(c.pontos).toBeGreaterThanOrEqual(10 * CONFIG_COMPETICAO.pontosDerrota);
    for (const r of c.replays) expect(duelo(r.a, r.b, r.semente, temaDaTemporada(c.temporada)).vencedor).toBe(r.vencedor);
    // No dia seguinte, mais lutas.
    expect(codA(e, { tipo: "lutarArena" }, T0 + DIA)).toBe("ok");
  });

  it("pontos da temporada dão a relíquia do tema (uma vez)", () => {
    const base = comCompeticao();
    const e = estadoCom({ ...base, competicao: { ...base.competicao, pontos: CONFIG_COMPETICAO.pontosReliquia } });
    const r = aplicar(e, { tipo: "lutarArena" });
    const id = temaDaTemporada(ativo(r).competicao.temporada).reliquiaId;
    expect(ativo(r).mochila[id]).toBe(1);
    expect(ativo(aplicar(r, { tipo: "lutarArena" }, T0 + 1)).mochila[id]).toBe(1);
  });

  it("ranking: jogador entre 20 bots, em ordem", () => {
    const r = rankingDaTemporada(3, inicioDaSemana(3 * 8) + 3 * CONFIG_COMPETICAO.semanaMs, { nome: "Eu", pontos: 500 });
    expect(r).toHaveLength(21);
    expect(r.filter((x) => x.jogador)).toHaveLength(1);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.pontos).toBeGreaterThanOrEqual(r[i]!.pontos);
  });
});

describe("torneio semanal", () => {
  it("chave de 16, 15 partidas, colocação válida e reproduzível", () => {
    const eu = retratoDe(personagem());
    const r = resolverTorneio(semanaDe(T0), eu);
    expect(r.inscritos).toHaveLength(16);
    expect(r.partidas).toHaveLength(15);
    expect([1, 2, 3, 5, 9]).toContain(r.colocacao);
    expect(resolverTorneio(semanaDe(T0), eu)).toEqual(r);
    expect(resolverTorneio(semanaDe(T0), mais(eu, 10)).colocacao).toBe(1);
  });

  it("inscrever, esperar a semana acabar e resgatar o prêmio", () => {
    let e = aplicar(estadoCom(comCompeticao({ ouro: 0 })), { tipo: "inscreverTorneio" });
    expect(codA(e, { tipo: "inscreverTorneio" })).toBe("ja_inscrito");
    expect(codA(e, { tipo: "resgatarTorneio" })).toBe("torneio_em_andamento");
    const depois = T0 + CONFIG_COMPETICAO.semanaMs;
    expect(codA(e, { tipo: "inscreverTorneio" }, depois)).toBe("torneio_pendente");
    const r = aplicarAcao(e, { tipo: "resgatarTorneio" }, depois);
    expect(r.ok && [1, 2, 3, 5, 9]).toContain(r.ok && r.detalhe?.colocacao);
    e = r.ok ? r.estado : e;
    expect(ativo(e).ouro).toBeGreaterThan(0);
    expect(ativo(e).competicao.torneio).toBeNull();
    expect(ativo(e).cronica.registros.at(-1)!.texto).toContain("torneio");
    expect(codA(e, { tipo: "resgatarTorneio" }, depois)).toBe("sem_torneio");
  });
});

describe("save v13", () => {
  it("ida e volta com lutas e torneio", () => {
    let e = estadoCom(comCompeticao());
    e = aplicar(aplicar(e, { tipo: "lutarArena" }), { tipo: "inscreverTorneio" });
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("rejeita competição adulterada", () => {
    const e = aplicar(estadoCom(comCompeticao()), { tipo: "lutarArena" });
    const base = JSON.parse(serializarSave(e)) as { conta: { personagens: Record<string, unknown>[] } };
    const com = (mudar: (c: Record<string, unknown>) => void) => {
      const d = structuredClone(base);
      mudar(d.conta.personagens[0]!.competicao as Record<string, unknown>);
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    const replay = (c: Record<string, unknown>) => (c.replays as Record<string, Record<string, unknown>>[])[0]!;
    expect(com(() => {})).toBe("ok");
    expect(com((c) => (c.lutasHoje = 99))).toBe("formato_invalido");
    expect(com((c) => (c.rating = -5))).toBe("formato_invalido");
    expect(com((c) => ((replay(c).a!.sc as Record<string, number>).esquiva = 2))).toBe("formato_invalido");
    expect(com((c) => (replay(c).b!.racaId = "dragao-de-papel"))).toBe("formato_invalido");
    expect(com((c) => (c.torneio = { semana: 1, retrato: { nome: "x" } }))).toBe("formato_invalido");
  });

  it("migra v12 → v13", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem()))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 12;
    delete d.conta.personagens[0]!.competicao;
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(12);
    expect(r.ok && r.estado.conta.personagens[0]!.competicao).toMatchObject({ rating: 1_000, pontos: 0, torneio: null, temporada: temporadaDe(T0) });
  });
});
