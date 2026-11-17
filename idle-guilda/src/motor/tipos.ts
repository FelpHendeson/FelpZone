export type Classe = 'guerreiro' | 'cacadora' | 'mistica';
export type Atributo = 'forca' | 'destreza' | 'mente' | 'vigor';
export type Material = 'gosma' | 'couro' | 'minerio' | 'fragmento';
export type ZonaId = 'campina' | 'bosque' | 'ruinas';
export type ArmaId = 'bastao' | 'espada' | 'arco' | 'cajado' | 'lamina';

export type Tarefa = { tipo: 'cacar'; zona: ZonaId } | { tipo: 'minerar' } | { tipo: 'descansar' };

export interface Heroi {
  id: string;
  nome: string;
  classe: Classe;
  nivel: number;
  xp: number;
  pontosLivres: number;
  atributos: Record<Atributo, number>;
  vida: number;
  /** 0 a 100. Acima de 0 reduz o rendimento. */
  fadiga: number;
  tarefa: Tarefa;
  /** Tarefa a retomar depois de um descanso automático. */
  tarefaAnterior: Tarefa | null;
  descansoAutomatico: boolean;
  arma: ArmaId;
  /** Fração do monstro atual já derrotada (0 a 1). */
  progressoAbate: number;
  abates: number;
  nocautes: number;
}

/** Acontecimentos estruturados; o texto é montado na interface. */
export type Evento =
  | { tipo: 'subiuNivel'; heroi: string; nivel: number }
  | { tipo: 'nocaute'; heroi: string; zona: ZonaId }
  | { tipo: 'zonaLiberada'; zona: ZonaId }
  | { tipo: 'forjou'; arma: ArmaId }
  | { tipo: 'contratou'; heroi: string; classe: Classe };

export interface RegistroEvento {
  /** Segundos de jogo em que aconteceu. */
  t: number;
  evento: Evento;
}

export interface Estado {
  versao: 1;
  /** Segundos de jogo simulados desde a fundação. */
  tempo: number;
  ouro: number;
  /** Quantidades fracionárias: o saque é calculado pelo valor esperado. */
  materiais: Record<Material, number>;
  /** Armas possuídas além do bastão, que é ilimitado. */
  armas: Record<ArmaId, number>;
  herois: Heroi[];
  zonasLiberadas: ZonaId[];
  diario: RegistroEvento[];
  proximoId: number;
}
