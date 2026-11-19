import { BASES, RARIDADES } from './dados/itens';
import { MAPAS, MONSTROS } from './dados/mapas';
import { MISSOES } from './dados/missoes';
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
  return a.tipo === 'exploracao' && ehTexto(a.missao) && MISSOES.some((m) => m.id === a.missao) && ehNumero(a.inicio) && ehNumero(a.fim);
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

function combatenteValido(c: unknown): boolean {
  return (
    numeros(c, ['vida', 'escudo', 'barra', 'provocando']) &&
    ehObj((c as Obj).recargas) &&
    Object.values((c as Obj).recargas as Obj).every(ehNumero) &&
    Array.isArray((c as Obj).buffs) &&
    ((c as Obj).buffs as unknown[]).every((b) => ehObj(b) && ehTexto(b.id) && Array.isArray(b.mods) && ehNumero(b.restante)) &&
    Array.isArray((c as Obj).dots) &&
    ((c as Obj).dots as unknown[]).every((d) => numeros(d, ['valor', 'restante']) && ehTexto((d as Obj).elemento))
  );
}

function batalhaValida(b: unknown): boolean {
  return (
    ehObj(b) &&
    mapaValido(b.mapa) &&
    ehNumero(b.onda) &&
    b.onda >= 1 &&
    (b.situacao === 'lutando' || b.situacao === 'descansando') &&
    Array.isArray(b.inimigos) &&
    b.inimigos.every(
      (i) => combatenteValido(i) && ehTexto(i.monstro) && i.monstro in MONSTROS && numeros(i, ['uid', 'nivel']) && typeof i.chefe === 'boolean',
    ) &&
    ehObj(b.herois) &&
    Object.entries(b.herois).every(([id, c]) => id in PERSONAGENS && combatenteValido(c)) &&
    Array.isArray(b.lancadas) &&
    Array.isArray(b.visuais) &&
    ehNumero(b.proximoUid)
  );
}

const CONTADORES = ['abates', 'chefes', 'itensForjados', 'melhorias', 'vendas', 'missoes', 'fusoes'] as const;

/** Estatísticas ausentes ou quebradas voltam a zero, sem perder o resto do save. */
function repararEstatisticas(est: Obj): void {
  for (const c of CONTADORES) if (!ehNumero(est[c])) est[c] = 0;
  if (!ehObj(est.maiorOnda)) est.maiorOnda = {};
  const ondas = est.maiorOnda as Obj;
  for (const [k, v] of Object.entries(ondas)) if (!ehNumero(v)) delete ondas[k];
  if (!ehObj(est.bestiario)) est.bestiario = {};
  const bestiario = est.bestiario as Obj;
  for (const [k, v] of Object.entries(bestiario)) if (!numeros(v, ['abates', 'chefes'])) delete bestiario[k];
}

function canteiroValido(c: unknown, herois: Heroi[]): boolean {
  return c === null || (ehObj(c) && herois.some((h) => h.id === c.heroi) && ehTexto(c.a) && ehTexto(c.b) && ehNumero(c.inicio) && ehNumero(c.fim));
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
  const herois = e.herois as Heroi[];
  // Herói repetido não acontece no jogo: o save foi editado.
  if (new Set(herois.map((h) => h.id)).size !== herois.length) return null;
  // Saves da v1.0 anteriores ao bestiário começam com ele vazio; o resto das estatísticas é reparado.
  repararEstatisticas(e.estatisticas as Obj);
  e.objetivo = Math.max(0, Math.floor(e.objetivo as number));
  const loja = e.loja as Obj;
  loja.itens = (loja.itens as unknown[]).filter(itemValido);
  if (!ehNumero(loja.renovaEm)) loja.renovaEm = 0;
  e.canteiros = (e.canteiros as unknown[]).map((c) => (canteiroValido(c, herois) ? c : null));
  if (!batalhaValida(e.batalha)) {
    e.batalha = { mapa: 'patio', onda: 1, situacao: 'lutando', inimigos: [], herois: {}, lancadas: [], visuais: [], proximoUid: 0 };
  }
  return { estado: e as unknown as Estado, salvoEm: dados.salvoEm };
}
