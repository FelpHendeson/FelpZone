/* Ações do jogador. Cada uma devolve um estado novo ou um erro, sem alterar o original. */
import { noDaArvore } from './dados/arvores';
import { fundirElementos, ORDEM_RANK, RECEITAS } from './dados/habilidades';
import { BASES, INVENTARIO_MAXIMO, MATERIAIS, MELHORIA_MAXIMA } from './dados/itens';
import { mapaPorId, MAPAS } from './dados/mapas';
import { MISSOES, recompensaMissao, TREINO_XP_POR_SEGUNDO } from './dados/missoes';
import { nivelDeChegada, PERSONAGENS } from './dados/personagens';
import { gerarItem, guardarItem, precoDeVenda, valorDoItem } from './itens';
import { criarHeroi, nivelDaParty } from './jogo';
import { objetivoAtual, objetivoCumprido } from './objetivos';
import { ganharXp, registrar } from './progressao';
import { aleatorio } from './rng';
import { habilidade } from './status';
import type { Efeito, Estado, Habilidade, Heroi, Item, Material, Mod, PersonagemId, Slot, Stat } from './tipos';

export type Resultado = { ok: true; estado: Estado } | { ok: false; erro: string };

export const MAXIMO_EQUIPADAS = 5;

const falha = (erro: string): Resultado => ({ ok: false, erro });

/** Copia o estado, aplica a alteração e devolve o resultado. */
function alterar(estado: Estado, f: (e: Estado) => string | void): Resultado {
  const e = structuredClone(estado);
  const erro = f(e);
  return erro ? falha(erro) : { ok: true, estado: e };
}

function heroiDe(e: Estado, id: PersonagemId): Heroi | undefined {
  return e.herois.find((h) => h.id === id);
}

/* ---------- Atributos ---------- */

export function distribuirPonto(estado: Estado, id: PersonagemId, stat: Stat, quantidade = 1): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h) return 'Herói não encontrado.';
    if (!Number.isInteger(quantidade) || quantidade <= 0) return 'Quantidade inválida.';
    const q = Math.min(quantidade, h.pontosLivres);
    if (q <= 0) return 'Sem pontos para distribuir.';
    h.pontos[stat] += q;
    h.pontosLivres -= q;
  });
}

/** Sugestão por papel: divide os pontos entre os atributos que mais importam. */
export const SUGESTAO_PONTOS: Record<PersonagemId, Partial<Record<Stat, number>>> = {
  leao: { atq: 3, vida: 2, def: 1, vel: 1 },
  quentin: { def: 3, vida: 3, defM: 2 },
  cyrus: { atqM: 4, velM: 2, vida: 1 },
  vesper: { atq: 4, vel: 3, vida: 1 },
  odalys: { velM: 3, atqM: 2, defM: 1, vida: 1 },
};

export function distribuirSugerido(estado: Estado, id: PersonagemId): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h || h.pontosLivres <= 0) return 'Sem pontos para distribuir.';
    const pesos = Object.entries(SUGESTAO_PONTOS[id]) as [Stat, number][];
    const total = pesos.reduce((s, [, p]) => s + p, 0);
    while (h.pontosLivres > 0) {
      // Vai para o atributo mais atrasado em relação à proporção sugerida.
      const usados = pesos.reduce((s, [st]) => s + h.pontos[st], 0) + 1;
      const [stat] = pesos.reduce((melhor, atual) =>
        (atual[1] / total) * usados - h.pontos[atual[0]] > (melhor[1] / total) * usados - h.pontos[melhor[0]] ? atual : melhor,
      );
      h.pontos[stat] += 1;
      h.pontosLivres -= 1;
    }
  });
}

/* ---------- Equipamento ---------- */

export function podeUsar(h: Heroi, item: Item): string | null {
  const base = BASES[item.base];
  if (!base) return 'Item desconhecido.';
  const p = PERSONAGENS[h.id];
  if (item.nivel > h.nivel + 5) return `Precisa do nível ${item.nivel - 5}.`;
  if (base.armadura && !p.armaduras.includes(base.armadura)) return `${p.nome} não usa armadura desse tipo.`;
  if (base.slot === 'arma' && base.arma && !p.armas.includes(base.arma)) return `${p.nome} não usa essa arma.`;
  if (base.slot === 'secundaria' && base.arma && !p.secundarias.includes(base.arma)) return `${p.nome} não usa isso na outra mão.`;
  return null;
}

