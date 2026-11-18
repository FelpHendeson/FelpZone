import { criarContexto, DT, passo } from './combate';
import { MATERIAIS } from './dados/itens';
import { PERSONAGENS } from './dados/personagens';
import { gerarItem } from './itens';
import { registrar } from './progressao';
import { statsZerados } from './status';
import type { Estado, Heroi, Material, PersonagemId } from './tipos';

export const OFFLINE_MAXIMO_SEGUNDOS = 8 * 60 * 60;
export const LOJA_RENOVA_SEGUNDOS = 15 * 60;
export const CANTEIROS = 2;

export function criarHeroi(id: PersonagemId, nivel = 1): Heroi {
  const p = PERSONAGENS[id];
  return {
    id,
    nivel,
    xp: 0,
    pontosLivres: (nivel - 1) * 3,
    pontos: statsZerados(),
    pontosHabilidade: nivel - 1,
    nos: ['raiz1', 'raiz2'],
    habilidades: p.habilidadesIniciais.map((h) => ({ id: h, nivel: 1, xp: 0 })),
    equipadas: [...p.habilidadesIniciais],
    equipamento: {},
    atividade: { tipo: 'batalha' },
  };
}

export function novoJogo(semente = Date.now()): Estado {
  const e: Estado = {
    versao: 3,
    tempo: 0,
    semente: semente | 0,
    ouro: 0,
    materiais: { ferrugem: 0, pena: 0, osso: 0, brasa: 0, nucleo: 0, essencia: 0 },
    herois: [criarHeroi('leao')],
    inventario: [],
    mapasLiberados: ['patio'],
    batalha: { mapa: 'patio', onda: 1, situacao: 'lutando', inimigos: [], herois: {}, lancadas: [], visuais: [], proximoUid: 0 },
    canteiros: Array.from({ length: CANTEIROS }, () => null),
    criadas: {},
    loja: { itens: [], renovaEm: 0 },
    objetivo: 0,
    estatisticas: { abates: 0, chefes: 0, maiorOnda: {}, itensForjados: 0, melhorias: 0, vendas: 0, missoes: 0, fusoes: 0, bestiario: {} },
    diario: [],
    proximoUid: 0,
  };
  // Equipamento inicial do herdeiro LionHearth.
  e.herois[0].equipamento.arma = { ...gerarItem(e, { nivel: 1, base: 'espada', raridade: 'comum' }) };
  e.herois[0].equipamento.secundaria = { ...gerarItem(e, { nivel: 1, base: 'escudo', raridade: 'comum' }) };
  e.herois[0].equipamento.peitoral = { ...gerarItem(e, { nivel: 1, base: 'peitoral-pesada', raridade: 'comum' }) };
  renovarLoja(e);
  registrar(e, { tipo: 'recrutou', heroi: 'leao' });
  return e;
}

/** Nível de referência para itens da loja e da forja: o maior nível da party. */
export function nivelDaParty(e: Estado): number {
  return e.herois.reduce((m, h) => Math.max(m, h.nivel), 1);
}

export function renovarLoja(e: Estado): void {
  const nivel = nivelDaParty(e);
  e.loja.itens = Array.from({ length: 6 }, () => gerarItem(e, { nivel, pesos: [55, 35, 10, 0, 0] }));
  e.loja.renovaEm = e.tempo + LOJA_RENOVA_SEGUNDOS;
}

/** Avança o jogo pelos segundos informados (em passos de meio segundo), sem alterar o original. */
export function avancar(estado: Estado, segundos: number): Estado {
  const passos = Math.floor(segundos / DT + 1e-9);
  if (passos <= 0) return estado;
  const e = structuredClone(estado);
  const ctx = criarContexto(e);
  for (let i = 0; i < passos; i++) {
    passo(e, ctx);
    if (e.tempo >= e.loja.renovaEm) renovarLoja(e);
  }
  return e;
}

export interface ResumoOffline {
  segundos: number;
  limitado: boolean;
  ouro: number;
  abates: number;
  chefes: number;
  materiais: Partial<Record<Material, number>>;
  itens: number;
  niveis: { id: PersonagemId; niveis: number }[];
}

export function aplicarTempoOffline(estado: Estado, segundos: number): { estado: Estado; resumo: ResumoOffline } {
  const efetivo = Math.min(Math.max(0, segundos), OFFLINE_MAXIMO_SEGUNDOS);
  const depois = avancar(estado, efetivo);
  const materiais: Partial<Record<Material, number>> = {};
  for (const m of Object.keys(MATERIAIS) as Material[]) {
    const ganho = Math.floor(depois.materiais[m]) - Math.floor(estado.materiais[m]);
    if (ganho > 0) materiais[m] = ganho;
  }
  return {
    estado: depois,
    resumo: {
      segundos: efetivo,
      limitado: segundos > OFFLINE_MAXIMO_SEGUNDOS,
      ouro: Math.floor(depois.ouro) - Math.floor(estado.ouro),
      abates: depois.estatisticas.abates - estado.estatisticas.abates,
      chefes: depois.estatisticas.chefes - estado.estatisticas.chefes,
      materiais,
      itens: Math.max(0, depois.inventario.length - estado.inventario.length),
      niveis: depois.herois.map((h) => ({
        id: h.id,
        niveis: h.nivel - (estado.herois.find((a) => a.id === h.id)?.nivel ?? h.nivel),
      })),
    },
  };
}

