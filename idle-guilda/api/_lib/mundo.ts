// "Pseudo online": o jogo continua individual, mas cada save enviado vira um
// perfil público (ranking), acontecimentos marcantes vão para um mural comum,
// e jogadores podem aplaudir as guildas uns dos outros.
import { ErroHttp, PREFIXO, type Banco } from './banco.js';

/** Total de objetivos do jogo (conferido contra o motor nos testes). */
export const TOTAL_OBJETIVOS = 12;
export const ONLINE_JANELA_MS = 5 * 60 * 1000;
const TAMANHO_MURAL = 50;
export const APLAUSOS_POR_DIA = 5;
const TAMANHO_RANKING = 20;

const chaves = {
  perfil: (id: string) => `${PREFIXO}perfil:${id}`,
  ranking: `${PREFIXO}ranking`,
  online: `${PREFIXO}online`,
  mural: `${PREFIXO}mural`,
  presentes: (id: string) => `${PREFIXO}presentes:${id}`,
  aplauso: (de: string, alvo: string, dia: string) => `${PREFIXO}aplauso:${de}:${alvo}:${dia}`,
  aplausosDoDia: (de: string, dia: string) => `${PREFIXO}aplausos-dia:${de}:${dia}`,
};

export interface HeroiPublico {
  nome: string;
  classe: string;
  nivel: number;
  arma: string;
}

export interface Perfil {
  id: string;
  apelido: string;
  renome: number;
  nivel: number;
  herois: HeroiPublico[];
  zona: string;
  objetivo: number;
  abates: number;
  armas: string[];
  aplausos: number;
  atualizadoEm: number;
}

export interface ItemMural {
  t: number;
  id: string;
  apelido: string;
  texto: string;
}

const dia = (agora: number) => new Date(agora).toISOString().slice(0, 10);
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

/** Fama da guilda: níveis dos heróis, objetivos e monstros derrotados. */
export function calcularRenome(p: Pick<Perfil, 'herois' | 'objetivo' | 'abates'>): number {
  return p.herois.reduce((s, h) => s + h.nivel, 0) * 10 + p.objetivo * 25 + Math.floor(p.abates / 100);
}

/** Monta o perfil público a partir do save enviado, lendo só o necessário e com limites. */
export function perfilDoSave(id: string, apelido: string, textoSave: string, aplausos: number, agora: number): Perfil {
  const estado = (JSON.parse(textoSave) as { estado?: Record<string, unknown> }).estado ?? {};
  const herois = (Array.isArray(estado.herois) ? estado.herois : []).slice(0, 3).map((h: Record<string, unknown>) => ({
    nome: texto(h?.nome, 16),
    classe: texto(h?.classe, 12),
    nivel: Math.min(999, numero(h?.nivel)),
    arma: texto(h?.arma, 12),
  }));
  const est = (estado.estatisticas ?? {}) as { abates?: Record<string, unknown> };
  const abates = Object.values(est.abates ?? {}).reduce<number>((s, v) => s + numero(v), 0);
  const armas = Object.entries((estado.armas ?? {}) as Record<string, unknown>)
    .filter(([, q]) => numero(q) > 0)
    .map(([a]) => texto(a, 12));
  const base = {
    id,
    apelido,
    herois,
    nivel: herois.reduce((m, h) => Math.max(m, h.nivel), 0),
    zona: texto(estado.zona, 12),
    objetivo: Math.min(TOTAL_OBJETIVOS, numero(estado.objetivo)),
    abates,
    armas,
    aplausos,
    atualizadoEm: agora,
  };
  return { ...base, renome: calcularRenome(base) };
}

const NOME_CLASSE: Record<string, string> = { guerreiro: 'um Guerreiro', cacadora: 'uma Caçadora', mistica: 'uma Mística' };
const NOME_ZONA: Record<string, string> = { bosque: 'o Bosque Sombrio', ruinas: 'as Ruínas Antigas' };

/** Acontecimentos que valem ir para o mural, comparando o perfil antigo com o novo. */
export function acontecimentos(antes: Perfil | null, depois: Perfil): string[] {
  if (!antes) return ['fundou uma guilda e partiu em aventura.'];
  const fatos: string[] = [];
  for (let n = Math.floor(antes.nivel / 5) * 5 + 5; n <= depois.nivel; n += 5) fatos.push(`chegou ao nível ${n}!`);
  for (const h of depois.herois.slice(antes.herois.length)) {
    fatos.push(`recrutou ${h.nome}, ${NOME_CLASSE[h.classe] ?? 'um aventureiro'}.`);
  }
  if (depois.zona !== antes.zona && NOME_ZONA[depois.zona]) fatos.push(`levou a party para ${NOME_ZONA[depois.zona]}.`);
  if (depois.armas.includes('lamina') && !antes.armas.includes('lamina')) fatos.push('forjou a Lâmina das ruínas!');
  if (depois.objetivo >= TOTAL_OBJETIVOS && antes.objetivo < TOTAL_OBJETIVOS) fatos.push('concluiu todos os objetivos! 🏆');
  return fatos;
}

