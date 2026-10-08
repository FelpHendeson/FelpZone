"use client";

import { useState, type FormEvent } from "react";
import type { Me } from "@/accounts/account";
import type { GroupView } from "@/accounts/groups";
import { groupAction } from "@/client/api";

/**
 * Grupos privados: só quem divide um grupo se vê online, conversa, acena e
 * convida. Entra-se pelo código de 6 letras ou pelo link `/?grupo=CODIGO`.
 */
export function GroupsPanel({ me, groups, onChange }: { me: Me; groups: GroupView[]; onChange: (groups: GroupView[]) => void }) {
  // Link de convite: /?grupo=CODIGO preenche o código (o painel só aparece no navegador, depois de ler a conta).
  const [code, setCode] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("grupo") ?? "").toUpperCase(),
  );
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function run(task: () => Promise<{ groups: GroupView[] }>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      onChange((await task()).groups);
      setMessage(done);
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Algo deu errado.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    if (await run(() => groupAction({ kind: "join", code }), "Você entrou no grupo!")) {
      setCode("");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (await run(() => groupAction({ kind: "create", name }), "Grupo criado. Mande o código para a família!")) {
      setName("");
      setCreating(false);
    }
  }

  async function share(group: GroupView) {
    const url = `${window.location.origin}/?grupo=${group.code}`;
    const text = `Entra no grupo "${group.name}" da Mesa Online: código ${group.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mesa Online", text, url });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setMessage(`Convite do grupo ${group.name} copiado.`);
    } catch {
      setMessage(`Código do grupo ${group.name}: ${group.code}`);
    }
  }

  return (
    <section className="card groups-card" aria-label="Seus grupos">
      <h2>👨‍👩‍👧 Seus grupos</h2>
      <p className="muted small">Só quem está nos seus grupos vê você online, conversa com você e manda convites.</p>
      {groups.length === 0 && <p className="muted">Você ainda não está em nenhum grupo. Crie um para a família ou entre com um código.</p>}
      <ul className="group-list">
        {groups.map((group) => (
          <li key={group.id}>
            <div className="group-head">
              <strong>{group.name}</strong>
              <span className="muted small">
                {group.members.length} {group.members.length === 1 ? "pessoa" : "pessoas"} · código <code>{group.code}</code>
              </span>
            </div>
            <ul className="group-members">
              {group.members.map((member) => (
                <li key={member.id}>
                  <span aria-hidden>{member.avatar}</span> {member.id === me.id ? "Você" : member.nickname}
                  {member.id === group.ownerId && <span className="badge subtle">cuida do grupo</span>}
                  {group.ownerId === me.id && member.id !== me.id && (
                    <button
                      className="link-button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Tirar ${member.nickname} do grupo ${group.name}?`)) {
                          void run(() => groupAction({ kind: "remove", groupId: group.id, memberId: member.id }), `${member.nickname} saiu do grupo.`);
                        }
                      }}
                      aria-label={`Tirar ${member.nickname} do grupo`}
                    >
                      tirar
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="action-row">
              <button className="button small" onClick={() => share(group)}>
                Convidar para o grupo
              </button>
              <button
                className="button small ghost-dark"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Sair do grupo ${group.name}?`)) void run(() => groupAction({ kind: "leave", groupId: group.id }), "Você saiu do grupo.");
                }}
              >
                Sair do grupo
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form className="join-row" onSubmit={onJoin}>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          placeholder="CÓDIGO"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Código do grupo"
          className="code-input"
        />
        <button className="button" disabled={busy || code.trim().length !== 6}>
          Entrar no grupo
        </button>
      </form>
      {creating ? (
        <form className="join-row" onSubmit={onCreate}>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} placeholder="Nome do grupo" aria-label="Nome do grupo" />
          <button className="button primary" disabled={busy || name.trim().length < 3}>
            Criar
          </button>
        </form>
      ) : (
        <button className="button block" onClick={() => setCreating(true)}>
          + Criar um grupo
        </button>
      )}
      {message && (
        <p className="muted small" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
