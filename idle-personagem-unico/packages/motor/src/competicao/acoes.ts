/** Ações da competição (F12): lutar na Arena, inscrever-se e resgatar o torneio. */
import { CONFIG_COMPETICAO } from "../dados/competicao";
import { capacidadeDe, comAtivo, erro, type ResultadoAtividade } from "../atividades/acoes";
import { registrarNaCronica } from "../mundo/mundo";
import { adicionarItens } from "../personagem/mochila";
import type { Personagem } from "../personagem/conta";
import type { EstadoJogo } from "../save";
import { Rng } from "../rng";
import { botDeArena, duelo, ocupacaoDe, emDia, faixaDaColocacao, resolverTorneio, retratoDe, semanaDe, temaDaTemporada, type EstadoCompeticao } from "./competicao";

/** Dá a relíquia do tema ao passar dos pontos (uma vez; se a mochila estiver cheia, tenta de novo depois). */
function talvezReliquia(p: Personagem, c: EstadoCompeticao): Personagem {
  if (c.pontos < CONFIG_COMPETICAO.pontosReliquia) return p;
  const id = temaDaTemporada(c.temporada).reliquiaId;
  if ((p.mochila[id] ?? 0) > 0 || Object.values(p.equipados).includes(id)) return p;
  const r = adicionarItens(p.mochila, id, 1, capacidadeDe(p));
  return r.aceitos > 0 ? { ...p, mochila: r.mochila } : p;
}

/** Uma luta na Arena contra um bot do seu nível (10 por dia). Elo e pontos de temporada. */
export function lutarArena(estado: EstadoJogo, agora: number): ResultadoAtividade & { vitoria?: boolean } {
  let vitoria = false;
  const r = comAtivo(estado, agora, (p) => {
    const c = emDia(p.competicao, agora);
    if (c.lutasHoje >= CONFIG_COMPETICAO.lutasPorDia) return erro("sem_lutas", `São ${CONFIG_COMPETICAO.lutasPorDia} lutas por dia. Volte amanhã.`);
    const semente = `arena:${p.id}:${p.criadoEm}:${c.totalLutas + 1}`;
    const rng = Rng.daSemente(semente);
    // Pareamento: nível parecido e treino parecido (ocupação da faixa de status).
    const oponente = botDeArena(semente, Math.max(1, p.nivel + rng.inteiro(-2, 2)), ocupacaoDe(p));
    const ratingOponente = Math.max(100, c.rating + rng.inteiro(-150, 150));
    const eu = retratoDe(p);
    const d = duelo(eu, oponente, semente, temaDaTemporada(c.temporada));
    vitoria = d.vencedor === "a";
    const esperado = 1 / (1 + 10 ** ((ratingOponente - c.rating) / 400));
    const delta = Math.round(CONFIG_COMPETICAO.fatorK * ((vitoria ? 1 : 0) - esperado));
    const nova: EstadoCompeticao = {
      ...c,
      rating: Math.max(0, c.rating + delta),
      lutasHoje: c.lutasHoje + 1,
      totalLutas: c.totalLutas + 1,
      pontos: c.pontos + (vitoria ? CONFIG_COMPETICAO.pontosVitoria : CONFIG_COMPETICAO.pontosDerrota),
      replays: [...c.replays, { semente, instante: agora, a: eu, b: oponente, vencedor: d.vencedor, delta }].slice(-CONFIG_COMPETICAO.replays),
    };
    const q: Personagem = { ...p, competicao: nova, ouro: p.ouro + (vitoria ? CONFIG_COMPETICAO.ouroVitoriaPorNivel * p.nivel : 0) };
    return talvezReliquia(q, nova);
  });
  return r.ok ? { ...r, vitoria } : r;
}

/** Inscreve o retrato de agora no torneio desta semana (resolvido quando a semana acaba). */
export function inscreverTorneio(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const c = emDia(p.competicao, agora);
    const semana = semanaDe(agora);
    if (c.torneio && c.torneio.semana === semana) return erro("ja_inscrito", "Você já está inscrito no torneio desta semana.");
    if (c.torneio && c.torneio.semana < semana) return erro("torneio_pendente", "Resgate o resultado do torneio anterior primeiro.");
    return { ...p, competicao: { ...c, torneio: { semana, retrato: retratoDe(p) } } };
  });
}

/** Depois que a semana do torneio acaba: resolve a chave e entrega o prêmio. */
export function resgatarTorneio(estado: EstadoJogo, agora: number): ResultadoAtividade & { colocacao?: number } {
  let colocacao = 0;
  const r = comAtivo(estado, agora, (p) => {
    const c = emDia(p.competicao, agora);
    if (!c.torneio) return erro("sem_torneio", "Você não está inscrito em nenhum torneio.");
    if (c.torneio.semana >= semanaDe(agora)) return erro("torneio_em_andamento", "O torneio desta semana ainda não acabou.");
    const res = resolverTorneio(c.torneio.semana, c.torneio.retrato);
    colocacao = res.colocacao;
    const f = faixaDaColocacao(colocacao);
    const pontos = CONFIG_COMPETICAO.pontosTorneio[f]!;
    const nova: EstadoCompeticao = { ...c, torneio: null, pontos: c.pontos + pontos };
    let q: Personagem = { ...p, competicao: nova, ouro: p.ouro + CONFIG_COMPETICAO.ouroTorneioPorNivel[f]! * p.nivel };
    const texto = colocacao === 1 ? "venceu o torneio" : colocacao === 2 ? "foi vice no torneio" : `ficou entre os ${colocacao === 3 ? 4 : colocacao === 5 ? 8 : 16} primeiros do torneio`;
    q = registrarNaCronica(q, agora, `${p.nome} ${texto} da semana ${c.torneio.semana}.`);
    return talvezReliquia(q, nova);
  });
  return r.ok ? { ...r, colocacao } : r;
}
