import { describe, expect, it } from 'vitest';
import {
  alternarDescansoAutomatico,
  armasLivres,
  contratar,
  definirTarefa,
  distribuirPonto,
  equipar,
  forjar,
  novoJogo,
} from './acoes';
import { OFFLINE_MAXIMO_SEGUNDOS } from './dados';
import { ataque, estimativaCaca, vidaMaxima, xpParaProximo } from './regras';
import { desserializar, serializar } from './save';
import { aplicarTempoOffline, avancar } from './simulacao';
import type { Estado } from './tipos';

function ok(r: ReturnType<typeof forjar>): Estado {
  if (!r.ok) throw new Error(r.erro);
  return r.estado;
}

describe('simulação', () => {
  it('caçar gera xp, ouro e saque sem alterar o estado original', () => {
    const e = novoJogo('Aren', 'guerreiro');
    const depois = avancar(e, 60);
    expect(e.ouro).toBe(0);
    expect(depois.ouro).toBeGreaterThan(0);
    expect(depois.materiais.gosma).toBeGreaterThan(0);
    expect(depois.herois[0].abates).toBeGreaterThan(0);
    expect(depois.tempo).toBe(60);
  });

  it('é determinística', () => {
    const e = novoJogo('Aren', 'cacadora');
    expect(avancar(e, 500)).toEqual(avancar(avancar(e, 200), 300));
  });

  it('sobe de nível, ganha pontos e cura a vida', () => {
    const e = novoJogo('Aren', 'guerreiro');
    e.herois[0].xp = xpParaProximo(1) - 0.1;
    e.herois[0].vida = 10;
    e.herois[0].progressoAbate = 0.99;
    const h = avancar(e, 1).herois[0];
    expect(h.nivel).toBe(2);
    expect(h.pontosLivres).toBe(2);
    expect(h.atributos.forca).toBe(6);
    expect(h.vida).toBe(vidaMaxima(h));
  });

  it('descanso automático interrompe a caça e retoma depois', () => {
    let e = novoJogo('Aren', 'mistica');
    e.zonasLiberadas.push('ruinas');
    e = ok(definirTarefa(e, 'h1', { tipo: 'cacar', zona: 'ruinas' }));
    e = avancar(e, 30);
    expect(e.herois[0].tarefa.tipo).toBe('descansar');
    expect(e.herois[0].nocautes).toBe(0);
    const progresso = e.herois[0].progressoAbate;
    expect(progresso).toBeGreaterThan(0);
    let voltou = false;
    for (let i = 0; i < 200 && !voltou; i++) {
      e = avancar(e, 1);
      voltou = e.herois[0].tarefa.tipo === 'cacar';
    }
    expect(voltou).toBe(true);
    expect(e.herois[0].progressoAbate).toBeGreaterThanOrEqual(progresso);
    expect(e.herois[0].nocautes).toBe(0);
  });

  it('sem descanso automático o herói é nocauteado e fica descansando', () => {
    let e = novoJogo('Aren', 'mistica');
    e.zonasLiberadas.push('ruinas');
    e = ok(definirTarefa(e, 'h1', { tipo: 'cacar', zona: 'ruinas' }));
    e = ok(alternarDescansoAutomatico(e, 'h1'));
    e = avancar(e, 300);
    expect(e.herois[0].nocautes).toBe(1);
    expect(e.herois[0].tarefa.tipo).toBe('descansar');
    expect(e.diario.some((r) => r.evento.tipo === 'nocaute')).toBe(true);
  });

  it('fadiga reduz o rendimento até 50%', () => {
    const e = novoJogo('Aren', 'guerreiro');
    e.herois[0].descansoAutomatico = false;
    const cansado = structuredClone(e);
    cansado.herois[0].fadiga = 100;
    expect(avancar(cansado, 1).herois[0].progressoAbate).toBeCloseTo(avancar(e, 1).herois[0].progressoAbate / 2, 1);
  });

  it('minerar gera minério e libera zonas por nível', () => {
    let e = ok(definirTarefa(novoJogo('Aren', 'guerreiro'), 'h1', { tipo: 'minerar' }));
    e = avancar(e, 100);
    expect(e.materiais.minerio).toBeGreaterThan(5);
    e.herois[0].nivel = 5;
    e = avancar(e, 1);
    expect(e.zonasLiberadas).toContain('bosque');
    expect(e.diario.at(-1)?.evento).toEqual({ tipo: 'zonaLiberada', zona: 'bosque' });
  });

  it('progresso offline respeita o teto de 8 horas e resume os ganhos', () => {
    const e = novoJogo('Aren', 'guerreiro');
    const { estado, resumo } = aplicarTempoOffline(e, OFFLINE_MAXIMO_SEGUNDOS * 2);
    expect(estado.tempo).toBe(OFFLINE_MAXIMO_SEGUNDOS);
    expect(resumo.limitado).toBe(true);
    expect(resumo.ouro).toBe(Math.floor(estado.ouro));
    expect(resumo.herois[0].niveis).toBe(estado.herois[0].nivel - 1);
  });
});

