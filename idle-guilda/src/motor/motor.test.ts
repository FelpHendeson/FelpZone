import { describe, expect, it } from 'vitest';
import {
  armasLivres,
  contratar,
  distribuirPonto,
  distribuirSugerido,
  equipar,
  forjar,
  irPara,
  novoJogo,
  receberObjetivo,
  receberAplausos,
  aplausoDado,
  type Resultado,
} from './acoes';
import { OFFLINE_MAXIMO_SEGUNDOS } from './dados';
import { OBJETIVOS, objetivoCumprido } from './objetivos';
import { dano, fatorDefesa, vidaMaxima, xpParaProximo } from './regras';
import { desserializar, serializar } from './save';
import { aplicarTempoOffline, avancar, estimar } from './simulacao';
import type { Estado } from './tipos';

function ok(r: Resultado): Estado {
  if (!r.ok) throw new Error(r.erro);
  return r.estado;
}

function comMistica(): Estado {
  const e = novoJogo('Aren');
  e.ouro = 1000;
  return ok(contratar(e, 'Lia', 'mistica'));
}

describe('combate da party', () => {
  it('abates geram xp para todos, ouro e saque, sem alterar o estado original', () => {
    const e = comMistica();
    const depois = avancar(e, 60);
    expect(e.estatisticas.abates.campina).toBe(0);
    expect(depois.estatisticas.abates.campina).toBeGreaterThan(0);
    expect(depois.ouro).toBeGreaterThan(e.ouro);
    expect(depois.materiais.gosma).toBeGreaterThan(0);
    for (const h of depois.herois) expect(h.xp + h.nivel).toBeGreaterThan(1);
  });

  it('é determinístico', () => {
    const e = comMistica();
    expect(avancar(e, 500)).toEqual(avancar(avancar(e, 200), 300));
  });

  it('o Guerreiro recebe todos os golpes', () => {
    let e = comMistica();
    e.zonasLiberadas.push('bosque');
    e = ok(irPara(e, 'bosque'));
    const depois = avancar(e, 3);
    const [guerreiro, mistica] = depois.herois;
    expect(guerreiro.vida).toBeLessThan(vidaMaxima(guerreiro));
    expect(mistica.vida).toBe(vidaMaxima(mistica));
  });

  it('sem tanque o dano é dividido entre todos', () => {
    const e = comMistica();
    e.herois = e.herois.filter((h) => h.classe === 'mistica');
    e.herois.push({ ...e.herois[0], id: 'h9', classe: 'cacadora', atributos: { poder: 6, vigor: 3 } });
    e.zonasLiberadas.push('bosque');
    e.zona = 'bosque';
    const depois = avancar(e, 1);
    expect(depois.herois.every((h) => h.vida < vidaMaxima(h))).toBe(true);
  });

  it('a Mística cura o aliado mais ferido', () => {
    const e = comMistica();
    const g = e.herois[0];
    g.vida = vidaMaxima(g) * 0.5;
    const antes = g.vida;
    const depois = avancar(e, 1).herois[0];
    const golpe = 4 * fatorDefesa(g);
    expect(depois.vida).toBeGreaterThan(antes - golpe);
  });

  it('a party recua quando alguém fica com pouca vida e volta recuperada', () => {
    let e = novoJogo('Aren');
    e.zonasLiberadas.push('ruinas');
    e = ok(irPara(e, 'ruinas'));
    e = avancar(e, 10);
    expect(e.situacao).toBe('descansando');
    const progresso = e.progressoAbate;
    let voltou = false;
    for (let i = 0; i < 100 && !voltou; i++) {
      e = avancar(e, 1);
      voltou = e.situacao === 'lutando';
    }
    expect(voltou).toBe(true);
    expect(e.herois[0].vida).toBe(vidaMaxima(e.herois[0]));
    expect(e.progressoAbate).toBe(progresso);
  });

  it('sobe de nível, ganha pontos e libera zonas', () => {
    const e = novoJogo('Aren');
    e.herois[0].xp = xpParaProximo(1) - 0.01;
    e.progressoAbate = 0.999;
    const depois = avancar(e, 1);
    expect(depois.herois[0].nivel).toBe(2);
    expect(depois.herois[0].pontosLivres).toBe(2);
    depois.herois[0].nivel = 5;
    expect(avancar(depois, 1).zonasLiberadas).toContain('bosque');
  });

  it('a estimativa mostra que as Ruínas são difíceis para um iniciante', () => {
    const e = comMistica();
    expect(estimar(e, 'campina').tempoLutando).toBeGreaterThan(0.8);
    expect(estimar(e, 'ruinas').tempoLutando).toBeLessThan(0.5);
    expect(estimar(e, 'campina').xpPorMinuto).toBeGreaterThan(0);
  });

  it('progresso offline respeita o teto de 8 horas e resume os ganhos', () => {
    const e = novoJogo('Aren');
    const { estado, resumo } = aplicarTempoOffline(e, OFFLINE_MAXIMO_SEGUNDOS * 2);
    expect(estado.tempo).toBe(OFFLINE_MAXIMO_SEGUNDOS);
    expect(resumo.limitado).toBe(true);
    expect(resumo.ouro).toBe(Math.floor(estado.ouro));
    expect(resumo.abates).toBe(estado.estatisticas.abates.campina);
    expect(resumo.herois[0].niveis).toBe(estado.herois[0].nivel - 1);
  });
});

