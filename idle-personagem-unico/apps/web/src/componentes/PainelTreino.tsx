import { ATIVIDADES_TREINO, NOME_STATUS, TODOS_OS_TREINOS, faixaStatus, modificadoresDoPersonagem, type Personagem, type StatusId } from "@idle-pu/motor";
import { useEffect, useRef } from "react";
import { estimarAtividade, formatarDuracao, formatarNumero, nomeLocal } from "@/lib/atividade";
import { CenaPersonagem } from "./ArtePersonagem";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly leitura: boolean;
  readonly escolhido: StatusId | null;
  readonly aoEscolher: (status: StatusId | null) => void;
  readonly aoIniciar: (atividadeId: string) => void;
  readonly aoParar: () => void;
}

const ROTULO_ATIVIDADE = { ativo: "Executando", viagem: "Em viagem" } as const;

/** Abrir o treino e iniciar um de seus níveis são escolhas independentes. */
export function PainelTreino({ personagem: p, ocupado, leitura, escolhido, aoEscolher, aoIniciar, aoParar }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const voltar = useRef<StatusId | null>(null);
  const treino = ATIVIDADES_TREINO.find((a) => a.status === escolhido);
  useEffect(() => {
    if (escolhido) {
      titulo.current?.focus({ preventScroll: true });
      titulo.current?.parentElement?.scrollIntoView({ block: "start" });
    } else if (voltar.current) document.getElementById(`treino-${voltar.current}`)?.focus();
  }, [escolhido]);
  if (!treino) return (
    <section className="painel" aria-label="Treinos">
      <div className="grade-atividades">
        {ATIVIDADES_TREINO.map((a) => {
          const ativo = TODOS_OS_TREINOS.some((nivel) => a.status === nivel.status && p.atividade?.id === nivel.id);
          return <button key={a.id} id={`treino-${a.status}`} type="button" className="cartao escolha-atividade"
            onClick={() => { voltar.current = a.status; aoEscolher(a.status); }}>
            <span className="escolha-status">{NOME_STATUS[a.status]}{ativo && ` · ${p.viagem ? ROTULO_ATIVIDADE.viagem : ROTULO_ATIVIDADE.ativo}`}</span>
            <strong>{a.nome}</strong>
            <span className="suave">{a.descricao}</span>
          </button>;
        })}
      </div>
    </section>
  );

  const niveis = TODOS_OS_TREINOS.filter((a) => a.status === treino.status);
  const emExecucao = niveis.some((a) => a.id === p.atividade?.id);
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const { piso, teto } = faixaStatus(p.racaId, treino.status, p.nivel, mods);
  const valor = p.status[treino.status];
  const percentual = Math.round((valor - piso) / (teto - piso) * 100);
  return (
    <section className="painel detalhe-atividade" aria-labelledby="titulo-treino">
      <div className="detalhe-atividade-topo">
        <button type="button" className="link" onClick={() => { voltar.current = treino.status; aoEscolher(null); }}>← Todos os treinos</button>
        <h2 ref={titulo} id="titulo-treino" tabIndex={-1}>{treino.nome}</h2>
        <p className="suave">{treino.descricao} · Campo de Treino de {nomeLocal("pedravau")}</p>
      </div>
      <CenaPersonagem personagem={p} animar={emExecucao || !!p.limiar} leitura={leitura} />
      <div className="cartao treino-medida">
        <strong>{NOME_STATUS[treino.status]}</strong>
        <span>{formatarNumero(valor, 2)} / {formatarNumero(teto, 2)} · {percentual}% da faixa</span>
      </div>
      <ol className="lista-treinos">
        {niveis.map((a) => {
          const atual = p.atividade?.id === a.id;
          const requisito = a.requisito;
          const completos = requisito ? p.treinos[requisito.contador] ?? 0 : 0;
          const bloqueado = !!requisito && completos < requisito.ciclos;
          const e = estimarAtividade(p, a.id);
          return <li key={a.id} className={`cartao treino${atual ? " treino-atual" : ""}${bloqueado ? " bloqueado" : ""}`}>
            <div className="treino-info">
              <h3>Nível {a.nivel}</h3>
              <p className="suave">{formatarDuracao(e.duracaoMs)} por ciclo · {formatarNumero(e.xpPorHora, 0)} XP/h · +{formatarNumero(e.ganhoPorHora, 2)} {NOME_STATUS[a.status]}/h</p>
              {atual ? <p className="destaque">{p.viagem ? ROTULO_ATIVIDADE.viagem : ROTULO_ATIVIDADE.ativo}</p>
                : bloqueado && requisito && <p className="suave">Complete o nível {a.nivel - 1}: {completos}/{requisito.ciclos} ciclos.</p>}
            </div>
            <button type="button" className={`botao${atual ? "" : " botao-principal"}`} disabled={ocupado || bloqueado} onClick={atual ? aoParar : () => aoIniciar(a.id)}>
              {atual ? "Parar" : bloqueado ? "Bloqueado" : "Executar"}
            </button>
          </li>;
        })}
      </ol>
    </section>
  );
}
