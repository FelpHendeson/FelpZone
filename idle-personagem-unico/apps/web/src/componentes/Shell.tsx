"use client";

import {
  aplicarAcao,
  avancar,
  personagemAtivo,
  relogioDoSistema,
  salvarJogo,
  type Acao,
  type Armazenamento,
  type EstadoJogo,
  type ResumoAvanco,
} from "@idle-pu/motor";
import { useCallback, useEffect, useRef, useState } from "react";
import { ABAS } from "@/lib/abas";
import { resumoRelevante } from "@/lib/atividade";
import { criarArmazenamentoLocal } from "@/lib/armazenamentoLocal";
import { prepararCriacao } from "@/lib/criacao";
import { CHAVE_SAVE, iniciarJogo, isolarSaveLegado, type ResultadoInicio } from "@/lib/persistencia";
import { tocar } from "@/lib/sons";
import { chamarApi, CHAVE_SESSAO, gravarSessao, lerSessao, restaurarSessao, sairDaConta, type Sessao } from "@/lib/sync";
import { ClienteConta, type SituacaoConta } from "@/lib/clienteConta";
import { BarraAtividade } from "./BarraAtividade";
import { CriacaoPersonagem } from "./CriacaoPersonagem";
import { FichaPersonagem } from "./FichaPersonagem";
import { PainelConta } from "./PainelConta";
import { PainelCuidados, PainelPets } from "./PainelPets";
import { PainelColeta } from "./PainelColeta";
import { PainelAreas, PainelBestiario } from "./PainelCombate";
import { PainelEquipados, PainelEquipaveis } from "./PainelEquipamento";
import { PainelAprendizado, PainelHabilidades } from "./PainelHabilidades";
import { PainelLimiar, PainelTitulos } from "./PainelLimiar";
import { missoesProntas, PainelGuilda, PainelHistoria, PainelMetas, PainelNpcs } from "./PainelMissoes";
import { EventosPendentes, PainelCronica } from "./PainelMundo";
import { PainelArena, PainelCampoDeProvas, PainelTorneio } from "./PainelCompeticao";
import { PainelEstabelecimentos, PainelLocalAtual, PainelRegiao } from "./PainelMapa";
import { PainelFerramentas, PainelMateriais } from "./PainelMochila";
import { PainelConsumiveis, PainelNomeados, PainelProducao } from "./PainelProducao";
import { PainelStatus } from "./PainelStatus";
import { PainelTreino } from "./PainelTreino";
import { ResumoOffline } from "./ResumoOffline";

type EstadoTela =
  | { readonly fase: "carregando" }
  | { readonly fase: "conta" }
  | { readonly fase: "pronto"; readonly estado: EstadoJogo; readonly origem: ResultadoInicio["origem"] }
  | { readonly fase: "erro"; readonly mensagem: string };

const TEXTO_ORIGEM: Record<ResultadoInicio["origem"], string> = {
  carregado: "Save carregado.",
  migrado: "Save atualizado para a versão nova.",
  novo: "Novo save criado.",
  recuperado: "O save anterior estava inválido; uma cópia foi guardada e um novo foi criado.",
};

/** Intervalo do avanço com a página aberta e da gravação periódica. */
const TICK_MS = 1_000;
const GRAVAR_A_CADA_MS = 15_000;

