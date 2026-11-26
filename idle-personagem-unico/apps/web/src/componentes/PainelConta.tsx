"use client";

import { CATALOGO, CONQUISTAS, MAX_PERSONAGENS, serializarSave, type EstadoJogo } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import { definirSons, sonsLigados, tocar } from "@/lib/sons";
import { chamarApi, type Sessao } from "@/lib/sync";
import type { Agir } from "./acoes";

interface Props {
  readonly estado: EstadoJogo;
  readonly sessao: Sessao | null;
  readonly ocupado: boolean;
  readonly agir: Agir;
  /** Conectou (ou desconectou, com `null`) a conta; `novo` é o estado que passa a valer. */
  readonly aoConectar: (sessao: Sessao | null, novo: Record<string, unknown> | null) => Promise<void>;
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

      <Preferencias />
      <Sincronizacao key={sessao?.token ?? "convidado"} estado={estado} sessao={sessao} aoConectar={aoConectar} />
    </section>
  );
}

function Sincronizacao({ estado, sessao, aoConectar }: Pick<Props, "estado" | "sessao" | "aoConectar">) {
  const [banco, setBanco] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [contaVazia, setContaVazia] = useState<Sessao | null>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    void chamarApi("saude").then((r) => {
      if (vivo.current) setBanco(r.ok ? r.corpo.banco === true : false);
    });
    return () => {
      vivo.current = false;
    };
  }, []);

  async function conectar(rota: "auth/registrar" | "auth/entrar") {
    setOcupado(true);
    setMensagem(null);
    try {
      const r = await chamarApi(rota, { metodo: "POST", corpo: { nome, senha } });
      if (!vivo.current) return;
      if (!r.ok) return setMensagem(r.mensagem);
      const s: Sessao = { token: r.corpo.token as string, nome: (r.corpo.conta as { nome: string }).nome };
      const jogo = await chamarApi("jogo", { token: s.token });
      if (!vivo.current) return;
      if (jogo.ok) {
        await aoConectar(s, jogo.corpo);
        setSenha("");
        return;
      }
      if (jogo.codigo !== "sem_save") return setMensagem(jogo.mensagem);
      setContaVazia(s);
    } finally {
      setOcupado(false);
    }
  }

  async function iniciar(importarLocal: boolean) {
    if (!contaVazia) return;
    setOcupado(true);
    try {
      const r = await chamarApi(importarLocal ? "jogo/importar" : "jogo/iniciar", { metodo: "POST", corpo: importarLocal ? { save: serializarSave(estado) } : {}, token: contaVazia.token });
      if (!vivo.current) return;
      if (!r.ok) {
        // Outra sessão pode ter iniciado a conta enquanto a escolha estava aberta.
        if (r.codigo === "ja_tem_save") {
          const atual = await chamarApi("jogo", { token: contaVazia.token });
          if (!vivo.current) return;
          if (atual.ok) { await aoConectar(contaVazia, atual.corpo); return; }
        }
        return setMensagem(r.mensagem);
      }
      await aoConectar(contaVazia, r.corpo);
      setContaVazia(null);
      setSenha("");
      setMensagem("Conta conectada.");
    } finally { setOcupado(false); }
  }

  async function desconectar() {
    if (!sessao) return;
    setOcupado(true);
    await aoConectar(null, null);
    setOcupado(false);
    setMensagem("Desconectado. O jogo da conta fica separado do jogo local.");
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
      ) : contaVazia ? (
        <>
          <p>Esta conta ainda não tem jogo. Um novo jogo online pode publicar builds competitivos. A importação é única e mantém o jogo casual, sem publicar builds.</p>
          <div className="acoes">
            <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => void iniciar(false)}>
              Iniciar novo jogo online
            </button>
            <button type="button" className="botao" disabled={ocupado} onClick={() => void iniciar(true)}>
              Importar jogo local (casual)
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
          <label className="campo">
            Nome da conta
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="username" maxLength={20} />
          </label>
          <label className="campo">
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

/** Preferências deste aparelho (F13). */
function Preferencias() {
  // Só renderiza no aparelho (depois de carregar o save), então pode ler a preferência já.
  const [sons, setSons] = useState(sonsLigados);
  return (
    <article className="cartao" aria-label="Preferências">
      <h3>Preferências</h3>
      <div className="nivel-linha">
        <span>Sons (nível, eventos, Arena)</span>
        <button
          type="button"
          className="botao"
          aria-pressed={sons}
          onClick={() => {
            definirSons(!sons);
            setSons(!sons);
            if (!sons) tocar("nivel");
          }}
        >
          {sons ? "Ligados" : "Desligados"}
        </button>
      </div>
      <p className="suave nota">Os sons são gerados pelo navegador, sem arquivos. A preferência fica só neste aparelho.</p>
    </article>
  );
}
