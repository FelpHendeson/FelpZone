/**
 * Competição (F12): retratos, duelo determinístico, bots, Campo de Provas,
 * torneio semanal e temporadas. Tudo reproduzível pela semente (replays).
 */
import { CATALOGO, SLOTS } from "../dados";
import { ARQUETIPOS, CONFIG_COMPETICAO, TEMAS, type TemaTemporada } from "../dados/competicao";
import { EQUIPAMENTOS } from "../dados/combate";
import { CONFIG_COMBATE, dano, statusDeCombate, type StatusDeCombate } from "../atividades/combate";
import { CONFIG_PROGRESSAO, faixas, modificadoresDoPersonagem } from "../personagem/progressao";
import type { Personagem } from "../personagem/conta";
import { Rng } from "../rng";

/** Retrato do personagem para a competição (o "build"). */
export interface Retrato {
  readonly nome: string;
  readonly nivel: number;
  readonly racaId: string;
  readonly coreId: string;
  readonly sc: StatusDeCombate;
  /** Golpes das ativas equipadas (multiplicador e recarga), na ordem de prioridade. */
  readonly golpes: readonly { readonly multiplicador: number; readonly recargaMs: number }[];
  /** Arquétipo, se for bot. */
  readonly arquetipoId?: string;
}

export interface LanceDuelo {
  readonly t: number;
  readonly quem: "a" | "b";
  readonly dano: number;
  readonly critico: boolean;
  readonly esquivou: boolean;
  readonly golpe: boolean;
}

export interface ResultadoDuelo {
  readonly vencedor: "a" | "b";
  readonly duracaoMs: number;
  /** Vida final em fração (0 a 1). */
  readonly vidaA: number;
  readonly vidaB: number;
  readonly lances: readonly LanceDuelo[];
}

const tagsDe = (r: Pick<Retrato, "racaId" | "coreId">) => new Set<string>([...(CATALOGO.racas.get(r.racaId)?.tags ?? []), ...(CATALOGO.cores.get(r.coreId)?.tags ?? [])]);

/** Golpes das ativas (efeitos do tipo "golpe"). */
function golpesDe(ids: readonly string[], maestria: (id: string) => number): Retrato["golpes"] {
  const lista: { multiplicador: number; recargaMs: number }[] = [];
  for (const id of ids) {
    const h = CATALOGO.habilidades.get(id);
    const g = h?.ativa?.efeitos.find((e) => e.tipo === "golpe");
    if (h?.ativa && g && g.tipo === "golpe") lista.push({ multiplicador: g.multiplicador * (1 + 0.01 * (maestria(id) - 1)), recargaMs: h.ativa.recargaMs });
  }
  return lista.slice(0, 5);
}

/** Retrato do personagem agora (status de combate com equipamento, passivas e pets fora). */
export function retratoDe(p: Personagem): Retrato {
  // Na Arena não contam pets, mundo nem atividade: só o personagem.
  const base = { ...p, atividade: null, pets: [], petsPorSlot: {}, mundo: { noite: false, clima: "limpo" as const } };
  const sc = statusDeCombate(p.status, modificadoresDoPersonagem(base, p.nivel));
  return { nome: p.nome, nivel: p.nivel, racaId: p.racaId, coreId: p.coreId, sc, golpes: golpesDe(p.ativasEquipadas, (id) => p.habilidades[id]?.maestria ?? 1) };
}

/** Quanto do caminho piso → teto o personagem já treinou (média dos 8 status, 0 a 1). Usado para parear bots. */
export function ocupacaoDe(p: Personagem): number {
  const f = faixas(p.racaId, p.nivel, modificadoresDoPersonagem(p, p.nivel));
  let soma = 0;
  let n = 0;
  for (const [s, x] of Object.entries(f)) {
    const largura = x.teto - x.piso;
    soma += largura > 0 ? Math.max(0, Math.min(1, (p.status[s as keyof typeof p.status] - x.piso) / largura)) : 0;
    n++;
  }
  return n ? soma / n : 0;
}

