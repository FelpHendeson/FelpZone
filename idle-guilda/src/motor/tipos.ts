export type Classe = 'guerreiro' | 'cacadora' | 'mistica';
export type Atributo = 'poder' | 'vigor';
export type Material = 'gosma' | 'couro' | 'fragmento';
export type ZonaId = 'campina' | 'bosque' | 'ruinas';
export type ArmaId = 'bastao' | 'espada' | 'arco' | 'cajado' | 'lamina';

export interface Heroi {
  id: string;
  nome: string;
  classe: Classe;
  nivel: number;
  xp: number;
  pontosLivres: number;
  atributos: Record<Atributo, number>;
  vida: number;
  arma: ArmaId;
}

/** A party inteira faz a mesma coisa: lutar numa zona ou descansar no acampamento. */
export type Situacao = 'lutando' | 'descansando';

/** Acontecimentos estruturados; o texto é montado na interface. */
export type Evento =
  | { tipo: 'subiuNivel'; heroi: string; nivel: number }
  | { tipo: 'zonaLiberada'; zona: ZonaId }
  | { tipo: 'forjou'; arma: ArmaId }
  | { tipo: 'contratou'; heroi: string; classe: Classe }
  | { tipo: 'objetivo'; indice: number };

export interface RegistroEvento {
  /** Segundos de jogo em que aconteceu. */
  t: number;
  evento: Evento;
}

/** Contadores usados pelos objetivos e pelo resumo offline. */
export interface Estatisticas {
  abates: Record<ZonaId, number>;
  pontosDistribuidos: number;
  armasForjadas: number;
  armasEquipadas: number;
}

export interface Estado {
  versao: 2;
  /** Segundos de jogo simulados desde a fundação. */
  tempo: number;
  ouro: number;
  /** Quantidades fracionárias: o saque é calculado pelo valor esperado. */
  materiais: Record<Material, number>;
  /** Armas possuídas além do bastão, que é ilimitado. */
  armas: Record<ArmaId, number>;
  herois: Heroi[];
  zona: ZonaId;
  situacao: Situacao;
  /** Fração do monstro atual já derrotada (0 a 1). O monstro espera a party descansar. */
  progressoAbate: number;
  zonasLiberadas: ZonaId[];
  /** Índice do objetivo atual na lista de objetivos. */
  objetivo: number;
  estatisticas: Estatisticas;
  diario: RegistroEvento[];
  proximoId: number;
}
