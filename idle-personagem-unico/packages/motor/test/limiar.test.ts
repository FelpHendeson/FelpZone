import { describe, expect, it } from "vitest";
import {
  COFRE_VAZIO,
  CATALOGO,
  CONFIG_LIMIAR,
  MONSTROS_LIMIAR,
  PECAS_POR_CHEFE,
  PECAS_RETORNADO,
  Rng,
  avancar,
  camposIniciaisF3,
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  cargasEco,
  carregarSave,
  criarEstadoInicial,
  custoDoPedagio,
  duracaoDoLimiar,
  entrarNoLimiar,
  equipar,
  iniciarAtividade,
  modificadoresDoPersonagem,
  monstroDoLimiar,
  pagarPedagio,
  serializarSave,
  statusIniciais,
  titulosPorMortes,
  vender,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HORA = 60 * MIN;

function personagem(extra: Partial<Personagem> = {}, coreId = "andarilho"): Personagem {
  const racaId = extra.racaId ?? "humano";
  const origem = extra.origem ?? { tipo: "comum" as const, id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." };
  const base = { racaId, dons: [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id], origem };
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
    ...camposIniciaisF5(coreId),
    ativasEquipadas: [],
    passivasEquipadas: [],
    ...camposIniciaisF6(),
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...extra,
  };
}
const estadoCom = (p: Personagem, semente = "limiar"): EstadoJogo => ({ ...criarEstadoInicial(semente, T0), conta: { personagens: [p], personagemAtivoId: p.id, sorteio: null, cofre: COFRE_VAZIO } });
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo);
  return r.estado;
}
const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
const ativo = (e: EstadoJogo) => e.conta.personagens[0]!;
const combateVazio = { fase: "procurando" as const, restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] };
/** Caçando no Poço sem Fundo, nível 1, sem recuo: vai morrer. */
function condenado(extra: Partial<Personagem> = {}, semente = "limiar"): EstadoJogo {
  return estadoCom(personagem({ localId: "mina-velha", subareaId: "poco-sem-fundo", recuoPercentual: 0, atividade: { id: "poco-sem-fundo", progressoMs: 0, combate: combateVazio }, ...extra }), semente);
}
/** Já no Limiar (morreu em T0 na área de nível 25). */
function noLimiar(extra: Partial<Personagem> = {}): EstadoJogo {
  const p = personagem({ atividade: { id: "cortar-pinho", progressoMs: 0 }, localId: "bosque-raso", subareaId: "orla", ...extra });
  return estadoCom(entrarNoLimiar(p, 25, T0));
}

describe("catálogo do Limiar", () => {
  it("monstros do Limiar no catálogo; acompanham o nível", () => {
    expect(MONSTROS_LIMIAR.map((m) => m.id)).toEqual(["alma-penada", "ceifeiro-menor", "eco-faminto", "o-cobrador", "a-rainha-palida"]);
    for (const m of MONSTROS_LIMIAR) expect(CATALOGO.monstros.has(m.id)).toBe(true);
    expect(monstroDoLimiar("alma-penada", 20).vida).toBeGreaterThan(monstroDoLimiar("alma-penada", 1).vida);
    expect(monstroDoLimiar("o-cobrador", 10).tipo).toBe("chefe");
  });

  it("O Retornado: 4 peças nomeadas, slots diferentes, cada uma de um chefe", () => {
    expect(PECAS_RETORNADO).toHaveLength(4);
    expect(new Set(PECAS_RETORNADO.map((p) => p.equipamento!.slot)).size).toBe(4);
    for (const p of PECAS_RETORNADO) expect(p.equipamento!.nomeado?.conjunto).toBe("o-retornado");
    expect(Object.values(PECAS_POR_CHEFE).flat().sort()).toEqual(PECAS_RETORNADO.map((p) => p.id).sort());
  });

  it("títulos por mortes", () => {
    expect(titulosPorMortes(5).filter((t) => t.conquistado).map((t) => t.nome)).toEqual(["Visitante Frequente"]);
    expect(titulosPorMortes(100).every((t) => t.conquistado)).toBe(true);
  });
});