/** Bot de Arena gerado pela semente: arquétipo, status e equipamento do nível. */
export function botDeArena(semente: string, nivel: number, ocupacaoAlvo?: number): Retrato {
  const rng = Rng.daSemente(`bot:${semente}`);
  const a = ARQUETIPOS[rng.inteiro(0, ARQUETIPOS.length - 1)]!;
  // Até o nível 4, kit básico (como quem acabou de chegar).
  const tier = nivel < 5 ? 0 : nivel < 10 ? 1 : nivel < 20 ? 2 : 3;
  const equipados: Record<string, string | null> = {};
  for (const s of SLOTS) equipados[s] = EQUIPAMENTOS.find((i) => i.equipamento?.slot === s && i.equipamento.tier === tier)?.id ?? null;
  const base = { racaId: a.racaId, dons: [] as string[], origem: { tipo: "comum" as const, id: "vila-rural" }, equipados };
  const mods = modificadoresDoPersonagem(base, nivel);
  const f = faixas(a.racaId, nivel, mods);
  const sorteio = rng.flutuante();
  const ocupacao = ocupacaoAlvo === undefined ? 0.2 + 0.4 * sorteio : Math.max(0, Math.min(1, ocupacaoAlvo - 0.1 + 0.2 * sorteio));
  const status = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.piso + ocupacao * (x.teto - x.piso)])) as Personagem["status"];
  const ativas = [...CATALOGO.habilidades.values()].filter((h) => h.origem.tipo === "core" && h.origem.coreId === a.coreId && !h.origem.ramoId && h.ativa).map((h) => h.id);
  const nomes = ["Varg", "Ilsa", "Torn", "Meri", "Kael", "Doro", "Senn", "Bria", "Ulfo", "Nara", "Edo", "Pim"];
  return { nome: `${nomes[rng.inteiro(0, nomes.length - 1)]} (${a.nome})`, nivel, racaId: a.racaId, coreId: a.coreId, sc: statusDeCombate(status, mods), golpes: golpesDe(ativas, () => 1), arquetipoId: a.id };
}

/** Duelo em passos de 0,5 s, até 2 min. O tema da temporada dá ataque a quem combina. */
export function duelo(a: Retrato, b: Retrato, semente: string, tema?: TemaTemporada): ResultadoDuelo {
  const c = CONFIG_COMPETICAO;
  const rng = Rng.daSemente(`duelo:${semente}`);
  const lados = [a, b].map((r) => ({
    r,
    vida: r.sc.vidaMax,
    ataque: r.sc.ataque * (tema && tema.tags.some((t) => tagsDe(r).has(t)) ? 1 + tema.bonusAtaque : 1),
    prox: Math.floor(rng.flutuante() * r.sc.intervaloMs),
    recargas: r.golpes.map(() => 0),
  }));
  const lances: LanceDuelo[] = [];
  let t = 0;
  for (; t <= c.duracaoMaximaMs; t += c.passoMs) {
    for (let i = 0; i < 2; i++) {
      const eu = lados[i]!;
      const outro = lados[1 - i]!;
      for (let g = 0; g < eu.recargas.length; g++) eu.recargas[g] = Math.max(0, eu.recargas[g]! - c.passoMs);
      if (t < eu.prox) continue;
      eu.prox += eu.r.sc.intervaloMs;
      const g = eu.recargas.findIndex((x) => x <= 0);
      const mult = g >= 0 ? eu.r.golpes[g]!.multiplicador : 1;
      if (g >= 0) eu.recargas[g] = eu.r.golpes[g]!.recargaMs;
      const esquivou = rng.flutuante() < outro.r.sc.esquiva;
      const critico = !esquivou && rng.flutuante() < eu.r.sc.critico;
      const d = esquivou ? 0 : dano(eu.ataque * mult, outro.r.sc.defesa) * (critico ? CONFIG_COMBATE.multiplicadorCritico : 1);
      outro.vida -= d;
      if (lances.length < 60) lances.push({ t, quem: i === 0 ? "a" : "b", dano: Math.round(d * 10) / 10, critico, esquivou, golpe: g >= 0 });
      if (outro.vida <= 0) {
        return { vencedor: i === 0 ? "a" : "b", duracaoMs: t, vidaA: Math.max(0, lados[0]!.vida / a.sc.vidaMax), vidaB: Math.max(0, lados[1]!.vida / b.sc.vidaMax), lances };
      }
    }
  }
  const va = lados[0]!.vida / a.sc.vidaMax;
  const vb = lados[1]!.vida / b.sc.vidaMax;
  return { vencedor: va >= vb ? "a" : "b", duracaoMs: c.duracaoMaximaMs, vidaA: va, vidaB: vb, lances };
}

