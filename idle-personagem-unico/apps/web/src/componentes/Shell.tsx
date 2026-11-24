"use client";

import {
  avancar,
  iniciarAtividade,
  pararAtividade,
  personagemAtivo,
  relogioDoSistema,
  salvarJogo,
  type Armazenamento,
  type EstadoJogo,
  type ResumoAvanco,
} from "@idle-pu/motor";
import { useCallback, useEffect, useRef, useState } from "react";
import { ABAS } from "@/lib/abas";
import { resumoRelevante } from "@/lib/atividade";
import { criarArmazenamentoLocal } from "@/lib/armazenamentoLocal";
import { aplicarESalvar, prepararCriacao, type ResultadoComEstado } from "@/lib/criacao";
import { CHAVE_SAVE, iniciarJogo, type ResultadoInicio } from "@/lib/persistencia";
import { BarraAtividade } from "./BarraAtividade";
import { CriacaoPersonagem } from "./CriacaoPersonagem";
import { FichaPersonagem } from "./FichaPersonagem";
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
  const armazenamento = useRef<Armazenamento | null>(null);
  const estadoRef = useRef<EstadoJogo | null>(null);
  const ultimaGravacao = useRef(0);

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

  async function aoAgir(resultado: ResultadoComEstado): Promise<string | null> {
    const arm = armazenamento.current;
    if (!arm) return "Armazenamento indisponível.";
    try {
      const gravado = await aplicarESalvar(arm, resultado);
      if (!gravado.ok) return gravado.erro.mensagem;
      ultimaGravacao.current = Date.now();
      const tinhaPersonagem = estadoRef.current ? personagemAtivo(estadoRef.current) !== null : false;
      definirEstado(gravado.estado);
      if (!tinhaPersonagem && personagemAtivo(gravado.estado)) {
        setAbaAtiva("personagem");
        setSubAbaPorAba((a) => ({ ...a, personagem: 0 }));
      }
      return null;
    } catch {
      return "Não foi possível salvar. Tente de novo.";
    }
  }

  async function agirNaAtividade(acao: (estado: EstadoJogo, agora: number) => ResultadoComEstado) {
    const estado = estadoRef.current;
    if (!estado) return;
    setOcupado(true);
    await aoAgir(acao(estado, relogioDoSistema.agora()));
    setOcupado(false);
  }

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
  if (!personagem) {
    return (
      <div className="shell">
        <main className="conteudo">
          <CriacaoPersonagem estado={tela.estado} aoAgir={aoAgir} />
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
  } else if (aba.id === "atividades" && indiceSub === 0) {
    conteudo = (
      <PainelTreino
        personagem={personagem}
        ocupado={ocupado}
        aoIniciar={(id) => void agirNaAtividade((e, agora) => iniciarAtividade(e, id, agora))}
        aoParar={() => void agirNaAtividade(pararAtividade)}
      />
    );
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
          </button>
        ))}
      </nav>

      {resumo && <ResumoOffline resumo={resumo} aoFechar={() => setResumo(null)} />}
    </div>
  );
}