describe("duração e Eco da Morte", () => {
  it("base + perigo da área; Eco alonga; reduções de origem, raça, core e set", () => {
    const p = personagem();
    expect(duracaoDoLimiar(p, 10, 0)).toBe(10 * MIN + 10 * 20_000);
    expect(duracaoDoLimiar(p, 10, 2)).toBe(Math.round((10 * MIN + 200_000) * 1.5));
    const sobrevivente = personagem({ origem: { tipo: "especial", id: "sobrevivente-do-vazio", loreGerada: "x" } });
    expect(duracaoDoLimiar(sobrevivente, 0, 0)).toBe(Math.round(10 * MIN * 0.75));
    const aldeia = personagem({ origem: { tipo: "comum", id: "aldeia-a-beira-do-limiar", motivacaoId: "fe", anosDeEstrada: 2, loreGerada: "x" } });
    expect(duracaoDoLimiar(aldeia, 0, 0)).toBe(Math.round(10 * MIN * 0.95));
    expect(duracaoDoLimiar(personagem({ racaId: "sangue-palido" }), 0, 0)).toBe(Math.round(10 * MIN * 0.8));
    expect(duracaoDoLimiar(personagem({}, "ser-das-trevas"), 0, 0)).toBe(Math.round(10 * MIN * 0.8));
    const set = personagem({ equipados: { arma: null, elmo: "capuz-do-retornado", peitoral: "mortalha-do-retornado", calcas: "ceroulas-do-retornado", botas: "passos-do-retornado", acessorio1: null, acessorio2: null, reliquia: null } });
    expect(duracaoDoLimiar(set, 0, 0)).toBe(Math.round(10 * MIN * 0.8));
  });

  it("cargas contam outras mortes na janela de 2 h (1 h para o Devedor), até 5", () => {
    const p = personagem({ mortesRecentes: [T0 - 3 * HORA, T0 - 90 * MIN, T0 - 10 * MIN], mortes: 3 });
    expect(cargasEco(p, T0)).toBe(2);
    const devedor = { ...p, origem: { tipo: "especial" as const, id: "devedor-do-barqueiro", loreGerada: "x" } };
    expect(cargasEco(devedor, T0)).toBe(1);
    const muitas = personagem({ mortesRecentes: Array.from({ length: 8 }, (_, i) => T0 - i * MIN), mortes: 8 });
    expect(cargasEco(muitas, T0)).toBe(5);
  });
});

