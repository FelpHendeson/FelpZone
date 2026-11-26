import { describe, expect, it } from "vitest";
import { ATIVIDADES_TREINO, ATIVIDADES_COLETA, AREAS_COMBATE, CATALOGO, CORES_CABELO, CORES_ROUPA, PASSOS_TUTORIAL, aplicarAcao, carregarSave, criarEstadoInicial, personagemAtivo, serializarSave, validarAcao, type Acao, type EstadoJogo } from "../src/index";

const T0 = 1_800_000_000_000;
function agir(e: EstadoJogo, a: Acao) {
  const r = aplicarAcao(e, a, e.ultimoTick);
  if (!r.ok) throw new Error(`${a.tipo}: ${r.erro.codigo}`);
  return r.estado;
}
function novo() {
  let e = criarEstadoInicial("tutorial", T0);
  for (const a of [{ tipo: "iniciarSorteio" }, { tipo: "aceitarSorteio" }, { tipo: "definirNomeEAparencia", nome: "Aprendiz", corCabelo: CORES_CABELO[0]!.id, corRoupa: CORES_ROUPA[0]!.id }] as const) e = agir(e, a);
  return e;
}
describe("tutorial por personagem", () => {
  it("começa ativo com sorteio reconhecido e sobrevive ao save", () => {
    const e = novo();
    expect(personagemAtivo(e)!.tutorial).toEqual({ modo: "ativo", concluidos: ["sorteio"] });
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });
  it("pular e retomar só mudam o modo, sem tempo, RNG, economia ou tentativas extras", () => {
    const e = novo();
    const pulado = agir(e, { tipo: "pularTutorial" });
    expect(personagemAtivo(pulado)!.tutorial.modo).toBe("pulado");
    expect(agir(pulado, { tipo: "retomarTutorial" })).toEqual(e);
    expect(agir(pulado, { tipo: "pularTutorial" })).toEqual(pulado);
  });
  it("ações inválidas não contam e não é possível marcar passo pelo payload", () => {
    const e = novo(); const antes = serializarSave(e);
    expect(aplicarAcao(e, { tipo: "iniciarAtividade", atividadeId: "inexistente" }, T0).ok).toBe(false);
    expect(validarAcao({ tipo: "concluirTutorial", passo: "combate" })).toBeNull();
    expect(serializarSave(e)).toBe(antes);
    expect(aplicarAcao(criarEstadoInicial("vazio", T0), { tipo: "pularTutorial" }, T0).ok).toBe(false);
  });
  it("registra treino/coleta/combate em qualquer ordem e sem duplicar, mesmo pausado", () => {
    let e = agir(novo(), { tipo: "pularTutorial" });
    for (const a of [AREAS_COMBATE[0]!, ATIVIDADES_TREINO[0]!, ATIVIDADES_COLETA[0]!, ATIVIDADES_TREINO[0]!]) e = agir(e, { tipo: "iniciarAtividade", atividadeId: a.id });
    expect(personagemAtivo(e)!.tutorial).toEqual({ modo: "pulado", concluidos: ["sorteio", "treino", "coleta", "combate"] });
  });
  it("só uma venda real que rende gold conta; equipar e aceitar missão da Guilda contam", () => {
    let e = novo();
    expect(aplicarAcao(e, { tipo: "venderTudo" }, T0).ok).toBe(false);
    expect(personagemAtivo(e)!.tutorial.concluidos).not.toContain("venda");
    const arma = [...CATALOGO.itens.values()].find((i) => i.equipamento?.precoCompra)!;
    const item = ATIVIDADES_COLETA[0]!.itemId;
    const p = personagemAtivo(e)!;
    e = { ...e, conta: { ...e.conta, personagens: [{ ...p, localId: "pedravau", mochila: { [item]: 3, [arma.id]: 1 } }] } };
    e = agir(e, { tipo: "vender", itemId: item, quantidade: 1 });
    e = agir(e, { tipo: "equipar", itemId: arma.id });
    const m = [...CATALOGO.missoes.values()].find((m) => m.tipo === "guilda" && m.rank === 0)!;
    e = agir(e, { tipo: "aceitarMissao", missaoId: m.id });
    expect(personagemAtivo(e)!.tutorial.concluidos).toEqual(["sorteio", "venda", "equipamento", "guilda"]);
    for (const a of [ATIVIDADES_TREINO[0]!, ATIVIDADES_COLETA[0]!, AREAS_COMBATE[0]!]) e = agir(e, { tipo: "iniciarAtividade", atividadeId: a.id });
    expect(personagemAtivo(e)!.tutorial.concluidos).toEqual(PASSOS_TUTORIAL);
  });
  it("mantém tutoriais independentes ao trocar de personagem", () => {
    const e = novo(); const p = personagemAtivo(e)!;
    const dois = { ...e, conta: { ...e.conta, personagens: [p, { ...p, id: "personagem-2", nome: "Outro" }] } };
    const pulado = agir(dois, { tipo: "pularTutorial" });
    const trocado = agir(pulado, { tipo: "trocarPersonagem", personagemId: "personagem-2" });
    expect(personagemAtivo(trocado)!.tutorial.modo).toBe("ativo");
    expect(trocado.conta.personagens[0]!.tutorial.modo).toBe("pulado");
  });
  it("migra v13 sem mudar o personagem, o RNG ou o sorteio pendente", () => {
    const e = novo(); const cru = JSON.parse(serializarSave(e));
    cru.versao = 13;
    delete cru.conta.personagens[0].tutorial;
    const r = carregarSave(JSON.stringify(cru));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migradoDe).toBe(13);
    expect(r.estado).toEqual({ ...e, conta: { ...e.conta, personagens: [{ ...personagemAtivo(e)!, tutorial: { modo: "pulado", concluidos: ["sorteio"] } }] } });
    const pendente = agir(criarEstadoInicial("pendente", T0), { tipo: "iniciarSorteio" });
    const rp = carregarSave(JSON.stringify({ ...pendente, versao: 13 }));
    expect(rp.ok && rp.estado.conta.sorteio).toEqual(pendente.conta.sorteio);
  });
  it("rejeita tutorial corrompido na v14", () => {
    for (const tutorial of [{ modo: "ativo", concluidos: ["sorteio", "inventado"] }, { modo: "ativo", concluidos: ["sorteio", "sorteio"] }, { modo: "invalido", concluidos: PASSOS_TUTORIAL }, { modo: "ativo", concluidos: [] }]) {
      const e = novo();
      const cru = JSON.parse(serializarSave(e)); cru.conta.personagens[0].tutorial = tutorial;
      expect(carregarSave(JSON.stringify(cru)).ok).toBe(false);
    }
  });
});