export function slotsDoItem(item: Item): Slot[] {
  const t = BASES[item.base]?.slot;
  if (!t) return [];
  return t === 'acessorio' ? ['acessorio1', 'acessorio2'] : [t];
}

export function equiparItem(estado: Estado, id: PersonagemId, uid: string, slotEscolhido?: Slot): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    const i = e.inventario.findIndex((x) => x.uid === uid);
    if (!h || i < 0) return 'Item não encontrado.';
    const item = e.inventario[i];
    const motivo = podeUsar(h, item);
    if (motivo) return motivo;
    const slots = slotsDoItem(item);
    const slot = slotEscolhido && slots.includes(slotEscolhido) ? slotEscolhido : (slots.find((s) => !h.equipamento[s]) ?? slots[0]);
    e.inventario.splice(i, 1);
    const anterior = h.equipamento[slot];
    if (anterior) e.inventario.push(anterior);
    h.equipamento[slot] = item;
  });
}

export function desequipar(estado: Estado, id: PersonagemId, slot: Slot): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    const item = h?.equipamento[slot];
    if (!h || !item) return 'Nada equipado aí.';
    if (e.inventario.length >= INVENTARIO_MAXIMO) return 'Inventário cheio.';
    delete h.equipamento[slot];
    e.inventario.push(item);
  });
}

/** Encontra o item equipado ou no inventário. */
export function acharItem(e: Estado, uid: string): { item: Item; heroi?: Heroi; slot?: Slot } | null {
  const inv = e.inventario.find((x) => x.uid === uid);
  if (inv) return { item: inv };
  for (const h of e.herois) {
    for (const [slot, item] of Object.entries(h.equipamento) as [Slot, Item][]) {
      if (item.uid === uid) return { item, heroi: h, slot };
    }
  }
  return null;
}

/* ---------- Habilidades ---------- */

export function alternarHabilidade(estado: Estado, id: PersonagemId, habilidadeId: string): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h || !h.habilidades.some((x) => x.id === habilidadeId)) return 'Habilidade não aprendida.';
    if (h.equipadas.includes(habilidadeId)) {
      h.equipadas = h.equipadas.filter((x) => x !== habilidadeId);
      return;
    }
    if (h.equipadas.length >= MAXIMO_EQUIPADAS) return `No máximo ${MAXIMO_EQUIPADAS} habilidades em uso. Tire uma antes.`;
    h.equipadas.push(habilidadeId);
  });
}

/** Troca a posição de uma habilidade equipada (a ordem é a prioridade de uso). */
export function moverHabilidade(estado: Estado, id: PersonagemId, habilidadeId: string, direcao: -1 | 1): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h) return 'Herói não encontrado.';
    const i = h.equipadas.indexOf(habilidadeId);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= h.equipadas.length) return 'Não dá para mover.';
    [h.equipadas[i], h.equipadas[j]] = [h.equipadas[j], h.equipadas[i]];
  });
}

export function situacaoDoNo(h: Heroi, noId: string): 'aprendido' | 'disponivel' | 'bloqueado' {
  if (h.nos.includes(noId)) return 'aprendido';
  const no = noDaArvore(h.id, noId);
  if (!no) return 'bloqueado';
  return no.requer.every((r) => h.nos.includes(r)) && h.nivel >= no.nivel ? 'disponivel' : 'bloqueado';
}

