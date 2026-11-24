/**
 * Progressão do personagem (GDD §5): nível, XP, piso/teto dos status e
 * modificadores vindos de raça, dons e origem. Números em `CONFIG_PROGRESSAO`
 * são [Calibrar] (ver `docs/CALIBRACAO.md`).
 */
import { CATALOGO, CONFIG_LIMIAR, obter, PERFIS_RACA, STATUS, type StatusId } from "../dados";
import type { Efeito } from "../dados/tipos";
import { modificadoresDeHabilidades, type Habilidades } from "../habilidades/maestria";
import { resumirModificadores, type Modificador } from "../modificadores";

export interface ConfigProgressao {
  readonly nivelMaximo: number;
  /** XP para ir de L a L+1 = round(xpBase × L^xpExpoente). */
  readonly xpBase: number;
  readonly xpExpoente: number;
  /** teto(L) = base × (1 + incremento × (L − 1)). */
  readonly incrementoTetoPorNivel: number;
  /** ganho_base por ciclo = fração × teto(L) sem modificadores. */
  readonly fracaoGanhoBase: number;
  /** Expoente da queda do ganho perto do teto. */
  readonly expoenteGanho: number;
  /** Ciclo nunca fica mais curto que isto, qualquer que seja a velocidade. */
  readonly cicloMinimoMs: number;
}

export const CONFIG_PROGRESSAO: ConfigProgressao = Object.freeze({
  nivelMaximo: 50,
  xpBase: 200,
  xpExpoente: 1.5,
  incrementoTetoPorNivel: 0.1,
  fracaoGanhoBase: 0.006,
  expoenteGanho: 0.6,
  cicloMinimoMs: 1_000,
});

export type ValoresStatus = Readonly<Record<StatusId, number>>;

/** Partes do personagem que definem os modificadores. */
export interface BaseModificadores {
  readonly racaId: string;
  readonly dons: readonly string[];
  readonly origem: { readonly tipo: "comum" | "especial"; readonly id: string };
  /** Equipamento de combate (F4): slot → id do item. */
  readonly equipados?: Readonly<Record<string, string | null>>;
  /** Habilidades conhecidas e passivas equipadas (F5). */
  readonly habilidades?: Habilidades;
  readonly passivasEquipadas?: readonly string[];
  /** Mortes acumuladas (F6: o set O Retornado cresce com elas). */
  readonly mortes?: number;
}

/** XP necessário para subir do nível `nivel` para o seguinte (0 no nível máximo). */
export function xpParaProximoNivel(nivel: number, config: ConfigProgressao = CONFIG_PROGRESSAO): number {
  if (nivel >= config.nivelMaximo) return 0;
  return Math.round(config.xpBase * nivel ** config.xpExpoente);
}

function doEfeito(efeito: Efeito, nivel: number): Modificador[] {
  const lista = [...(efeito.modificadores ?? [])];
  if (efeito.temporario && nivel <= efeito.temporario.ateNivel) lista.push(...efeito.temporario.modificadores);
  return lista;
}

/** Todos os modificadores do personagem no nível indicado. */
export function modificadoresDoPersonagem(p: BaseModificadores, nivel: number): Modificador[] {
  const raca = obter(CATALOGO.racas, p.racaId);
  const lista = doEfeito(raca.habilidadeComum.efeito, nivel);
  for (const d of p.dons) lista.push(...doEfeito(obter(CATALOGO.dons, d).efeito, nivel));
  const efeitoOrigem = p.origem.tipo === "especial" ? obter(CATALOGO.origensEspeciais, p.origem.id).efeito : obter(CATALOGO.bercos, p.origem.id).efeito;
  lista.push(...doEfeito(efeitoOrigem, nivel));
  for (const itemId of Object.values(p.equipados ?? {})) {
    if (itemId) lista.push(...(obter(CATALOGO.itens, itemId).equipamento?.modificadores ?? []));
  }
  // Passivas equipadas (auras ficam de fora: dependem da vida e são tratadas no combate).
  lista.push(...modificadoresDeHabilidades(p));
  // O Retornado (F6): 2 peças dão ataque, 4 dão defesa e Limiar mais curto; crescem com as mortes.
  let pecas = 0;
  for (const itemId of Object.values(p.equipados ?? {})) {
    if (itemId && CATALOGO.itens.get(itemId)?.equipamento?.nomeado?.conjunto === "o-retornado") pecas++;
  }
  if (pecas >= 2) {
    const origem = { tipo: "equipamento" as const, id: "o-retornado" };
    const bonus = Math.min(CONFIG_LIMIAR.retornadoBonusMaximo, CONFIG_LIMIAR.retornadoBonusPorMorte * (p.mortes ?? 0));
    lista.push({ alvo: "ataque", operacao: "percentual", valor: bonus, origem });
    if (pecas >= 4) {
      lista.push({ alvo: "defesa", operacao: "percentual", valor: bonus, origem });
      lista.push({ alvo: "duracao-limiar", operacao: "percentual", valor: -0.2, origem });
    }
  }
  return lista;
}

/**
 * Aplica XP ao personagem e sobe de nível quantas vezes couber. Ao subir,
 * quem está abaixo do novo piso sobe até ele e nada passa do teto. Altera
 * `status` e `ganhos` no lugar; devolve o nível e o XP novos.
 */
