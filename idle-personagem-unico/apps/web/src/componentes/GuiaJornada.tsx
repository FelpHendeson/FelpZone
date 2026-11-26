"use client";

import { PASSOS_TUTORIAL, type Acao, type PassoTutorial, type Personagem } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import type { DestinoJogo } from "@/lib/navegacao";

const ETAPAS: readonly { id: PassoTutorial; titulo: string; texto: string; destino: DestinoJogo; botao: string }[] = [
  { id: "sorteio", titulo: "Seu destino foi escolhido", texto: "Você aceitou o sorteio e criou este personagem. São cinco tentativas por criação; voltar ou recarregar preserva a tentativa atual. Raça, core e origem são o início da sua história.", destino: { aba: "personagem", sub: 0 }, botao: "Ver minha ficha" },
  { id: "treino", titulo: "Inicie um treino", texto: "Escolha um atributo e toque em Treinar. O personagem trabalha sozinho por ciclos. Só uma atividade fica ativa; trocar descarta o ciclo em andamento. Este passo registra o início confirmado do treino.", destino: { aba: "atividades", sub: 0 }, botao: "Abrir treino" },
  { id: "coleta", titulo: "Escolha um recurso para coletar", texto: "Escolha um recurso desbloqueado em Coleta. A viagem acontece antes dos ciclos. Aguarde os materiais entrarem na mochila para vender ou produzir. O passo registra o início confirmado da coleta.", destino: { aba: "atividades", sub: 1 }, botao: "Abrir coleta" },
  { id: "venda", titulo: "Venda materiais em Pedravau", texto: "Volte a Pedravau pelo Mapa. Em Mochila → Materiais, venda o que coletou no Mercado. Uma venda que rende gold conclui o passo; uma mochila vazia não conta. Não há gold extra pelo tutorial.", destino: { aba: "mochila", sub: 3 }, botao: "Abrir materiais" },
  { id: "equipamento", titulo: "Equipe uma peça de combate", texto: "Com gold suficiente, compre arma ou armadura no Ferreiro em Mapa → Estabelecimentos. Depois, toque em Equipar na aba Equipáveis. Comprar não equipa automaticamente. Continue coletando e vendendo se faltar gold.", destino: { aba: "mochila", sub: 1 }, botao: "Abrir equipáveis" },
  { id: "combate", titulo: "Comece uma caçada com cuidado", texto: "Compare nível recomendado e risco antes de tocar em Caçar. Confira o percentual de recuo: ele ajuda a voltar à cidade com vida baixa. A caça é automática. Se morrer, O Limiar é parte da jornada. O início confirmado da caça conclui o passo.", destino: { aba: "combate", sub: 0 }, botao: "Abrir áreas de combate" },
  { id: "guilda", titulo: "Aceite uma missão da Guilda", texto: "Em Pedravau, abra Missões → Guilda e aceite uma tarefa disponível no quadro. Ela progride pelas atividades reais e precisa ser entregue. Mérito e provas permitem subir de rank. Aceitar uma missão da Guilda conclui o passo.", destino: { aba: "missoes", sub: 2 }, botao: "Abrir Guilda" },
];
interface Props {
  personagem: Personagem; ocupado: boolean;
  aoDestino: (destino: DestinoJogo) => void;
  aoAgir: (acao: Acao) => Promise<string | null>;
}
function ControleTutorial({ retomar, ocupado, aoAgir }: Pick<Props, "ocupado" | "aoAgir"> & { retomar: boolean }) {
  const [emCurso, setEmCurso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return <div className="tutorial-controle"><button type="button" className="link" disabled={ocupado || emCurso} onClick={async () => {
    setEmCurso(true);
    try {
      const falha = await aoAgir({ tipo: retomar ? "retomarTutorial" : "pularTutorial" });
      setErro(falha);
      if (!falha) document.getElementById("atalho-guia")?.focus({ preventScroll: true });
    } finally { setEmCurso(false); }
  }}>{retomar ? "Retomar tutorial" : "Pular tutorial"}</button>{erro && <p className="erro" role="alert">{erro}</p>}</div>;
}
export function TutorialContextual({ personagem: p, ocupado, aoDestino, aoAgir }: Props) {
  const etapa = ETAPAS.find((e) => !p.tutorial.concluidos.includes(e.id));
  const bloco = useRef<HTMLElement>(null);
  const anterior = useRef(etapa?.id);
  useEffect(() => {
    const mudou = anterior.current !== etapa?.id;
    anterior.current = etapa?.id;
    if (!mudou || p.tutorial.modo !== "ativo") return;
    bloco.current?.focus({ preventScroll: true });
    const quadro = requestAnimationFrame(() => {
      const atual = bloco.current;
      if (!atual) return;
      const topo = atual.closest(".shell-jogo")?.querySelector(".jornada-topo");
      const altura = topo?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: Math.max(0, window.scrollY + atual.getBoundingClientRect().top - altura - 16), behavior: "instant" });
    });
    return () => cancelAnimationFrame(quadro);
  }, [etapa?.id, p.tutorial.modo]);
  if (p.tutorial.modo !== "ativo" || !etapa) return null;
  return <section ref={bloco} tabIndex={-1} className="tutorial-contextual" aria-label="Tutorial">
    <div className="tutorial-progresso">Primeiros passos · {p.tutorial.concluidos.length} de {PASSOS_TUTORIAL.length} feitos</div>
    <h2>{etapa.titulo}</h2><p>{etapa.texto}</p>
    <div className="tutorial-acoes"><button type="button" className="botao" onClick={() => aoDestino(etapa.destino)}>{etapa.botao}</button>
      <button type="button" className="link" onClick={() => aoDestino({ aba: "personagem", sub: 6 })}>Ver guia completo</button>
      <ControleTutorial retomar={false} ocupado={ocupado} aoAgir={aoAgir} />
    </div>
    {ocupado && <p className="suave nota">Aguarde a confirmação para salvar o tutorial.</p>}
  </section>;
}
export function GuiaJornada({ personagem: p, ocupado, aoDestino, aoAgir }: Props) {
  const completo = p.tutorial.concluidos.length === PASSOS_TUTORIAL.length;
  return <section className="guia-jornada" aria-label="Guia da jornada">
    <header><h2>{completo ? "Primeiros passos concluídos" : "Aprenda no seu ritmo"}</h2>
      <p>{p.tutorial.concluidos.length} de {PASSOS_TUTORIAL.length} passos feitos com {p.nome}. {p.tutorial.modo === "pulado" && !completo ? "O tutorial está pausado." : "Você pode explorar os sistemas em qualquer ordem."} O guia fica sempre disponível; abrir uma tela não marca uma ação como feita.</p>
      {!completo && <ControleTutorial retomar={p.tutorial.modo === "pulado"} ocupado={ocupado} aoAgir={aoAgir} />}
    </header>
    <ol className="guia-etapas">{ETAPAS.map((e) => <li key={e.id}><h3>{e.titulo} <span className="selo">{p.tutorial.concluidos.includes(e.id) ? "Feito" : "Por fazer"}</span></h3>
      <p>{e.texto}</p><button type="button" className="link" onClick={() => aoDestino(e.destino)}>{e.botao}</button>
      {(e.id === "venda" || e.id === "guilda") && <button type="button" className="link" onClick={() => aoDestino({ aba: "mapa", sub: 0 })}>Abrir Mapa</button>}
      {e.id === "equipamento" && <button type="button" className="link" onClick={() => aoDestino({ aba: "mapa", sub: 2 })}>Abrir Ferreiro</button>}
    </li>)}</ol>
    <p className="suave">A atividade rende por até 12 horas fora do jogo. Com conta online, o servidor confirma o progresso; sem conexão, consulte o último estado e reconecte. No modo local, o save fica neste navegador. Tutorial não concede itens, gold nem tentativas extras.</p>
  </section>;
}