async function lerPerfil(banco: Banco, id: string): Promise<Perfil | null> {
  const t = await banco.get(chaves.perfil(id));
  return t ? (JSON.parse(t) as Perfil) : null;
}

/** Chamado a cada save recebido: atualiza perfil, ranking e mural. */
export async function atualizarMundo(banco: Banco, id: string, apelido: string, textoSave: string, agora = Date.now()) {
  const antes = await lerPerfil(banco, id);
  const depois = perfilDoSave(id, apelido, textoSave, antes?.aplausos ?? 0, agora);
  await banco.set(chaves.perfil(id), JSON.stringify(depois));
  await banco.zadd(chaves.ranking, id, depois.renome);
  for (const fato of acontecimentos(antes, depois)) {
    await banco.lpush(chaves.mural, JSON.stringify({ t: agora, id, apelido, texto: fato } satisfies ItemMural), TAMANHO_MURAL);
  }
  return depois;
}

export async function marcarPresenca(banco: Banco, id: string, agora = Date.now()) {
  await banco.zadd(chaves.online, id, agora);
}

/** Presença leve (a cada minuto): marca online e entrega aplausos recebidos. */
export async function pulso(banco: Banco, id: string, agora = Date.now()): Promise<{ presentes: number }> {
  await marcarPresenca(banco, id, agora);
  return { presentes: numero(Number(await banco.getdel(chaves.presentes(id)))) };
}

export interface VisaoMundo {
  online: number;
  ranking: (Perfil & { posicao: number })[];
  minhaPosicao: number | null;
  meuPerfil: Perfil | null;
  mural: ItemMural[];
}

export async function lerMundo(banco: Banco, id: string | null, agora = Date.now()): Promise<VisaoMundo> {
  if (id) await marcarPresenca(banco, id, agora);
  await banco.zremAte(chaves.online, agora - ONLINE_JANELA_MS);
  const ids = await banco.zrevrange(chaves.ranking, 0, TAMANHO_RANKING - 1);
  const perfis = await banco.mget(ids.map(chaves.perfil));
  const ranking = perfis.flatMap((t, i) => (t ? [{ ...(JSON.parse(t) as Perfil), posicao: i + 1 }] : []));
  const posicao = id ? await banco.zrevrank(chaves.ranking, id) : null;
  return {
    online: await banco.zcard(chaves.online),
    ranking,
    minhaPosicao: posicao === null ? null : posicao + 1,
    meuPerfil: id && posicao !== null && posicao >= TAMANHO_RANKING ? await lerPerfil(banco, id) : null,
    mural: (await banco.lrange(chaves.mural, 0, 29)).map((t) => JSON.parse(t) as ItemMural),
  };
}

/** Aplaudir dá ouro aos dois lados: quem aplaude recebe na hora; o alvo, no próximo pulso. */
export async function aplaudir(banco: Banco, de: string, alvo: unknown, agora = Date.now()): Promise<{ restantes: number }> {
  if (typeof alvo !== 'string' || !alvo) throw new ErroHttp(400, 'Guilda não informada.');
  if (alvo === de) throw new ErroHttp(400, 'Não dá para aplaudir a própria guilda.');
  const perfil = await lerPerfil(banco, alvo);
  if (!perfil) throw new ErroHttp(404, 'Guilda não encontrada.');
  const hoje = dia(agora);
  const novo = await banco.set(chaves.aplauso(de, alvo, hoje), '1', { segundos: 2 * 86400, soSeNovo: true });
  if (!novo) throw new ErroHttp(409, 'Você já aplaudiu essa guilda hoje.');
  const usados = await banco.incr(chaves.aplausosDoDia(de, hoje), 2 * 86400);
  if (usados > APLAUSOS_POR_DIA) {
    await banco.del(chaves.aplauso(de, alvo, hoje));
    throw new ErroHttp(429, `Você já deu os ${APLAUSOS_POR_DIA} aplausos de hoje. Volte amanhã!`);
  }
  await banco.incr(chaves.presentes(alvo));
  perfil.aplausos += 1;
  await banco.set(chaves.perfil(alvo), JSON.stringify(perfil));
  return { restantes: APLAUSOS_POR_DIA - usados };
}

/** Apaga tudo o que é público da conta: perfil, ranking, presença e mural. */
export async function sairDoMundo(banco: Banco, id: string): Promise<void> {
  await banco.del(chaves.perfil(id));
  await banco.del(chaves.presentes(id));
  await banco.zrem(chaves.ranking, id);
  await banco.zrem(chaves.online, id);
  for (const item of await banco.lrange(chaves.mural, 0, TAMANHO_MURAL)) {
    if ((JSON.parse(item) as ItemMural).id === id) await banco.lrem(chaves.mural, item);
  }
}
