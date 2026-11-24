import { describe, expect, it } from "vitest";
import {
  CATALOGO,
  CLIMAS,
  COFRE_VAZIO,
  CONFIG_MUNDO,
  EVENTOS,
  MARCOS_CRONICA,
  aceitarMissao,
  aplicarAcao,
  avancar,
  bonusBestiario,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  camposIniciaisF11,
  carregarSave,
  climaEm,
  criarEstadoInicial,
  ehNoite,
  entregarMissao,
  horaDoJogo,
  missoesVisiveis,
  modificadoresDoPersonagem,
  proximaMudanca,
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
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...camposIniciaisF10(),
    ...camposIniciaisF11(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "mundo"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;


const codA = (e: EstadoJogo, acao: unknown, t = T0) => {
  const r = aplicarAcao(e, acao, t);
  return r.ok ? "ok" : r.erro.codigo;
};
const DIA = CONFIG_MUNDO.diaMs;
/** Primeiro instante ≥ T0 em que o relógio está na hora `h`. */
const naHora = (h: number) => {
  const t = Math.ceil(T0 / DIA) * DIA;
  return t + (h * DIA) / 24;
};
const colhendo = (extra: Partial<Personagem> = {}) => personagem({ localId: "pedravau", subareaId: "hortas", atividade: { id: "colher-trigo", progressoMs: 0 }, ...extra });
const soma = (mods: ReturnType<typeof modificadoresDoPersonagem>, alvo: string) => mods.filter((m) => m.alvo === alvo && m.operacao === "percentual").reduce((s, m) => s + m.valor, 0);

describe("relógio e clima", () => {
  it("1 h real = 1 dia; noite das 19h às 5h", () => {
    expect(horaDoJogo(naHora(0))).toBe(0);
    expect(horaDoJogo(naHora(13))).toBe(13);
    expect(ehNoite(naHora(4))).toBe(true);
    expect(ehNoite(naHora(5))).toBe(false);
    expect(ehNoite(naHora(18))).toBe(false);
    expect(ehNoite(naHora(19))).toBe(true);
  });

  it("a próxima mudança cai exatamente na virada (dia/noite ou clima)", () => {
    for (let i = 0; i < 200; i++) {
      const t = T0 + i * 7_919_337;
      const d = proximaMudanca(t);
      expect(d).toBeGreaterThan(0);
      const antes = [ehNoite(t), climaEm(t)].join();
      expect([ehNoite(t + d - 1), climaEm(t + d - 1)].join()).toBe(antes);
      // A virada é um ponto possível de mudança (o bloco de clima seguinte pode repetir o clima).
      expect(d).toBeLessThanOrEqual(CONFIG_MUNDO.climaBlocoMs);
      expect(ehNoite(t + d) !== ehNoite(t) || Math.floor((t + d) / CONFIG_MUNDO.climaBlocoMs) !== Math.floor(t / CONFIG_MUNDO.climaBlocoMs)).toBe(true);
    }
  });

  it("o clima é o mesmo para todos e segue os pesos", () => {
    expect(climaEm(T0)).toBe(climaEm(T0));
    const n: Record<string, number> = {};
    for (let b = 0; b < 10_000; b++) n[climaEm(b * CONFIG_MUNDO.climaBlocoMs)] = (n[climaEm(b * CONFIG_MUNDO.climaBlocoMs)] ?? 0) + 1;
    for (const c of CLIMAS) expect(n[c]).toBeGreaterThan(0);
    expect(n.limpo! / 10_000).toBeCloseTo(0.4, 1);
    expect(n.neblina! / 10_000).toBeCloseTo(0.1, 1);
  });
});

describe("efeitos do mundo", () => {
  it("noite fortalece Sangue-Pálido e Ser das Trevas; dia fortalece a Alma da Luz", () => {
    const noite = { noite: true, clima: "limpo" as const };
    const dia = { noite: false, clima: "limpo" as const };
    const sp = (mundo: typeof noite) => soma(modificadoresDoPersonagem(personagem({ racaId: "sangue-palido", mundo }), 1), "ataque");
    expect(sp(noite) - sp(dia)).toBeCloseTo(0.1, 9);
    const trevas = (mundo: typeof noite) => soma(modificadoresDoPersonagem({ ...personagem({ mundo }), coreId: "ser-das-trevas" }, 1), "defesa");
    expect(trevas(noite) - trevas(dia)).toBeCloseTo(0.08, 9);
    const luz = (mundo: typeof noite) => soma(modificadoresDoPersonagem({ ...personagem({ mundo }), coreId: "alma-da-luz" }, 1), "ataque");
    expect(luz(dia) - luz(noite)).toBeCloseTo(0.05, 9);
    expect(modificadoresDoPersonagem(personagem({ mundo: noite }), 1).some((m) => m.alvo === "combate.raro")).toBe(true);
  });

  it("chuva rende mais na lavoura e na pesca e deixa a viagem mais lenta", () => {
    const m = modificadoresDoPersonagem(personagem({ mundo: { noite: false, clima: "chuva" } }), 1);
    expect(soma(m, "oficio.agricultura.rendimento")).toBeCloseTo(0.15, 9);
    expect(soma(m, "duracao-viagem")).toBeCloseTo(0.1, 9);
  });

  it("títulos por mortes e marcos do Bestiário dão bônus", () => {
    expect(soma(modificadoresDoPersonagem(personagem({ mortes: 30 }), 1), "duracao-limiar")).toBeCloseTo(-0.1, 9);
    expect(soma(modificadoresDoPersonagem(personagem({ mortes: 4 }), 1), "duracao-limiar")).toBe(0);
    expect([bonusBestiario(99), bonusBestiario(100), bonusBestiario(1_000), bonusBestiario(10_000)]).toEqual([0, 0.05, 0.1, 0.15]);
  });

  it("o avanço acompanha dia, noite e clima, e dividir o tempo dá o mesmo resultado", () => {
    for (let s = 0; s < 3; s++) {
      const e = estadoCom(colhendo(), `mundo-${s}`);
      const fim = T0 + 7 * HORA + s * 12_345;
      const direto = avancar(e, fim).estado;
      let partes = e;
      for (let t = T0 + 3_331 + s * 991; t < fim; t += 9_871 + s * 1_211) partes = avancar(partes, t).estado;
      partes = avancar(partes, fim).estado;
      expect(partes, `semente ${s}`).toEqual(direto);
      expect(ativo(direto).mundo).toEqual({ noite: ehNoite(fim), clima: climaEm(fim) });
    }
  });
});

describe("eventos e Crônica", () => {
  it("eventos surgem a cada hora de trabalho (até 3), iguais para qualquer divisão do tempo", () => {
    const e = avancar(estadoCom(colhendo({ espacosExtras: 30 })), T0 + 12 * HORA).estado;
    const p = ativo(e);
    expect(p.eventos.sorteios).toBe(12);
    expect(p.eventos.pendentes.length).toBeGreaterThan(0);
    expect(p.eventos.pendentes.length).toBeLessThanOrEqual(CONFIG_MUNDO.eventosPendentesMax);
    for (const x of p.eventos.pendentes) expect(EVENTOS.some((ev) => ev.id === x.eventoId)).toBe(true);
    // Ocioso não gera eventos.
    expect(ativo(avancar(estadoCom(personagem()), T0 + 12 * HORA).estado).eventos.sorteios).toBe(0);
  });

  it("responder: cada escolha tem efeito e vai para a Crônica", () => {
    const com = (eventoId: string, extra: Partial<Personagem> = {}) =>
      estadoCom(personagem({ ouro: 1_000, nivel: 1, eventos: { pendentes: [{ n: 1, eventoId }], trabalhoMs: 0, sorteios: 1 }, ...extra }));
    const r1 = aplicarAcao(com("brilho-na-lama"), { tipo: "resolverEvento", n: 1, escolha: 0 }, T0);
    expect(r1.ok && ativo(r1.estado).ouro).toBe(1_015);
    expect(r1.ok && ativo(r1.estado).eventos.pendentes).toEqual([]);
    expect(r1.ok && ativo(r1.estado).cronica.registros[0]!.texto).toContain("Brilho na lama");
    const r2 = aplicarAcao(com("emboscada"), { tipo: "resolverEvento", n: 1, escolha: 1 }, T0);
    expect(r2.ok && ativo(r2.estado).ouro).toBe(950);
    expect(codA(com("viajante-faminto"), { tipo: "resolverEvento", n: 1, escolha: 0 })).toBe("sem_comida");
    const r3 = aplicarAcao(com("viajante-faminto", { mochila: { "pao-de-trigo": 1 } }), { tipo: "resolverEvento", n: 1, escolha: 0 }, T0);
    expect(r3.ok && ativo(r3.estado).mochila["pao-de-trigo"]).toBeUndefined();
    expect(r3.ok && ativo(r3.estado).xp).toBeGreaterThan(0);
    expect(codA(com("emboscada"), { tipo: "resolverEvento", n: 2, escolha: 0 })).toBe("evento_inexistente");
    expect(codA(com("emboscada"), { tipo: "resolverEvento", n: 1, escolha: 2 })).toBe("acao_invalida");
  });

  it("marcos da Crônica em ordem canônica", () => {
    const e = avancar(estadoCom(personagem({ mortes: 12, petsCriados: 1, guilda: { rank: 3, merito: 0 } })), T0 + 1_000).estado;
    expect(ativo(e).cronica.marcos).toEqual(["primeira-morte", "dez-mortes", "primeiro-pet", "rank-c"]);
    for (const m of ativo(e).cronica.marcos) expect(MARCOS_CRONICA.some((x) => x.id === m)).toBe(true);
  });
});

describe("arcos das origens especiais", () => {
  const origem = { tipo: "especial" as const, id: "orfao-do-templo-cinzento", loreGerada: "Lore." };
  it("cada origem especial tem 3 capítulos; só ela vê os seus", () => {
    const arcos = [...CATALOGO.missoes.values()].filter((m) => m.tipo === "arco");
    expect(arcos.length).toBe(3 * CATALOGO.origensEspeciais.size);
    const meus = missoesVisiveis(personagem({ origem }), "arco", T0);
    expect(meus.map((x) => x.missao.id)).toEqual(["arco-orfao-do-templo-cinzento-1", "arco-orfao-do-templo-cinzento-2", "arco-orfao-do-templo-cinzento-3"]);
    expect(missoesVisiveis(personagem(), "arco", T0)).toEqual([]);
  });

  it("capítulo aceito, cumprido e entregue entra na Crônica", () => {
    let e = estadoCom(personagem({ origem }));
    const r = aceitarMissao(e, "arco-orfao-do-templo-cinzento-1", T0);
    expect(r.ok).toBe(true);
    e = r.ok ? r.estado : e;
    expect(cod(entregarMissao(e, "arco-orfao-do-templo-cinzento-1", T0))).toBe("missao_incompleta");
    const p = ativo(e);
    e = { ...e, conta: { ...e.conta, personagens: [{ ...p, nivel: 10, status: statusIniciais(p) }] } };
    const fim = entregarMissao(e, "arco-orfao-do-templo-cinzento-1", T0);
    expect(fim.ok && ativo(fim.estado).cronica.registros.at(-1)!.texto).toContain("Capítulo concluído");
    expect(cod(aceitarMissao(estadoCom(personagem()), "arco-orfao-do-templo-cinzento-1", T0))).toBe("missao_indisponivel");
  });
});

describe("save v12", () => {
  it("ida e volta com mundo, eventos e Crônica", () => {
    const e = avancar(estadoCom(colhendo({ espacosExtras: 30 })), T0 + 6 * HORA).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("rejeita mundo, eventos ou Crônica adulterados", () => {
    const base = JSON.parse(serializarSave(estadoCom(personagem({ eventos: { pendentes: [{ n: 1, eventoId: "emboscada" }], trabalhoMs: 0, sorteios: 1 } })))) as { conta: { personagens: Record<string, unknown>[] } };
    const com = (mudar: (p: Record<string, unknown>) => void) => {
      const d = structuredClone(base);
      mudar(d.conta.personagens[0]!);
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(com(() => {})).toBe("ok");
    expect(com((p) => (p.mundo = { noite: true, clima: "tempestade" }))).toBe("formato_invalido");
    expect(com((p) => ((p.eventos as { pendentes: unknown[] }).pendentes = [{ n: 5, eventoId: "emboscada" }]))).toBe("formato_invalido");
    expect(com((p) => ((p.eventos as { pendentes: unknown[] }).pendentes = [{ n: 1, eventoId: "dragao" }]))).toBe("formato_invalido");
    expect(com((p) => ((p.eventos as { trabalhoMs: number }).trabalhoMs = CONFIG_MUNDO.eventoACadaMs))).toBe("formato_invalido");
    expect(com((p) => (p.cronica = { marcos: ["rank-c", "nivel-10"], registros: [] }))).toBe("formato_invalido");
    expect(com((p) => (p.cronica = { marcos: [], registros: [{ instante: 1, texto: "" }] }))).toBe("formato_invalido");
  });

  it("migra v11 → v12", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem({ mortes: 1 })))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 11;
    for (const k of ["mundo", "eventos", "cronica"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(11);
    expect(r.ok && r.estado.conta.personagens[0]!.mundo).toEqual({ noite: ehNoite(T0), clima: climaEm(T0) });
    const e = r.ok ? avancar(r.estado, T0 + 1_000).estado : null;
    expect(e && ativo(e).cronica.marcos).toEqual(["primeira-morte"]);
  });
});