describe('estimativas', () => {
  it('descontam as pausas para descansar', () => {
    const h = novoJogo('Aren', 'mistica').herois[0];
    const campina = estimativaCaca(h, 'campina');
    const ruinas = estimativaCaca(h, 'ruinas');
    expect(campina.tempoAtivo).toBeGreaterThan(0.5);
    expect(ruinas.tempoAtivo).toBeLessThan(0.2);
  });
});

describe('ações', () => {
  it('não caça em zona bloqueada', () => {
    const r = definirTarefa(novoJogo('Aren', 'guerreiro'), 'h1', { tipo: 'cacar', zona: 'ruinas' });
    expect(r.ok).toBe(false);
  });

  it('distribui pontos mantendo a proporção de vida', () => {
    const e = novoJogo('Aren', 'guerreiro');
    e.herois[0].pontosLivres = 1;
    const h = ok(distribuirPonto(e, 'h1', 'vigor')).herois[0];
    expect(h.atributos.vigor).toBe(6);
    expect(h.vida).toBe(vidaMaxima(h));
    expect(distribuirPonto(ok(distribuirPonto(e, 'h1', 'vigor')), 'h1', 'vigor').ok).toBe(false);
  });

  it('forja consome recursos e a arma não pode ser usada por dois heróis', () => {
    let e = novoJogo('Aren', 'guerreiro');
    expect(forjar(e, 'espada').ok).toBe(false);
    e.ouro = 300;
    e.materiais.minerio = 10;
    e.materiais.gosma = 5.9;
    e = ok(forjar(e, 'espada'));
    expect(e.ouro).toBe(240);
    expect(e.materiais.minerio).toBe(0);
    expect(e.armas.espada).toBe(1);
    const antes = ataque(e.herois[0]);
    e = ok(equipar(e, 'h1', 'espada'));
    expect(ataque(e.herois[0])).toBe(antes - 2 + 9 * 1.5);
    e = ok(contratar(e, 'Lia', 'cacadora'));
    expect(armasLivres(e, 'espada')).toBe(0);
    expect(equipar(e, 'h2', 'espada').ok).toBe(false);
  });

  it('contratar cobra ouro e respeita o limite da guilda', () => {
    let e = novoJogo('Aren', 'guerreiro');
    expect(contratar(e, 'Lia', 'cacadora').ok).toBe(false);
    e.ouro = 2000;
    e = ok(contratar(e, 'Lia', 'cacadora'));
    e = ok(contratar(e, 'Nim', 'mistica'));
    expect(e.ouro).toBe(2000 - 150 - 900);
    expect(e.herois.map((h) => h.id)).toEqual(['h1', 'h2', 'h3']);
    expect(contratar(e, 'Bo', 'guerreiro').ok).toBe(false);
  });
});

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const e = avancar(novoJogo('Aren', 'guerreiro'), 120);
    expect(desserializar(serializar(e, 123))).toEqual({ estado: e, salvoEm: 123 });
  });

  it('rejeita saves inválidos', () => {
    expect(desserializar(null)).toBeNull();
    expect(desserializar('{quebrado')).toBeNull();
    const e = novoJogo('Aren', 'guerreiro');
    const ruim = JSON.parse(serializar(e, 1));
    ruim.estado.herois[0].tarefa = { tipo: 'cacar', zona: 'lua' };
    expect(desserializar(JSON.stringify(ruim))).toBeNull();
    ruim.estado.versao = 2;
    expect(desserializar(JSON.stringify(ruim))).toBeNull();
  });
});
