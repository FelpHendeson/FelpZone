import { describe, expect, it } from 'vitest';
import * as A from './acoes';
import { criarContexto, passo } from './combate';
import { HABILIDADES, RECEITAS } from './dados/habilidades';
import { CONJUNTOS } from './dados/itens';
import { MAPAS } from './dados/mapas';
import { xpParaProximo } from './dados/personagens';
import { gerarItem } from './itens';
import { aplicarTempoOffline, avancar, criarHeroi, novoJogo, OFFLINE_MAXIMO_SEGUNDOS } from './jogo';
import { OBJETIVOS } from './objetivos';
import { desserializar, serializar } from './save';
import { statsDoHeroi } from './status';
import type { Estado, PersonagemId } from './tipos';

function ok(r: A.Resultado): Estado {
  if (!r.ok) throw new Error(r.erro);
  return r.estado;
}

function comParty(nivel = 10, ids: PersonagemId[] = ['leao', 'quentin', 'cyrus', 'vesper', 'odalys']): Estado {
  const e = novoJogo(1);
  e.herois = ids.map((id) => criarHeroi(id, nivel));
  e.ouro = 100_000;
  return e;
}

describe('combate contínuo', () => {
  it('a party luta sozinha: abates, ouro, XP e ondas', () => {
    const e = novoJogo(1);
    const depois = avancar(e, 120);
    expect(e.estatisticas.abates).toBe(0);
    expect(depois.estatisticas.abates).toBeGreaterThan(5);
    expect(depois.ouro).toBeGreaterThan(0);
    expect(depois.batalha.onda).toBeGreaterThan(1);
    expect(depois.herois[0].xp + depois.herois[0].nivel).toBeGreaterThan(1);
  });

  it('é determinístico pela semente', () => {
    const e = comParty(5);
    expect(avancar(e, 300)).toEqual(avancar(avancar(e, 100), 200));
    expect(avancar(novoJogo(1), 200).ouro).not.toBe(avancar(novoJogo(2), 200).ouro);
  });

  it('o tanque atrai os golpes e Provocar os prende nele', () => {
    let e = comParty(10, ['leao', 'quentin']);
    e = ok(A.irParaMapa(e, 'patio'));
    e = avancar(e, 3);
    const danos = (alvo: string) => e.batalha.visuais.filter((v) => v.alvo === alvo && v.tipo !== 'cura' && v.tipo !== 'escudo').length;
    // Em poucos segundos, só Quentin apanha.
    expect(danos('h:leao')).toBe(0);
    expect(e.herois.find((h) => h.id === 'quentin')!.habilidades.find((x) => x.id === 'provocar')!.xp).toBeGreaterThan(0);
  });

  it('habilidades entram em recarga e sobem de nível com o uso', () => {
    let e = comParty(10, ['leao']);
    e = avancar(e, 600);
    const golpe = e.herois[0].habilidades.find((x) => x.id === 'golpeJusto')!;
    expect(golpe.nivel).toBeGreaterThan(1);
    const ctx = criarContexto(e);
    passo(e, ctx);
    expect(Object.keys(e.batalha.herois.leao!.recargas)).toContain('golpeJusto');
  });

  it('o Leão das Chamas transforma e o ataque básico vira fogo', () => {
    let e = comParty(20, ['leao']);
    e.herois[0].habilidades.push({ id: 'leaoDasChamas', nivel: 1, xp: 0 });
    e.herois[0].equipadas = ['leaoDasChamas'];
    e = avancar(e, 4);
    const comb = e.batalha.herois.leao!;
    expect(comb.buffs.some((b) => b.id === 'transf:leaoDasChamas')).toBe(true);
    expect(e.batalha.visuais.some((v) => v.elemento === 'fogo')).toBe(true);
  });

  it('a party perde, descansa e volta a lutar', () => {
    let e = comParty(1, ['leao']);
    e.mapasLiberados = MAPAS.map((m) => m.id);
    e = ok(A.irParaMapa(e, 'cidadela'));
    e = avancar(e, 30);
    expect(e.diario.some((r) => r.evento.tipo === 'derrota')).toBe(true);
    expect(e.batalha.situacao).toBe('descansando');
    e = ok(A.irParaMapa(e, 'patio'));
    e = avancar(e, 60);
    expect(e.batalha.situacao).toBe('lutando');
  });

  it('subir de nível dá 3 pontos de atributo e 1 de habilidade, e libera mapas', () => {
    let e = novoJogo(1);
    e.herois[0].nivel = 7;
    e.herois[0].xp = xpParaProximo(7) - 0.1;
    e = avancar(e, 60);
    const h = e.herois[0];
    expect(h.nivel).toBeGreaterThanOrEqual(8);
    expect(h.pontosLivres).toBeGreaterThanOrEqual(3);
    expect(e.mapasLiberados).toContain('bosque');
  });
});

