import { ARMAS, CLASSES, MATERIAIS, ZONAS } from './dados';
import type { Estado, Heroi } from './tipos';

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
const temChaves = (o: unknown, chaves: string[]) => ehObj(o) && chaves.every((c) => ehNumero(o[c]));
const ehZona = (z: unknown) => typeof z === 'string' && z in ZONAS;

function heroiValido(h: unknown): h is Heroi {
  return (
    ehObj(h) &&
    typeof h.id === 'string' &&
    typeof h.nome === 'string' &&
    typeof h.classe === 'string' &&
    h.classe in CLASSES &&
    typeof h.arma === 'string' &&
    h.arma in ARMAS &&
    ['nivel', 'xp', 'pontosLivres', 'vida'].every((c) => ehNumero(h[c])) &&
    temChaves(h.atributos, ['poder', 'vigor'])
  );
}

/**
 * Lê um save; devolve null se estiver ausente, corrompido ou em versão
 * desconhecida (saves da v0.1 não são compatíveis e começam do zero).
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
    e.versao !== 2 ||
    !['tempo', 'ouro', 'proximoId', 'progressoAbate', 'objetivo'].every((c) => ehNumero(e[c])) ||
    !temChaves(e.materiais, Object.keys(MATERIAIS)) ||
    !temChaves(e.armas, Object.keys(ARMAS)) ||
    !Array.isArray(e.herois) ||
    e.herois.length === 0 ||
    !e.herois.every(heroiValido) ||
    !ehZona(e.zona) ||
    (e.situacao !== 'lutando' && e.situacao !== 'descansando') ||
    !Array.isArray(e.zonasLiberadas) ||
    !e.zonasLiberadas.every(ehZona) ||
    !ehObj(e.estatisticas) ||
    !temChaves(e.estatisticas.abates, Object.keys(ZONAS)) ||
    !temChaves(e.estatisticas, ['pontosDistribuidos', 'armasForjadas', 'armasEquipadas']) ||
    !Array.isArray(e.diario)
  ) {
    return null;
  }
  return { estado: e as unknown as Estado, salvoEm: dados.salvoEm };
}
