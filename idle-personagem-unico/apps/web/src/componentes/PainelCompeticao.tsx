"use client";

import {
  ARQUETIPOS,
  CATALOGO,
  CONFIG_COMPETICAO,
  botDeArena,
  campoDeProvas,
  duelo,
  emDia,
  inicioDaSemana,
  ocupacaoDe,
  rankingDaTemporada,
  relogioDoSistema,
  resolverTorneio,
  retratoDe,
  semanaDe,
  temaDaTemporada,
  validarRetrato,
  type Personagem,
  type ReplayArena,
  type Retrato,
} from "@idle-pu/motor";
import { useEffect, useMemo, useState } from "react";
import { formatarDuracao, formatarNumero } from "@/lib/atividade";
import { chamarApi, type Sessao } from "@/lib/sync";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

function linhaRetrato(r: Retrato): string {
  return `nível ${r.nivel} · ${CATALOGO.racas.get(r.racaId)?.nome} · ${CATALOGO.cores.get(r.coreId)?.nome} · ${formatarNumero(r.sc.vidaMax, 0)} vida, ${formatarNumero(r.sc.ataque, 0)} ataque, ${formatarNumero(r.sc.defesa, 0)} defesa`;
}

function Replay({ replay, tema }: { replay: ReplayArena; tema: ReturnType<typeof temaDaTemporada> }) {
  const d = useMemo(() => duelo(replay.a, replay.b, replay.semente, tema), [replay, tema]);
  return (
    <ol className="lista-simples replay">
      {d.lances.slice(0, 30).map((l, i) => (
        <li key={i}>
          <span className="suave">{formatarNumero(l.t / 1000, 1)} s · </span>
          {l.quem === "a" ? replay.a.nome : replay.b.nome}
          {l.esquivou ? " erra (esquiva)" : ` causa ${formatarNumero(l.dano, 1)}${l.critico ? " (crítico)" : ""}${l.golpe ? " com uma técnica" : ""}`}
        </li>
      ))}
      <li>
        <strong>{d.vencedor === "a" ? replay.a.nome : replay.b.nome}</strong> vence em {formatarNumero(d.duracaoMs / 1000, 1)} s.
      </li>
    </ol>
  );
}

