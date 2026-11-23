"use client";

import { relogioDoSistema } from "@idle-pu/motor";
import { useEffect, useState } from "react";
import { ABAS } from "@/lib/abas";
import { criarArmazenamentoLocal } from "@/lib/armazenamentoLocal";
import { iniciarJogo, type ResultadoInicio } from "@/lib/persistencia";

type EstadoSave =
  | { readonly fase: "carregando" }
  | { readonly fase: "pronto"; readonly resultado: ResultadoInicio }
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
  const [save, setSave] = useState<EstadoSave>({ fase: "carregando" });

  useEffect(() => {
    let cancelado = false;
    iniciarJogo(criarArmazenamentoLocal(window.localStorage), relogioDoSistema.agora())
      .then((resultado) => {
        if (!cancelado) setSave({ fase: "pronto", resultado });
      })
      .catch(() => {
        if (!cancelado) setSave({ fase: "erro", mensagem: "Não foi possível acessar o armazenamento do navegador." });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const aba = ABAS.find((a) => a.id === abaAtiva) ?? ABAS[0]!;
  const indiceSub = subAbaPorAba[aba.id] ?? 0;
  const subAba = aba.subAbas[indiceSub] ?? aba.subAbas[0];

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
        <section className="vazio">
          <h2>{subAba}</h2>
          <p>Em construção. Esta seção chega nas próximas fatias.</p>
        </section>
      </main>

      <p className="status-save" role="status" aria-live="polite">
        {save.fase === "carregando" && "Carregando save…"}
        {save.fase === "erro" && save.mensagem}
        {save.fase === "pronto" && TEXTO_ORIGEM[save.resultado.origem]}
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