describe('atributos e equipamento', () => {
  it('pontos e sugestão aumentam os atributos certos', () => {
    let e = comParty(4, ['leao']);
    const antes = statsDoHeroi(e, e.herois[0]).stats.atq;
    e = ok(A.distribuirPonto(e, 'leao', 'atq', 2));
    expect(statsDoHeroi(e, e.herois[0]).stats.atq).toBeCloseTo(antes + 3);
    e = ok(A.distribuirSugerido(e, 'leao'));
    expect(e.herois[0].pontosLivres).toBe(0);
    expect(e.herois[0].pontos.atq).toBeGreaterThan(e.herois[0].pontos.def);
  });

  it('cada personagem só usa os tipos de armadura e arma dele', () => {
    const e = comParty(10);
    const cyrus = e.herois.find((h) => h.id === 'cyrus')!;
    const placas = gerarItem(e, { nivel: 10, base: 'peitoral-pesada', raridade: 'comum' });
    const cajado = gerarItem(e, { nivel: 10, base: 'cajado', raridade: 'comum' });
    expect(A.podeUsar(cyrus, placas)).toMatch(/armadura/);
    expect(A.podeUsar(cyrus, cajado)).toBeNull();
    expect(A.podeUsar(cyrus, gerarItem(e, { nivel: 30, base: 'cajado' }))).toMatch(/nível/);
  });

  it('equipar troca com o inventário e soma atributos; acessórios usam dois espaços', () => {
    let e = comParty(10, ['leao']);
    const elmo = gerarItem(e, { nivel: 10, base: 'elmo-pesada', raridade: 'raro' });
    const anel1 = gerarItem(e, { nivel: 10, base: 'anel', raridade: 'comum' });
    const anel2 = gerarItem(e, { nivel: 10, base: 'anel', raridade: 'comum' });
    e.inventario.push(elmo, anel1, anel2);
    const antes = statsDoHeroi(e, e.herois[0]).stats.def;
    e = ok(A.equiparItem(e, 'leao', elmo.uid));
    e = ok(A.equiparItem(e, 'leao', anel1.uid));
    e = ok(A.equiparItem(e, 'leao', anel2.uid));
    expect(statsDoHeroi(e, e.herois[0]).stats.def).toBeGreaterThan(antes);
    expect(e.herois[0].equipamento.acessorio1?.uid).toBe(anel1.uid);
    expect(e.herois[0].equipamento.acessorio2?.uid).toBe(anel2.uid);
    expect(e.inventario).toHaveLength(0);
    e = ok(A.desequipar(e, 'leao', 'elmo'));
    expect(e.inventario.map((i) => i.uid)).toEqual([elmo.uid]);
  });

  it('conjuntos dão bônus por número de peças', () => {
    let e = comParty(10, ['leao']);
    const pecas = (['elmo', 'peitoral', 'manoplas', 'calcas'] as const).map((p) =>
      gerarItem(e, { nivel: 10, base: `${p}-pesada`, raridade: 'raro', conjunto: 'leaoDeAco', forcarConjunto: true }),
    );
    expect(pecas.every((p) => p.conjunto === 'leaoDeAco')).toBe(true);
    e.inventario.push(...pecas);
    for (const p of pecas) e = ok(A.equiparItem(e, 'leao', p.uid));
    const mods = statsDoHeroi(e, e.herois[0]).mods;
    expect(mods.elemento.fogo).toBeGreaterThanOrEqual(10);
    expect(CONJUNTOS.leaoDeAco.bonus[1].pecas).toBe(4);
  });

  it('relíquias dão passivas mais fortes conforme a raridade', () => {
    let e = comParty(10, ['leao']);
    const r = gerarItem(e, { nivel: 10, base: 'dadoDoDestino', raridade: 'lendario' });
    e.inventario.push(r);
    e = ok(A.equiparItem(e, 'leao', r.uid));
    expect(statsDoHeroi(e, e.herois[0]).mods.critico).toBeCloseTo(10 * 1.9, 0);
  });
});

