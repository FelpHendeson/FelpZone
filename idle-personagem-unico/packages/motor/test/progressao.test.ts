import { describe, expect, it } from "vitest";
import {
  CONFIG_PROGRESSAO,
  LIMITE_OFFLINE_MS,
  PERFIS_RACA,
  RACAS,
  Rng,
  STATUS,
  avancar,
  avancarPersonagem,
  carregarSave,
  criarEstadoInicial,
  duracaoCicloMs,
  faixaStatus,
  ganhoDeTreino,
  iniciarAtividade,
  modificadoresDoPersonagem,
  pararAtividade,
  serializarSave,
  statusIniciais,
  valorEfetivo,
  xpParaProximoNivel,
  CATALOGO,
  type EstadoJogo,
  type Personagem,
  type ResultadoAtividade,
} from "../src/index";

const T0 = 1_700_000_000_000;
const HORA = 3_600_000;

type Base = Pick<Personagem, "racaId" | "dons" | "origem">;

/** Personagem de teste. O dom padrão é o primeiro Incomum da raça (sem efeito aplicado). */
function personagem(base: Partial<Base> & { id?: string } = {}): Personagem {
  const racaId = base.racaId ?? "humano";
  const b: Base = {
    racaId,
    dons: base.dons ?? [[...CATALOGO.dons.values()].find((d) => d.racaId === racaId)!.id],
    origem: base.origem ?? { tipo: "comum", id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 3, loreGerada: "Lore." },
  };
  return {
    id: base.id ?? "personagem-1",
    nome: "Teste",
    nivel: 1,
    xp: 0,
    coreId: "andarilho",
    tracoPersonalidadeId: "calado",
    aparencia: { corCabelo: "preto", corRoupa: "linho" },
    criadoEm: T0,
    ...b,
    status: statusIniciais(b),
    atividade: null,
  };
}
function estadoCom(...ps: Personagem[]): EstadoJogo {
  const e = criarEstadoInicial("progressao", T0);
  return { ...e, conta: { personagens: ps, personagemAtivoId: ps[0]?.id ?? null, sorteio: null } };
}
function ok(r: ResultadoAtividade): EstadoJogo {
  if (!r.ok) throw new Error(r.erro.codigo);
  return r.estado;
}
const ativo = (e: EstadoJogo) => e.conta.personagens.find((p) => p.id === e.conta.personagemAtivoId)!;
const treinando = (atividadeId = "levantamento-de-pedras", p = personagem()) => ok(iniciarAtividade(estadoCom(p), atividadeId, T0));

describe("piso e teto", () => {
  it("todas as raças têm perfil; piso < teto; teto cresce 10% por nível", () => {
    for (const r of RACAS) {
      expect(PERFIS_RACA[r.id], r.id).toBeDefined();
      for (const s of STATUS) {
        const f1 = faixaStatus(r.id, s, 1, []);
        const f11 = faixaStatus(r.id, s, 11, []);
        expect(f1.piso).toBeLessThan(f1.teto);
        expect(f11.teto).toBeCloseTo(f1.teto * 2, 9);
      }
    }
  });

  it("Humano tem piso alto e teto baixo; Draconato, teto alto e piso baixo", () => {
    const h = faixaStatus("humano", "forca", 1, []);
    const d = faixaStatus("draconato", "forca", 1, []);
    expect(h.piso / h.teto).toBeGreaterThan(d.piso / d.teto);
    expect(d.teto).toBeGreaterThan(h.teto);
  });

  it("status iniciais são o piso do nível 1", () => {
    const p = personagem({ racaId: "elfo" });
    const mods = modificadoresDoPersonagem(p, 1);
    for (const s of STATUS) expect(p.status[s]).toBe(faixaStatus("elfo", s, 1, mods).piso);
  });

  it("ganho cai perto do teto, é zero no teto e nunca passa dele", () => {
    const { piso, teto } = faixaStatus("humano", "forca", 1, []);
    const ganhos = [0, 0.25, 0.5, 0.75, 0.99].map((x) => ganhoDeTreino("humano", "forca", piso + x * (teto - piso), 1, []));
    for (let i = 1; i < ganhos.length; i++) expect(ganhos[i]!).toBeLessThan(ganhos[i - 1]!);
    expect(ganhoDeTreino("humano", "forca", teto, 1, [])).toBe(0);
    const quase = teto - 1e-6;
    expect(quase + ganhoDeTreino("humano", "forca", quase, 1, [])).toBeLessThanOrEqual(teto);
  });

  it("curva de XP cresce e zera no nível máximo", () => {
    for (let l = 1; l < CONFIG_PROGRESSAO.nivelMaximo - 1; l++) expect(xpParaProximoNivel(l + 1)).toBeGreaterThan(xpParaProximoNivel(l));
    expect(xpParaProximoNivel(CONFIG_PROGRESSAO.nivelMaximo)).toBe(0);
  });
});