export function aprenderNo(estado: Estado, id: PersonagemId, noId: string): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    const no = noDaArvore(id, noId);
    if (!h || !no) return 'Nó não encontrado.';
    if (h.nos.includes(noId)) return 'Já aprendido.';
    if (h.nivel < no.nivel) return `Precisa do nível ${no.nivel}.`;
    if (!no.requer.every((r) => h.nos.includes(r))) return 'Aprenda os nós anteriores primeiro.';
    if (h.pontosHabilidade < no.custo) return `Precisa de ${no.custo} ponto(s) de habilidade.`;
    h.pontosHabilidade -= no.custo;
    h.nos.push(noId);
    if (no.habilidade && !h.habilidades.some((x) => x.id === no.habilidade)) {
      h.habilidades.push({ id: no.habilidade, nivel: 1, xp: 0 });
      if (h.equipadas.length < MAXIMO_EQUIPADAS) h.equipadas.push(no.habilidade);
      registrar(e, { tipo: 'aprendeu', heroi: id, habilidade: no.habilidade });
    }
  });
}

/* ---------- Jardim de habilidades (fusão) ---------- */

export const DURACAO_FUSAO = 20 * 60;
export const custoFusao = (e: Estado, a: string, b: string) => {
  const ha = habilidade(e, a);
  const hb = habilidade(e, b);
  const nivel = Math.max(ORDEM_RANK.indexOf(ha?.rank ?? 'D'), ORDEM_RANK.indexOf(hb?.rank ?? 'D'));
  return { ouro: 300 * (nivel + 1) * (nivel + 1), essencia: 1 + nivel };
};

/** Resultado da fusão: receita conhecida ou habilidade gerada pelas regras. */
export function previaFusao(e: Estado, heroi: PersonagemId, a: string, b: string): Habilidade | null {
  const receita = RECEITAS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
  if (receita) return habilidade(e, receita.resultado) ?? null;
  const ha = habilidade(e, a);
  const hb = habilidade(e, b);
  if (!ha || !hb || a === b) return null;
  return gerarFusao(heroi, ha, hb);
}

const SUBSTANTIVO: Record<string, string[]> = {
  dano: ['Golpe', 'Impacto', 'Corte', 'Estrondo'],
  area: ['Tempestade', 'Onda', 'Explosão', 'Chuva'],
  cura: ['Bênção', 'Seiva', 'Prece'],
  escudo: ['Égide', 'Bastião', 'Muralha'],
  buff: ['Hino', 'Canção', 'Fervor'],
  debuff: ['Maldição', 'Selo', 'Marca'],
  passiva: ['Essência', 'Alma', 'Instinto'],
};

function substantivo(efeitos: Efeito[], passiva: boolean, semente: number): string {
  let tipo = 'dano';
  if (passiva) tipo = 'passiva';
  else if (efeitos.some((ef) => ef.tipo === 'dano' && ef.area)) tipo = 'area';
  else if (efeitos.some((ef) => ef.tipo === 'dano')) tipo = 'dano';
  else if (efeitos.some((ef) => ef.tipo === 'cura')) tipo = 'cura';
  else if (efeitos.some((ef) => ef.tipo === 'escudo')) tipo = 'escudo';
  else if (efeitos.some((ef) => ef.tipo === 'debuff')) tipo = 'debuff';
  else if (efeitos.some((ef) => ef.tipo === 'buff')) tipo = 'buff';
  const lista = SUBSTANTIVO[tipo];
  return lista[semente % lista.length];
}

