import { ARMAS, CUSTO_CONTRATACAO, CLASSES, MAXIMO_HEROIS } from './dados';
import { objetivoAtual, objetivoCumprido } from './objetivos';
import { vidaMaxima } from './regras';
import { registrar } from './simulacao';
import type { ArmaId, Atributo, Classe, Estado, Heroi, Material, ZonaId } from './tipos';

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
    arma: 'bastao',
  };
  h.vida = vidaMaxima(h);
  return h;
}

/** A guilda começa com um Guerreiro, que segura os golpes enquanto o jogador aprende. */
export function novoJogo(nome: string): Estado {
  const e: Estado = {
    versao: 2,
    tempo: 0,
    ouro: 0,
    materiais: { gosma: 0, couro: 0, fragmento: 0 },
    armas: { bastao: 0, espada: 0, arco: 0, cajado: 0, lamina: 0 },
    herois: [criarHeroi('h1', nome, 'guerreiro')],
    zona: 'campina',
    situacao: 'lutando',
    progressoAbate: 0,
    zonasLiberadas: ['campina'],
    objetivo: 0,
    estatisticas: { abates: { campina: 0, bosque: 0, ruinas: 0 }, pontosDistribuidos: 0, armasForjadas: 0, armasEquipadas: 0 },
    diario: [],
    proximoId: 2,
  };
  registrar(e, { tipo: 'contratou', heroi: 'h1', classe: 'guerreiro' });
  return e;
}

export function irPara(estado: Estado, zona: ZonaId): Resultado {
  if (!estado.zonasLiberadas.includes(zona)) return falha('Essa zona ainda não foi liberada.');
  if (estado.zona === zona) return { ok: true, estado };
  const e = structuredClone(estado);
  e.zona = zona;
  e.progressoAbate = 0;
  return { ok: true, estado: e };
}

export function distribuirPonto(estado: Estado, heroiId: string, atributo: Atributo): Resultado {
  return comHeroi(estado, heroiId, (e, h) => {
    if (h.pontosLivres <= 0) return 'Sem pontos para distribuir.';
    const proporcao = h.vida / vidaMaxima(h);
    h.pontosLivres -= 1;
    h.atributos[atributo] += 1;
    // Vigor aumenta a vida máxima; mantém a mesma proporção de vida.
    h.vida = vidaMaxima(h) * proporcao;
    e.estatisticas.pontosDistribuidos += 1;
  });
}

/**
 * Usa todos os pontos livres com uma divisão sugerida pelo papel:
 * o tanque equilibra Poder e Vigor; os outros focam Poder (3 para 1).
 */
export function distribuirSugerido(estado: Estado, heroiId: string): Resultado {
  return comHeroi(estado, heroiId, (e, h) => {
    if (h.pontosLivres <= 0) return 'Sem pontos para distribuir.';
    const proporcao = h.vida / vidaMaxima(h);
    const tanque = CLASSES[h.classe].papel === 'tanque';
    while (h.pontosLivres > 0) {
      const querVigor = tanque ? h.atributos.vigor <= h.atributos.poder : h.atributos.vigor * 3 < h.atributos.poder;
      h.atributos[querVigor ? 'vigor' : 'poder'] += 1;
      h.pontosLivres -= 1;
      e.estatisticas.pontosDistribuidos += 1;
    }
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
    e.estatisticas.armasEquipadas += 1;
  });
}

export function faltaParaForjar(e: Estado, arma: ArmaId): boolean {
  const dados = ARMAS[arma];
  if (e.ouro < dados.custoOuro) return true;
  return !Object.entries(dados.custoMateriais).every(([m, q]) => Math.floor(e.materiais[m as Material]) >= (q ?? 0));
}

export function forjar(estado: Estado, arma: ArmaId): Resultado {
  if (arma === 'bastao') return falha('O bastão não precisa ser forjado.');
  if (faltaParaForjar(estado, arma)) return falha('Recursos insuficientes.');
  const e = structuredClone(estado);
  const dados = ARMAS[arma];
  e.ouro -= dados.custoOuro;
  for (const [m, q] of Object.entries(dados.custoMateriais)) e.materiais[m as Material] -= q ?? 0;
  e.armas[arma] += 1;
  e.estatisticas.armasForjadas += 1;
  registrar(e, { tipo: 'forjou', arma });
  return { ok: true, estado: e };
}

export function custoProximaContratacao(e: Estado): number | null {
  return e.herois.length >= MAXIMO_HEROIS ? null : CUSTO_CONTRATACAO[e.herois.length];
}

export function contratar(estado: Estado, nome: string, classe: Classe): Resultado {
  const custo = custoProximaContratacao(estado);
  if (custo === null) return falha('A party está completa.');
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

export function receberObjetivo(estado: Estado): Resultado {
  const o = objetivoAtual(estado);
  if (!o) return falha('Todos os objetivos foram concluídos.');
  if (!objetivoCumprido(estado)) return falha('O objetivo ainda não foi cumprido.');
  const e = structuredClone(estado);
  e.ouro += o.recompensa;
  registrar(e, { tipo: 'objetivo', indice: e.objetivo });
  e.objetivo += 1;
  return { ok: true, estado: e };
}