describe("ciclos e atividades", () => {
  it("ocioso não ganha nada, mas o relógio anda", () => {
    const e = estadoCom(personagem());
    const { estado, resumo } = avancar(e, T0 + 5 * HORA);
    expect(resumo.ciclos).toBe(0);
    expect(ativo(estado)).toEqual(ativo(e));
    expect(estado.ultimoTick).toBe(T0 + 5 * HORA);
  });

  it("um ciclo só conta inteiro; o resto fica guardado", () => {
    const e = treinando();
    const quase = avancar(e, T0 + 29_999);
    expect(quase.resumo.ciclos).toBe(0);
    expect(ativo(quase.estado).atividade).toEqual({ id: "levantamento-de-pedras", progressoMs: 29_999 });
    const um = avancar(quase.estado, T0 + 30_001);
    expect(um.resumo.ciclos).toBe(1);
    expect(um.resumo.xp).toBe(10);
    expect(ativo(um.estado).atividade?.progressoMs).toBe(1);
    expect(ativo(um.estado).status.forca).toBeGreaterThan(ativo(e).status.forca);
    // Só o status treinado sobe.
    expect(ativo(um.estado).status.vigor).toBe(ativo(e).status.vigor);
  });

  it("uma atividade por vez: trocar descarta o ciclo parcial", () => {
    const e = avancar(treinando(), T0 + 20_000).estado;
    const trocado = ok(iniciarAtividade(e, "meditacao", T0 + 20_000));
    expect(ativo(trocado).atividade).toEqual({ id: "meditacao", progressoMs: 0 });
    const parado = ok(pararAtividade(trocado, T0 + 50_000));
    // O tempo até parar conta para a meditação (1 ciclo).
    expect(ativo(parado).status.espirito).toBeGreaterThan(ativo(e).status.espirito);
    expect(ativo(parado).atividade).toBeNull();
  });

  it("erros tipados", () => {
    const e = treinando();
    const cod = (r: ResultadoAtividade) => (r.ok ? "ok" : r.erro.codigo);
    expect(cod(iniciarAtividade(e, "levantamento-de-pedras", T0))).toBe("ja_na_atividade");
    expect(cod(iniciarAtividade(e, "danca-da-chuva", T0))).toBe("atividade_inexistente");
    expect(cod(pararAtividade(estadoCom(personagem()), T0))).toBe("ja_ocioso");
    expect(cod(iniciarAtividade(criarEstadoInicial("x", T0), "meditacao", T0))).toBe("sem_personagem");
  });

  it("velocidade encurta o ciclo (Corpo de Vento do Silfo)", () => {
    const silfo = personagem({ racaId: "silfo" });
    const a = CATALOGO.atividades.get("meditacao")!;
    expect(duracaoCicloMs(a, modificadoresDoPersonagem(personagem(), 1))).toBe(30_000);
    expect(duracaoCicloMs(a, modificadoresDoPersonagem(silfo, 1))).toBe(Math.round(30_000 / 1.1));
  });

  it("subir de nível não tira nada e leva quem estava abaixo ao novo piso", () => {
    const e = avancar(treinando(), T0 + 2 * HORA).estado;
    const antes = ativo(treinando());
    const depois = ativo(e);
    expect(depois.nivel).toBeGreaterThan(1);
    const mods = modificadoresDoPersonagem(depois, depois.nivel);
    for (const s of STATUS) {
      expect(depois.status[s]).toBeGreaterThanOrEqual(antes.status[s]);
      const f = faixaStatus(depois.racaId, s, depois.nivel, mods);
      expect(depois.status[s]).toBeGreaterThanOrEqual(f.piso - 1e-9);
      expect(depois.status[s]).toBeLessThanOrEqual(f.teto + 1e-9);
    }
  });

  it("no nível máximo o XP fica em zero e o treino continua", () => {
    const p = { ...personagem(), nivel: CONFIG_PROGRESSAO.nivelMaximo };
    const noMax: Personagem = { ...p, status: { ...p.status, forca: faixaStatus("humano", "forca", p.nivel, []).piso }, atividade: { id: "levantamento-de-pedras", progressoMs: 0 } };
    const r = avancarPersonagem(noMax, HORA);
    expect(r.personagem.nivel).toBe(CONFIG_PROGRESSAO.nivelMaximo);
    expect(r.personagem.xp).toBe(0);
    expect(r.xp).toBe(0);
    expect(r.ganhos.forca).toBeGreaterThan(0);
  });
});