/** Combate → Arena: lutas contra bots, rating, temporada e ranking. */
export function PainelArena({ personagem: p, ocupado, agir, sessao }: Props & { sessao: Sessao | null }) {
  const agora = relogioDoSistema.agora();
  const c = emDia(p.competicao, agora);
  const tema = temaDaTemporada(c.temporada);
  const fim = inicioDaSemana((c.temporada + 1) * CONFIG_COMPETICAO.semanasPorTemporada);
  const [aberto, setAberto] = useState<string | null>(null);
  const [build, setBuild] = useState<string | null>(null);
  const ranking = rankingDaTemporada(c.temporada, agora, { nome: p.nome, pontos: c.pontos });
  const posicao = ranking.findIndex((x) => x.jogador) + 1;
  const ultimo = c.replays.at(-1);
  return (
    <section className="painel" aria-label="Arena">
      <article className="cartao">
        <div className="nivel-linha">
          <h3>{tema.nome}</h3>
          <span className="suave">termina em {formatarDuracao(fim - agora)}</span>
        </div>
        <p className="suave">{tema.descricao} Com {CONFIG_COMPETICAO.pontosReliquia} pontos, a {CATALOGO.itens.get(tema.reliquiaId)?.nome} é sua.</p>
        <p>
          Rating <strong>{c.rating}</strong> · {c.pontos} pontos · {posicao}º no ranking · lutas hoje {c.lutasHoje}/{CONFIG_COMPETICAO.lutasPorDia}
        </p>
        <div className="acoes">
          <button type="button" className="botao botao-principal" disabled={ocupado || c.lutasHoje >= CONFIG_COMPETICAO.lutasPorDia || !!p.limiar} onClick={() => agir({ tipo: "lutarArena" })}>
            Lutar
          </button>
          {sessao && (
            <button
              type="button"
              className="botao"
              disabled={ocupado}
              onClick={async () => {
                const r = await chamarApi("arena/builds", { metodo: "POST", corpo: {}, token: sessao.token });
                setBuild(r.ok ? "Build registrado: outros jogadores podem testar contra você no Campo de Provas." : r.mensagem);
              }}
            >
              Registrar meu build
            </button>
          )}
        </div>
        {build && (
          <p className="suave" role="status">
            {build}
          </p>
        )}
        {ultimo && (
          <p role="status" className={ultimo.vencedor === "a" ? "destaque" : "suave"}>
            Última luta: {ultimo.vencedor === "a" ? "vitória" : "derrota"} contra {ultimo.b.nome} ({ultimo.delta >= 0 ? "+" : ""}
            {ultimo.delta} de rating).
          </p>
        )}
      </article>
      <article className="cartao">
        <h3>Replays</h3>
        {c.replays.length === 0 ? (
          <p className="suave">Nenhuma luta ainda.</p>
        ) : (
          <ul className="lista-recursos">
            {[...c.replays].reverse().map((r) => (
              <li key={r.semente} className="recurso" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="nivel-linha">
                  <span>
                    {r.vencedor === "a" ? "✓" : "✗"} contra <strong>{r.b.nome}</strong>
                  </span>
                  <button type="button" className="botao" onClick={() => setAberto(aberto === r.semente ? null : r.semente)}>
                    {aberto === r.semente ? "Fechar" : "Ver replay"}
                  </button>
                </div>
                <p className="suave">{linhaRetrato(r.b)}</p>
                {aberto === r.semente && <Replay replay={r} tema={tema} />}
              </li>
            ))}
          </ul>
        )}
      </article>
      <article className="cartao">
        <h3>Ranking da temporada</h3>
        <ol className="lista-simples">
          {ranking.slice(0, 10).map((x, i) => (
            <li key={i} className={x.jogador ? "destaque" : undefined}>
              {x.nome} — {x.pontos}
            </li>
          ))}
        </ol>
        {posicao > 10 && (
          <p className="destaque">
            {posicao}º {p.nome} — {c.pontos}
          </p>
        )}
        {c.historico.length > 0 && <p className="suave nota">Temporadas anteriores: {c.historico.map((h) => `${h.temporada + 1}ª: ${h.pontos} pontos`).join(" · ")}.</p>}
      </article>
    </section>
  );
}