function hashTexto(t: string): number {
  let h = 0;
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const somarModsLista = (a: Mod[], b: Mod[], fator: number): Mod[] => [...a, ...b].map((m) => ({ ...m, pct: Math.round(m.pct * fator * 10) / 10 }) as Mod);

/**
 * Fusão sem receita: junta os efeitos das duas habilidades com um pouco de
 * perda, escolhe o elemento pela tabela de combinações e sobe um rank.
 */
export function gerarFusao(heroi: PersonagemId, a: Habilidade, b: Habilidade): Habilidade {
  const [x, y] = [a, b].sort((p, q) => p.id.localeCompare(q.id));
  const { elemento, prefixo } = fundirElementos(x.elemento, y.elemento);
  const rank = ORDEM_RANK[Math.min(ORDEM_RANK.length - 1, Math.max(ORDEM_RANK.indexOf(x.rank), ORDEM_RANK.indexOf(y.rank)) + 1)];
  const id = `fusao:${heroi}:${x.id}+${y.id}`;
  const semente = hashTexto(id);
  const passiva = x.tipo === 'passiva' && y.tipo === 'passiva';
  const escola = x.escola === y.escola ? x.escola : 'magica';

  if (passiva) {
    const mods = somarModsLista(x.mods ?? [], y.mods ?? [], 0.8);
    return {
      id, nome: `${substantivo([], true, semente)} de ${prefixo}`, criada: true, rank, elemento, escola,
      tipo: 'passiva', recarga: 0, efeitos: [], mods, aura: x.aura || y.aura,
      descricao: `Fusão de ${x.nome} e ${y.nome}: as duas passivas juntas, com 80% da força de cada.`,
    };
  }

  const ativas = [x, y].filter((h) => h.tipo !== 'passiva');
  const passivas = [x, y].filter((h) => h.tipo === 'passiva');
  const efeitos: Efeito[] = [];
  for (const h of ativas) {
    for (const ef of h.efeitos) efeitos.push('mult' in ef ? ({ ...ef, mult: Math.round(ef.mult * 0.8 * 100) / 100 } as Efeito) : ef);
    if (h.tipo === 'transformacao' && h.mods) efeitos.push({ tipo: 'buff', mods: h.mods, duracao: h.duracao ?? 10 });
  }
  for (const h of passivas) if (h.mods) efeitos.push({ tipo: 'buff', mods: h.mods, duracao: 10 });
  const recarga = Math.round(Math.max(...ativas.map((h) => h.recarga)) * 0.95);
  return {
    id, nome: `${substantivo(efeitos, false, semente)} de ${prefixo}`, criada: true, rank, elemento, escola,
    tipo: 'ativa', recarga, efeitos,
    descricao: `Fusão de ${x.nome} e ${y.nome}: une os efeitos das duas (80% da força de cada) numa só habilidade.`,
  };
}

export function plantarFusao(estado: Estado, canteiro: number, heroi: PersonagemId, a: string, b: string): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, heroi);
    if (!h) return 'Herói não encontrado.';
    if (canteiro < 0 || canteiro >= e.canteiros.length || e.canteiros[canteiro]) return 'Esse canteiro está ocupado.';
    if (a === b) return 'Escolha duas habilidades diferentes.';
    if (!h.habilidades.some((x) => x.id === a) || !h.habilidades.some((x) => x.id === b)) return 'O herói precisa conhecer as duas.';
    const resultado = previaFusao(e, heroi, a, b);
    if (!resultado) return 'Essas habilidades não se combinam.';
    if (h.habilidades.some((x) => x.id === resultado.id)) return `${PERSONAGENS[heroi].nome} já conhece ${resultado.nome}.`;
    const custo = custoFusao(e, a, b);
    if (e.ouro < custo.ouro || e.materiais.essencia < custo.essencia) return 'Faltam ouro ou essências.';
    e.ouro -= custo.ouro;
    e.materiais.essencia -= custo.essencia;
    e.canteiros[canteiro] = { heroi, a, b, inicio: e.tempo, fim: e.tempo + DURACAO_FUSAO };
  });
}

export function colherFusao(estado: Estado, canteiro: number): Resultado {
  return alterar(estado, (e) => {
    const c = e.canteiros[canteiro];
    if (!c) return 'Canteiro vazio.';
    if (e.tempo < c.fim) return 'Ainda está crescendo.';
    const h = heroiDe(e, c.heroi);
    const resultado = previaFusao(e, c.heroi, c.a, c.b);
    e.canteiros[canteiro] = null;
    if (!h || !resultado) return;
    if (resultado.criada) e.criadas[resultado.id] = resultado;
    if (!h.habilidades.some((x) => x.id === resultado.id)) h.habilidades.push({ id: resultado.id, nivel: 1, xp: 0 });
    e.estatisticas.fusoes += 1;
    registrar(e, { tipo: 'fusao', heroi: c.heroi, habilidade: resultado.id });
  });
}

/* ---------- Ferreiro ---------- */

/** Forjar: escolhe a base; o nível vem do mapa e a raridade é sorteada (melhor com essência). */
export function custoForja(mapaId: string, comEssencia: boolean) {
  const i = MAPAS.findIndex((m) => m.id === mapaId);
  return { ouro: Math.round(80 * Math.pow(2.4, i)), material: mapaPorId(mapaId).material, quantidade: 10 + i * 4, essencia: comEssencia ? 1 : 0 };
}