describe("avanço do tempo e offline", () => {
  it("avançar de uma vez ou em partes dá o mesmo estado (propriedade)", () => {
    const atividades = [...CATALOGO.atividades.keys()];
    for (let semente = 0; semente < 30; semente++) {
      const rng = Rng.daSemente(`particao-${semente}`);
      const raca = RACAS[semente % RACAS.length]!.id;
      const inicio = ok(iniciarAtividade(estadoCom(personagem({ racaId: raca })), atividades[semente % atividades.length]!, T0));
      const total = rng.inteiro(1, LIMITE_OFFLINE_MS);
      const direto = avancar(inicio, T0 + total).estado;
      let partes = inicio;
      let t = T0;
      while (t < T0 + total) {
        t = Math.min(T0 + total, t + rng.inteiro(1, Math.max(1, Math.floor(total / rng.inteiro(1, 50)))));
        partes = avancar(partes, t).estado;
      }
      expect(partes, `semente ${semente}`).toEqual(direto);
    }
  });

  it("3 h de uma vez = 3 × 1 h = 10.800 avanços de 1 s, com subida de nível no meio", () => {
    const inicio = treinando();
    const direto = avancar(inicio, T0 + 3 * HORA).estado;
    let horas = inicio;
    for (let h = 1; h <= 3; h++) horas = avancar(horas, T0 + h * HORA).estado;
    let segundos = inicio;
    for (let s = 1; s <= 3 * 3600; s++) segundos = avancar(segundos, T0 + s * 1000).estado;
    expect(ativo(direto).nivel).toBeGreaterThan(2);
    expect(horas).toEqual(direto);
    expect(segundos).toEqual(direto);
  });

  it("limite de 12 h: o excesso é descartado", () => {
    const inicio = treinando();
    const doze = avancar(inicio, T0 + 12 * HORA);
    const vinte = avancar(inicio, T0 + 20 * HORA);
    expect(vinte.resumo.limitado).toBe(true);
    expect(vinte.resumo.simuladoMs).toBe(LIMITE_OFFLINE_MS);
    expect(vinte.resumo.decorridoMs).toBe(20 * HORA);
    expect(ativo(vinte.estado)).toEqual(ativo(doze.estado));
    expect(vinte.estado.ultimoTick).toBe(T0 + 20 * HORA);
    expect(doze.resumo.limitado).toBe(false);
  });

  it("relógio que volta não dá ganho e não conta o mesmo tempo duas vezes", () => {
    const e = avancar(treinando(), T0 + HORA).estado;
    const voltou = avancar(e, T0 - HORA);
    expect(voltou.estado).toBe(e);
    expect(voltou.resumo.ciclos).toBe(0);
    expect(avancar(voltou.estado, T0 + 2 * HORA).estado).toEqual(avancar(e, T0 + 2 * HORA).estado);
    expect(avancar(e, Number.NaN).estado).toBe(e);
  });

  it("só o personagem ativo avança", () => {
    const um = { ...personagem(), atividade: { id: "meditacao", progressoMs: 0 } };
    const dois = { ...personagem({ id: "personagem-2" }), atividade: { id: "meditacao", progressoMs: 0 } };
    const { estado } = avancar(estadoCom(um, dois), T0 + HORA);
    expect(estado.conta.personagens[0]!.status.espirito).toBeGreaterThan(um.status.espirito);
    expect(estado.conta.personagens[1]).toEqual(dois);
  });

  it("resumo soma os ganhos e os níveis", () => {
    const inicio = treinando();
    const { estado, resumo } = avancar(inicio, T0 + 2 * HORA);
    expect(resumo.ciclos).toBe(240);
    expect(resumo.xp).toBe(2400);
    expect(resumo.nivelInicial).toBe(1);
    expect(resumo.nivelFinal).toBe(ativo(estado).nivel);
    for (const s of STATUS) expect(ativo(inicio).status[s] + resumo.ganhos[s]).toBeCloseTo(ativo(estado).status[s], 9);
  });

  it("desempenho: 12 h em menos de 50 ms", () => {
    const inicio = treinando();
    avancar(inicio, T0 + LIMITE_OFFLINE_MS); // aquece
    const t = performance.now();
    avancar(inicio, T0 + LIMITE_OFFLINE_MS);
    expect(performance.now() - t).toBeLessThan(50);
  });
});

