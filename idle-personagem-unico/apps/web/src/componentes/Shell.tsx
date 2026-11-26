"use client";

import {
  aplicarAcao,
  avancar,
  personagemAtivo,
  relogioDoSistema,
  salvarJogo,
  serializarSave,
  type Acao,
  type Armazenamento,
  type EstadoJogo,
  type ResumoAvanco,
} from "@idle-pu/motor";
import { useCallback, useEffect, useRef, useState } from "react";
import { ABAS } from "@/lib/abas";
import { resumoRelevante } from "@/lib/atividade";
import { criarArmazenamentoLocal } from "@/lib/armazenamentoLocal";
import { lerJornadaLocal } from "@/lib/entrada";
import { AcessoConta } from "./AcessoConta";
import { Apresentacao, MolduraEntrada, SelecaoPersonagens } from "./PortalEntrada";
import { CHAVE_SAVE, iniciarJogo, isolarSaveLegado, type ResultadoInicio } from "@/lib/persistencia";
import { tocar } from "@/lib/sons";
import { chamarApi, CHAVE_SESSAO, gravarSessao, lerSessao, restaurarSessao, sairDaConta, type Sessao } from "@/lib/sync";
import { ClienteConta, type SituacaoConta } from "@/lib/clienteConta";
import { CabecalhoJornada } from "./CabecalhoJornada";
import { GuiaJornada, TutorialContextual } from "./GuiaJornada";
import { NavegacaoPrincipal, SubAbas } from "./NavegacaoJogo";
import type { DestinoJogo } from "@/lib/navegacao";
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
  | { readonly fase: "inicio" }
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
  const [fluxo, setFluxo] = useState<"inicio" | "acesso" | "personagens" | "jogo">("inicio");
  const [modoAcesso, setModoAcesso] = useState<"entrar" | "registrar">("entrar");
  const [estadoLocal, setEstadoLocal] = useState<EstadoJogo | null>(null);
  const [resumo, setResumo] = useState<ResumoAvanco | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState("");
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
    if (!sessaoRef.current) setEstadoLocal(estado);
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
    const { estado, resumo: fora } = avancar(inicio.estado, relogioDoSistema.agora());
    await salvarJogo(arm, CHAVE_SAVE, estado);
    if (geracao !== identidade.current) return;
    estadoRef.current = estado;
    setEstadoLocal(estado);
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
      const local = await lerJornadaLocal(arm);
      if (cancelado || geracao !== identidade.current) return;
      setEstadoLocal(local);
      const s = await restaurarSessao(window.localStorage);
      if (cancelado || geracao !== identidade.current) return;
      if (s) {
        const separada: Sessao = { ...s, cacheSeparado: true };
        sessaoRef.current = separada;
        gravarSessao(window.localStorage, separada);
        await online.conectar(separada);
        if (!cancelado && geracao === identidade.current) setFluxo(online.atual?.conexao === "expirado" ? "acesso" : "personagens");
      } else {
        online.encerrar();
        sessaoRef.current = null;
        setSessao(null);
        setSituacaoConta(null);
        estadoRef.current = null;
        setTela({ fase: "inicio" });
        setFluxo("inicio");
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
  }, [invalidarIdentidade]);

  async function conectarConta(s: Sessao | null, corpo: Record<string, unknown> | null) {
    identidade.current++;
    const geracao = identidade.current;
    setResumo(null);
    setAviso(null);
    setConfirmacao("");
    if (s) {
      const separada: Sessao = { ...s, cacheSeparado: true };
      sessaoRef.current = separada;
      gravarSessao(window.localStorage, separada);
      await cliente.current?.conectar(separada, corpo ?? undefined);
      if (geracao !== identidade.current) return;
      setFluxo(corpo && cliente.current?.atual?.jogo?.estado.conta.sorteio ? "jogo" : "personagens");
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
      const local = armazenamento.current ? await lerJornadaLocal(armazenamento.current) : null;
      if (geracao !== identidade.current) return;
      setEstadoLocal(local);
      setTela({ fase: "inicio" });
      setFluxo("inicio");
      if (!await saida) setAviso("Você saiu neste aparelho. O encerramento no servidor será confirmado quando a conexão voltar.");
    }
  }

  async function entrarLocal() {
    setAviso(null);
    setTela({ fase: "carregando" });
    try { await carregarLocal(); setFluxo("personagens"); }
    catch { setTela({ fase: "erro", mensagem: "Não foi possível carregar a jornada deste aparelho. O save foi preservado." }); }
  }
  async function iniciarContaVazia(importar = false) {
    const s = sessaoRef.current;
    if (!s || (importar && !estadoLocal)) return;
    const geracao = identidade.current;
    setOcupado(true);
    try {
      const r = await chamarApi(importar ? "jogo/importar" : "jogo/iniciar", { metodo: "POST", corpo: importar && estadoLocal ? { save: serializarSave(estadoLocal) } : {}, token: s.token, contaId: s.id });
      if (geracao !== identidade.current) return;
      if (!r.ok) { setAviso(r.mensagem); return; }
      await cliente.current?.conectar(s, r.corpo);
      if (geracao !== identidade.current) return;
      setFluxo(cliente.current?.atual?.jogo?.estado.conta.sorteio ? "jogo" : "personagens");
    } catch { if (geracao === identidade.current) setAviso("Não foi possível confirmar o início da jornada. Sincronize antes de tentar novamente."); }
    finally { if (geracao === identidade.current) setOcupado(false); }
  }
  const avisoEntrada = aviso && <p role="alert" className="erro aviso-acao">{aviso}</p>;
  const abrirAcesso = (modo: "entrar" | "registrar" = "entrar") => { setModoAcesso(modo); setFluxo("acesso"); };

  const controlesConta = situacaoConta && (
    <section className="cartao" aria-label="Conexão da conta">
      <p role="status">{situacaoConta.conexao === "online" ? "Conta sincronizada." : situacaoConta.conexao === "expirado" ? "Sessão expirada. Seu progresso continua na conta." : situacaoConta.conexao === "sincronizando" ? "Sincronizando conta…" : "Sem confirmação do servidor. O progresso online está pausado neste aparelho."}</p>
      {situacaoConta.mensagem && <p className="erro" role="alert">{situacaoConta.mensagem}</p>}
      {situacaoConta.jogo?.procedencia === "importado" && <p className="suave">Jogo importado: pode jogar contra bots, mas não publicar builds competitivos.</p>}
      <div className="acoes">
        <button className="botao" type="button" disabled={situacaoConta.ocupado || situacaoConta.conexao === "expirado"} onClick={() => void cliente.current?.sincronizar().catch(() => setAviso("Não foi possível sincronizar. Tente novamente."))}>Sincronizar</button>
        <button className="botao" type="button" onClick={() => void conectarConta(null, null).catch(() => setAviso("Não foi possível concluir a saída."))}>Sair da conta</button>
      </div>
    </section>
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLHeadingElement>("h1")?.focus({ preventScroll: true });
  }, [fluxo]);

  useEffect(() => {
    if (fluxo !== "jogo") return;
    window.scrollTo(0, 0);
    document.querySelector<HTMLHeadingElement>("#titulo-secao")?.focus({ preventScroll: true });
  }, [abaAtiva, fluxo]);

  useEffect(() => {
    if (!aviso || fluxo !== "jogo") return;
    const mensagem = document.querySelector<HTMLElement>(".aviso-acao");
    mensagem?.focus({ preventScroll: true });
    mensagem?.scrollIntoView({ block: "nearest" });
  }, [aviso, fluxo]);

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
    const geracao = identidade.current;
    setConfirmacao("");
    if (sessaoRef.current) {
      if (cliente.current?.atual?.conexao !== "online") return "A conta está em leitura. Reconecte ou entre novamente para confirmar ações.";
      try {
        const erro = await cliente.current!.enviar(acao);
        if (!erro && geracao === identidade.current) setConfirmacao("Alteração confirmada na conta.");
        return erro;
      }
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
      if (geracao === identidade.current) setConfirmacao("Alteração salva neste aparelho.");
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

  const atual = tela.fase === "pronto" ? tela.estado : null;
  const inicio = <Apresentacao estado={sessao ? atual : estadoLocal} sessao={sessao} aoAcesso={abrirAcesso} aoLocal={() => void entrarLocal()} aoConta={() => setFluxo("personagens")} aviso={avisoEntrada} />;
  if (fluxo === "inicio") return inicio;
  if (fluxo === "acesso") return <MolduraEntrada sessao={sessao} aoInicio={() => setFluxo("inicio")}>
    <header className="entrada-titulo"><h1 tabIndex={-1}>{sessao && situacaoConta?.conexao !== "expirado" ? "Sua conta" : modoAcesso === "registrar" ? "Uma conta para sua jornada" : "Bom ter você de volta"}</h1><p>{atual ? "Sua jornada continua salva enquanto você cuida do acesso à conta." : "Continue sua história em qualquer aparelho. O personagem vem depois."}</p></header>
    {avisoEntrada}{controlesConta}
    <div className="entrada-acesso"><AcessoConta key={`${sessao?.id ?? "convidado"}:${situacaoConta?.conexao === "expirado"}:${modoAcesso}`} estado={estadoLocal ?? undefined} sessao={situacaoConta?.conexao === "expirado" ? null : sessao} modoInicial={modoAcesso} aoConectar={conectarConta} /></div>
    <div className="entrada-retorno">{atual && personagemAtivo(atual) && !atual.conta.sorteio && <button type="button" className="link" onClick={() => setFluxo("jogo")}>Voltar à jornada</button>}<button type="button" className="link" onClick={() => setFluxo("inicio")}>Voltar à apresentação</button>{!sessao && !atual && <button type="button" className="link" onClick={() => void entrarLocal()}>Jogar neste aparelho</button>}</div>
  </MolduraEntrada>;
  if (fluxo === "personagens" || tela.fase === "conta") return <SelecaoPersonagens
    estado={atual} sessao={sessao} ocupado={ocupado} aviso={avisoEntrada} controles={controlesConta}
    podeIniciar={!sessao || situacaoConta?.conexao === "online" || situacaoConta?.codigo === "sem_save"}
    aoInicio={() => setFluxo("inicio")} aoAcesso={() => abrirAcesso()}
    aoJogar={(id) => { void (async () => { if (atual?.conta.personagemAtivoId !== id) { const erro = await executar({ tipo: "trocarPersonagem", personagemId: id }); if (erro) { setAviso(erro); return; } } setFluxo("jogo"); })(); }}
    aoCriar={() => { if (!atual && sessao) { void iniciarContaVazia(); return; } void (async () => { const erro = await executar({ tipo: "iniciarSorteio" }); if (erro) setAviso(erro); else setFluxo("jogo"); })(); }}
    aoContinuarCriacao={() => setFluxo("jogo")}
    aoImportar={!atual && sessao && estadoLocal && (estadoLocal.conta.personagens.length > 0 || estadoLocal.conta.sorteio) ? () => void iniciarContaVazia(true) : undefined}
  />;
  if (tela.fase !== "pronto") return inicio;

  const personagem = personagemAtivo(tela.estado);
  if (!personagem || tela.estado.conta.sorteio) {
    return (
      <div className="shell">
        <main className="conteudo" id="conteudo">
          <button className="link entrada-voltar" type="button" onClick={() => setFluxo("personagens")}>Voltar aos personagens</button>
          {avisoEntrada}{controlesConta}
          <CriacaoPersonagem estado={tela.estado} aoAgir={executar} />
        </main>
      </div>
    );
  }

  const aba = ABAS.find((a) => a.id === abaAtiva) ?? ABAS[0]!;
  const indiceSub = subAbaPorAba[aba.id] ?? 0;
  const subAba = aba.subAbas[indiceSub] ?? aba.subAbas[0];
  const bloquearAcoes = ocupado || (!!sessao && situacaoConta?.conexao !== "online");
  const navegar = ({ aba: id, sub }: DestinoJogo) => {
    setAbaAtiva(id);
    setSubAbaPorAba((atual) => ({ ...atual, [id]: sub }));
  };

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
    conteudo = <PainelArena personagem={personagem} ocupado={bloquearAcoes} agir={agir} sessao={sessao} />;
  } else if (aba.id === "combate" && indiceSub === 4) {
    conteudo = <PainelCampoDeProvas personagem={personagem} />;
  } else if (aba.id === "combate" && indiceSub === 5) {
    conteudo = <PainelTorneio personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "personagem" && indiceSub === 4) {
    conteudo = <PainelCronica personagem={personagem} />;
  } else if (aba.id === "personagem" && indiceSub === 2) {
    conteudo = <PainelPets personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 4) {
    conteudo = <PainelCuidados personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 2) {
    conteudo = (
      <PainelProducao personagem={personagem} ocupado={bloquearAcoes} aoIniciar={(id) => agir({ tipo: "iniciarAtividade", atividadeId: id })} aoParar={() => agir({ tipo: "pararAtividade" })} />
    );
  } else if (aba.id === "mochila" && indiceSub === 4) {
    conteudo = <PainelConsumiveis personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 5) {
    conteudo = <PainelNomeados personagem={personagem} />;
  } else if (aba.id === "atividades" && (indiceSub === 0 || indiceSub === 1)) {
    const props = {
      personagem,
      ocupado: bloquearAcoes,
      aoIniciar: (id: string) => agir({ tipo: "iniciarAtividade", atividadeId: id }),
      aoParar: () => agir({ tipo: "pararAtividade" }),
    };
    conteudo = indiceSub === 0 ? <PainelTreino {...props} /> : <PainelColeta {...props} />;
  } else if (aba.id === "mapa") {
    const props = { personagem, ocupado: bloquearAcoes, agir };
    conteudo = indiceSub === 0 ? <PainelRegiao {...props} /> : indiceSub === 1 ? <PainelLocalAtual personagem={personagem} /> : <PainelEstabelecimentos {...props} />;
  } else if (aba.id === "personagem" && indiceSub === 1) {
    conteudo = <PainelHabilidades personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "atividades" && indiceSub === 3) {
    conteudo = <PainelAprendizado personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "combate" && indiceSub === 0) {
    conteudo = (
      <PainelAreas
        personagem={personagem}
        ocupado={bloquearAcoes}
        agir={agir}
        aoIniciar={(id) => agir({ tipo: "iniciarAtividade", atividadeId: id })}
        aoParar={() => agir({ tipo: "pararAtividade" })}
      />
    );
  } else if (aba.id === "missoes") {
    const props = { personagem, ocupado: bloquearAcoes, agir };
    conteudo = indiceSub === 0 ? <PainelNpcs {...props} /> : indiceSub === 1 ? <PainelMetas {...props} /> : indiceSub === 2 ? <PainelGuilda {...props} /> : <PainelHistoria {...props} />;
  } else if (aba.id === "combate" && indiceSub === 2) {
    conteudo = <PainelLimiar personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "personagem" && indiceSub === 6) {
    conteudo = <GuiaJornada key={personagem.id} personagem={personagem} ocupado={bloquearAcoes} aoDestino={navegar} aoAgir={executar} />;
  } else if (aba.id === "personagem" && indiceSub === 5) {
    conteudo = (
      <PainelConta
        estado={tela.estado}
        sessao={sessao}
        ocupado={bloquearAcoes}
        agir={agir}
        aoConectar={conectarConta}
      />
    );
  } else if (aba.id === "personagem" && indiceSub === 3) {
    conteudo = <PainelTitulos personagem={personagem} />;
  } else if (aba.id === "combate" && indiceSub === 1) {
    conteudo = <PainelBestiario personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 0) {
    conteudo = <PainelEquipados personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "mochila" && indiceSub === 1) {
    conteudo = <PainelEquipaveis personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  } else if (aba.id === "mochila" && indiceSub === 2) {
    conteudo = <PainelFerramentas personagem={personagem} />;
  } else if (aba.id === "mochila" && indiceSub === 3) {
    conteudo = <PainelMateriais personagem={personagem} ocupado={bloquearAcoes} agir={agir} />;
  }

  return (
    <div className="shell shell-jogo">
      <CabecalhoJornada personagem={personagem} sessao={sessao} situacao={situacaoConta}
        aoPersonagens={() => setFluxo("personagens")} aoConta={() => abrirAcesso()}
        aoDestino={navegar} aoSincronizar={() => void cliente.current?.sincronizar().catch(() => setAviso("Não foi possível sincronizar. Tente novamente."))} />
      <NavegacaoPrincipal ativa={aba.id} prontas={missoesProntas(personagem)} aoEscolher={setAbaAtiva} />
      <main className="conteudo conteudo-coluna jornada-conteudo" id="conteudo" aria-busy={ocupado}>
        <div className="jornada-secao"><h1 className="titulo" id="titulo-secao" tabIndex={-1}>{aba.rotulo}</h1>
          <SubAbas aba={aba} indice={indiceSub} aoEscolher={(i) => setSubAbaPorAba((atual) => ({ ...atual, [aba.id]: i }))} />
        </div>
        <div id="painel-jogo" role="tabpanel" aria-labelledby={`secao-${aba.id}-${indiceSub}`} tabIndex={0} className="painel-aba">
        <h2 className="visualmente-oculto">{subAba}</h2>
        {aviso && (
          <p className="erro aviso-acao" role="alert" tabIndex={-1}>
            {aviso}{" "}
            <button type="button" className="link" onClick={() => setAviso(null)}>
              Fechar
            </button>
          </p>
        )}
        <EventosPendentes personagem={personagem} ocupado={bloquearAcoes} agir={agir} />
        {situacaoConta?.conexao === "expirado" && <p className="aviso" role="status">Entre novamente na conta para continuar. Seu último progresso está preservado.</p>}
        {situacaoConta?.conexao === "desconectado" && <p className="aviso" role="status">Conta em leitura até reconectar. O progresso online está pausado neste aparelho.{situacaoConta.mensagem && ` ${situacaoConta.mensagem}`}</p>}
        {!(aba.id === "personagem" && indiceSub === 6) && <TutorialContextual key={personagem.id} personagem={personagem} ocupado={bloquearAcoes} aoDestino={navegar} aoAgir={executar} />}
        {conteudo}
        </div>
      </main>

      <p className="status-save" role="status" aria-live="polite">
        {ocupado ? situacaoConta?.conexao === "sincronizando" ? "Sincronizando conta…" : "Confirmando ação…" : confirmacao || (sessao ? "Progresso vinculado à conta." : TEXTO_ORIGEM[tela.origem])}
        {situacaoConta?.jogo?.procedencia === "importado" && " Jornada importada (casual)."}
      </p>

      {resumo && <ResumoOffline resumo={resumo} aoFechar={() => setResumo(null)} />}
    </div>
  );
}
