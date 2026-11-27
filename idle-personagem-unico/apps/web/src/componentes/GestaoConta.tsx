"use client";

import { useEffect, useState } from "react";
import { chamarApi, type Sessao } from "@/lib/sync";

export function GestaoConta({ sessao, aoExcluir }: { sessao: Sessao; aoExcluir: () => Promise<void> }) {
  const [email, setEmail] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [mensagemPerfil, setMensagemPerfil] = useState("");
  const [mensagemExclusao, setMensagemExclusao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { id, token } = sessao;

  useEffect(() => {
    let ativa = true;
    void chamarApi("auth/perfil", { token, contaId: id }).then((r) => {
      if (!ativa) return;
      if (r.ok) setEmail(typeof r.corpo.email === "string" ? r.corpo.email : "");
      else setMensagemPerfil(r.mensagem);
    });
    return () => { ativa = false; };
  }, [id, token]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const r = await chamarApi("auth/perfil", { metodo: "POST", corpo: { email }, token, contaId: id });
    if (r.ok) setEmail(typeof r.corpo.email === "string" ? r.corpo.email : "");
    setMensagemPerfil(r.ok ? "Perfil salvo." : r.mensagem);
    setOcupado(false);
  }

  async function excluir(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const r = await chamarApi("auth/excluir", { metodo: "POST", corpo: { senha }, token, contaId: id });
    setSenha("");
    if (!r.ok) {
      setMensagemExclusao(r.mensagem);
      setOcupado(false);
      return;
    }
    await aoExcluir();
  }

  return <>
    <details>
      <summary>E-mail do perfil</summary>
      <p className="suave">O e-mail é opcional e privado. Deixe em branco para removê-lo. A recuperação de senha usa o código da conta.</p>
      {email !== null && <form className="formulario" onSubmit={(e) => void salvar(e)}>
        <label className="campo">E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254} /></label>
        <button type="submit" className="botao" disabled={ocupado}>Salvar e-mail</button>
      </form>}
      {mensagemPerfil && <p role="status">{mensagemPerfil}</p>}
    </details>
    <details>
      <summary>Excluir conta</summary>
      <p className="suave">A exclusão encerra as sessões e retira sua ficha pública da Arena. Você pode recuperar sua conta e seus personagens por 30 dias. Ao fim do prazo, o progresso da conta é apagado.</p>
      <form className="formulario" onSubmit={(e) => void excluir(e)}>
        <label className="campo">Confirme a senha atual<input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></label>
        <button type="submit" className="botao" disabled={ocupado}>Confirmar exclusão da conta</button>
      </form>
      {mensagemExclusao && <p role="alert">{mensagemExclusao}</p>}
    </details>
  </>;
}