export function Shell() {
  const [abaAtiva, setAbaAtiva] = useState(ABAS[0]!.id);
  const [subAbaPorAba, setSubAbaPorAba] = useState<Record<string, number>>({});
  const [tela, setTela] = useState<EstadoTela>({ fase: "carregando" });
  const [resumo, setResumo] = useState<ResumoAvanco | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const armazenamento = useRef<Armazenamento | null>(null);
  const estadoRef = useRef<EstadoJogo | null>(null);
  const ultimaGravacao = useRef(0);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const sessaoRef = useRef<Sessao | null>(null);

  const cliente = useRef<ClienteConta | null>(null);
  const [situacaoConta, setSituacaoConta] = useState<SituacaoConta | null>(null);
  const acaoLocalEmCurso = useRef(false);
  const identidade = useRef(0);
  const invalidarIdentidade = useCallback(() => { identidade.current++; }, []);

  const definirEstado = useCallback((estado: EstadoJogo) => {
    estadoRef.current = estado;
    setTela((atual) => (atual.fase === "pronto" ? { ...atual, estado } : atual));
  }, []);

  const gravar = useCallback(async () => {
    const arm = armazenamento.current;
    const estado = estadoRef.current;
    if (!arm || !estado || sessaoRef.current || acaoLocalEmCurso.current) return;
    ultimaGravacao.current = Date.now();
    await salvarJogo(arm, CHAVE_SAVE, estado);
  }, []);

  /** Avança até agora; mostra o resumo se a ausência foi relevante. */
  const avancarAteAgora = useCallback(
    (mostrarResumo: boolean) => {
      const atual = estadoRef.current;
      if (!atual || sessaoRef.current || acaoLocalEmCurso.current) return;
      const r = avancar(atual, relogioDoSistema.agora());
      const pa = personagemAtivo(atual);
      const pn = personagemAtivo(r.estado);
      if (pa && pn && pa.id === pn.id) {
        if (pn.nivel > pa.nivel) tocar("nivel");
        else if (pn.eventos.pendentes.length > pa.eventos.pendentes.length) tocar("evento");
      }
      if (r.estado !== atual) definirEstado(r.estado);
      if (mostrarResumo && resumoRelevante(r.resumo)) setResumo(r.resumo);
    },
    [definirEstado],
  );

  const carregarLocal = useCallback(async () => {
    const arm = armazenamento.current;
    if (!arm) return;
    const geracao = identidade.current;
    const inicio = await iniciarJogo(arm, relogioDoSistema.agora());
    if (geracao !== identidade.current) return;
    const { estado, resumo: fora } = avancar(prepararCriacao(inicio.estado), relogioDoSistema.agora());
    await salvarJogo(arm, CHAVE_SAVE, estado);
    if (geracao !== identidade.current) return;
    estadoRef.current = estado;
    ultimaGravacao.current = Date.now();
    setTela({ fase: "pronto", estado, origem: inicio.origem });
    if (resumoRelevante(fora)) setResumo(fora);
    setAbaAtiva(personagemAtivo(estado)?.atividade ? "atividades" : "personagem");
  }, []);

  useEffect(() => {
    let cancelado = false;
    const arm = criarArmazenamentoLocal(window.localStorage);
    armazenamento.current = arm;
    const online = new ClienteConta(arm, (situacao) => {
      if (cancelado) return;
      sessaoRef.current = situacao.sessao;
      setSessao(situacao.sessao);
      setSituacaoConta(situacao);
      setOcupado(situacao.ocupado);
      if (situacao.jogo) {
        const antes = estadoRef.current;
        const pa = antes ? personagemAtivo(antes) : null;
        const pn = personagemAtivo(situacao.jogo.estado);
        if (pa && pn && pa.id === pn.id) {
          if (pn.nivel > pa.nivel) tocar("nivel");
          else if (pn.competicao.totalLutas > pa.competicao.totalLutas) tocar(pn.competicao.replays.at(-1)?.vencedor === "a" ? "vitoria" : "derrota");
          else if (pn.eventos.pendentes.length > pa.eventos.pendentes.length) tocar("evento");
        }
        if ((!pa || antes?.conta.sorteio) && pn && !situacao.jogo.estado.conta.sorteio) {
          setAbaAtiva("personagem");
          setSubAbaPorAba((atual) => ({ ...atual, personagem: 0 }));
        }
        estadoRef.current = situacao.jogo.estado;
        setTela({ fase: "pronto", estado: situacao.jogo.estado, origem: "carregado" });
      } else setTela({ fase: "conta" });
    });
    cliente.current = online;
    const restaurar = async () => {
      const geracao = identidade.current;
      const anterior = lerSessao(window.localStorage);
      await isolarSaveLegado(arm, !!anterior && !anterior.cacheSeparado);
      const s = await restaurarSessao(window.localStorage);
      if (cancelado || geracao !== identidade.current) return;
      if (s) {
        const separada: Sessao = { ...s, cacheSeparado: true };
        sessaoRef.current = separada;
        gravarSessao(window.localStorage, separada);
        await online.conectar(separada);
      } else {
        online.encerrar();
        sessaoRef.current = null;
        setSessao(null);
        setSituacaoConta(null);
        await carregarLocal();
      }
    };
    const falhou = () => { if (!cancelado) setTela({ fase: "erro", mensagem: "Não foi possível carregar o jogo. Seu save foi preservado. Recarregue a página para tentar novamente." }); };
    const outraAba = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || (e.key !== CHAVE_SESSAO && e.key !== null)) return;
      identidade.current++;
      online.encerrar();
      estadoRef.current = null;
      setResumo(null);
      setTela({ fase: "carregando" });
      void restaurar().catch(falhou);
    };
    window.addEventListener("storage", outraAba);
    void restaurar().catch(falhou);
    return () => { cancelado = true; online.encerrar(); invalidarIdentidade(); window.removeEventListener("storage", outraAba); };
  }, [carregarLocal, invalidarIdentidade]);

  async function conectarConta(s: Sessao | null, corpo: Record<string, unknown> | null) {
    identidade.current++;
    setResumo(null);
    setAviso(null);
    if (s) {
      const separada: Sessao = { ...s, cacheSeparado: true };
      sessaoRef.current = separada;
      gravarSessao(window.localStorage, separada);
      await cliente.current?.conectar(separada, corpo ?? undefined);
    } else {
      const anterior = sessaoRef.current;
      cliente.current?.encerrar();
      sessaoRef.current = null;
      setSessao(null);
      setSituacaoConta(null);
      setOcupado(false);
      const saida = sairDaConta(window.localStorage, anterior);
      estadoRef.current = null;
      setTela({ fase: "carregando" });
      await carregarLocal();
      if (!await saida) setAviso("Você saiu neste aparelho. O encerramento no servidor será confirmado quando a conexão voltar.");
    }
  }

  const controlesConta = situacaoConta && (
    <section className="cartao" aria-label="Conexão da conta">
      <p role="status">{situacaoConta.conexao === "online" ? "Conta sincronizada." : situacaoConta.conexao === "expirado" ? "Sessão expirada. Seu progresso continua na conta." : situacaoConta.conexao === "sincronizando" ? "Sincronizando conta…" : "Sem confirmação do servidor. O progresso online está pausado neste aparelho."}</p>
      {situacaoConta.mensagem && <p className="erro" role="alert">{situacaoConta.mensagem}</p>}
      {situacaoConta.codigo === "sem_save" && <button className="botao botao-principal" type="button" disabled={situacaoConta.ocupado} onClick={async () => {
        const s = situacaoConta.sessao;
        const geracao = identidade.current;
        const r = await chamarApi("jogo/iniciar", { metodo: "POST", corpo: {}, token: s.token, contaId: s.id });
        if (geracao !== identidade.current) return;
        if (r.ok) await cliente.current?.conectar(s, r.corpo);
        else setAviso(r.mensagem);
      }}>Iniciar novo jogo online</button>}
      {situacaoConta.jogo?.procedencia === "importado" && <p className="suave">Jogo importado: pode jogar contra bots, mas não publicar builds competitivos.</p>}
      <div className="acoes">
        <button className="botao" type="button" disabled={situacaoConta.ocupado || situacaoConta.conexao === "expirado"} onClick={() => void cliente.current?.sincronizar().catch(() => setAviso("Não foi possível sincronizar. Tente novamente."))}>Sincronizar</button>
        <button className="botao" type="button" onClick={() => void conectarConta(null, null).catch(() => setAviso("Não foi possível abrir o jogo local."))}>Sair e voltar ao jogo local</button>
      </div>
    </section>
  );

  const pronto = tela.fase === "pronto";
  useEffect(() => {
    if (!pronto) return;
    const intervalo = window.setInterval(() => {
      if (sessaoRef.current) {
        if (Date.now() - ultimaGravacao.current >= GRAVAR_A_CADA_MS) {
          ultimaGravacao.current = Date.now();
          void cliente.current?.sincronizar().catch(() => setAviso("Não foi possível sincronizar. Tente novamente."));
        }
        return;
      }
      avancarAteAgora(false);
      if (Date.now() - ultimaGravacao.current >= GRAVAR_A_CADA_MS) void gravar();
    }, TICK_MS);
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        avancarAteAgora(false);
        void gravar();
      } else {
        // Aba em segundo plano pode ter ficado parada: mostra o que rendeu.
        if (sessaoRef.current) void cliente.current?.sincronizar().catch(() => setAviso("Não foi possível sincronizar. Tente novamente."));
        else avancarAteAgora(true);
      }
    };
    const aoSair = () => {
      avancarAteAgora(false);
      void gravar();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", aoSair);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", aoSair);
    };
  }, [pronto, avancarAteAgora, gravar]);

  /** Troca o estado (já gravado) e ajusta as abas quando um personagem nasce. */
  async function adotar(novo: EstadoJogo) {
    const arm = armazenamento.current;
    const geracao = identidade.current;
    if (sessaoRef.current) return;
    if (arm) await salvarJogo(arm, CHAVE_SAVE, novo);
    if (geracao !== identidade.current || sessaoRef.current) return;
    ultimaGravacao.current = Date.now();
    const antes = estadoRef.current;
    const tinhaPersonagem = antes ? personagemAtivo(antes) !== null && !antes.conta.sorteio : false;
    definirEstado(novo);
    // Sons (F13): nível, eventos novos e o resultado da Arena; senão, um clique.
    const pa = antes ? personagemAtivo(antes) : null;
    const pn = personagemAtivo(novo);
    if (pa && pn && pa.id === pn.id) {
      const luta = pn.competicao.totalLutas > pa.competicao.totalLutas ? pn.competicao.replays.at(-1) : undefined;
      if (pn.nivel > pa.nivel) tocar("nivel");
      else if (luta) tocar(luta.vencedor === "a" ? "vitoria" : "derrota");
      else tocar("clique");
    }
    if (!tinhaPersonagem && personagemAtivo(novo) && !novo.conta.sorteio) {
      setAbaAtiva("personagem");
      setSubAbaPorAba((a) => ({ ...a, personagem: 0 }));
    }
  }

  /** Aplica uma ação: no servidor (com conta) ou aqui (modo local). Devolve o erro, se houver. */
  async function executar(acao: Acao): Promise<string | null> {
    if (sessaoRef.current) {
      try { return await cliente.current!.enviar(acao); }
      catch { return "Não foi possível confirmar a ação. Use Sincronizar para conferir o resultado."; }
    }
    const estado = estadoRef.current;
    if (!estado) return null;
    if (acaoLocalEmCurso.current) return "Aguarde a operação em andamento.";
    acaoLocalEmCurso.current = true;
    try {
      const r = aplicarAcao(estado, acao, relogioDoSistema.agora());
      if (!r.ok) return r.erro.mensagem;
      await adotar(r.estado);
      return null;
    } catch { return "Não foi possível salvar. Tente de novo."; }
    finally { acaoLocalEmCurso.current = false; }
  }

  async function agirNaAtividade(acao: Acao) {
    setOcupado(true);
    setAviso(await executar(acao));
    setOcupado(false);
  }
  const agir = (acao: Acao) => void agirNaAtividade(acao);

  if (tela.fase === "carregando") {
    return (
      <p className="carregando" role="status">
        Carregando save…
      </p>
    );
  }
  if (tela.fase === "erro") {
    return (
      <p className="erro carregando" role="alert">
        {tela.mensagem}
      </p>
    );
  }

  if (tela.fase === "conta") return <main className="conteudo" id="conteudo">{controlesConta}</main>;

  const personagem = personagemAtivo(tela.estado);
  if (!personagem || tela.estado.conta.sorteio) {
    return (
      <div className="shell">
        <main className="conteudo" id="conteudo">
          {controlesConta}
          <CriacaoPersonagem estado={tela.estado} aoAgir={executar} />
        </main>
      </div>
    );
  }

  const aba = ABAS.find((a) => a.id === abaAtiva) ?? ABAS[0]!;
  const indiceSub = subAbaPorAba[aba.id] ?? 0;
  const subAba = aba.subAbas[indiceSub] ?? aba.subAbas[0];

  let conteudo: React.ReactNode = (
    <section className="vazio">
      <h2>{subAba}</h2>
      <p>Em construção. Esta seção chega nas próximas fatias.</p>
    </section>
  );
  if (aba.id === "personagem" && indiceSub === 0) {
    conteudo = (
      <>
        <PainelStatus personagem={personagem} />
        <FichaPersonagem personagem={personagem} />
      </>
    );
  } else if (aba.id === "combate" && indiceSub === 3) {
    conteudo = <PainelArena personagem={personagem} ocupado={ocupado} agir={agir} sessao={sessao} />;
  } else if (aba.id === "combate" && indiceSub === 4) {
    conteudo = <PainelCampoDeProvas personagem={personagem} />;
  } else if (aba.id === "combate" && indiceSub === 5) {
    conteudo = <PainelTorneio personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "personagem" && indiceSub === 4) {
    conteudo = <PainelCronica personagem={personagem} />;
  } else if (aba.id === "personagem" && indiceSub === 2) {
    conteudo = <PainelPets personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 4) {
    conteudo = <PainelCuidados personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 2) {
    conteudo = (
      <PainelProducao personagem={personagem} ocupado={ocupado} aoIniciar={(id) => agir({ tipo: "iniciarAtividade", atividadeId: id })} aoParar={() => agir({ tipo: "pararAtividade" })} />
    );
  } else if (aba.id === "mochila" && indiceSub === 4) {
    conteudo = <PainelConsumiveis personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 5) {
    conteudo = <PainelNomeados personagem={personagem} />;
  } else if (aba.id === "atividades" && (indiceSub === 0 || indiceSub === 1)) {
    const props = {
      personagem,
      ocupado,
      aoIniciar: (id: string) => agir({ tipo: "iniciarAtividade", atividadeId: id }),
      aoParar: () => agir({ tipo: "pararAtividade" }),
    };
    conteudo = indiceSub === 0 ? <PainelTreino {...props} /> : <PainelColeta {...props} />;
  } else if (aba.id === "mapa") {
    const props = { personagem, ocupado, agir };
    conteudo = indiceSub === 0 ? <PainelRegiao {...props} /> : indiceSub === 1 ? <PainelLocalAtual personagem={personagem} /> : <PainelEstabelecimentos {...props} />;
  } else if (aba.id === "personagem" && indiceSub === 1) {
    conteudo = <PainelHabilidades personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 3) {
    conteudo = <PainelAprendizado personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "combate" && indiceSub === 0) {
    conteudo = (
      <PainelAreas
        personagem={personagem}
        ocupado={ocupado}
        agir={agir}
        aoIniciar={(id) => agir({ tipo: "iniciarAtividade", atividadeId: id })}
        aoParar={() => agir({ tipo: "pararAtividade" })}
      />
    );
  } else if (aba.id === "missoes") {
    const props = { personagem, ocupado, agir };
    conteudo = indiceSub === 0 ? <PainelNpcs {...props} /> : indiceSub === 1 ? <PainelMetas {...props} /> : indiceSub === 2 ? <PainelGuilda {...props} /> : <PainelHistoria {...props} />;
  } else if (aba.id === "combate" && indiceSub === 2) {
    conteudo = <PainelLimiar personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "personagem" && indiceSub === 5) {
    conteudo = (
      <PainelConta
        estado={tela.estado}
        sessao={sessao}
        ocupado={ocupado}
        agir={agir}
        aoConectar={conectarConta}
      />
    );
  } else if (aba.id === "personagem" && indiceSub === 3) {
    conteudo = <PainelTitulos personagem={personagem} />;
  } else if (aba.id === "combate" && indiceSub === 1) {
    conteudo = <PainelBestiario personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 0) {
    conteudo = <PainelEquipados personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "mochila" && indiceSub === 1) {
    conteudo = <PainelEquipaveis personagem={personagem} ocupado={ocupado} agir={agir} />;
  } else if (aba.id === "mochila" && indiceSub === 2) {
    conteudo = <PainelFerramentas personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 3) {
    conteudo = <PainelMateriais personagem={personagem} ocupado={ocupado} agir={agir} />;
  }

  return (
    <div className="shell">
      <header className="topo">
        <BarraAtividade personagem={personagem} />
        <h1 className="titulo">{aba.rotulo}</h1>
        <nav className="subabas" role="tablist" aria-label={`Seções de ${aba.rotulo}`}>
          {aba.subAbas.map((nome, i) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={i === indiceSub}
              className="subaba"
              onClick={() => setSubAbaPorAba((atual) => ({ ...atual, [aba.id]: i }))}
            >
              {nome}
            </button>
          ))}
        </nav>
      </header>

      <main className="conteudo conteudo-coluna" id="conteudo">
        <div role="tabpanel" aria-label={subAba} className="painel-aba">
        <h2 className="visualmente-oculto">{subAba}</h2>
        {aviso && (
          <p className="erro aviso-acao" role="alert">
            {aviso}{" "}
            <button type="button" className="link" onClick={() => setAviso(null)}>
              Fechar
            </button>
          </p>
        )}
        <EventosPendentes personagem={personagem} ocupado={ocupado} agir={agir} />
        {controlesConta}
        {conteudo}
        </div>
      </main>

      <p className="status-save" role="status" aria-live="polite">
        {TEXTO_ORIGEM[tela.origem]}
      </p>

      <nav className="abas" aria-label="Navegação principal">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="aba"
            aria-current={a.id === abaAtiva ? "page" : undefined}
            onClick={() => setAbaAtiva(a.id)}
          >
            <span className="aba-icone" aria-hidden="true">
              {a.icone}
            </span>
            <span className="aba-rotulo">{a.rotulo}</span>
            {a.id === "missoes" && missoesProntas(personagem) > 0 && (
              <span className="aba-selo" aria-label={`${missoesProntas(personagem)} missões prontas para entregar`}>
                {missoesProntas(personagem)}
              </span>
            )}
          </button>
        ))}
      </nav>

      {resumo && <ResumoOffline resumo={resumo} aoFechar={() => setResumo(null)} />}
    </div>
  );
}
