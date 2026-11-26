"use client";

import { serializarSave, type EstadoJogo } from "@idle-pu/motor";
import { useEffect, useRef, useState } from "react";
import { chamarApi, concluirSaida, gravarSessao, sessaoDaResposta, type Sessao } from "@/lib/sync";

interface Props {
  readonly estado?: EstadoJogo | undefined;
  readonly sessao: Sessao | null;
  readonly modoInicial?: "entrar" | "registrar" | "recuperar";
  readonly aoConectar: (sessao: Sessao | null, corpo: Record<string, unknown> | null) => Promise<void>;
}

export function AcessoConta({ estado, sessao, aoConectar, modoInicial = "entrar" }: Props) {
  const [banco, setBanco] = useState<boolean | null>(null);
  const [modo, setModo] = useState<"entrar" | "registrar" | "recuperar">(modoInicial);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoNovo, setCodigoNovo] = useState<string | null>(null);
  const [autenticada, setAutenticada] = useState<Sessao | null>(null);
  const [contaVazia, setContaVazia] = useState<Sessao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    void chamarApi("prontidao").then((r) => { if (vivo.current) setBanco(r.ok); });
    return () => { vivo.current = false; };
  }, []);

  async function abrir(s: Sessao) {
    const jogo = await chamarApi("jogo", { token: s.token, contaId: s.id });
    if (!vivo.current) return;
    if (jogo.ok) { await aoConectar(s, jogo.corpo); return; }
    if (jogo.codigo === "sem_save") setContaVazia(s);
    else setMensagem(jogo.mensagem);
  }
  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setMensagem(null);
    try {
      if (!await concluirSaida(window.localStorage)) return setMensagem("Não foi possível encerrar a sessão anterior. Confira a conexão e tente novamente.");
      if (!vivo.current) return;
      const r = await chamarApi(`auth/${modo === "registrar" ? "registrar" : modo === "recuperar" ? "recuperar" : "entrar"}`, { metodo: "POST", corpo: modo === "recuperar" ? { nome, codigo, senhaNova: senha } : { nome, senha } });
      if (!vivo.current) return;
      if (!r.ok) return setMensagem(r.mensagem);
      setSenha("");
      setCodigo("");
      if (modo === "recuperar") {
        gravarSessao(window.localStorage, null);
        setCodigoNovo(typeof r.corpo.codigoRecuperacao === "string" ? r.corpo.codigoRecuperacao : null);
        setMensagem("Senha atualizada. As sessões anteriores foram encerradas. Guarde o novo código e entre novamente.");
        return;
      }
      const s = sessaoDaResposta(r.corpo);
      if (!s) return setMensagem("Resposta de autenticação inválida.");
      if (typeof r.corpo.codigoRecuperacao === "string") {
        setCodigoNovo(r.corpo.codigoRecuperacao);
        setAutenticada(s);
      } else await abrir(s);
    } finally { if (vivo.current) setOcupado(false); }
  }
  async function iniciar(importarLocal: boolean) {
    if (!contaVazia || ocupado) return;
    if (importarLocal && !estado) return;
    setOcupado(true);
    try {
      const r = await chamarApi(importarLocal ? "jogo/importar" : "jogo/iniciar", { metodo: "POST", corpo: importarLocal && estado ? { save: serializarSave(estado) } : {}, token: contaVazia.token, contaId: contaVazia.id });
      if (!vivo.current) return;
      if (r.ok) await aoConectar(contaVazia, r.corpo);
      else if (r.codigo === "ja_tem_save") await abrir(contaVazia);
      else setMensagem(r.mensagem);
    } finally { if (vivo.current) setOcupado(false); }
  }
  async function confirmarCodigo() {
    if (autenticada) {
      setOcupado(true);
      try { await abrir(autenticada); }
      finally { if (vivo.current) setOcupado(false); }
    } else setModo("entrar");
    setCodigoNovo(null);
    setAutenticada(null);
  }

  return <article className="cartao" aria-label="Sincronização">
    <h3>Conta e sincronização</h3>
    {sessao ? <>
      <p>Conectado como <strong>{sessao.nome}</strong>. O progresso pertence à conta e pode ser continuado em outro aparelho.</p>
      <RecuperacaoConta sessao={sessao} />
      <button type="button" className="botao" onClick={() => void aoConectar(null, null)}>Sair da conta</button>
    </> : codigoNovo ? <>
      <h4>Guarde seu código de recuperação</h4>
      <p className="suave">Ele permite trocar a senha se você perder o acesso. É exibido apenas agora e não fica salvo neste navegador. Guarde em um local seguro fora do jogo.</p>
      <code className="codigo-recuperacao">{codigoNovo}</code>
      <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => void confirmarCodigo()}>Guardei o código, continuar</button>
    </> : contaVazia ? <>
      <p>Esta conta ainda não tem jogo. Um novo jogo online pode publicar builds. A importação é única e mantém o jogo casual, sem publicar builds competitivos.</p>
      <div className="acoes">
        <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => void iniciar(false)}>Iniciar novo jogo online</button>
        {estado && (estado.conta.personagens.length > 0 || estado.conta.sorteio) && <button type="button" className="botao" disabled={ocupado} onClick={() => void iniciar(true)}>Importar jogo local (casual)</button>}
      </div>
    </> : banco === false ? <p role="status">A sincronização está indisponível. O jogo local continua salvo neste aparelho. Tente novamente mais tarde.</p> : <form className="formulario" onSubmit={enviar}>
      <p className="suave">{modo === "recuperar" ? "Use seu código de recuperação para definir outra senha." : "Entre na conta para continuar em outro aparelho. Sem e-mail: nome, senha e código de recuperação."}</p>
      <label className="campo">Nome da conta<input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="username" maxLength={20} required /></label>
      {modo === "recuperar" && <label className="campo">Código de recuperação<input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" maxLength={100} required /></label>}
      <label className="campo">{modo === "recuperar" ? "Nova senha" : "Senha"}<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modo === "entrar" ? "current-password" : "new-password"} minLength={8} maxLength={128} required /></label>
      <div className="acoes"><button type="submit" className="botao botao-principal" disabled={ocupado || banco !== true}>{modo === "registrar" ? "Criar conta" : modo === "recuperar" ? "Trocar senha" : "Entrar"}</button></div>
      <div className="acoes">
        {modo !== "entrar" && <button type="button" className="botao" disabled={ocupado} onClick={() => setModo("entrar")}>Já tenho conta</button>}
        {modo !== "registrar" && <button type="button" className="botao" disabled={ocupado} onClick={() => setModo("registrar")}>Quero criar uma conta</button>}
        {modo !== "recuperar" && <button type="button" className="botao" disabled={ocupado} onClick={() => setModo("recuperar")}>Esqueci minha senha</button>}
      </div>
    </form>}
    {mensagem && <p role="status" className="suave">{mensagem}</p>}
  </article>;
}

function RecuperacaoConta({ sessao }: { sessao: Sessao }) {
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await chamarApi("auth/recuperacao", { metodo: "POST", corpo: { senha }, token: sessao.token, contaId: sessao.id });
      if (!vivo.current) return;
      setSenha("");
      if (r.ok && typeof r.corpo.codigoRecuperacao === "string") { setCodigo(r.corpo.codigoRecuperacao); setMensagem("Código atualizado. O anterior deixou de funcionar."); }
      else setMensagem(r.ok ? "Resposta inválida." : r.mensagem);
    } finally { if (vivo.current) setOcupado(false); }
  }
  return <details>
    <summary>Recuperação de acesso</summary>
    <p className="suave">Guarde um código para recuperar sua conta sem e-mail. Gerar outro código invalida o anterior e exige sua senha atual.</p>
    <form className="formulario" onSubmit={gerar}>
      <label className="campo">Senha atual<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required /></label>
      <button type="submit" className="botao" disabled={ocupado}>Gerar novo código</button>
    </form>
    {codigo && <code className="codigo-recuperacao">{codigo}</code>}
    {mensagem && <p role="status">{mensagem}</p>}
  </details>;
}
