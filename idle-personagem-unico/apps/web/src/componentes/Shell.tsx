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
import { CHAVE_SAVE, iniciarJogo, type ResultadoInicio } from "@/lib/persistencia";
import { chamarApi, enviarAcao, estadoDaResposta, gravarSessao, lerSessao, type Sessao } from "@/lib/sync";
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
import { PainelEstabelecimentos, PainelLocalAtual, PainelRegiao } from "./PainelMapa";
import { PainelFerramentas, PainelMateriais } from "./PainelMochila";
import { PainelConsumiveis, PainelNomeados, PainelProducao } from "./PainelProducao";
import { PainelStatus } from "./PainelStatus";
import { PainelTreino } from "./PainelTreino";
import { ResumoOffline } from "./ResumoOffline";

type EstadoTela =
  | { readonly fase: "carregando" }
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

  const definirSessao = useCallback((s: Sessao | null) => {
    sessaoRef.current = s;
    setSessao(s);
    gravarSessao(window.localStorage, s);
  }, []);

  const definirEstado = useCallback((estado: EstadoJogo) => {
    estadoRef.current = estado;
    setTela((atual) => (atual.fase === "pronto" ? { ...atual, estado } : atual));
  }, []);

  const gravar = useCallback(async () => {
    const arm = armazenamento.current;
    const estado = estadoRef.current;
    if (!arm || !estado) return;
    ultimaGravacao.current = Date.now();
    await salvarJogo(arm, CHAVE_SAVE, estado);
  }, []);

  /** Avança até agora; mostra o resumo se a ausência foi relevante. */
  const avancarAteAgora = useCallback(
    (mostrarResumo: boolean) => {
      const atual = estadoRef.current;
      if (!atual) return;
      const r = avancar(atual, relogioDoSistema.agora());
      if (r.estado !== atual) definirEstado(r.estado);
      if (mostrarResumo && resumoRelevante(r.resumo)) setResumo(r.resumo);
    },
    [definirEstado],
  );

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const arm = criarArmazenamentoLocal(window.localStorage);
      armazenamento.current = arm;
      const inicio = await iniciarJogo(arm, relogioDoSistema.agora());
      // Sem personagem, já começa o sorteio; com personagem, aplica o tempo fora.
      const { estado, resumo: fora } = avancar(prepararCriacao(inicio.estado), relogioDoSistema.agora());
      estadoRef.current = estado;
      await salvarJogo(arm, CHAVE_SAVE, estado);
      ultimaGravacao.current = Date.now();
      if (!cancelado) {
        setTela({ fase: "pronto", estado, origem: inicio.origem });
        if (resumoRelevante(fora)) setResumo(fora);
        setAbaAtiva(personagemAtivo(estado)?.atividade ? "atividades" : "personagem");
      }
      // Com conta, o estado do servidor manda (ele avança o tempo com o relógio dele).
      const s = lerSessao(window.localStorage);
      if (s && !cancelado) {
        sessaoRef.current = s;
        setSessao(s);
        const r = await chamarApi("jogo", { token: s.token });
        const doServidor = r.ok ? estadoDaResposta(r.corpo) : null;
        if (cancelado) return;
        if (doServidor) {
          estadoRef.current = doServidor;
          await salvarJogo(arm, CHAVE_SAVE, doServidor);
          setTela((t) => (t.fase === "pronto" ? { ...t, estado: doServidor } : t));
        } else if (!r.ok && r.status === 401) {
          sessaoRef.current = null;
          setSessao(null);
          gravarSessao(window.localStorage, null);
          setAviso("A sessão da conta expirou. Entre de novo em Personagem → Conta.");
        } else if (!r.ok) {
          setAviso(`${r.mensagem} Jogando com o save deste aparelho.`);
        }
      }
    })().catch(() => {
      if (!cancelado) setTela({ fase: "erro", mensagem: "Não foi possível acessar o armazenamento do navegador." });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const pronto = tela.fase === "pronto";
  useEffect(() => {
    if (!pronto) return;
    const intervalo = window.setInterval(() => {
      avancarAteAgora(false);
      if (Date.now() - ultimaGravacao.current >= GRAVAR_A_CADA_MS) void gravar();
    }, TICK_MS);
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        avancarAteAgora(false);
        void gravar();
      } else {
        // Aba em segundo plano pode ter ficado parada: mostra o que rendeu.
        avancarAteAgora(true);
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
    if (arm) await salvarJogo(arm, CHAVE_SAVE, novo);
    ultimaGravacao.current = Date.now();
    const antes = estadoRef.current;
    const tinhaPersonagem = antes ? personagemAtivo(antes) !== null && !antes.conta.sorteio : false;
    definirEstado(novo);
    if (!tinhaPersonagem && personagemAtivo(novo) && !novo.conta.sorteio) {
      setAbaAtiva("personagem");
      setSubAbaPorAba((a) => ({ ...a, personagem: 0 }));
    }
  }

  /** Aplica uma ação: no servidor (com conta) ou aqui (modo local). Devolve o erro, se houver. */
  async function executar(acao: Acao): Promise<string | null> {
    const estado = estadoRef.current;
    if (!estado) return null;
    try {
      const s = sessaoRef.current;
      if (s) {
        const r = await enviarAcao(s, acao);
        if (!r.ok) {
          if (r.status === 401) definirSessao(null);
          return r.mensagem;
        }
        const novo = estadoDaResposta(r.corpo);
        if (!novo) return "Resposta inválida do servidor.";
        await adotar(novo);
        return null;
      }
      const r = aplicarAcao(estado, acao, relogioDoSistema.agora());
      if (!r.ok) return r.erro.mensagem;
      await adotar(r.estado);
      return null;
    } catch {
      return "Não foi possível salvar. Tente de novo.";
    }
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

  const personagem = personagemAtivo(tela.estado);
  if (!personagem || tela.estado.conta.sorteio) {
    return (
      <div className="shell">
        <main className="conteudo">
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
        aoConectar={async (s, novo) => {
          definirSessao(s);
          if (novo) await adotar(novo);
        }}
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

      <main className="conteudo conteudo-coluna" role="tabpanel" aria-label={subAba}>
        {aviso && (
          <p className="erro aviso-acao" role="alert">
            {aviso}{" "}
            <button type="button" className="link" onClick={() => setAviso(null)}>
              Fechar
            </button>
          </p>
        )}
        <EventosPendentes personagem={personagem} ocupado={ocupado} agir={agir} />
        {conteudo}
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
