import { describe, expect, it } from "vitest";
import {
  BERCOS,
  BESTAS_VINCULADAS,
  CATALOGO,
  CORES,
  CORES_CABELO,
  CORES_ROUPA,
  DONS,
  MARCAS_ANOMALIA,
  MARCAS_CURADAS,
  MARCAS_ORIGEM,
  MOTIVACOES,
  ORIGENS_ESPECIAIS,
  RACAS,
  TAGS_AFINIDADE,
  TRACOS_PERSONALIDADE,
  compatibilidade,
  donsDaRaca,
  gerarMarcaAnomalia,
  idMarcaAnomalia,
  type Efeito,
} from "../src/index";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const naoVazio = (t: string) => t.trim().length > 0;

function confereIds(lista: readonly { id: string }[]) {
  const ids = lista.map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id, id).toMatch(KEBAB);
}

function confereEfeito(efeito: Efeito, contexto: string) {
  expect(efeito.modificadores !== undefined || efeito.efeitoPendente !== undefined, contexto).toBe(true);
  if (efeito.efeitoPendente !== undefined) expect(naoVazio(efeito.efeitoPendente), contexto).toBe(true);
  for (const m of efeito.modificadores ?? []) {
    expect(naoVazio(m.alvo), contexto).toBe(true);
    expect(Number.isFinite(m.valor), contexto).toBe(true);
  }
}

