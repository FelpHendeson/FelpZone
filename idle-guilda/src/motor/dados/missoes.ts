import { gerarItem } from '../itens';
import { aleatorio, sortearPeso } from '../rng';
import type { Estado, Material, ResultadoMissao } from '../tipos';
import { mapaPorId, recompensaOuro, recompensaXp } from './mapas';

export interface Missao {
  id: string;
  mapa: string;
  nome: string;
  descricao: string;
  duracao: number;
  maxHerois: number;
  /** Peso da recompensa: missões longas rendem mais por segundo em itens raros. */
  itens: number;
  pesosRaridade: number[];
  chanceReliquia: number;
}

const MINUTO = 60;
const HORA = 60 * MINUTO;

function missoesDoMapa(mapa: string, nomes: [string, string, string]): Missao[] {
  return [
    {
      id: `${mapa}-curta`, mapa, nome: nomes[0], descricao: 'Uma ronda rápida pelos arredores.',
      duracao: 15 * MINUTO, maxHerois: 1, itens: 1, pesosRaridade: [45, 35, 16, 3.5, 0.5], chanceReliquia: 0,
    },
    {
      id: `${mapa}-media`, mapa, nome: nomes[1], descricao: 'Exploração de pontos escondidos do mapa.',
      duracao: 2 * HORA, maxHerois: 2, itens: 3, pesosRaridade: [20, 35, 30, 12, 3], chanceReliquia: 0.12,
    },
    {
      id: `${mapa}-longa`, mapa, nome: nomes[2], descricao: 'Uma expedição profunda, atrás de relíquias.',
      duracao: 8 * HORA, maxHerois: 3, itens: 6, pesosRaridade: [5, 25, 40, 22, 8], chanceReliquia: 0.45,
    },
  ];
}

export const MISSOES: Missao[] = [
  ...missoesDoMapa('patio', ['Ronda nas muralhas', 'Minas abandonadas da Ilha de Aço', 'O cofre perdido dos LionHearth']),
  ...missoesDoMapa('bosque', ['Trilha das copas', 'Ninhos das harpias', 'O coração do Bosque Suspenso']),
  ...missoesDoMapa('ruinas', ['Ruas de Velha Hope', 'Catacumbas reais', 'O trono esquecido']),
  ...missoesDoMapa('vulcao', ['Rios de lava', 'Berçário salamandrino', 'A primeira forja']),
  ...missoesDoMapa('cidadela', ['Pontes de nuvem', 'Arsenal celeste', 'O observatório do céu']),
];

/** Treino: XP garantida por segundo, sem risco e sem saque. */
export const TREINO_XP_POR_SEGUNDO = (nivel: number) => recompensaXp(nivel) * 0.15;

export function recompensaMissao(e: Estado, m: Missao, niveis: number[]): ResultadoMissao {
  const mapa = mapaPorId(m.mapa);
  const nivel = Math.max(mapa.nivelInimigo, Math.round(niveis.reduce((s, n) => s + n, 0) / Math.max(1, niveis.length)));
  const horas = m.duracao / HORA;
  const materiais: Partial<Record<Material, number>> = { [mapa.material]: Math.round((6 + aleatorio(e) * 6) * horas * 4 + 4) };
  if (aleatorio(e) < 0.3 * horas) materiais.essencia = 1 + Math.floor(aleatorio(e) * horas * 0.5);
  const itens = [];
  for (let i = 0; i < m.itens; i++) {
    itens.push(gerarItem(e, { nivel: nivel + 2, pesos: m.pesosRaridade, conjunto: mapa.conjunto }));
  }
  if (aleatorio(e) < m.chanceReliquia) itens.push(gerarItem(e, { nivel, reliquia: true, pesos: [0, 0, 60, 30, 10] }));
  // Acessórios aparecem com mais frequência em expedições.
  if (aleatorio(e) < 0.5) {
    const base = ['anel', 'amuleto', 'bracelete'][sortearPeso(e, [1, 1, 1])];
    itens.push(gerarItem(e, { nivel: nivel + 2, base, pesos: m.pesosRaridade }));
  }
  return {
    ouro: Math.round(recompensaOuro(nivel) * 70 * horas * niveis.length),
    xp: Math.round(recompensaXp(nivel) * 50 * horas),
    materiais,
    itens,
  };
}