export function forjar(estado: Estado, mapaId: string, base: string, comEssencia = false): Resultado {
  return alterar(estado, (e) => {
    if (!e.mapasLiberados.includes(mapaId)) return 'Esse mapa ainda não foi liberado.';
    if (!BASES[base] || BASES[base].slot === 'reliquia') return 'Isso não se forja.';
    if (e.inventario.length >= INVENTARIO_MAXIMO) return 'Inventário cheio.';
    const c = custoForja(mapaId, comEssencia);
    if (e.ouro < c.ouro || e.materiais[c.material] < c.quantidade || e.materiais.essencia < c.essencia) return 'Faltam ouro ou materiais.';
    e.ouro -= c.ouro;
    e.materiais[c.material] -= c.quantidade;
    e.materiais.essencia -= c.essencia;
    const mapa = mapaPorId(mapaId);
    const item = gerarItem(e, {
      nivel: mapa.nivelInimigo + 3,
      base,
      pesos: comEssencia ? [0, 30, 45, 20, 5] : [35, 35, 21, 7.5, 1.5],
      conjunto: mapa.conjunto,
    });
    e.inventario.push(item);
    e.estatisticas.itensForjados += 1;
    registrar(e, { tipo: 'forjou', item });
  });
}

export function custoMelhoria(item: Item) {
  const tier = Math.min(MAPAS.length - 1, MAPAS.filter((m) => item.nivel >= m.nivelInimigo).length - 1);
  return {
    ouro: Math.round((25 + item.nivel * 10) * Math.pow(item.melhoria + 1, 1.6)),
    material: MAPAS[Math.max(0, tier)].material,
    quantidade: 2 + item.melhoria * 2,
    essencia: item.melhoria >= 6 ? 1 : 0,
  };
}

export function melhorar(estado: Estado, uid: string): Resultado {
  return alterar(estado, (e) => {
    const achado = acharItem(e, uid);
    if (!achado) return 'Item não encontrado.';
    const { item } = achado;
    if (item.melhoria >= MELHORIA_MAXIMA) return 'Melhoria máxima.';
    const c = custoMelhoria(item);
    if (e.ouro < c.ouro || e.materiais[c.material] < c.quantidade || e.materiais.essencia < c.essencia) return 'Faltam ouro ou materiais.';
    e.ouro -= c.ouro;
    e.materiais[c.material] -= c.quantidade;
    e.materiais.essencia -= c.essencia;
    item.melhoria += 1;
    e.estatisticas.melhorias += 1;
    if (item.melhoria === 5 || item.melhoria === MELHORIA_MAXIMA) registrar(e, { tipo: 'melhorou', item: structuredClone(item) });
  });
}

/** Desmontar devolve materiais do mapa do item (e às vezes essência). */
export function desmontar(estado: Estado, uid: string): Resultado {
  return alterar(estado, (e) => {
    const i = e.inventario.findIndex((x) => x.uid === uid);
    if (i < 0) return 'Só dá para desmontar itens do inventário.';
    const item = e.inventario[i];
    const c = custoMelhoria({ ...item, melhoria: 0 });
    const r = ['comum', 'incomum', 'raro', 'epico', 'lendario'].indexOf(item.raridade);
    e.materiais[c.material] += 2 + r * 2 + item.melhoria;
    if (r >= 2 && aleatorio(e) < 0.25 * (r - 1)) e.materiais.essencia += 1;
    e.inventario.splice(i, 1);
  });
}

/* ---------- Loja ---------- */

export function comprar(estado: Estado, uid: string): Resultado {
  return alterar(estado, (e) => {
    const i = e.loja.itens.findIndex((x) => x.uid === uid);
    if (i < 0) return 'Item não está mais à venda.';
    const preco = valorDoItem(e.loja.itens[i]);
    if (e.ouro < preco) return 'Ouro insuficiente.';
    if (e.inventario.length >= INVENTARIO_MAXIMO) return 'Inventário cheio.';
    e.ouro -= preco;
    e.inventario.push(e.loja.itens[i]);
    e.loja.itens.splice(i, 1);
  });
}

