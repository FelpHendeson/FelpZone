import type { OpcoesItem } from './itens';
import type { Estado, Material, PersonagemId } from './tipos';

/** Tela onde o jogador cumpre o objetivo. */
export type Destino = 'batalha' | 'party' | 'cidade' | 'expedicoes' | 'mundo';

export interface Objetivo {
  titulo: string;
  dica: string;
  destino: Destino;
  recompensa: { ouro?: number; materiais?: Partial<Record<Material, number>>; item?: Omit<OpcoesItem, 'nivel'> };
  progresso: (e: Estado) => [number, number];
}

const sim = (c: boolean): [number, number] => [c ? 1 : 0, 1];
const tem = (e: Estado, id: PersonagemId) => e.herois.some((h) => h.id === id);
const nivelLider = (e: Estado) => e.herois.find((h) => h.id === 'leao')?.nivel ?? 1;

/** A campanha: cada passo ensina um sistema e conta um pedaço da história. */
export const OBJETIVOS: Objetivo[] = [
  {
    titulo: 'Derrote 15 inimigos',
    dica: 'A party luta sozinha. As barras sob os heróis mostram quando atacam e as habilidades disparam quando recarregam.',
    destino: 'batalha',
    recompensa: { ouro: 30 },
    progresso: (e) => [e.estatisticas.abates, 15],
  },
  {
    titulo: 'Distribua os pontos de Sir LionHearth',
    dica: 'Cada nível dá 3 pontos. Em Party, abra o Sir LionHearth e use os + ou o botão de sugestão.',
    destino: 'party',
    recompensa: { ouro: 20 },
    progresso: (e) => sim(Object.values(e.herois[0]?.pontos ?? {}).some((v) => v > 0)),
  },
  {
    titulo: 'Recrute Quentin Salamander',
    dica: 'O escudeiro espera na Taverna (Cidade). Com ele na frente, os golpes vão para quem aguenta.',
    destino: 'cidade',
    recompensa: { ouro: 40 },
    progresso: (e) => sim(tem(e, 'quentin')),
  },
  {
    titulo: 'Complete a armadura de alguém',
    dica: 'Equipe elmo, manoplas, calças ou botas: toque no herói, em Equipamento, e escolha um espaço vazio.',
    destino: 'party',
    recompensa: { item: { base: 'amuleto', minima: 'raro' } },
    progresso: (e) => sim(e.herois.some((h) => ['elmo', 'manoplas', 'calcas', 'botas'].some((s) => h.equipamento[s as 'elmo']))),
  },
  {
    titulo: 'Aprenda um nó da árvore de habilidades',
    dica: 'A partir do nível 3, cada nível dá um ponto de habilidade. Veja em Party › herói › Árvore.',
    destino: 'party',
    recompensa: { ouro: 60 },
    progresso: (e) => sim(e.herois.some((h) => h.nos.length > 2)),
  },
  {
    titulo: 'Melhore um equipamento no Ferreiro',
    dica: 'Melhorar (+1 a +10) usa ouro e materiais dos monstros. Cidade › Ferreiro.',
    destino: 'cidade',
    recompensa: { materiais: { ferrugem: 15 } },
    progresso: (e) => [e.estatisticas.melhorias, 1],
  },
  {
    titulo: 'Derrote o primeiro chefe',
    dica: 'A cada 10 ondas aparece um chefe. Ele sempre deixa um item.',
    destino: 'batalha',
    recompensa: { ouro: 120 },
    progresso: (e) => [e.estatisticas.chefes, 1],
  },
  {
    titulo: 'Recrute Cyrus Viper',
    dica: 'O aprendiz de mago chega à Taverna quando Sir LionHearth atinge o nível 5. Raios em área!',
    destino: 'cidade',
    recompensa: { ouro: 150 },
    progresso: (e) => sim(tem(e, 'cyrus')),
  },
  {
    titulo: 'Mande alguém explorar ou treinar',
    dica: 'Em Expedições, heróis saem da batalha por um tempo e voltam com itens, relíquias ou XP.',
    destino: 'expedicoes',
    recompensa: { materiais: { essencia: 1 } },
    progresso: (e) => sim(e.estatisticas.missoes > 0 || e.herois.some((h) => h.atividade.tipo !== 'batalha')),
  },
  {
    titulo: 'Leve a party ao Bosque Suspenso',
    dica: 'O mapa abre no nível 8 do Sir LionHearth. Mapas novos deixam os antigos para trás.',
    destino: 'batalha',
    recompensa: { ouro: 250 },
    progresso: (e) => sim(e.batalha.mapa !== 'patio' || nivelLider(e) >= 16),
  },
  {
    titulo: 'Venda algo na Loja',
    dica: 'Itens fracos e materiais sobrando viram ouro. Cidade › Loja.',
    destino: 'cidade',
    recompensa: { ouro: 80 },
    progresso: (e) => [e.estatisticas.vendas, 1],
  },
  {
    titulo: 'Recrute Vesper Ashveil',
    dica: 'A Lâmina da Névoa chega no nível 10. Dano constante e críticos.',
    destino: 'cidade',
    recompensa: { item: { base: 'anel', minima: 'raro' } },
    progresso: (e) => sim(tem(e, 'vesper')),
  },
  {
    titulo: 'Forje um equipamento',
    dica: 'O Ferreiro forja a peça que você escolher, no nível do mapa. Com essência, a raridade melhora.',
    destino: 'cidade',
    recompensa: { materiais: { pena: 10 } },
    progresso: (e) => [e.estatisticas.itensForjados, 1],
  },
  {
    titulo: 'Recrute Odalys Thornwick',
    dica: 'A feiticeira das runas chega no nível 14 e fecha a party de cinco.',
    destino: 'cidade',
    recompensa: { ouro: 600 },
    progresso: (e) => sim(tem(e, 'odalys')),
  },
  {
    titulo: 'Plante uma fusão no Jardim',
    dica: 'O Jardim une duas habilidades de um herói numa nova. Algumas combinações têm receita secreta.',
    destino: 'cidade',
    recompensa: { materiais: { essencia: 2 } },
    progresso: (e) => sim(e.estatisticas.fusoes > 0 || e.canteiros.some(Boolean)),
  },
  {
    titulo: 'Chegue às Ruínas da Velha Hope',
    dica: 'Abre no nível 15. A primeira capital do reino guarda o conjunto Vigília de Hope.',
    destino: 'batalha',
    recompensa: { ouro: 900 },
    progresso: (e) => sim(['ruinas', 'vulcao', 'cidadela'].includes(e.batalha.mapa)),
  },
  {
    titulo: 'Desperte o Leão das Chamas',
    dica: 'No nível 15, a árvore do Sir LionHearth une os dois ramos: o cavaleiro justo e a fúria do leão.',
    destino: 'party',
    recompensa: { item: { reliquia: true, minima: 'epico' } },
    progresso: (e) => sim(e.herois.some((h) => h.habilidades.some((x) => x.id === 'leaoDasChamas'))),
  },
  {
    titulo: 'Colha uma fusão',
    dica: 'Fusões levam 20 minutos para crescer, inclusive com o jogo fechado.',
    destino: 'cidade',
    recompensa: { materiais: { essencia: 3 } },
    progresso: (e) => [e.estatisticas.fusoes, 1],
  },
  {
    titulo: 'Chegue à Forja Vulcânica',
    dica: 'Abre no nível 23: a terra natal do povo de Quentin.',
    destino: 'batalha',
    recompensa: { ouro: 3000 },
    progresso: (e) => sim(['vulcao', 'cidadela'].includes(e.batalha.mapa)),
  },
  {
    titulo: 'Chegue à Cidadela das Nuvens',
    dica: 'Abre no nível 31: a fortaleza acima de todas as ilhas.',
    destino: 'batalha',
    recompensa: { ouro: 8000 },
    progresso: (e) => sim(e.batalha.mapa === 'cidadela'),
  },
  {
    titulo: 'Vença o chefe da Cidadela',
    dica: 'O nome LionHearth vai ecoar por todas as Sky Islands.',
    destino: 'batalha',
    recompensa: { item: { reliquia: true, raridade: 'lendario' } },
    progresso: (e) => [Math.min(10, e.estatisticas.maiorOnda.cidadela ?? 0), 10],
  },
];

export function objetivoAtual(e: Estado): Objetivo | null {
  return OBJETIVOS[e.objetivo] ?? null;
}

export function objetivoCumprido(e: Estado): boolean {
  const o = objetivoAtual(e);
  if (!o) return false;
  const [a, t] = o.progresso(e);
  return a >= t;
}