/** Campo de Provas: N duelos com sementes seguidas; taxa de vitória de `a`. */
export function campoDeProvas(a: Retrato, b: Retrato, n: number, semente: string, tema?: TemaTemporada): { vitorias: number; n: number; taxa: number; duracaoMediaMs: number } {
  let v = 0;
  let dur = 0;
  for (let i = 0; i < n; i++) {
    const r = duelo(a, b, `${semente}:${i}`, tema);
    if (r.vencedor === "a") v++;
    dur += r.duracaoMs;
  }
  return { vitorias: v, n, taxa: n ? v / n : 0, duracaoMediaMs: n ? dur / n : 0 };
}

// ---------------------------------------------------------------- calendário

export function semanaDe(instante: number): number {
  return Math.max(0, Math.floor((instante - CONFIG_COMPETICAO.epocaSemanaMs) / CONFIG_COMPETICAO.semanaMs));
}
export function inicioDaSemana(semana: number): number {
  return CONFIG_COMPETICAO.epocaSemanaMs + semana * CONFIG_COMPETICAO.semanaMs;
}
export function temporadaDe(instante: number): number {
  return Math.floor(semanaDe(instante) / CONFIG_COMPETICAO.semanasPorTemporada);
}
export function temaDaTemporada(temporada: number): TemaTemporada {
  return TEMAS[((temporada % TEMAS.length) + TEMAS.length) % TEMAS.length]!;
}
export function diaDe(instante: number): number {
  return Math.floor(instante / 86_400_000);
}

// ---------------------------------------------------------------- torneio

export interface PartidaTorneio {
  readonly rodada: number;
  readonly a: number;
  readonly b: number;
  readonly semente: string;
  readonly vencedor: number;
}

/** Os 16 da chave: o jogador (índice 0) e 15 bots da semana, perto do nível dele. */
export function chaveDoTorneio(semana: number, jogador: Retrato): Retrato[] {
  const lista = [jogador];
  for (let i = 1; i < CONFIG_COMPETICAO.tamanhoTorneio; i++) {
    const rng = Rng.daSemente(`torneio:${semana}:inscrito:${i}`);
    const nivel = Math.max(1, Math.min(CONFIG_PROGRESSAO.nivelMaximo, jogador.nivel + rng.inteiro(-3, 3)));
    lista.push(botDeArena(`torneio:${semana}:${i}`, nivel));
  }
  return lista;
}

/** Resolve a chave (eliminação simples). Devolve as partidas e a colocação do jogador (1, 2, 3, 5 ou 9). */
export function resolverTorneio(semana: number, jogador: Retrato): { partidas: PartidaTorneio[]; colocacao: number; inscritos: Retrato[] } {
  const inscritos = chaveDoTorneio(semana, jogador);
  const tema = temaDaTemporada(Math.floor(semana / CONFIG_COMPETICAO.semanasPorTemporada));
  // Ordem da chave embaralhada pela semana.
  const rng = Rng.daSemente(`torneio:${semana}:chave`);
  let vivos = inscritos.map((_, i) => i);
  for (let i = vivos.length - 1; i > 0; i--) {
    const j = rng.inteiro(0, i);
    [vivos[i], vivos[j]] = [vivos[j]!, vivos[i]!];
  }
  const partidas: PartidaTorneio[] = [];
  let colocacao = 1;
  let rodada = 0;
  while (vivos.length > 1) {
    rodada++;
    const proximos: number[] = [];
    for (let m = 0; m < vivos.length; m += 2) {
      const a = vivos[m]!;
      const b = vivos[m + 1]!;
      const semente = `torneio:${semana}:r${rodada}:m${m / 2}`;
      const r = duelo(inscritos[a]!, inscritos[b]!, semente, tema);
      const vencedor = r.vencedor === "a" ? a : b;
      partidas.push({ rodada, a, b, semente, vencedor });
      proximos.push(vencedor);
      if ((a === 0 || b === 0) && vencedor !== 0) colocacao = vivos.length / 2 + 1;
    }
    vivos = proximos;
  }
  return { partidas, colocacao, inscritos };
}