describe("morrer, ficar e sair", () => {
  it("entrar guarda a atividade, conta a morte e enche a vida", () => {
    const p = ativo(noLimiar());
    expect(p).toMatchObject({ atividade: null, viagem: null, vida: 1, mortes: 1, mortesRecentes: [T0] });
    expect(p.limiar).toMatchObject({ retorno: { id: "cortar-pinho" }, cargasEco: 0, nivelEntrada: 1, totalMs: 10 * MIN + 25 * 20_000 });
  });

  it("no Limiar só se combate: abates do Limiar, Essência, sem segunda morte", () => {
    const { estado, resumo } = avancar(noLimiar(), T0 + 5 * MIN);
    const p = ativo(estado);
    expect(p.limiar!.restanteMs).toBe(10 * MIN + 25 * 20_000 - 5 * MIN);
    const ids = Object.keys(resumo.abates);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(MONSTROS_LIMIAR.some((m) => m.id === id)).toBe(true);
    expect(resumo.essencia).toBeGreaterThan(0);
    expect(p.essencia).toBe(resumo.essencia);
    expect(resumo.mortes).toBe(0);
  });

  it("ações de fora ficam bloqueadas; equipar continua valendo", () => {
    const e = noLimiar({ mochila: { "espada-curta": 1 } });
    expect(cod(iniciarAtividade(e, "meditacao", T0))).toBe("no_limiar");
    expect(cod(vender(e, "espada-curta", 1, T0))).toBe("no_limiar");
    expect(ativo(ok(equipar(e, "espada-curta", T0))).equipados.arma).toBe("espada-curta");
  });

  it("acabou o tempo: acorda em Pedravau e a atividade anterior volta sozinha (com viagem)", () => {
    const total = ativo(noLimiar()).limiar!.totalMs;
    const { estado, resumo } = avancar(noLimiar(), T0 + total + 2_000);
    const p = ativo(estado);
    expect(resumo.saidasDoLimiar).toBe(1);
    expect(p.limiar).toBeNull();
    expect(p.atividade).toEqual({ id: "cortar-pinho", progressoMs: 0 });
    expect(p.viagem).toMatchObject({ origemLocalId: "pedravau", destinoLocalId: "bosque-raso", restanteMs: 4_000 - 2_000 });
  });

  it("offline: morrer, passar pelo Limiar e voltar a caçar no mesmo avanço", () => {
    const { estado, resumo } = avancar(condenado(), T0 + 2 * HORA);
    expect(resumo.mortes).toBeGreaterThanOrEqual(1);
    expect(resumo.saidasDoLimiar).toBeGreaterThanOrEqual(1);
    const p = ativo(estado);
    expect(p.mortes).toBe(resumo.mortes);
    // Ou está caçando de novo (ou a caminho), ou morreu outra vez e está no Limiar.
    expect(p.atividade?.id === "poco-sem-fundo" || p.limiar !== null).toBe(true);
  });

  it("Eco: morrer de novo logo depois alonga a estadia", () => {
    const p = personagem({ mortesRecentes: [T0 - 5 * MIN], mortes: 1 });
    const l = entrarNoLimiar(p, 0, T0).limiar!;
    expect(l.cargasEco).toBe(1);
    expect(l.totalMs).toBe(Math.round(10 * MIN * 1.25));
  });
});

describe("Barqueiro", () => {
  it("pedágio: Essência por minuto restante; sem Essência, não sai", () => {
    const e = noLimiar();
    const custo = custoDoPedagio(ativo(e));
    expect(custo).toBe(Math.ceil((10 * MIN + 25 * 20_000) / MIN) * CONFIG_LIMIAR.essenciaPorMinuto);
    expect(cod(pagarPedagio(e, T0))).toBe("essencia_insuficiente");
    const rico = noLimiar({ essencia: 1_000 });
    const saiu = ativo(ok(pagarPedagio(rico, T0)));
    expect(saiu.limiar).toBeNull();
    expect(saiu.essencia).toBe(1_000 - custo);
    expect(cod(pagarPedagio(estadoCom(personagem()), T0))).toBe("fora_do_limiar");
  });

  it("Devedor do Barqueiro sai de graça só na primeira vez", () => {
    const devedor = { origem: { tipo: "especial" as const, id: "devedor-do-barqueiro", loreGerada: "x" } };
    const e = noLimiar(devedor);
    expect(custoDoPedagio(ativo(e))).toBe(0);
    const saiu = ativo(ok(pagarPedagio(e, T0)));
    expect(saiu.pedagioGratisUsado).toBe(true);
    expect(custoDoPedagio(entrarNoLimiar(saiu, 0, T0 + HORA))).toBeGreaterThan(0);
  });
});