describe('ferreiro e loja', () => {
  it('forja, melhora e desmonta', () => {
    let e = comParty(10, ['leao']);
    e.materiais.ferrugem = 500;
    e = ok(A.forjar(e, 'patio', 'botas-pesada'));
    const botas = e.inventario.at(-1)!;
    expect(botas.base).toBe('botas-pesada');
    e = ok(A.melhorar(e, botas.uid));
    expect(e.inventario.at(-1)!.melhoria).toBe(1);
    const ferrugem = e.materiais.ferrugem;
    e = ok(A.desmontar(e, botas.uid));
    expect(e.materiais.ferrugem).toBeGreaterThan(ferrugem);
    expect(A.forjar(e, 'cidadela', 'botas-pesada').ok).toBe(false);
  });

  it('compra pelo valor e vende por 30%', () => {
    let e = comParty(10, ['leao']);
    const item = e.loja.itens[0];
    const ouro = e.ouro;
    e = ok(A.comprar(e, item.uid));
    expect(e.inventario.some((i) => i.uid === item.uid)).toBe(true);
    const gasto = ouro - e.ouro;
    e = ok(A.vender(e, [item.uid]));
    expect(ouro - e.ouro).toBeCloseTo(gasto - Math.round(gasto * 0.3), -1);
    e.materiais.ferrugem = 10;
    e = ok(A.venderMaterial(e, 'ferrugem', 10));
    expect(e.materiais.ferrugem).toBe(0);
  });

  it('a loja se renova com o tempo', () => {
    const e = novoJogo(1);
    const antes = e.loja.itens.map((i) => i.uid);
    expect(avancar(e, 16 * 60).loja.itens.map((i) => i.uid)).not.toEqual(antes);
  });
});

describe('habilidades, árvore e jardim', () => {
  it('no máximo 5 habilidades em uso', () => {
    let e = comParty(30, ['leao']);
    for (const no of ['l1', 'h1', 'l2', 'l3', 'h2', 'l4']) e = ok(A.aprenderNo(e, 'leao', no));
    expect(e.herois[0].equipadas).toHaveLength(5);
    expect(A.alternarHabilidade(e, 'leao', 'sedeDeBatalha').ok).toBe(false);
    e = ok(A.alternarHabilidade(e, 'leao', 'golpeJusto'));
    e = ok(A.alternarHabilidade(e, 'leao', 'sedeDeBatalha'));
    expect(e.herois[0].equipadas).toContain('sedeDeBatalha');
  });

  it('a árvore exige nível, pontos e os nós anteriores; o Leão das Chamas exige os dois ramos', () => {
    let e = comParty(20, ['leao']);
    expect(A.aprenderNo(e, 'leao', 'l5').ok).toBe(false);
    for (const no of ['l1', 'l3']) e = ok(A.aprenderNo(e, 'leao', no));
    expect(A.aprenderNo(e, 'leao', 'l5').ok).toBe(false);
    for (const no of ['h1', 'h2', 'l5']) e = ok(A.aprenderNo(e, 'leao', no));
    expect(e.herois[0].habilidades.some((x) => x.id === 'leaoDasChamas')).toBe(true);
    const baixo = comParty(2, ['leao']);
    expect(A.aprenderNo(baixo, 'leao', 'l1').ok).toBe(false);
  });

  it('fusão com receita leva tempo e ensina a habilidade', () => {
    let e = comParty(20, ['leao']);
    e = ok(A.aprenderNo(e, 'leao', 'l1'));
    e.materiais.essencia = 10;
    const previa = A.previaFusao(e, 'leao', 'golpeJusto', 'rugidoFlamejante');
    expect(previa?.id).toBe('julgamentoDoLeao');
    e = ok(A.plantarFusao(e, 0, 'leao', 'golpeJusto', 'rugidoFlamejante'));
    expect(A.colherFusao(e, 0).ok).toBe(false);
    e = avancar(e, A.DURACAO_FUSAO);
    e = ok(A.colherFusao(e, 0));
    expect(e.herois[0].habilidades.some((x) => x.id === 'julgamentoDoLeao')).toBe(true);
    expect(e.canteiros[0]).toBeNull();
  });

  it('fusão sem receita gera uma habilidade nova, um rank acima, com elemento combinado', () => {
    const e = comParty(20);
    const nova = A.gerarFusao('cyrus', HABILIDADES.faiscaEmCadeia, HABILIDADES.barreiraEstatica);
    expect(nova.criada).toBe(true);
    expect(nova.rank).toBe('C');
    expect(nova.efeitos.some((ef) => ef.tipo === 'dano')).toBe(true);
    expect(nova.efeitos.some((ef) => ef.tipo === 'escudo')).toBe(true);
    const mista = A.gerarFusao('leao', HABILIDADES.rugidoFlamejante, HABILIDADES.tempestade);
    expect(mista.elemento).toBe('raio');
    expect(mista.nome).toMatch(/Plasma/);
    expect(A.previaFusao(e, 'leao', 'golpeJusto', 'golpeJusto')).toBeNull();
    for (const r of RECEITAS) expect(HABILIDADES[r.resultado]).toBeDefined();
  });

  it('habilidades criadas vão para o estado e funcionam em batalha', () => {
    let e = comParty(20, ['cyrus', 'leao']);
    e.materiais.essencia = 10;
    e = ok(A.plantarFusao(e, 0, 'cyrus', 'faiscaEmCadeia', 'barreiraEstatica'));
    e = avancar(e, A.DURACAO_FUSAO);
    e = ok(A.colherFusao(e, 0));
    const id = e.herois[0].habilidades.at(-1)!.id;
    expect(e.criadas[id]).toBeDefined();
    e = ok(A.alternarHabilidade(e, 'cyrus', 'faiscaEmCadeia'));
    e = ok(A.alternarHabilidade(e, 'cyrus', id));
    e = avancar(e, 60);
    expect(e.herois[0].habilidades.find((x) => x.id === id)!.xp + e.herois[0].habilidades.find((x) => x.id === id)!.nivel).toBeGreaterThan(1);
  });
});

