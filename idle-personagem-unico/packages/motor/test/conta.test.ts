import { describe, expect, it } from "vitest";
import {
  COFRE_VAZIO,
  CORES_CABELO,
  CORES_ROUPA,
  MAX_PERGAMINHOS,
  aplicarAcao,
  atualizarCofre,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  carregarSave,
  criarEstadoInicial,
  iniciarAtividade,
  serializarSave,
  statusIniciais,
  trocarPersonagem,
  validarAcao,
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
const estadoCom = (p: Personagem, semente = "conta"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);


const aplicar = (e: EstadoJogo, acao: unknown, t = T0) => {
  const r = aplicarAcao(e, acao, t);
  if (!r.ok) throw new Error(r.erro.codigo + ": " + r.erro.mensagem);
  return r.estado;
};
const codA = (e: EstadoJogo, acao: unknown, t = T0) => {
  const r = aplicarAcao(e, acao, t);
  return r.ok ? "ok" : r.erro.codigo;
};
const comPergaminhos = (e: EstadoJogo, n: number): EstadoJogo => ({ ...e, conta: { ...e.conta, cofre: { ...e.conta.cofre, pergaminhos: n } } });
/** Cria um novo personagem pelo fluxo de sorteio, via ações. */
function criar(e: EstadoJogo, nome: string, t = T0): EstadoJogo {
  let x = aplicar(e, { tipo: "iniciarSorteio" }, t);
  x = aplicar(x, { tipo: "aceitarSorteio" }, t);
  return aplicar(x, { tipo: "definirNomeEAparencia", nome, corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id }, t);
}

describe("cofre da conta", () => {
  it("conquistas e descobertas vêm dos personagens, sem poder e sem repetir", () => {
    const p = personagem({ nivel: 26, bestiario: { "lobo-cinzento": 3 } });
    const c = atualizarCofre(COFRE_VAZIO, [p]);
    expect(c.conquistas).toEqual(["primeiros-passos", "veterano"]);
    expect(c.descobertas.racas).toEqual(["humano"]);
    expect(c.descobertas.monstros).toEqual(["lobo-cinzento"]);
    expect(atualizarCofre(c, [p])).toBe(c);
  });

  it("rank C e rank A dão um Pergaminho do Novo Destino, uma vez por personagem", () => {
    const c1 = atualizarCofre(COFRE_VAZIO, [personagem({ guilda: { rank: 3, merito: 0 } })]);
    expect(c1.pergaminhos).toBe(1);
    expect(atualizarCofre(c1, [personagem({ guilda: { rank: 3, merito: 0 } })]).pergaminhos).toBe(1);
    expect(atualizarCofre(c1, [personagem({ guilda: { rank: 5, merito: 0 } })]).pergaminhos).toBe(2);
    expect(atualizarCofre({ ...c1, pergaminhos: MAX_PERGAMINHOS }, [personagem({ guilda: { rank: 5, merito: 0 } })]).pergaminhos).toBe(MAX_PERGAMINHOS);
  });

  it("o avanço do tempo atualiza o cofre", () => {
    const e = estadoCom(personagem({ nivel: 5 }));
    expect(avancar(e, T0 + 1_000).estado.conta.cofre.conquistas).toContain("primeiros-passos");
  });
});

describe("vários personagens", () => {
  it("o 2º personagem exige e gasta um pergaminho; o 4º não existe", () => {
    const e = estadoCom(personagem());
    expect(codA(e, { tipo: "iniciarSorteio" })).toBe("requer_pergaminho");
    let x = criar(comPergaminhos(e, 3), "Segunda");
    expect(x.conta.personagens).toHaveLength(2);
    expect(x.conta.personagemAtivoId).toBe("personagem-2");
    expect(x.conta.cofre.pergaminhos).toBe(2);
    x = criar(x, "Terceira");
    expect(x.conta.personagens.map((p) => p.id)).toEqual(["personagem-1", "personagem-2", "personagem-3"]);
    expect(codA(x, { tipo: "iniciarSorteio" })).toBe("limite_personagens");
  });

  it("só o ativo avança; o outro fica parado até ser escolhido", () => {
    let e = criar(comPergaminhos(estadoCom(personagem()), 1), "Segunda");
    e = aplicar(e, { tipo: "trocarPersonagem", personagemId: "personagem-1" });
    e = aplicar(e, { tipo: "iniciarAtividade", atividadeId: "colher-trigo" });
    e = aplicar(e, { tipo: "trocarPersonagem", personagemId: "personagem-2" }, T0 + HORA);
    const p1 = e.conta.personagens[0]!;
    const trigo = p1.mochila["trigo"] ?? 0;
    expect(trigo).toBeGreaterThan(0);
    e = avancar(e, T0 + 5 * HORA).estado;
    expect(e.conta.personagens[0]!.mochila["trigo"]).toBe(trigo);
    expect(cod(trocarPersonagem(e, "personagem-2", T0 + 5 * HORA))).toBe("ja_ativo");
    expect(cod(trocarPersonagem(e, "fantasma", T0 + 5 * HORA))).toBe("personagem_inexistente");
  });
});

describe("ações serializadas", () => {
  it("recusa formas inválidas", () => {
    for (const a of [null, 1, "x", [], {}, { tipo: "naoExiste" }, { tipo: "iniciarAtividade" }, { tipo: "vender", itemId: "trigo", quantidade: 1.5 }, { tipo: "desequipar", slot: "cabeca" }, { tipo: "moverPrioridade", habilidadeId: "x", direcao: 2 }, { tipo: "irPara", localId: "x".repeat(200) }])
      expect(validarAcao(a), JSON.stringify(a)).toBeNull();
    expect(codA(estadoCom(personagem()), { tipo: "nada" })).toBe("acao_invalida");
  });

  it("aplicar a ação dá o mesmo que chamar a função do motor", () => {
    const e = estadoCom(personagem());
    const direto = iniciarAtividade(e, "colher-trigo", T0 + 1_000);
    const r = aplicarAcao(e, { tipo: "iniciarAtividade", atividadeId: "colher-trigo", extra: "ignorado" }, T0 + 1_000);
    expect(r.ok && direto.ok && r.estado).toEqual(direto.ok && direto.estado);
  });

  it("a fusão informa se deu certo", () => {
    const e = estadoCom(personagem({ ouro: 10_000, mochila: { "espada-de-ferro": 3, "minerio-de-ferro": 10 } }));
    const r = aplicarAcao(e, { tipo: "fundir", itemId: "espada-de-ferro" }, T0);
    expect(r.ok && typeof r.detalhe?.sucesso).toBe("boolean");
  });
});

describe("save v10", () => {
  it("ida e volta com cofre e 2 personagens", () => {
    const e = avancar(criar(comPergaminhos(estadoCom(personagem()), 1), "Segunda"), T0 + HORA).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("rejeita cofre adulterado", () => {
    const base = JSON.parse(serializarSave(estadoCom(personagem()))) as { conta: { cofre: Record<string, unknown> } };
    const com = (mudar: (c: Record<string, unknown>) => void) => {
      const d = structuredClone(base);
      mudar(d.conta.cofre);
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(com(() => {})).toBe("ok");
    expect(com((c) => (c.pergaminhos = -1))).toBe("formato_invalido");
    expect(com((c) => (c.pergaminhos = MAX_PERGAMINHOS + 1))).toBe("formato_invalido");
    expect(com((c) => (c.conquistas = ["inventada"]))).toBe("formato_invalido");
    expect(com((c) => (c.conquistas = ["veterano", "veterano"]))).toBe("formato_invalido");
    expect(com((c) => ((c.descobertas as Record<string, unknown>).racas = ["raca-falsa"]))).toBe("formato_invalido");
    expect(com((c) => delete c.marcos)).toBe("formato_invalido");
  });

  it("migra v9 → v10 (cofre vazio, preenchido no próximo avanço)", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem({ guilda: { rank: 4, merito: 0 } })))) as { versao: number; conta: Record<string, unknown> };
    d.versao = 9;
    delete d.conta.cofre;
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(9);
    const e = r.ok ? avancar(r.estado, T0 + 1_000).estado : null;
    expect(e?.conta.cofre.pergaminhos).toBe(1);
    expect(e?.conta.cofre.conquistas).toContain("rank-c");
  });
});
