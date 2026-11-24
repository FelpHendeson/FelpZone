"use client";

import { CATALOGO, CONQUISTAS, MAX_PERSONAGENS, serializarSave, type EstadoJogo } from "@idle-pu/motor";
import { useEffect, useState } from "react";
import { chamarApi, estadoDaResposta, type Sessao } from "@/lib/sync";
import type { Agir } from "./acoes";

interface Props {
  readonly estado: EstadoJogo;
  readonly sessao: Sessao | null;
  readonly ocupado: boolean;
  readonly agir: Agir;
  /** Conectou (ou desconectou, com `null`) a conta; `novo` é o estado que passa a valer. */
  readonly aoConectar: (sessao: Sessao | null, novo: EstadoJogo | null) => Promise<void>;
}

/** Personagem → Conta: personagens, Cofre da Conta e sincronização (F9). */
export function PainelConta({ estado, sessao, ocupado, agir, aoConectar }: Props) {
  const { personagens, personagemAtivoId, cofre } = estado.conta;
  const podeCriar = personagens.length < MAX_PERSONAGENS && cofre.pergaminhos > 0;
  return (
    <section className="painel" aria-label="Conta">
      <article className="cartao">
        <h3>Personagens ({personagens.length} de {MAX_PERSONAGENS})</h3>
        <p className="suave">Cada personagem é uma existência separada. Só o ativo joga; os outros ficam parados até serem escolhidos.</p>
        <ul className="lista-recursos">
          {personagens.map((p) => (
            <li key={p.id} className={`recurso${p.id === personagemAtivoId ? " treino-atual" : ""}`}>
              <div>
                <strong>{p.nome}</strong> <span className="suave">· nível {p.nivel} · {CATALOGO.racas.get(p.racaId)?.nome} · {CATALOGO.cores.get(p.coreId)?.nome}</span>
              </div>
              {p.id === personagemAtivoId ? (
                <span className="selo">Ativo</span>
              ) : (
                <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "trocarPersonagem", personagemId: p.id })}>
                  Jogar com este
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="acoes">
          <button type="button" className="botao botao-principal" disabled={ocupado || !podeCriar} onClick={() => agir({ tipo: "iniciarSorteio" })}>
            Novo personagem (gasta 1 pergaminho)
          </button>
        </div>
        <p className="suave nota">
          Pergaminhos do Novo Destino: <strong>{cofre.pergaminhos}</strong>. Cada personagem ganha um ao chegar aos ranks C e A da guilda.
        </p>
      </article>

      <article className="cartao" aria-label="Conquistas">
        <h3>
          Conquistas ({cofre.conquistas.length} de {CONQUISTAS.length})
        </h3>
        <ul className="lista-recursos">
          {CONQUISTAS.map((c) => {
            const tem = cofre.conquistas.includes(c.id);
            return (
              <li key={c.id} className={`recurso${tem ? "" : " bloqueado"}`}>
                <div>
                  <strong>{tem ? "✓ " : ""}{c.nome}</strong>
                  <p className="suave">{c.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="suave nota">
          Álbum de Descobertas: {cofre.descobertas.racas.length} raças, {cofre.descobertas.cores.length} cores, {cofre.descobertas.origens.length} origens e {cofre.descobertas.monstros.length} monstros. Conquistas não dão poder.
        </p>
      </article>

      <Sincronizacao estado={estado} sessao={sessao} aoConectar={aoConectar} />
    </section>
  );
}

function Sincronizacao({ estado, sessao, aoConectar }: Pick<Props, "estado" | "sessao" | "aoConectar">) {
  const [banco, setBanco] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [conflito, setConflito] = useState<{ sessao: Sessao; doServidor: EstadoJogo } | null>(null);

  useEffect(() => {
    let vivo = true;
    void chamarApi("saude").then((r) => {
      if (vivo) setBanco(r.ok ? r.corpo.banco === true : false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function conectar(rota: "auth/registrar" | "auth/entrar") {
    setOcupado(true);
    setMensagem(null);
    try {
      const r = await chamarApi(rota, { metodo: "POST", corpo: { nome, senha } });
      if (!r.ok) return setMensagem(r.mensagem);
      const s: Sessao = { token: r.corpo.token as string, nome: (r.corpo.conta as { nome: string }).nome };
      const jogo = await chamarApi("jogo", { token: s.token });
      if (jogo.ok) {
        const doServidor = estadoDaResposta(jogo.corpo);
        if (!doServidor) return setMensagem("Resposta inválida do servidor.");
        // A conta já tem jogo: a pessoa escolhe qual fica.
        setConflito({ sessao: s, doServidor });
        return;
      }
      if (jogo.codigo !== "sem_save") return setMensagem(jogo.mensagem);
      const imp = await chamarApi("jogo/importar", { metodo: "POST", corpo: { save: serializarSave(estado) }, token: s.token });
      if (!imp.ok) return setMensagem(imp.mensagem);
      await aoConectar(s, estadoDaResposta(imp.corpo));
      setSenha("");
      setMensagem("Conta conectada. O jogo deste aparelho agora fica salvo na conta.");
    } finally {
      setOcupado(false);
    }
  }

  async function resolver(usarDaConta: boolean) {
    if (!conflito) return;
    setOcupado(true);
    try {
      if (usarDaConta) {
        await aoConectar(conflito.sessao, conflito.doServidor);
      } else {
        const imp = await chamarApi("jogo/importar", { metodo: "POST", corpo: { save: serializarSave(estado), substituir: true }, token: conflito.sessao.token });
        if (!imp.ok) return setMensagem(imp.mensagem);
        await aoConectar(conflito.sessao, estadoDaResposta(imp.corpo));
      }
      setConflito(null);
      setSenha("");
      setMensagem("Conta conectada.");
    } finally {
      setOcupado(false);
    }
  }

  async function desconectar() {
    if (!sessao) return;
    setOcupado(true);
    await chamarApi("auth/sair", { metodo: "POST", token: sessao.token });
    await aoConectar(null, null);
    setOcupado(false);
    setMensagem("Desconectado. O jogo continua salvo neste aparelho.");
  }

  return (
    <article className="cartao" aria-label="Sincronização">
      <h3>Sincronização</h3>
      {sessao ? (
        <>
          <p>
            Conectado como <strong>{sessao.nome}</strong>. O servidor guarda o jogo e aplica as ações; outro aparelho com a mesma conta vê o mesmo personagem.
          </p>
          <div className="acoes">
            <button type="button" className="botao" disabled={ocupado} onClick={() => void desconectar()}>
              Sair da conta
            </button>
          </div>
        </>
      ) : banco === false ? (
        <p className="suave" role="status">
          A sincronização ainda não está ativa neste servidor. O jogo fica salvo neste aparelho.
        </p>
      ) : conflito ? (
        <>
          <p>A conta já tem um jogo salvo. Qual fica?</p>
          <div className="acoes">
            <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => void resolver(true)}>
              Usar o jogo da conta
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => void resolver(false)}>
              Enviar o deste aparelho (substitui)
            </button>
          </div>
        </>
      ) : (
        <form
          className="formulario"
          onSubmit={(ev) => {
            ev.preventDefault();
            void conectar("auth/entrar");
          }}
        >
          <p className="suave">Crie uma conta para jogar o mesmo personagem em outro aparelho. Sem e-mail: só um nome e uma senha.</p>
          <label>
            Nome da conta
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="username" maxLength={20} />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" maxLength={128} />
          </label>
          <div className="acoes">
            <button type="submit" className="botao botao-principal" disabled={ocupado || banco === null}>
              Entrar
            </button>
            <button type="button" className="botao" disabled={ocupado || banco === null} onClick={() => void conectar("auth/registrar")}>
              Criar conta
            </button>
          </div>
        </form>
      )}
      {mensagem && (
        <p className="suave" role="status">
          {mensagem}
        </p>
      )}
    </article>
  );
}