describe('ações', () => {
  it('não vai para zona bloqueada', () => {
    expect(irPara(novoJogo('Aren'), 'ruinas').ok).toBe(false);
  });

  it('distribui pontos mantendo a proporção de vida', () => {
    const e = novoJogo('Aren');
    e.herois[0].pontosLivres = 1;
    const depois = ok(distribuirPonto(e, 'h1', 'vigor'));
    const h = depois.herois[0];
    expect(h.atributos.vigor).toBe(7);
    expect(h.vida).toBe(vidaMaxima(h));
    expect(depois.estatisticas.pontosDistribuidos).toBe(1);
    expect(distribuirPonto(depois, 'h1', 'vigor').ok).toBe(false);
  });

  it('distribuição sugerida usa todos os pontos conforme o papel', () => {
    const e = novoJogo('Aren');
    e.herois[0].pontosLivres = 4;
    const h = ok(distribuirSugerido(e, 'h1')).herois[0];
    expect(h.pontosLivres).toBe(0);
    expect(h.atributos.poder + h.atributos.vigor).toBe(4 + 6 + 4);
    expect(h.atributos.vigor - h.atributos.poder).toBeLessThanOrEqual(2);
  });

  it('forja consome recursos e cada arma fica com um herói só', () => {
    let e = novoJogo('Aren');
    expect(forjar(e, 'espada').ok).toBe(false);
    e.ouro = 100;
    e.materiais.gosma = 8.5;
    e = ok(forjar(e, 'espada'));
    expect(e.ouro).toBe(70);
    expect(e.materiais.gosma).toBeCloseTo(0.5);
    const antes = dano(e.herois[0]);
    e = ok(equipar(e, 'h1', 'espada'));
    expect(dano(e.herois[0])).toBeCloseTo(antes + (8 * 1.5 - 2) * 0.8);
    e = ok(contratar(e, 'Lia', 'mistica'));
    expect(armasLivres(e, 'espada')).toBe(0);
    expect(equipar(e, 'h2', 'espada').ok).toBe(false);
  });

  it('contratar cobra ouro e respeita o limite da party', () => {
    let e = novoJogo('Aren');
    expect(contratar(e, 'Lia', 'mistica').ok).toBe(false);
    e.ouro = 1000;
    e = ok(contratar(e, 'Lia', 'mistica'));
    e = ok(contratar(e, 'Nim', 'cacadora'));
    expect(e.ouro).toBe(1000 - 40 - 250);
    expect(contratar(e, 'Bo', 'guerreiro').ok).toBe(false);
  });
});

describe('aplausos', () => {
  it('recebidos e dados viram ouro e entram no diário', () => {
    let e = novoJogo('Aren');
    expect(receberAplausos(e, 0).ok).toBe(false);
    e = ok(receberAplausos(e, 2));
    expect(e.ouro).toBe(50);
    e = ok(aplausoDado(e, 'Bia'));
    expect(e.ouro).toBe(60);
    expect(e.diario.at(-1)?.evento).toEqual({ tipo: 'aplaudiu', apelido: 'Bia', ouro: 10 });
  });
});

describe('objetivos', () => {
  it('só entregam a recompensa quando cumpridos, em ordem', () => {
    let e = novoJogo('Aren');
    expect(receberObjetivo(e).ok).toBe(false);
    e.estatisticas.abates.campina = 10;
    expect(objetivoCumprido(e)).toBe(true);
    e = ok(receberObjetivo(e));
    expect(e.objetivo).toBe(1);
    expect(e.ouro).toBe(OBJETIVOS[0].recompensa);
    expect(receberObjetivo(e).ok).toBe(false);
  });

  it('o primeiro objetivo é cumprido só jogando', () => {
    const e = avancar(novoJogo('Aren'), 300);
    expect(objetivoCumprido(e)).toBe(true);
  });

  it('a lista termina sem erro', () => {
    const e = novoJogo('Aren');
    e.objetivo = OBJETIVOS.length;
    expect(receberObjetivo(e).ok).toBe(false);
  });
});

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const e = avancar(comMistica(), 120);
    expect(desserializar(serializar(e, 123))).toEqual({ estado: e, salvoEm: 123 });
  });

  it('rejeita saves inválidos e da versão anterior', () => {
    expect(desserializar(null)).toBeNull();
    expect(desserializar('{quebrado')).toBeNull();
    const ruim = JSON.parse(serializar(novoJogo('Aren'), 1));
    ruim.estado.zona = 'lua';
    expect(desserializar(JSON.stringify(ruim))).toBeNull();
    ruim.estado.zona = 'campina';
    ruim.estado.versao = 1;
    expect(desserializar(JSON.stringify(ruim))).toBeNull();
  });
});