/** Índice da faixa de prêmio (0 = 1º … 4 = 9º-16º). */
export function faixaDaColocacao(colocacao: number): number {
  return colocacao === 1 ? 0 : colocacao === 2 ? 1 : colocacao <= 4 ? 2 : colocacao <= 8 ? 3 : 4;
}

// ---------------------------------------------------------------- ranking

/** Ranking da temporada: o jogador entre 20 bots com pontos pela semente e pelo tempo de temporada. */
export function rankingDaTemporada(temporada: number, agora: number, jogador: { nome: string; pontos: number }): { nome: string; pontos: number; jogador: boolean }[] {
  const inicio = inicioDaSemana(temporada * CONFIG_COMPETICAO.semanasPorTemporada);
  const duracao = CONFIG_COMPETICAO.semanasPorTemporada * CONFIG_COMPETICAO.semanaMs;
  const fracao = Math.max(0, Math.min(1, (agora - inicio) / duracao));
  const lista = [];
  for (let i = 0; i < 20; i++) {
    const rng = Rng.daSemente(`ranking:${temporada}:${i}`);
    const total = 200 + rng.inteiro(0, 1_400);
    lista.push({ nome: botDeArena(`ranking:${temporada}:${i}`, 10 + rng.inteiro(0, 30)).nome, pontos: Math.round(total * fracao), jogador: false });
  }
  lista.push({ ...jogador, jogador: true });
  return lista.sort((x, y) => y.pontos - x.pontos || Number(y.jogador) - Number(x.jogador));
}

// ---------------------------------------------------------------- estado

export interface ReplayArena {
  readonly semente: string;
  readonly instante: number;
  readonly a: Retrato;
  readonly b: Retrato;
  readonly vencedor: "a" | "b";
  readonly delta: number;
}

export interface EstadoCompeticao {
  readonly rating: number;
  /** Dia (UTC) da contagem de lutas e quantas já foram nele. */
  readonly dia: number;
  readonly lutasHoje: number;
  readonly totalLutas: number;
  readonly temporada: number;
  readonly pontos: number;
  readonly replays: readonly ReplayArena[];
  readonly torneio: { readonly semana: number; readonly retrato: Retrato } | null;
  readonly historico: readonly { readonly temporada: number; readonly pontos: number }[];
}

export function camposIniciaisF12(instante = 0): Pick<Personagem, "competicao"> {
  return { competicao: { rating: CONFIG_COMPETICAO.ratingInicial, dia: diaDe(instante), lutasHoje: 0, totalLutas: 0, temporada: temporadaDe(instante), pontos: 0, replays: [], torneio: null, historico: [] } };
}

/** Fecha a temporada se ela mudou: guarda os pontos no histórico e reinicia (rating cai pela metade da distância a 1.000). */
export function emDia(c: EstadoCompeticao, agora: number): EstadoCompeticao {
  let r = c;
  const t = temporadaDe(agora);
  if (t !== r.temporada) {
    const historico = [...r.historico, { temporada: r.temporada, pontos: r.pontos }].slice(-CONFIG_COMPETICAO.historico);
    r = { ...r, temporada: t, pontos: 0, historico, rating: Math.round(CONFIG_COMPETICAO.ratingInicial + (r.rating - CONFIG_COMPETICAO.ratingInicial) / 2) };
  }
  const d = diaDe(agora);
  if (d !== r.dia) r = { ...r, dia: d, lutasHoje: 0 };
  return r;
}

const ehObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const inteiro = (v: unknown, min: number, max: number): v is number => num(v, min, max) && Number.isSafeInteger(v);

export function validarRetrato(v: unknown): Retrato | null {
  if (!ehObj(v) || !ehObj(v.sc) || !Array.isArray(v.golpes) || v.golpes.length > 5) return null;
  const { nome, nivel, racaId, coreId, arquetipoId } = v;
  if (typeof nome !== "string" || nome.length < 1 || nome.length > 60) return null;
  if (!inteiro(nivel, 1, CONFIG_PROGRESSAO.nivelMaximo) || typeof racaId !== "string" || !CATALOGO.racas.has(racaId) || typeof coreId !== "string" || !CATALOGO.cores.has(coreId)) return null;
  if (arquetipoId !== undefined && !ARQUETIPOS.some((a) => a.id === arquetipoId)) return null;
  const s = v.sc;
  if (!num(s.vidaMax, 1, 1e7) || !num(s.ataque, 0, 1e6) || !num(s.defesa, 0, 1e6) || !num(s.intervaloMs, 100, 60_000) || !num(s.esquiva, 0, 0.95) || !num(s.critico, 0, 1)) return null;
  const golpes: { multiplicador: number; recargaMs: number }[] = [];
  for (const g of v.golpes) {
    if (!ehObj(g) || !num(g.multiplicador, 0, 20) || !num(g.recargaMs, 0, 600_000)) return null;
    golpes.push({ multiplicador: g.multiplicador, recargaMs: g.recargaMs });
  }
  return {
    nome,
    nivel,
    racaId,
    coreId,
    sc: { vidaMax: s.vidaMax, ataque: s.ataque, defesa: s.defesa, intervaloMs: s.intervaloMs, esquiva: s.esquiva, critico: s.critico },
    golpes,
    ...(typeof arquetipoId === "string" ? { arquetipoId } : {}),
  };
}

export function validarCompeticao(v: unknown): EstadoCompeticao | null {
  if (!ehObj(v)) return null;
  const { rating, dia, lutasHoje, totalLutas, temporada, pontos, replays, torneio, historico } = v;
  if (!inteiro(rating, 0, 100_000) || !inteiro(dia, 0, 1e9) || !inteiro(lutasHoje, 0, CONFIG_COMPETICAO.lutasPorDia) || !inteiro(totalLutas, 0, 1e9)) return null;
  if (!inteiro(temporada, 0, 1e7) || !inteiro(pontos, 0, 1e9)) return null;
  if (!Array.isArray(replays) || replays.length > CONFIG_COMPETICAO.replays || !Array.isArray(historico) || historico.length > CONFIG_COMPETICAO.historico) return null;
  const rs: ReplayArena[] = [];
  for (const r of replays) {
    if (!ehObj(r) || typeof r.semente !== "string" || r.semente.length > 200 || !inteiro(r.instante, 0, Number.MAX_SAFE_INTEGER) || (r.vencedor !== "a" && r.vencedor !== "b") || !inteiro(r.delta, -1_000, 1_000)) return null;
    const a = validarRetrato(r.a);
    const b = validarRetrato(r.b);
    if (!a || !b) return null;
    rs.push({ semente: r.semente, instante: r.instante, a, b, vencedor: r.vencedor, delta: r.delta });
  }
  let t: EstadoCompeticao["torneio"] = null;
  if (torneio !== null) {
    if (!ehObj(torneio) || !inteiro(torneio.semana, 0, 1e7)) return null;
    const retrato = validarRetrato(torneio.retrato);
    if (!retrato) return null;
    t = { semana: torneio.semana, retrato };
  }
  const hs: { temporada: number; pontos: number }[] = [];
  for (const h of historico) {
    if (!ehObj(h) || !inteiro(h.temporada, 0, 1e7) || !inteiro(h.pontos, 0, 1e9)) return null;
    hs.push({ temporada: h.temporada, pontos: h.pontos });
  }
  return { rating, dia, lutasHoje, totalLutas, temporada, pontos, replays: rs, torneio: t, historico: hs };
}
