import { ARMAS, CLASSES, CUSTO_CONTRATACAO, MAXIMO_HEROIS } from './dados';
import { registrar } from './simulacao';
import { vidaMaxima } from './regras';
import type { ArmaId, Atributo, Classe, Estado, Heroi, Material, Tarefa } from './tipos';

export type Resultado = { ok: true; estado: Estado } | { ok: false; erro: string };

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

function comHeroi(estado: Estado, id: string, alterar: (e: Estado, h: Heroi) => string | void): Resultado {
  const e = structuredClone(estado);
  const h = e.herois.find((x) => x.id === id);
  if (!h) return falha('Herói não encontrado.');
  const erro = alterar(e, h);
  return erro ? falha(erro) : { ok: true, estado: e };
}

export function criarHeroi(id: string, nome: string, classe: Classe): Heroi {
  const h: Heroi = {
    id,
    nome,
    classe,
    nivel: 1,
    xp: 0,
    pontosLivres: 0,
    atributos: { ...CLASSES[classe].atributosIniciais },
    vida: 0,
    fadiga: 0,
    tarefa: { tipo: 'cacar', zona: 'campina' },
    tarefaAnterior: null,
    descansoAutomatico: true,
    arma: 'bastao',
    progressoAbate: 0,
    abates: 0,
    nocautes: 0,
  };
  h.vida = vidaMaxima(h);
  return h;
}

export function novoJogo(nome: string, classe: Classe): Estado {
  const e: Estado = {
    versao: 1,
    tempo: 0,
    ouro: 0,
    materiais: { gosma: 0, couro: 0, minerio: 0, fragmento: 0 },
    armas: { bastao: 0, espada: 0, arco: 0, cajado: 0, lamina: 0 },
    herois: [criarHeroi('h1', nome, classe)],
    zonasLiberadas: ['campina'],
    diario: [],
    proximoId: 2,
  };
  registrar(e, { tipo: 'contratou', heroi: 'h1', classe });
  return e;
}

export function definirTarefa(estado: Estado, heroiId: string, tarefa: Tarefa): Resultado {
  if (tarefa.tipo === 'cacar' && !estado.zonasLiberadas.includes(tarefa.zona)) {
    return falha('Essa zona ainda não foi liberada.');
  }
  return comHeroi(estado, heroiId, (_, h) => {
    h.tarefa = tarefa;
    h.tarefaAnterior = null;
    h.progressoAbate = 0;
  });
}

export function alternarDescansoAutomatico(estado: Estado, heroiId: string): Resultado {
  return comHeroi(estado, heroiId, (_, h) => {
    h.descansoAutomatico = !h.descansoAutomatico;
    if (!h.descansoAutomatico) h.tarefaAnterior = null;
  });
}

export function distribuirPonto(estado: Estado, heroiId: string, atributo: Atributo): Resultado {
  return comHeroi(estado, heroiId, (_, h) => {
    if (h.pontosLivres <= 0) return 'Sem pontos para distribuir.';
    const proporcao = h.vida / vidaMaxima(h);
    h.pontosLivres -= 1;
    h.atributos[atributo] += 1;
    // Vigor aumenta a vida máxima; mantém a mesma proporção de vida.
    h.vida = vidaMaxima(h) * proporcao;
  });
}

/** Armas daquele tipo que não estão nas mãos de nenhum herói. */
export function armasLivres(e: Estado, arma: ArmaId): number {
  if (arma === 'bastao') return Infinity;
  return e.armas[arma] - e.herois.filter((h) => h.arma === arma).length;
}

export function equipar(estado: Estado, heroiId: string, arma: ArmaId): Resultado {
  return comHeroi(estado, heroiId, (e, h) => {
    if (h.arma === arma) return;
    if (armasLivres(e, arma) <= 0) return 'Nenhuma unidade livre dessa arma.';
    h.arma = arma;
  });
}

export function podeForjar(e: Estado, arma: ArmaId): boolean {
  const dados = ARMAS[arma];
  if (arma === 'bastao' || e.ouro < dados.custoOuro) return false;
  return Object.entries(dados.custoMateriais).every(([m, q]) => Math.floor(e.materiais[m as Material]) >= (q ?? 0));
}

export function forjar(estado: Estado, arma: ArmaId): Resultado {
  if (arma === 'bastao') return falha('O bastão não precisa ser forjado.');
  if (!podeForjar(estado, arma)) return falha('Recursos insuficientes.');
  const e = structuredClone(estado);
  const dados = ARMAS[arma];
  e.ouro -= dados.custoOuro;
  for (const [m, q] of Object.entries(dados.custoMateriais)) e.materiais[m as Material] -= q ?? 0;
  e.armas[arma] += 1;
  registrar(e, { tipo: 'forjou', arma });
  return { ok: true, estado: e };
}

export function custoProximaContratacao(e: Estado): number | null {
  return e.herois.length >= MAXIMO_HEROIS ? null : CUSTO_CONTRATACAO[e.herois.length];
}

export function contratar(estado: Estado, nome: string, classe: Classe): Resultado {
  const custo = custoProximaContratacao(estado);
  if (custo === null) return falha('A guilda está cheia.');
  if (estado.ouro < custo) return falha('Ouro insuficiente.');
  const nomeLimpo = nome.trim().slice(0, 16);
  if (!nomeLimpo) return falha('Dê um nome ao herói.');
  const e = structuredClone(estado);
  const id = `h${e.proximoId}`;
  e.proximoId += 1;
  e.ouro -= custo;
  e.herois.push(criarHeroi(id, nomeLimpo, classe));
  registrar(e, { tipo: 'contratou', heroi: id, classe });
  return { ok: true, estado: e };
}