/** Combate → Provas: Campo de Provas contra arquétipos (e builds de outros jogadores, com conta online). */
export function PainelCampoDeProvas({ personagem: p }: { personagem: Personagem }) {
  const [arquetipo, setArquetipo] = useState(ARQUETIPOS[0]!.id);
  const [nivel, setNivel] = useState(p.nivel);
  const [outros, setOutros] = useState<Retrato[] | null>(null);
  const [indiceOutro, setIndiceOutro] = useState(-1);
  const [resultado, setResultado] = useState<{ nome: string; taxa: number; duracao: number } | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarApi("arena/builds").then((r) => {
      if (vivo) setOutros(r.ok && Array.isArray(r.corpo.builds) ? (r.corpo.builds as unknown[]).map(validarRetrato).filter((x): x is Retrato => x !== null) : []);
    });
    return () => {
      vivo = false;
    };
  }, []);
  const tema = temaDaTemporada(emDia(p.competicao, relogioDoSistema.agora()).temporada);
  const testar = () => {
    const eu = retratoDe(p);
    let oponente: Retrato;
    if (indiceOutro >= 0 && outros?.[indiceOutro]) oponente = outros[indiceOutro]!;
    else {
      // Bot do arquétipo escolhido: procura uma semente que dê esse arquétipo.
      let s = 0;
      do oponente = botDeArena(`provas:${arquetipo}:${s++}`, nivel, ocupacaoDe(p));
      while (oponente.arquetipoId !== arquetipo && s < 200);
    }
    const r = campoDeProvas(eu, oponente, 200, `provas:${Date.now()}`, tema);
    setResultado({ nome: oponente.nome, taxa: r.taxa, duracao: r.duracaoMediaMs });
  };
  return (
    <section className="painel" aria-label="Campo de Provas">
      <article className="cartao">
        <h3>Campo de Provas</h3>
        <p className="suave">Simula 200 lutas do seu personagem de agora contra um oponente (com treino parecido com o seu) e mostra a taxa de vitória. Não gasta nada: serve para testar combinações.</p>
        <div className="campo-linha">
          <label htmlFor="provas-arquetipo">Oponente</label>
          <select id="provas-arquetipo" value={indiceOutro >= 0 ? `outro-${indiceOutro}` : arquetipo} onChange={(e) => (e.target.value.startsWith("outro-") ? setIndiceOutro(Number(e.target.value.slice(6))) : (setIndiceOutro(-1), setArquetipo(e.target.value)))}>
            {ARQUETIPOS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
            {(outros ?? []).map((r, i) => (
              <option key={`o${i}`} value={`outro-${i}`}>
                Jogador: {r.nome} (nível {r.nivel})
              </option>
            ))}
          </select>
        </div>
        {indiceOutro < 0 && (
          <div className="campo-linha">
            <label htmlFor="provas-nivel">Nível</label>
            <input id="provas-nivel" type="number" min={1} max={50} value={nivel} onChange={(e) => setNivel(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </div>
        )}
        <div className="acoes">
          <button type="button" className="botao botao-principal" onClick={testar}>
            Simular 200 lutas
          </button>
        </div>
        {resultado && (
          <p role="status" className="destaque">
            Contra {resultado.nome}: {formatarNumero(resultado.taxa * 100, 0)}% de vitórias (luta média de {formatarNumero(resultado.duracao / 1000, 1)} s).
          </p>
        )}
        <p className="suave nota">{outros && outros.length > 0 ? `${outros.length} builds de outros jogadores disponíveis.` : "Builds de outros jogadores aparecem aqui quando a sincronização estiver ativa."}</p>
      </article>
    </section>
  );
}

/** Combate → Torneio: inscrição semanal, resultado e a chave. */
export function PainelTorneio({ personagem: p, ocupado, agir }: Props) {
  const agora = relogioDoSistema.agora();
  const semana = semanaDe(agora);
  const fim = inicioDaSemana(semana + 1);
  const t = p.competicao.torneio;
  const ultimaSemana = semana - 1;
  // A chave da semana passada com o seu retrato de agora (para ver como seria).
  const chave = useMemo(() => (t && t.semana < semana ? resolverTorneio(t.semana, t.retrato) : null), [t, semana]);
  return (
    <section className="painel" aria-label="Torneio">
      <article className="cartao">
        <h3>Torneio da semana</h3>
        <p className="suave">
          16 lutadores em chave, resolvida pela semente quando a semana acaba (toda segunda, 00:00 UTC). Termina em {formatarDuracao(fim - agora)}.
        </p>
        {!t && (
          <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => agir({ tipo: "inscreverTorneio" })}>
            Inscrever meu personagem
          </button>
        )}
        {t && t.semana === semana && <p>Inscrito com o build de nível {t.retrato.nivel}. O resultado sai quando a semana acabar.</p>}
        {t && t.semana < semana && (
          <>
            <p>
              O torneio da semana {t.semana}
              {t.semana === ultimaSemana ? " (a passada)" : ""} acabou.
            </p>
            <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => agir({ tipo: "resgatarTorneio" })}>
              Ver resultado e resgatar prêmio
            </button>
          </>
        )}
        <p className="suave nota">
          Prêmios: 1º {CONFIG_COMPETICAO.pontosTorneio[0]} pontos e {CONFIG_COMPETICAO.ouroTorneioPorNivel[0]}× nível em gold; até os 16, {CONFIG_COMPETICAO.pontosTorneio[4]} pontos.
        </p>
      </article>
      {chave && (
        <article className="cartao">
          <h3>Chave</h3>
          <ol className="lista-simples">
            {chave.partidas.map((m) => (
              <li key={m.semente} className={m.a === 0 || m.b === 0 ? "destaque" : undefined}>
                Rodada {m.rodada}: {chave.inscritos[m.a]!.nome} × {chave.inscritos[m.b]!.nome} → {chave.inscritos[m.vencedor]!.nome}
              </li>
            ))}
          </ol>
        </article>
      )}
    </section>
  );
}