export function vender(estado: Estado, uids: string[]): Resultado {
  return alterar(estado, (e) => {
    let vendidos = 0;
    for (const uid of uids) {
      const i = e.inventario.findIndex((x) => x.uid === uid);
      if (i < 0) continue;
      e.ouro += precoDeVenda(e.inventario[i]);
      e.inventario.splice(i, 1);
      vendidos += 1;
    }
    if (vendidos === 0) return 'Nada para vender.';
    e.estatisticas.vendas += vendidos;
  });
}

export function venderMaterial(estado: Estado, material: Material, quantidade: number): Resultado {
  return alterar(estado, (e) => {
    if (!(material in MATERIAIS) || !Number.isFinite(quantidade)) return 'Quantidade inválida.';
    const q = Math.min(Math.floor(e.materiais[material]), Math.floor(quantidade));
    if (q <= 0) return 'Nada para vender.';
    e.materiais[material] -= q;
    e.ouro += q * MATERIAIS[material].preco;
    e.estatisticas.vendas += 1;
  });
}

/* ---------- Taverna ---------- */

export function recrutar(estado: Estado, id: PersonagemId): Resultado {
  return alterar(estado, (e) => {
    const p = PERSONAGENS[id];
    if (heroiDe(e, id)) return `${p.nome} já está na party.`;
    if (!p.recrutamento) return 'Não está na taverna.';
    const lider = heroiDe(e, 'leao');
    if ((lider?.nivel ?? 1) < p.recrutamento.nivel) return `Aparece quando Sir LionHearth chegar ao nível ${p.recrutamento.nivel}.`;
    if (e.ouro < p.recrutamento.ouro) return 'Ouro insuficiente.';
    e.ouro -= p.recrutamento.ouro;
    const novo = criarHeroi(id, nivelDeChegada(e.herois.map((h) => h.nivel)));
    // Chega com uma arma básica do próprio estilo.
    const arma = BASES[p.armas[0]] ? p.armas[0] : 'espada';
    novo.equipamento.arma = gerarItem(e, { nivel: novo.nivel, base: arma, raridade: 'comum' });
    e.herois.push(novo);
    registrar(e, { tipo: 'recrutou', heroi: id });
  });
}

/* ---------- Batalha ---------- */

export function irParaMapa(estado: Estado, mapaId: string, onda = 1): Resultado {
  return alterar(estado, (e) => {
    if (!e.mapasLiberados.includes(mapaId)) return 'Esse mapa ainda não foi liberado.';
    e.batalha.mapa = mapaId;
    e.batalha.onda = Math.max(1, onda);
    e.batalha.inimigos = [];
  });
}

/* ---------- Expedições ---------- */

export function enviarMissao(estado: Estado, missaoId: string, herois: PersonagemId[]): Resultado {
  return alterar(estado, (e) => {
    const m = MISSOES.find((x) => x.id === missaoId);
    if (!m) return 'Missão desconhecida.';
    if (!e.mapasLiberados.includes(m.mapa)) return 'Libere o mapa da missão primeiro.';
    if (herois.length === 0 || herois.length > m.maxHerois) return `Envie de 1 a ${m.maxHerois} heróis.`;
    const lista = herois.map((id) => heroiDe(e, id));
    if (new Set(herois).size !== herois.length) return 'Herói repetido.';
    if (lista.some((h) => !h || h.atividade.tipo !== 'batalha')) return 'Algum herói já está fora.';
    // A volta junta quem saiu na mesma missão no mesmo instante: uma segunda equipe agora se misturaria à primeira.
    if (e.herois.some((h) => h.atividade.tipo === 'exploracao' && h.atividade.missao === m.id && h.atividade.inicio === e.tempo)) {
      return 'Essa expedição acabou de sair. Espere um instante para mandar outra equipe.';
    }
    if (e.herois.filter((h) => h.atividade.tipo === 'batalha').length - herois.length < 1) return 'Pelo menos um herói precisa ficar lutando.';
    for (const h of lista) h!.atividade = { tipo: 'exploracao', missao: m.id, inicio: e.tempo, fim: e.tempo + m.duracao };
    for (const id of herois) delete e.batalha.herois[id];
  });
}

