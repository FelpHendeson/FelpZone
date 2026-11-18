/* Tipos do motor. Tudo aqui é dado puro (serializável em JSON). */

export type Stat = 'vida' | 'atq' | 'def' | 'vel' | 'atqM' | 'defM' | 'velM';
export type Stats = Record<Stat, number>;

export type Elemento = 'neutro' | 'fogo' | 'raio' | 'sombra' | 'natureza' | 'vento' | 'gelo' | 'luz';
export type Escola = 'fisica' | 'magica';

export type PersonagemId = 'leao' | 'quentin' | 'cyrus' | 'vesper' | 'odalys';
export type Papel = 'equilibrado' | 'tanque' | 'area' | 'dps' | 'suporte';

/* ---------- Modificadores: usados por buffs, passivas, conjuntos, relíquias e árvore ---------- */

export type Mod =
  | { tipo: 'stat'; stat: Stat; pct: number }
  | { tipo: 'danoCausado'; pct: number }
  | { tipo: 'danoRecebido'; pct: number }
  | { tipo: 'elemento'; elemento: Elemento; pct: number }
  | { tipo: 'critico'; pct: number }
  | { tipo: 'danoCritico'; pct: number }
  | { tipo: 'rouboVida'; pct: number }
  | { tipo: 'regen'; pct: number }
  | { tipo: 'recarga'; pct: number }
  | { tipo: 'ameaca'; pct: number }
  | { tipo: 'espinhos'; pct: number }
  | { tipo: 'cura'; pct: number }
  | { tipo: 'xp'; pct: number }
  | { tipo: 'ouro'; pct: number }
  | { tipo: 'saque'; pct: number };

/* ---------- Habilidades ---------- */

export type TipoHabilidade = 'ativa' | 'passiva' | 'transformacao';
export type Rank = 'D' | 'C' | 'B' | 'A' | 'S';

export type Efeito =
  | { tipo: 'dano'; mult: number; area?: boolean; golpes?: number }
  | { tipo: 'dot'; mult: number; duracao: number; area?: boolean }
  /** Cura e escudo valem `mult` × o atributo `base` de quem lança. */
  | { tipo: 'cura'; mult: number; base: Stat; todos?: boolean }
  | { tipo: 'escudo'; mult: number; base: Stat; todos?: boolean }
  | { tipo: 'buff'; mods: Mod[]; duracao: number; todos?: boolean }
  | { tipo: 'debuff'; mods: Mod[]; duracao: number; area?: boolean }
  | { tipo: 'provocar'; duracao: number };

export interface Habilidade {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoHabilidade;
  escola: Escola;
  elemento: Elemento;
  rank: Rank;
  /** Segundos de recarga (ativas e transformações). */
  recarga: number;
  efeitos: Efeito[];
  /** Passivas: modificadores sempre ativos. Transformação: modificadores durante o efeito. */
  mods?: Mod[];
  /** Transformação: duração em segundos. */
  duracao?: number;
  /** Aura: a passiva vale para toda a party. */
  aura?: boolean;
  /** Criada no Jardim (não existe nos dados fixos). */
  criada?: boolean;
}

export interface HabilidadeAprendida {
  id: string;
  nivel: number;
  xp: number;
}

/* ---------- Itens ---------- */

export type Slot =
  | 'elmo'
  | 'peitoral'
  | 'manoplas'
  | 'calcas'
  | 'botas'
  | 'arma'
  | 'secundaria'
  | 'acessorio1'
  | 'acessorio2'
  | 'reliquia';

/** Onde o item encaixa; acessórios servem nos dois espaços. */
export type TipoSlot = Exclude<Slot, 'acessorio1' | 'acessorio2'> | 'acessorio';

export type Raridade = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type Material = 'ferrugem' | 'pena' | 'osso' | 'brasa' | 'nucleo' | 'essencia';

export interface Afixo {
  stat: Stat;
  pct: number;
}

export interface Item {
  uid: string;
  base: string;
  raridade: Raridade;
  /** Nível de poder do item (define os atributos base). */
  nivel: number;
  /** Melhorias no ferreiro: +0 a +10. */
  melhoria: number;
  afixos: Afixo[];
  /** Peça de um conjunto (bônus ao usar várias peças). */
  conjunto?: string;
}

/* ---------- Heróis ---------- */

export type Atividade =
  | { tipo: 'batalha' }
  | { tipo: 'exploracao'; missao: string; inicio: number; fim: number }
  | { tipo: 'treino'; inicio: number; fim: number };