describe("O Retornado", () => {
  it("chefes do Limiar largam peças que faltam; nunca uma segunda cópia", () => {
    // Um veterano bem equipado no Limiar por muito tempo, com Eco alto (mais chefes).
    const ferro = { arma: "espada-de-ferro", elmo: "elmo-de-ferro", peitoral: "cota-de-malha", calcas: "grevas-de-ferro", botas: "botas-ferradas", acessorio1: null, acessorio2: null, reliquia: null };
    let e = estadoCom(entrarNoLimiar(personagem({ equipados: ferro, mortesRecentes: [T0 - 1, T0 - 2, T0 - 3, T0 - 4, T0 - 5], mortes: 5 }), 50, T0));
    let pecas = 0;
    for (let h = 1; h <= 12 && pecas < 2; h++) {
      e = avancar(e, T0 + h * HORA).estado;
      pecas = PECAS_RETORNADO.filter((p) => (ativo(e).mochila[p.id] ?? 0) > 0).length;
      if (!ativo(e).limiar) e = estadoCom(entrarNoLimiar({ ...ativo(e), atividade: null }, 50, T0 + h * HORA));
    }
    expect(pecas).toBeGreaterThan(0);
    for (const p of PECAS_RETORNADO) expect(ativo(e).mochila[p.id] ?? 0).toBeLessThanOrEqual(1);
  });

  it("bônus do set cresce com as mortes (com teto)", () => {
    const dois = { arma: null, elmo: "capuz-do-retornado", peitoral: "mortalha-do-retornado", calcas: null, botas: null, acessorio1: null, acessorio2: null, reliquia: null };
    const bonus = (mortes: number) =>
      modificadoresDoPersonagem(personagem({ equipados: dois, mortes }), 1).find((m) => m.origem.id === "o-retornado" && m.alvo === "ataque")?.valor;
    expect(bonus(10)).toBeCloseTo(0.1, 9);
    expect(bonus(100)).toBeCloseTo(0.25, 9);
    expect(modificadoresDoPersonagem(personagem({ equipados: { ...dois, peitoral: null }, mortes: 10 }), 1).some((m) => m.origem.id === "o-retornado")).toBe(false);
  });
});

describe("consistência e save v7", () => {
  it("dividir o tempo dá o mesmo resultado com mortes, Limiar e retorno", () => {
    for (let s = 0; s < 10; s++) {
      const rng = Rng.daSemente(`f6-${s}`);
      const inicio = condenado({}, `sem-${s}`);
      const total = rng.inteiro(10 * MIN, 3 * HORA);
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

  it("ida e volta no meio do Limiar", () => {
    const e = avancar(noLimiar(), T0 + 3 * MIN + 250).estado;
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v6 → v7", () => {
    const d = JSON.parse(serializarSave(estadoCom(personagem()))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    d.versao = 6;
    for (const k of ["limiar", "mortes", "mortesRecentes", "essencia", "pedagioGratisUsado"]) delete d.conta.personagens[0]![k];
    const r = carregarSave(JSON.stringify(d));
    expect(r.ok && r.migradoDe).toBe(6);
    expect(r.ok && r.estado.conta.personagens[0]).toMatchObject(camposIniciaisF6());
  });

  it("rejeita Limiar, mortes, Essência ou nomeados adulterados", () => {
    const base = () => JSON.parse(serializarSave(avancar(noLimiar(), T0 + 3 * MIN + 250).estado)) as { conta: { personagens: Record<string, unknown>[] } };
    const codigo = (d: unknown) => {
      const r = carregarSave(JSON.stringify(d));
      return r.ok ? "ok" : r.erro.codigo;
    };
    expect(codigo(base())).toBe("ok");
    const limiar = (p: Record<string, unknown>) => p.limiar as Record<string, unknown>;
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p.atividade = { id: "meditacao", progressoMs: 0 }),
      (p) => (limiar(p).cargasEco = 6),
      (p) => (limiar(p).restanteMs = 99 * HORA),
      (p) => (limiar(p).retorno = { id: "danca-da-chuva" }),
      (p) => (p.mortesRecentes = [1, 2, 3]),
      (p) => (p.essencia = -1),
      (p) => (p.mochila = { "capuz-do-retornado": 2 }),
      (p) => {
        p.mochila = { "capuz-do-retornado": 1 };
        p.equipados = { ...(p.equipados as object), elmo: "capuz-do-retornado" };
      },
    ];
    for (const altera of casos) {
      const d = base();
      altera(d.conta.personagens[0]!);
      expect(codigo(d), altera.toString()).toBe("formato_invalido");
    }
  });
});
