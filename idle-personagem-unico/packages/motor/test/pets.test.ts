import { describe, expect, it } from "vitest";
import {
  AREAS_COMBATE,
  CATALOGO,
  COFRE_VAZIO,
  COMIDA_PET,
  CONFIG_PETS,
  CUIDADOS,
  ESPECIES_PET,
  LACO_DE_DOMA,
  aplicarAcao,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  camposIniciaisF11,
  camposIniciaisF12,
  carregarSave,
  criarEstadoInicial,
  modificadoresDoPersonagem,
  novoPet,
  serializarSave,
  statusIniciais,
  type EstadoJogo,
  type Personagem,
  type Pet,
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
    ...camposIniciaisF12(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "pets"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
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
const javali = (extra: Partial<Pet> = {}): Pet => ({ ...novoPet("pet-1", "javali", "Toco"), ...extra });
const colhendo = (extra: Partial<Personagem> = {}) =>
  personagem({ localId: "pedravau", subareaId: "hortas", atividade: { id: "colher-trigo", progressoMs: 0 }, petsCriados: 1, ...extra });
const pet0 = (e: EstadoJogo) => ativo(e).pets[0]!;

describe("catálogo dos pets", () => {
  it("espécies, comidas, cuidados e Estábulo válidos", () => {
    for (const e of ESPECIES_PET) {
      if (e.domadoDe) expect(CATALOGO.monstros.has(e.domadoDe), e.id).toBe(true);
      if (e.tipo === "espiritual") expect(CATALOGO.bestas.has(e.id), e.id).toBe(true);
      expect(e.bonus.length).toBeGreaterThan(0);
    }
    for (const b of CATALOGO.bestas.keys()) expect(ESPECIES_PET.some((e) => e.id === b)).toBe(true);
    for (const id of Object.keys(COMIDA_PET)) expect(CATALOGO.itens.has(id), id).toBe(true);
    expect(CATALOGO.itens.has(LACO_DE_DOMA)).toBe(true);
    for (const c of CUIDADOS) expect(CATALOGO.locais.get(c.localId)?.subareas.some((s) => s.id === c.subareaId)).toBe(true);
  });

  it("quem nasce com besta vinculada já a tem em todos os slots de trabalho", () => {
    const f = camposIniciaisF10("filhote-do-altar");
    expect(f.pets).toHaveLength(1);
    expect(f.petsPorSlot).toEqual({ treino: "pet-1", coleta: "pet-1", producao: "pet-1", combate: "pet-1" });
    expect(camposIniciaisF10()).toEqual({ pets: [], petsPorSlot: {}, petsCriados: 0, uniaoRestanteMs: 0 });
  });
});

describe("pet trabalhando", () => {
  it("só ajuda (e só cansa) na atividade onde está", () => {
    const naColeta = colhendo({ pets: [javali()], petsPorSlot: { coleta: "pet-1" } });
    const noCombate = colhendo({ pets: [javali()], petsPorSlot: { combate: "pet-1" } });
    expect(modificadoresDoPersonagem(naColeta, 1).some((m) => m.origem.id === "pet-javali")).toBe(true);
    expect(modificadoresDoPersonagem(noCombate, 1).some((m) => m.origem.id === "pet-javali")).toBe(false);
    const a = avancar(estadoCom(naColeta), T0 + HORA).estado;
    const b = avancar(estadoCom(noCombate), T0 + HORA).estado;
    expect(pet0(a).energiaMs).toBe(CONFIG_PETS.energiaMaximaMs - HORA);
    expect(pet0(a).saciedadeMs).toBe(CONFIG_PETS.saciedadeMaximaMs - HORA);
    expect(pet0(b).energiaMs).toBe(CONFIG_PETS.energiaMaximaMs);
  });

  it("sem energia ou com fome, o bônus some", () => {
    expect(modificadoresDoPersonagem(colhendo({ pets: [javali({ energiaMs: 0 })], petsPorSlot: { coleta: "pet-1" } }), 1).some((m) => m.origem.id === "pet-javali")).toBe(false);
    expect(modificadoresDoPersonagem(colhendo({ pets: [javali({ saciedadeMs: 0 })], petsPorSlot: { coleta: "pet-1" } }), 1).some((m) => m.origem.id === "pet-javali")).toBe(false);
  });

  it("o bônus cresce com o nível do pet", () => {
    const valor = (nivel: number) => modificadoresDoPersonagem(colhendo({ pets: [javali({ nivel })], petsPorSlot: { coleta: "pet-1" } }), 1).find((m) => m.origem.id === "pet-javali")!.valor;
    expect(valor(11)).toBeCloseTo(valor(1) * 2, 9);
  });

  it("dividir o tempo dá o mesmo resultado, com a energia acabando no meio", () => {
    for (let s = 0; s < 4; s++) {
      const e = estadoCom(colhendo({ pets: [javali({ energiaMs: 37 * 60_000 + s * 1_111 })], petsPorSlot: { coleta: "pet-1" } }), `part-${s}`);
      const direto = avancar(e, T0 + 2 * HORA).estado;
      let partes = e;
      for (let t = T0 + 4_999 + s * 997; t < T0 + 2 * HORA; t += 6_101 + s * 1_003) partes = avancar(partes, t).estado;
      partes = avancar(partes, T0 + 2 * HORA).estado;
      expect(partes, `semente ${s}`).toEqual(direto);
      expect(pet0(direto).energiaMs).toBe(0);
    }
  });
});

describe("cuidados e doma", () => {
  const noEstabulo = (cuidado: string, extra: Partial<Personagem>) => personagem({ localId: "pedravau", subareaId: "estabulo", atividade: { id: cuidado, progressoMs: 0 }, petsCriados: 1, ...extra });

  it("alimentar gasta comida, enche a saciedade e para quando acaba", () => {
    const p = noEstabulo("alimentar-pet", { pets: [javali({ saciedadeMs: 0 })], petsPorSlot: { cuidado: "pet-1" }, mochila: { "racao-de-viagem": 2 } });
    const e = avancar(estadoCom(p), T0 + 10 * MIN).estado;
    expect(ativo(e).mochila["racao-de-viagem"]).toBeUndefined();
    expect(pet0(e).saciedadeMs).toBe(2 * COMIDA_PET["racao-de-viagem"]!);
    expect(ativo(e).atividade).toBeNull();
  });

  it("descansar recupera energia; treinar sobe de nível e gasta energia", () => {
    const d = avancar(estadoCom(noEstabulo("descansar-pet", { pets: [javali({ energiaMs: 0 })], petsPorSlot: { cuidado: "pet-1" } })), T0 + 20 * MIN).estado;
    expect(pet0(d).energiaMs).toBe(2 * HORA);
    const t = avancar(estadoCom(noEstabulo("treinar-pet", { pets: [javali()], petsPorSlot: { cuidado: "pet-1" } })), T0 + HORA).estado;
    expect(pet0(t).nivel).toBeGreaterThan(1);
    expect(pet0(t).energiaMs).toBeLessThan(CONFIG_PETS.energiaMaximaMs);
  });

  it("sem pet no slot de cuidados, a atividade para", () => {
    const e = avancar(estadoCom(noEstabulo("descansar-pet", { pets: [javali({ energiaMs: 0 })], petsPorSlot: {} })), T0 + 20 * MIN).estado;
    expect(ativo(e).atividade).toBeNull();
  });

  it("caçando lobos com Laço de doma, um lobo vira pet; sem laço, não", () => {
    const area = AREAS_COMBATE.find((a) => a.id === "trilha-dos-lobos")!;
    const ferro = { arma: "espada-de-ferro", elmo: "elmo-de-ferro", peitoral: "cota-de-malha", calcas: "grevas-de-ferro", botas: "botas-ferradas", acessorio1: null, acessorio2: null, reliquia: null };
    const p = (mochila: Record<string, number>) =>
      personagem({
        nivel: 1,
        equipados: ferro,
        mochila,
        localId: area.localId,
        subareaId: area.subareaId,
        atividade: { id: area.id, progressoMs: 0, combate: { fase: "procurando", restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] } },
      });
    const com = avancar(estadoCom(p({ [LACO_DE_DOMA]: 20 })), T0 + 8 * HORA);
    const sem = avancar(estadoCom(p({})), T0 + 8 * HORA);
    expect(ativo(com.estado).pets.some((x) => x.especieId === "lobo" || x.especieId === "javali")).toBe(true);
    expect(com.resumo.domados.length).toBe(ativo(com.estado).pets.length);
    expect(ativo(com.estado).mochila[LACO_DE_DOMA] ?? 0).toBe(20 - ativo(com.estado).pets.length);
    expect(ativo(sem.estado).pets).toEqual([]);
  });
});

describe("ações de pet", () => {
  const rico = () => estadoCom(personagem({ ouro: 100_000 }));

  it("compra, nomeia, atribui e solta; Estábulo tem limite", () => {
    let e = aplicar(rico(), { tipo: "comprarPet", especieId: "mula" });
    expect(pet0(e)).toMatchObject({ id: "pet-1", especieId: "mula", nome: "Mula" });
    e = aplicar(e, { tipo: "nomearPet", petId: "pet-1", nome: "  Teimosa  " });
    expect(pet0(e).nome).toBe("Teimosa");
    expect(codA(e, { tipo: "nomearPet", petId: "pet-1", nome: "   " })).toBe("nome_invalido");
    e = aplicar(e, { tipo: "atribuirPet", slot: "coleta", petId: "pet-1" });
    e = aplicar(e, { tipo: "atribuirPet", slot: "combate", petId: "pet-1" });
    expect(ativo(e).petsPorSlot).toEqual({ coleta: "pet-1", combate: "pet-1" });
    for (let i = 0; i < CONFIG_PETS.maximo - 1; i++) e = aplicar(e, { tipo: "comprarPet", especieId: "gato-de-celeiro" });
    expect(codA(e, { tipo: "comprarPet", especieId: "gato-de-celeiro" })).toBe("estabulo_cheio");
    expect(codA(e, { tipo: "comprarPet", especieId: "lobo" })).toBe("pet_inexistente");
    e = aplicar(e, { tipo: "soltarPet", petId: "pet-1" });
    expect(ativo(e).petsPorSlot).toEqual({});
    expect(codA(e, { tipo: "atribuirPet", slot: "cabeca", petId: "pet-2" })).toBe("acao_invalida");
    e = aplicar(e, { tipo: "comprarLaco" });
    expect(ativo(e).mochila[LACO_DE_DOMA]).toBe(1);
  });

  it("União: só com a besta e a Sincronia cheia; dobra o bônus e acaba sozinha", () => {
    const besta = { ...camposIniciaisF10("besta-do-estudo") };
    const base = colhendo({ bestaVinculadaId: "besta-do-estudo", ...besta });
    expect(codA(estadoCom(base), { tipo: "ativarUniao" })).toBe("sincronia_incompleta");
    expect(codA(estadoCom(colhendo()), { tipo: "ativarUniao" })).toBe("pet_inexistente");
    const cheia = { ...base, pets: [{ ...base.pets[0]!, sincroniaMs: CONFIG_PETS.sincroniaMaximaMs }] };
    const antes = modificadoresDoPersonagem(cheia, 1).find((m) => m.origem.id === "pet-besta-do-estudo")!.valor;
    let e = aplicar(estadoCom(cheia), { tipo: "ativarUniao" });
    expect(ativo(e).uniaoRestanteMs).toBe(CONFIG_PETS.uniaoMs);
    expect(modificadoresDoPersonagem(ativo(e), 1).find((m) => m.origem.id === "pet-besta-do-estudo")!.valor).toBeCloseTo(2 * antes, 9);
    expect(codA(e, { tipo: "ativarUniao" })).toBe("uniao_ativa");
    e = avancar(e, T0 + HORA).estado;
    expect(ativo(e).uniaoRestanteMs).toBe(0);
    expect(codA(e, { tipo: "soltarPet", petId: "pet-1" })).toBe("pet_espiritual");
  });
});

describe("save v11", () => {
  it("ida e volta com pets e União", () => {
    const p = colhendo({ bestaVinculadaId: "espirito-do-rio", ...camposIniciaisF10("espirito-do-rio"), uniaoRestanteMs: 60_000 });
    const e = avancar(estadoCom({ ...p, pets: [...p.pets, javali({ id: "pet-2" })], petsCriados: 2 }), T0 + 30 * MIN).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("rejeita pets adulterados", () => {
    const base = JSON.parse(serializarSave(estadoCom(personagem({ pets: [javali()], petsCriados: 1, petsPorSlot: { coleta: "pet-1" } })))) as { conta: { personagens: Record<string, unknown>[] } };
    const com = (mudar: (p: Record<string, unknown>) => void) => {
      const d = structuredClone(base);
      mudar(d.conta.personagens[0]!);
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    const pet = (p: Record<string, unknown>) => (p.pets as Record<string, unknown>[])[0]!;
    expect(com(() => {})).toBe("ok");
    expect(com((p) => (pet(p).especieId = "dragao"))).toBe("formato_invalido");
    expect(com((p) => (pet(p).especieId = "filhote-do-altar"))).toBe("formato_invalido");
    expect(com((p) => (pet(p).energiaMs = CONFIG_PETS.energiaMaximaMs + 1))).toBe("formato_invalido");
    expect(com((p) => (pet(p).nivel = 99))).toBe("formato_invalido");
    expect(com((p) => (pet(p).id = "pet-9"))).toBe("formato_invalido");
    expect(com((p) => (p.petsPorSlot = { coleta: "pet-7" }))).toBe("formato_invalido");
    expect(com((p) => (p.petsPorSlot = { cabeca: "pet-1" }))).toBe("formato_invalido");
    expect(com((p) => (p.uniaoRestanteMs = -1))).toBe("formato_invalido");
  });

  it("migra v10 → v11 (a besta vinculada vira pet)", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem({ bestaVinculadaId: "filhote-do-altar" })))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 10;
    for (const k of ["pets", "petsPorSlot", "petsCriados", "uniaoRestanteMs"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(10);
    expect(r.ok && r.estado.conta.personagens[0]!.pets.map((x) => x.especieId)).toEqual(["filhote-do-altar"]);
  });
});
