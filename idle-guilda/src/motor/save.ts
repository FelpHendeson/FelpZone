import { BASES, RARIDADES } from './dados/itens';
import { MAPAS } from './dados/mapas';
import { PERSONAGENS, STATS } from './dados/personagens';
import type { Estado, Heroi, Item } from './tipos';

export interface Save {
  estado: Estado;
  /** Momento real (ms desde 1970) em que o jogo foi salvo. */
  salvoEm: number;
}

export function serializar(estado: Estado, agora: number): string {
  return JSON.stringify({ estado, salvoEm: agora } satisfies Save);
}

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ehTexto = (v: unknown): v is string => typeof v === 'string';
const numeros = (o: unknown, chaves: readonly string[]) => ehObj(o) && chaves.every((c) => ehNumero(o[c]));
const mapaValido = (m: unknown) => ehTexto(m) && MAPAS.some((x) => x.id === m);

function itemValido(i: unknown): i is Item {
  return (
    ehObj(i) &&
    ehTexto(i.uid) &&
    ehTexto(i.base) &&
    i.base in BASES &&
    RARIDADES.includes(i.raridade as never) &&
    ehNumero(i.nivel) &&
    ehNumero(i.melhoria) &&
    Array.isArray(i.afixos) &&
    i.afixos.every((a) => ehObj(a) && STATS.includes(a.stat as never) && ehNumero(a.pct))
  );
}

function atividadeValida(a: unknown): boolean {
  if (!ehObj(a)) return false;
  if (a.tipo === 'batalha') return true;
  if (a.tipo === 'treino') return ehNumero(a.inicio) && ehNumero(a.fim);
  return a.tipo === 'exploracao' && ehTexto(a.missao) && ehNumero(a.inicio) && ehNumero(a.fim);
}

function heroiValido(h: unknown): h is Heroi {
  return (
    ehObj(h) &&
    ehTexto(h.id) &&
    h.id in PERSONAGENS &&
    numeros(h, ['nivel', 'xp', 'pontosLivres', 'pontosHabilidade']) &&
    numeros(h.pontos, STATS) &&
    Array.isArray(h.nos) &&
    h.nos.every(ehTexto) &&
    Array.isArray(h.habilidades) &&
    h.habilidades.every((x) => ehObj(x) && ehTexto(x.id) && ehNumero(x.nivel) && ehNumero(x.xp)) &&
    Array.isArray(h.equipadas) &&
    h.equipadas.every(ehTexto) &&
    ehObj(h.equipamento) &&
    Object.values(h.equipamento).every(itemValido) &&
    atividadeValida(h.atividade)
  );
}

function batalhaValida(b: unknown): boolean {
  return (
    ehObj(b) &&
    mapaValido(b.mapa) &&
    ehNumero(b.onda) &&
    (b.situacao === 'lutando' || b.situacao === 'descansando') &&
    Array.isArray(b.inimigos) &&
    b.inimigos.every((i) => ehObj(i) && ehNumero(i.vida) && ehTexto(i.monstro) && ehNumero(i.nivel)) &&
    ehObj(b.herois) &&
    Array.isArray(b.lancadas) &&
    Array.isArray(b.visuais) &&
    ehNumero(b.proximoUid)
  );
}

/**
 * Lê um save; devolve null se estiver ausente, corrompido ou em versão
 * desconhecida. Saves de versões antigas (outro jogo) não são aproveitados.
 * Se só a batalha em andamento estiver inválida, ela recomeça.
 */
export function desserializar(texto: string | null): Save | null {
  if (!texto) return null;
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!ehObj(dados) || !ehNumero(dados.salvoEm)) return null;
  const e = dados.estado;
  if (
    !ehObj(e) ||
    e.versao !== 3 ||
    !numeros(e, ['tempo', 'semente', 'ouro', 'objetivo', 'proximoUid']) ||
    !numeros(e.materiais, ['ferrugem', 'pena', 'osso', 'brasa', 'nucleo', 'essencia']) ||
    !Array.isArray(e.herois) ||
    e.herois.length === 0 ||
    !e.herois.every(heroiValido) ||
    !Array.isArray(e.inventario) ||
    !e.inventario.every(itemValido) ||
    !Array.isArray(e.mapasLiberados) ||
    !e.mapasLiberados.every(mapaValido) ||
    !Array.isArray(e.canteiros) ||
    !ehObj(e.criadas) ||
    !ehObj(e.loja) ||
    !Array.isArray((e.loja as Obj).itens) ||
    !ehObj(e.estatisticas) ||
    !Array.isArray(e.diario)
  ) {
    return null;
  }
  if (!batalhaValida(e.batalha)) {
    e.batalha = { mapa: 'patio', onda: 1, situacao: 'lutando', inimigos: [], herois: {}, lancadas: [], visuais: [], proximoUid: 0 };
  }
  return { estado: e as unknown as Estado, salvoEm: dados.salvoEm };
}