describe('taverna e expedições', () => {
  it('recrutar exige o nível do Sir LionHearth e ouro', () => {
    let e = novoJogo(1);
    e.ouro = 10_000;
    expect(A.recrutar(e, 'quentin').ok).toBe(false);
    e.herois[0].nivel = 2;
    e = ok(A.recrutar(e, 'quentin'));
    expect(e.herois.map((h) => h.id)).toEqual(['leao', 'quentin']);
    expect(A.recrutar(e, 'quentin').ok).toBe(false);
    expect(A.recrutar(e, 'odalys').ok).toBe(false);
  });

  it('expedição tira o herói da batalha e volta com recompensas', () => {
    let e = comParty(10, ['leao', 'quentin']);
    e = ok(A.enviarMissao(e, 'patio-curta', ['quentin']));
    expect(A.enviarMissao(e, 'patio-curta', ['leao']).ok).toBe(false);
    expect(A.concluirAtividade(e, 'quentin').ok).toBe(false);
    e = avancar(e, 15 * 60);
    const ouro = e.ouro;
    e = ok(A.concluirAtividade(e, 'quentin'));
    expect(e.herois[1].atividade.tipo).toBe('batalha');
    expect(e.ouro).toBeGreaterThan(ouro);
    expect(e.diario.at(-1)?.evento.tipo).toBe('missao');
  });

  it('treino dá XP proporcional ao tempo', () => {
    let e = comParty(10, ['leao', 'quentin']);
    e = ok(A.enviarTreino(e, 'quentin', 3600));
    e = avancar(e, 1800);
    const xp = e.herois[1].xp;
    e = ok(A.concluirAtividade(e, 'quentin'));
    expect(e.herois[1].xp + e.herois[1].nivel * 1e6).toBeGreaterThan(xp + 10 * 1e6);
  });
});

describe('objetivos, save e offline', () => {
  it('objetivos dão recompensa em ordem', () => {
    let e = novoJogo(1);
    expect(A.receberObjetivo(e).ok).toBe(false);
    e.estatisticas.abates = 15;
    e = ok(A.receberObjetivo(e));
    expect(e.objetivo).toBe(1);
    expect(e.ouro).toBe(OBJETIVOS[0].recompensa.ouro);
  });

  it('save ida e volta; versões antigas e saves quebrados são recusados', () => {
    const e = avancar(comParty(5), 60);
    expect(desserializar(serializar(e, 9))).toEqual({ estado: e, salvoEm: 9 });
    expect(desserializar('{x')).toBeNull();
    const velho = JSON.parse(serializar(e, 1));
    velho.estado.versao = 2;
    expect(desserializar(JSON.stringify(velho))).toBeNull();
    const batalhaRuim = JSON.parse(serializar(e, 1));
    batalhaRuim.estado.batalha = 'x';
    expect(desserializar(JSON.stringify(batalhaRuim))?.estado.batalha.onda).toBe(1);
  });

  it('offline respeita 8 horas e resume os ganhos', () => {
    const { estado, resumo } = aplicarTempoOffline(novoJogo(1), OFFLINE_MAXIMO_SEGUNDOS + 100);
    expect(resumo.limitado).toBe(true);
    expect(estado.tempo).toBe(OFFLINE_MAXIMO_SEGUNDOS);
    expect(resumo.abates).toBe(estado.estatisticas.abates);
  });
});