export function aplicarXp(
  p: BaseModificadores,
  nivel: number,
  xp: number,
  ganhoXp: number,
  status: Record<StatusId, number>,
  ganhos: Record<StatusId, number>,
  config: ConfigProgressao = CONFIG_PROGRESSAO,
): { nivel: number; xp: number; subiu: boolean } {
  if (nivel >= config.nivelMaximo) return { nivel, xp: 0, subiu: false };
  let n = nivel;
  let x = xp + ganhoXp;
  let subiu = false;
  while (n < config.nivelMaximo && x >= xpParaProximoNivel(n, config)) {
    x -= xpParaProximoNivel(n, config);
    n++;
    subiu = true;
  }
  if (n >= config.nivelMaximo) x = 0;
  if (subiu) {
    const mods = modificadoresDoPersonagem(p, n);
    for (const s of STATUS) {
      const f = faixaStatus(p.racaId, s, n, mods, config);
      const novo = Math.min(f.teto, Math.max(f.piso, status[s]));
      ganhos[s] += novo - status[s];
      status[s] = novo;
    }
  }
  return { nivel: n, xp: x, subiu };
}

/** Soma dos percentuais de vários alvos (ex.: `teto` e `teto.forca`). */
function percentual(mods: readonly Modificador[], ...alvos: string[]): number {
  let total = 0;
  for (const a of alvos) total += resumirModificadores(mods, a).percentual;
  return total;
}

/** Fator multiplicativo de um alvo percentual (1 = neutro). Nunca abaixo de 0,1. */
export function fator(mods: readonly Modificador[], ...alvos: string[]): number {
  return Math.max(0.1, 1 + percentual(mods, ...alvos));
}

export interface FaixaStatus {
  readonly piso: number;
  readonly teto: number;
}

/** Piso e teto de um status no nível, para a raça e os modificadores dados. */
export function faixaStatus(racaId: string, status: StatusId, nivel: number, mods: readonly Modificador[], config: ConfigProgressao = CONFIG_PROGRESSAO): FaixaStatus {
  const perfil = PERFIS_RACA[racaId];
  if (!perfil) throw new RangeError(`Raça sem perfil: ${racaId}`);
  const teto = perfil.base[status] * (1 + config.incrementoTetoPorNivel * (nivel - 1)) * fator(mods, "teto", `teto.${status}`);
  return { piso: perfil.fracaoPiso * teto, teto };
}

/** Faixas dos 8 status. */
export function faixas(racaId: string, nivel: number, mods: readonly Modificador[], config: ConfigProgressao = CONFIG_PROGRESSAO): Record<StatusId, FaixaStatus> {
  const r = {} as Record<StatusId, FaixaStatus>;
  for (const s of STATUS) r[s] = faixaStatus(racaId, s, nivel, mods, config);
  return r;
}

/** Status iniciais: o piso do nível 1 (GDD §5.2). */
export function statusIniciais(p: BaseModificadores, config: ConfigProgressao = CONFIG_PROGRESSAO): Record<StatusId, number> {
  const f = faixas(p.racaId, 1, modificadoresDoPersonagem(p, 1), config);
  const r = {} as Record<StatusId, number>;
  for (const s of STATUS) r[s] = f[s].piso;
  return r;
}

/**
 * Ganho de um ciclo de treino: `ganho_base × (1 − (valor − piso)/(teto − piso))^expoente`,
 * com `ganho_base` proporcional ao teto sem modificadores e multiplicado por `ganho-treino`.
 */
export function ganhoDeTreino(
  racaId: string,
  status: StatusId,
  valor: number,
  nivel: number,
  mods: readonly Modificador[],
  config: ConfigProgressao = CONFIG_PROGRESSAO,
): number {
  const { piso, teto } = faixaStatus(racaId, status, nivel, mods, config);
  if (teto <= piso || valor >= teto) return 0;
  const perfil = PERFIS_RACA[racaId]!;
  const tetoSemMods = perfil.base[status] * (1 + config.incrementoTetoPorNivel * (nivel - 1));
  const posicao = Math.min(1, Math.max(0, (valor - piso) / (teto - piso)));
  const ganho = config.fracaoGanhoBase * tetoSemMods * (1 - posicao) ** config.expoenteGanho * fator(mods, "ganho-treino");
  return Math.min(ganho, teto - valor);
}

/**
 * Valor efetivo (o que outros sistemas usam): valor treinado com os
 * modificadores `status.<id>` (somar, percentual, multiplicar).
 */
export function valorEfetivo(valor: number, status: StatusId, mods: readonly Modificador[]): number {
  const r = resumirModificadores(mods, `status.${status}`);
  return Math.max(0, (valor + r.somar) * (1 + r.percentual) * r.multiplicar);
}

/** Ofícios de coleta (F3): curva própria de XP [Calibrar]. */
export interface ConfigOficios {
  readonly nivelMaximo: number;
  readonly xpBase: number;
  readonly xpExpoente: number;
}

export const CONFIG_OFICIOS: ConfigOficios = Object.freeze({ nivelMaximo: 50, xpBase: 150, xpExpoente: 1.5 });

/** XP de ofício para ir do nível `nivel` ao seguinte (0 no máximo). */
export function xpParaProximoNivelOficio(nivel: number, config: ConfigOficios = CONFIG_OFICIOS): number {
  if (nivel >= config.nivelMaximo) return 0;
  return Math.round(config.xpBase * nivel ** config.xpExpoente);
}

/** Mochila (GDD §9.3) [Calibrar]: espaços = base + Força efetiva × fator. */
export const CONFIG_MOCHILA = Object.freeze({ espacosBase: 20, espacosPorForca: 0.5 });