describe("modificadores de raça, origem e dom aplicados", () => {
  const especial = (id: string) => ({ tipo: "especial" as const, id, loreGerada: "Lore." });

  it("status.<id>: Órfão do Templo +2 Espírito; Reencarnado −5% Vigor", () => {
    const orfao = personagem({ origem: especial("orfao-do-templo-cinzento") });
    const mods = modificadoresDoPersonagem(orfao, 1);
    expect(valorEfetivo(orfao.status.espirito, "espirito", mods)).toBeCloseTo(orfao.status.espirito + 2, 9);
    const reenc = personagem({ origem: especial("o-reencarnado") });
    expect(valorEfetivo(reenc.status.vigor, "vigor", modificadoresDoPersonagem(reenc, 1))).toBeCloseTo(reenc.status.vigor * 0.95, 9);
  });

  it("Despertado Tardio: teto 10% menor; +50% de XP e de treino só até o nível 20", () => {
    const d = personagem({ origem: especial("o-despertado-tardio") });
    const normal = personagem();
    expect(faixaStatus("humano", "forca", 1, modificadoresDoPersonagem(d, 1)).teto).toBeCloseTo(faixaStatus("humano", "forca", 1, []).teto * 0.9, 9);
    const r = avancarPersonagem({ ...d, atividade: { id: "meditacao", progressoMs: 0 } }, 30_000);
    expect(r.xp).toBe(15);
    const n = avancarPersonagem({ ...normal, atividade: { id: "meditacao", progressoMs: 0 } }, 30_000);
    expect(n.xp).toBe(10);
    expect(modificadoresDoPersonagem(d, 21).some((m) => m.alvo === "xp-personagem")).toBe(false);
  });

  it("Coração de Dragão: teto de Força e Espírito 10% maior", () => {
    const d = personagem({ racaId: "draconato", dons: ["draconato-coracao-de-dragao"] });
    const mods = modificadoresDoPersonagem(d, 1);
    expect(faixaStatus("draconato", "forca", 1, mods).teto).toBeCloseTo(faixaStatus("draconato", "forca", 1, []).teto * 1.1, 9);
    expect(faixaStatus("draconato", "vigor", 1, mods).teto).toBeCloseTo(faixaStatus("draconato", "vigor", 1, []).teto, 9);
  });
});

describe("save v3", () => {
  const valido = () => {
    const e = avancar(treinando(), T0 + 2 * HORA + 1234).estado;
    return { e, dados: JSON.parse(serializarSave(e)) as { versao: number; conta: { personagens: Record<string, unknown>[] } } };
  };
  const codigo = (d: unknown) => {
    const r = carregarSave(JSON.stringify(d));
    return r.ok ? "ok" : r.erro.codigo;
  };

  it("ida e volta preserva status, XP e atividade", () => {
    const { e } = valido();
    const r = carregarSave(serializarSave(e));
    expect(r.ok && r.estado).toEqual(e);
  });

  it("migra v2 → v3: status iniciais e ocioso", () => {
    const p = personagem({ racaId: "orc" });
    const v3 = JSON.parse(serializarSave(estadoCom(p))) as { versao: number; conta: { personagens: Record<string, unknown>[] } };
    v3.versao = 2;
    delete v3.conta.personagens[0]!.status;
    delete v3.conta.personagens[0]!.atividade;
    const r = carregarSave(JSON.stringify(v3));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migradoDe).toBe(2);
    expect(r.estado.conta.personagens[0]!.status).toEqual(statusIniciais(p));
    expect(r.estado.conta.personagens[0]!.atividade).toBeNull();
  });

  it("rejeita status, XP, nível ou atividade adulterados", () => {
    expect(codigo(valido().dados)).toBe("ok");
    const casos: ((p: Record<string, unknown>) => void)[] = [
      (p) => ((p.status as Record<string, unknown>).forca = 9999),
      (p) => ((p.status as Record<string, unknown>).forca = null),
      (p) => ((p.status as Record<string, unknown>).sorte = 0),
      (p) => delete (p.status as Record<string, unknown>).vigor,
      (p) => (p.xp = 1e9),
      (p) => (p.xp = -1),
      (p) => (p.nivel = 51),
      (p) => (p.atividade = { id: "danca-da-chuva", progressoMs: 0 }),
      (p) => (p.atividade = { id: "meditacao", progressoMs: -5 }),
      (p) => (p.atividade = { id: "meditacao", progressoMs: 1.5 }),
    ];
    for (const altera of casos) {
      const { dados } = valido();
      altera(dados.conta.personagens[0]!);
      expect(codigo(dados), altera.toString()).toBe("formato_invalido");
    }
  });
});