describe("integridade do catálogo", () => {
  it("tem as quantidades da F1", () => {
    expect(RACAS).toHaveLength(8);
    expect(CORES).toHaveLength(12);
    expect(ORIGENS_ESPECIAIS).toHaveLength(22);
    expect(DONS).toHaveLength(8 * 13);
    expect(CORES_CABELO).toHaveLength(12);
    expect(CORES_ROUPA).toHaveLength(12);
    expect(BERCOS).toHaveLength(10);
    expect(MOTIVACOES).toHaveLength(10);
    expect(MARCAS_ORIGEM).toHaveLength(5);
  });

  it("ids únicos e em kebab-case em cada coleção", () => {
    for (const lista of [RACAS, CORES, DONS, ORIGENS_ESPECIAIS, BESTAS_VINCULADAS, BERCOS, MOTIVACOES, MARCAS_ORIGEM, TRACOS_PERSONALIDADE, MARCAS_ANOMALIA, CORES_CABELO, CORES_ROUPA]) {
      confereIds(lista);
    }
    confereIds(CORES.flatMap((c) => c.tecnicas));
    confereIds(RACAS.map((r) => r.habilidadeComum));
  });

  it("textos não vazios e efeitos bem formados", () => {
    for (const r of RACAS) {
      for (const t of [r.nome, r.perfil, r.habilidadeComum.nome, r.habilidadeComum.descricao]) expect(naoVazio(t), r.id).toBe(true);
      confereEfeito(r.habilidadeComum.efeito, r.id);
      expect(r.nucleosAnomalia.length).toBeGreaterThan(0);
    }
    for (const c of CORES) {
      for (const t of [c.nome, c.descricao, c.efeitoAnomalia, ...c.complementosAnomalia]) expect(naoVazio(t), c.id).toBe(true);
      for (const t of c.tecnicas) expect(naoVazio(t.nome) && naoVazio(t.descricao), t.id).toBe(true);
    }
    for (const d of DONS) {
      expect(naoVazio(d.nome) && naoVazio(d.descricao), d.id).toBe(true);
      confereEfeito(d.efeito, d.id);
    }
    for (const o of ORIGENS_ESPECIAIS) {
      for (const t of [o.nome, o.lore, o.efeitoTexto, o.gancho]) expect(naoVazio(t), o.id).toBe(true);
      confereEfeito(o.efeito, o.id);
    }
    for (const b of BERCOS) confereEfeito(b.efeito, b.id);
    for (const m of MARCAS_ANOMALIA) expect(naoVazio(m.nome) && naoVazio(m.descricao), m.id).toBe(true);
  });

  it("tags de raças e cores pertencem ao vocabulário", () => {
    const validas = new Set<string>(TAGS_AFINIDADE);
    for (const t of [...RACAS.flatMap((r) => r.tags), ...CORES.flatMap((c) => c.tags)]) expect(validas.has(t), t).toBe(true);
  });

  it("raridades de raça seguem o GDD §3.1", () => {
    const por = (raridade: string) => RACAS.filter((r) => r.raridade === raridade).map((r) => r.id).sort();
    expect(por("comum")).toEqual(["anao", "elfo", "humano", "orc"]);
    expect(por("incomum")).toEqual(["lobisomem", "sangue-palido"]);
    expect(por("raro")).toEqual(["draconato", "silfo"]);
  });

  it("13 dons por raça: 5 Incomum, 4 Raro, 2 Épico, 1 Ancestral, 1 Primordial", () => {
    for (const r of RACAS) {
      const dons = donsDaRaca(r.id);
      const conta = (raridade: string) => dons.filter((d) => d.raridade === raridade).length;
      expect([conta("incomum"), conta("raro"), conta("epico"), conta("ancestral"), conta("primordial")], r.id).toEqual([5, 4, 2, 1, 1]);
    }
    for (const d of DONS) expect(CATALOGO.racas.has(d.racaId)).toBe(true);
  });

  it("dons de exemplo do GDD para o Lobisomem", () => {
    const por = (nome: string) => DONS.find((d) => d.racaId === "lobisomem" && d.nome === nome)?.raridade;
    expect(por("Faro de Caçador")).toBe("incomum");
    expect(por("Matilha Fantasma")).toBe("raro");
    expect(por("Lua Cheia Plena")).toBe("epico");
    expect(por("Primeira Presa")).toBe("primordial");
  });

  it("cores têm de 2 a 3 técnicas e o Ser das Trevas usa o texto do autor", () => {
    for (const c of CORES) expect(c.tecnicas.length, c.id).toBeGreaterThanOrEqual(2);
    for (const c of CORES) expect(c.tecnicas.length, c.id).toBeLessThanOrEqual(3);
    const trevas = CATALOGO.cores.get("ser-das-trevas")!;
    expect(trevas.descricao).toBe("As trevas te reconhecem como um deles e portanto te acolhem.");
    expect(trevas.tecnicas.map((t) => [t.nome, t.modo, t.descricao])).toEqual([
      ["Sentido das Sombras", "passiva", "Enxerga e sente através das sombras."],
      ["Abraço das Sombras", "passiva", "Oculta presença, cheiro, respiração; todos os traços somem."],
      [
        "Invocação do Manto das Trevas",
        "ativa",
        "Converte parte da mana em trevas e cobre uma área; debuff no inimigo conforme o tipo, buff em você (+ataque, +esquiva).",
      ],
    ]);
  });

  it("toda raça tem ao menos um core de afinidade alta ou média", () => {
    for (const r of RACAS) expect(CORES.some((c) => compatibilidade(r, c) !== "excentrica"), r.id).toBe(true);
  });

  it("compatibilidade segue o número de tags em comum", () => {
    const lobo = CATALOGO.racas.get("lobisomem")!;
    expect(compatibilidade(lobo, CATALOGO.cores.get("predador-nato")!)).toBe("alta");
    expect(compatibilidade(lobo, CATALOGO.cores.get("domador")!)).toBe("media");
    expect(compatibilidade(lobo, CATALOGO.cores.get("ser-das-trevas")!)).toBe("excentrica");
  });

  it("todo par excêntrico resolve uma marca da anomalia (e só eles)", () => {
    let pares = 0;
    for (const r of RACAS) {
      for (const c of CORES) {
        const marca = CATALOGO.marcasAnomalia.get(idMarcaAnomalia(r.id, c.id));
        if (compatibilidade(r, c) === "excentrica") {
          pares++;
          expect(marca, `${r.id}+${c.id}`).toBeDefined();
          expect(marca!.racaId).toBe(r.id);
          expect(marca!.coreId).toBe(c.id);
        } else expect(marca).toBeUndefined();
      }
    }
    expect(MARCAS_ANOMALIA).toHaveLength(pares);
  });

  it("marcas curadas: Lua sem Luz e mais 5, todas em pares excêntricos", () => {
    expect(MARCAS_CURADAS.length).toBeGreaterThanOrEqual(6);
    expect(CATALOGO.marcasAnomalia.get(idMarcaAnomalia("lobisomem", "ser-das-trevas"))?.nome).toBe("Lua sem Luz");
    for (const m of MARCAS_CURADAS) {
      expect(compatibilidade(CATALOGO.racas.get(m.racaId)!, CATALOGO.cores.get(m.coreId)!), `${m.racaId}+${m.coreId}`).toBe("excentrica");
      expect(CATALOGO.marcasAnomalia.get(idMarcaAnomalia(m.racaId, m.coreId))?.curada).toBe(true);
    }
  });

  it("gerador de marcas é determinístico", () => {
    const r = CATALOGO.racas.get("silfo")!;
    const c = CATALOGO.cores.get("ser-das-trevas")!;
    expect(gerarMarcaAnomalia(r, c)).toEqual(gerarMarcaAnomalia(r, c));
    expect(gerarMarcaAnomalia(r, c).nome).not.toContain("undefined");
  });

  it("origens especiais: referências válidas, bestas vinculadas e as duas do autor", () => {
    expect(ORIGENS_ESPECIAIS.map((o) => o.numero)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    for (const o of ORIGENS_ESPECIAIS) {
      for (const r of o.racasPermitidas) expect(CATALOGO.racas.has(r), `${o.id}: ${r}`).toBe(true);
      if (o.bestaVinculadaId) expect(CATALOGO.bestas.has(o.bestaVinculadaId), o.id).toBe(true);
    }
    expect(ORIGENS_ESPECIAIS.filter((o) => o.bestaVinculadaId).map((o) => o.numero)).toEqual([1, 11, 12]);
    expect(ORIGENS_ESPECIAIS.filter((o) => o.doAutor).map((o) => o.nome)).toEqual(["Fruto do Vínculo", "12º Filho do Clã Ironblood"]);
    expect(CATALOGO.origensEspeciais.get("quebra-ovo")?.racasPermitidas).toEqual(["draconato"]);
  });

  it("paletas com hexadecimais válidos", () => {
    for (const c of [...CORES_CABELO, ...CORES_ROUPA]) expect(c.hex, c.id).toMatch(/^#[0-9a-f]{6}$/);
  });
});