export interface Heroi {
  id: PersonagemId;
  nivel: number;
  xp: number;
  pontosLivres: number;
  pontos: Stats;
  pontosHabilidade: number;
  /** Nós da árvore já aprendidos. */
  nos: string[];
  habilidades: HabilidadeAprendida[];
  /** Até 5 habilidades em uso (ataque básico é automático). */
  equipadas: string[];
  equipamento: Partial<Record<Slot, Item>>;
  atividade: Atividade;
}

/* ---------- Batalha ---------- */

export interface Efeitoativo {
  id: string;
  mods: Mod[];
  restante: number;
}

export interface Combatente {
  vida: number;
  escudo: number;
  /** Barra do ataque básico, de 0 a 1. */
  barra: number;
  recargas: Record<string, number>;
  buffs: Efeitoativo[];
  /** Dano por segundo contínuo (queimadura, veneno...). */
  dots: { valor: number; restante: number; elemento: Elemento }[];
  provocando: number;
}

export interface Inimigo extends Combatente {
  uid: number;
  monstro: string;
  nivel: number;
  chefe: boolean;
}

export interface EventoVisual {
  t: number;
  /** 'h:leao' para herói, 'i:12' para inimigo. */
  alvo: string;
  valor: number;
  tipo: 'dano' | 'cura' | 'escudo' | 'critico';
  elemento: Elemento;
}

export interface Batalha {
  mapa: string;
  onda: number;
  situacao: 'lutando' | 'descansando';
  inimigos: Inimigo[];
  herois: Partial<Record<PersonagemId, Combatente>>;
  /** Habilidades lançadas há pouco, para a interface mostrar o nome. */
  lancadas: { t: number; heroi: PersonagemId; habilidade: string }[];
  visuais: EventoVisual[];
  proximoUid: number;
}

/* ---------- Jardim, expedições e registro ---------- */

export interface Canteiro {
  heroi: PersonagemId;
  a: string;
  b: string;
  inicio: number;
  fim: number;
}

export interface ResultadoMissao {
  ouro: number;
  xp: number;
  materiais: Partial<Record<Material, number>>;
  itens: Item[];
}

export type Evento =
  | { tipo: 'subiuNivel'; heroi: PersonagemId; nivel: number }
  | { tipo: 'mapaLiberado'; mapa: string }
  | { tipo: 'recrutou'; heroi: PersonagemId }
  | { tipo: 'drop'; item: Item }
  | { tipo: 'chefe'; mapa: string; onda: number }
  | { tipo: 'derrota'; mapa: string }
  | { tipo: 'forjou'; item: Item }
  | { tipo: 'melhorou'; item: Item }
  | { tipo: 'aprendeu'; heroi: PersonagemId; habilidade: string }
  | { tipo: 'fusao'; heroi: PersonagemId; habilidade: string }
  | { tipo: 'missao'; herois: PersonagemId[]; missao: string; resultado: ResultadoMissao }
  | { tipo: 'objetivo'; indice: number }
  | { tipo: 'bestiario'; monstro: string; abates: number }
  | { tipo: 'aplausosRecebidos'; quantidade: number; ouro: number }
  | { tipo: 'aplaudiu'; apelido: string; ouro: number };

export interface RegistroEvento {
  t: number;
  evento: Evento;
}

export interface Estatisticas {
  abates: number;
  chefes: number;
  maiorOnda: Record<string, number>;
  itensForjados: number;
  melhorias: number;
  vendas: number;
  missoes: number;
  fusoes: number;
  /** Abates e chefes por espécie de monstro. */
  bestiario: Record<string, { abates: number; chefes: number }>;
}

export interface Estado {
  versao: 3;
  /** Segundos de jogo simulados. */
  tempo: number;
  /** Semente do gerador pseudoaleatório (o jogo é determinístico). */
  semente: number;
  ouro: number;
  materiais: Record<Material, number>;
  herois: Heroi[];
  inventario: Item[];
  mapasLiberados: string[];
  batalha: Batalha;
  canteiros: (Canteiro | null)[];
  /** Habilidades criadas no Jardim. */
  criadas: Record<string, Habilidade>;
  loja: { itens: Item[]; renovaEm: number };
  objetivo: number;
  estatisticas: Estatisticas;
  diario: RegistroEvento[];
  proximoUid: number;
}