export function enviarTreino(estado: Estado, id: PersonagemId, segundos: number): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h || h.atividade.tipo !== 'batalha') return 'Esse herói está ocupado.';
    if (!Number.isFinite(segundos) || segundos <= 0) return 'Duração inválida.';
    if (e.herois.filter((x) => x.atividade.tipo === 'batalha').length <= 1) return 'Pelo menos um herói precisa ficar lutando.';
    h.atividade = { tipo: 'treino', inicio: e.tempo, fim: e.tempo + segundos };
    delete e.batalha.herois[id];
  });
}

/** Recolhe quem terminou (ou interrompe um treino, recebendo o proporcional). */
export function concluirAtividade(estado: Estado, id: PersonagemId): Resultado {
  return alterar(estado, (e) => {
    const h = heroiDe(e, id);
    if (!h || h.atividade.tipo === 'batalha') return 'Esse herói já está na batalha.';
    const at = h.atividade;
    if (at.tipo === 'treino') {
      const segundos = Math.max(0, Math.min(e.tempo, at.fim) - at.inicio);
      ganharXp(e, h, segundos * TREINO_XP_POR_SEGUNDO(h.nivel));
      h.atividade = { tipo: 'batalha' };
      return;
    }
    if (e.tempo < at.fim) return 'A expedição ainda não voltou.';
    const m = MISSOES.find((x) => x.id === at.missao);
    if (!m) {
      // Missão que não existe mais: o herói só volta.
      h.atividade = { tipo: 'batalha' };
      return;
    }
    const equipe = e.herois.filter((x) => x.atividade.tipo === 'exploracao' && x.atividade.missao === at.missao && x.atividade.inicio === at.inicio);
    const resultado = recompensaMissao(e, m, equipe.map((x) => x.nivel));
    e.ouro += resultado.ouro;
    for (const [mat, q] of Object.entries(resultado.materiais) as [Material, number][]) e.materiais[mat] += q;
    resultado.itens = resultado.itens.filter((item) => guardarItem(e, item));
    for (const x of equipe) {
      ganharXp(e, x, resultado.xp);
      x.atividade = { tipo: 'batalha' };
    }
    e.estatisticas.missoes += 1;
    registrar(e, { tipo: 'missao', herois: equipe.map((x) => x.id), missao: m.id, resultado });
  });
}

/* ---------- Objetivos ---------- */

export function receberObjetivo(estado: Estado): Resultado {
  return alterar(estado, (e) => {
    const o = objetivoAtual(e);
    if (!o) return 'Todos os objetivos foram concluídos.';
    if (!objetivoCumprido(e)) return 'O objetivo ainda não foi cumprido.';
    e.ouro += o.recompensa.ouro ?? 0;
    for (const [m, q] of Object.entries(o.recompensa.materiais ?? {}) as [Material, number][]) e.materiais[m] += q;
    if (o.recompensa.item) guardarItem(e, gerarItem(e, { ...o.recompensa.item, nivel: Math.max(1, nivelDaParty(e)) }));
    registrar(e, { tipo: 'objetivo', indice: e.objetivo });
    e.objetivo += 1;
  });
}

/* ---------- Aplausos (mundo online) ---------- */

export const OURO_APLAUSO_RECEBIDO = 40;
export const OURO_APLAUSO_DADO = 15;

export function receberAplausos(estado: Estado, quantidade: number): Resultado {
  const n = Math.max(0, Math.floor(quantidade));
  if (n === 0) return falha('Nenhum aplauso.');
  return alterar(estado, (e) => {
    const ouro = n * OURO_APLAUSO_RECEBIDO;
    e.ouro += ouro;
    registrar(e, { tipo: 'aplausosRecebidos', quantidade: n, ouro });
  });
}

export function aplausoDado(estado: Estado, apelido: string): Resultado {
  return alterar(estado, (e) => {
    e.ouro += OURO_APLAUSO_DADO;
    registrar(e, { tipo: 'aplaudiu', apelido: apelido.slice(0, 16), ouro: OURO_APLAUSO_DADO });
  });
}

