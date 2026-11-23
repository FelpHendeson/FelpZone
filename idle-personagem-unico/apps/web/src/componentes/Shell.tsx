"use client";

import { personagemAtivo, relogioDoSistema, salvarJogo, type Armazenamento, type EstadoJogo, type ResultadoAcao } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import { ABAS } from "@/lib/abas";
import { criarArmazenamentoLocal } from "@/lib/armazenamentoLocal";
import { aplicarESalvar, prepararCriacao } from "@/lib/criacao";
import { CHAVE_SAVE, iniciarJogo, type ResultadoInicio } from "@/lib/persistencia";
import { CriacaoPersonagem } from "./CriacaoPersonagem";
import { FichaPersonagem } from "./FichaPersonagem";

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

export function Shell() {
  const [abaAtiva, setAbaAtiva] = useState(ABAS[0]!.id);
  const [subAbaPorAba, setSubAbaPorAba] = useState<Record<string, number>>({});
  const [tela, setTela] = useState<EstadoTela>({ fase: "carregando" });
  const armazenamento = useRef<Armazenamento | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const arm = criarArmazenamentoLocal(window.localStorage);
      armazenamento.current = arm;
      const inicio = await iniciarJogo(arm, relogioDoSistema.agora());
      // Jogo sem personagem já começa o sorteio; grava antes de mostrar.
      const estado = prepararCriacao(inicio.estado);
      if (estado !== inicio.estado) await salvarJogo(arm, CHAVE_SAVE, estado);
      if (!cancelado) {
        setTela({ fase: "pronto", estado, origem: inicio.origem });
        // Na F1 só a ficha tem conteúdo: abre direto na aba Personagem.
        setAbaAtiva("personagem");
      }
    })().catch(() => {
      if (!cancelado) setTela({ fase: "erro", mensagem: "Não foi possível acessar o armazenamento do navegador." });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function aoAgir(resultado: ResultadoAcao): Promise<string | null> {
    const arm = armazenamento.current;
    if (!arm) return "Armazenamento indisponível.";
    try {
      const gravado = await aplicarESalvar(arm, resultado);
      if (!gravado.ok) return gravado.erro.mensagem;
      setTela((atual) => (atual.fase === "pronto" ? { ...atual, estado: gravado.estado } : atual));
      if (personagemAtivo(gravado.estado)) {
        setAbaAtiva("personagem");
        setSubAbaPorAba((a) => ({ ...a, personagem: 0 }));
      }
      return null;
    } catch {
      return "Não foi possível salvar. Tente de novo.";
    }
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
  const mostraFicha = aba.id === "personagem" && indiceSub === 0;

  return (
    <div className="shell">
      <header className="topo">
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

      <main className="conteudo" role="tabpanel" aria-label={subAba}>
        {mostraFicha ? (
          <FichaPersonagem personagem={personagem} />
        ) : (
          <section className="vazio">
            <h2>{subAba}</h2>
            <p>Em construção. Esta seção chega nas próximas fatias.</p>
          </section>
        )}
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
    </div>
  );
}
