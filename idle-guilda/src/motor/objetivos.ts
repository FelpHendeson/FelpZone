import { maiorNivel } from './regras';
import type { Estado } from './tipos';

/** Onde o jogador deve ir para cumprir o objetivo. */
export type Destino = 'expedicao' | 'forja' | 'taverna';

export interface Objetivo {
  titulo: string;
  dica: string;
  destino: Destino;
  recompensa: number;
  /** [atual, total]; o objetivo está cumprido quando atual >= total. */
  progresso: (e: Estado) => [number, number];
}

const sim = (cond: boolean): [number, number] => [cond ? 1 : 0, 1];

/** Sequência que funciona como tutorial: cada passo ensina uma parte do jogo. */
export const OBJETIVOS: Objetivo[] = [
  {
    titulo: 'Derrote 10 gosmas',
    dica: 'Sua party luta sozinha. É só esperar e acompanhar a cena.',
    destino: 'expedicao',
    recompensa: 10,
    progresso: (e) => [e.estatisticas.abates.campina, 10],
  },
  {
    titulo: 'Forje uma Espada de ferro',
    dica: 'Abra a Forja, embaixo. A espada custa ouro e gosmas, que caem dos monstros.',
    destino: 'forja',
    recompensa: 10,
    progresso: (e) => sim(e.armas.espada > 0),
  },
  {
    titulo: 'Equipe a espada no Guerreiro',
    dica: 'Na Expedição, toque no Guerreiro na lista da party e escolha a espada.',
    destino: 'expedicao',
    recompensa: 10,
    progresso: (e) => sim(e.herois.some((h) => h.classe === 'guerreiro' && h.arma === 'espada')),
  },
  {
    titulo: 'Distribua um ponto de atributo',
    dica: 'Cada nível dá 2 pontos. Toque no herói com o selo "+pontos" e use o botão +.',
    destino: 'expedicao',
    recompensa: 15,
    progresso: (e) => [e.estatisticas.pontosDistribuidos, 1],
  },
  {
    titulo: 'Contrate uma Mística',
    dica: 'Na Taverna, contrate uma Mística. Ela cura o grupo e todos ganham mais XP.',
    destino: 'taverna',
    recompensa: 20,
    progresso: (e) => sim(e.herois.some((h) => h.classe === 'mistica')),
  },
  {
    titulo: 'Equipe um Cajado rúnico na Mística',
    dica: 'Forje o cajado e depois toque na Mística para equipar.',
    destino: 'forja',
    recompensa: 25,
    progresso: (e) => sim(e.herois.some((h) => h.classe === 'mistica' && h.arma === 'cajado')),
  },
  {
    titulo: 'Chegue ao nível 5',
    dica: 'O Bosque Sombrio abre no nível 5. Continue distribuindo os pontos.',
    destino: 'expedicao',
    recompensa: 30,
    progresso: (e) => [Math.min(maiorNivel(e), 5), 5],
  },
  {
    titulo: 'Leve a party ao Bosque Sombrio',
    dica: 'Na Expedição, escolha o Bosque Sombrio. Lobos dão mais XP, ouro e couro.',
    destino: 'expedicao',
    recompensa: 30,
    progresso: (e) => sim(e.zona === 'bosque' || e.zona === 'ruinas'),
  },
  {
    titulo: 'Complete a party com uma Caçadora',
    dica: 'Na Taverna, contrate uma Caçadora. Ela causa muito dano e acha mais materiais.',
    destino: 'taverna',
    recompensa: 50,
    progresso: (e) => sim(e.herois.some((h) => h.classe === 'cacadora')),
  },
  {
    titulo: 'Derrote 150 lobos',
    dica: 'Se a party recua muito, ponha pontos em Vigor no Guerreiro.',
    destino: 'expedicao',
    recompensa: 100,
    progresso: (e) => [e.estatisticas.abates.bosque, 150],
  },
  {
    titulo: 'Entre nas Ruínas Antigas',
    dica: 'As Ruínas abrem no nível 10. Os esqueletos batem forte.',
    destino: 'expedicao',
    recompensa: 150,
    progresso: (e) => sim(e.zona === 'ruinas'),
  },
  {
    titulo: 'Forje a Lâmina das ruínas',
    dica: 'A arma mais forte: precisa de couro do Bosque e fragmentos das Ruínas.',
    destino: 'forja',
    recompensa: 300,
    progresso: (e) => sim(e.armas.lamina > 0),
  },
];

export function objetivoAtual(e: Estado): Objetivo | null {
  return OBJETIVOS[e.objetivo] ?? null;
}

export function objetivoCumprido(e: Estado): boolean {
  const o = objetivoAtual(e);
  if (!o) return false;
  const [atual, total] = o.progresso(e);
  return atual >= total;
}
