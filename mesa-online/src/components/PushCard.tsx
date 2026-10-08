"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/client/push";

/** Cartão do menu para receber avisos de vez, convite e aceno no celular. */
export function PushCard() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pushStatus()
      .then((next) => !cancelled && setStatus(next))
      .catch(() => !cancelled && setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(task: () => Promise<PushStatus>) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await task());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível mudar os avisos.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <section className="card push-card" aria-label="Avisos no celular">
      <h2>🔔 Avisos no celular</h2>
      {status === "install" && (
        <>
          <p>Para receber avisos no iPhone, instale a Mesa Online na tela de início:</p>
          <ol className="steps">
            <li>
              Toque em <strong>Compartilhar</strong> <span aria-hidden>⎋</span> no Safari.
            </li>
            <li>
              Escolha <strong>Adicionar à Tela de Início</strong> <span aria-hidden>➕</span>.
            </li>
            <li>Abra pelo ícone novo e ative os avisos aqui (iOS 16.4 ou mais novo).</li>
          </ol>
        </>
      )}
      {status === "server-off" && <p className="muted">Os avisos ainda não foram ligados no servidor. Avise quem cuida do site.</p>}
      {status === "denied" && (
        <p className="muted">Os avisos estão bloqueados para este site. Libere nos Ajustes do aparelho (Notificações) e volte aqui.</p>
      )}
      {(status === "off" || status === "on") && (
        <>
          <p className="muted small">
            {status === "on"
              ? "Ligados neste aparelho: você recebe aviso quando for sua vez (com a sala fechada), de convites e de acenos."
              : "Receba aviso quando for sua vez numa sala que está fechada, quando te convidarem ou acenarem."}
          </p>
          <button className={status === "on" ? "button" : "button primary"} disabled={busy} onClick={() => run(status === "on" ? disablePush : enablePush)}>
            {status === "on" ? "Desligar avisos neste aparelho" : "Ativar avisos"}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
