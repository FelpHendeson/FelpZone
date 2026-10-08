"use client";

import { useState, type FormEvent } from "react";
import type { Me } from "@/accounts/account";
import type { Notice, OnlineEntry, Plaza } from "@/accounts/plaza";
import { postPlaza } from "@/client/api";
import { GAMES } from "@/games/registry";
import { Honors } from "./Badges";
import { ProfileSheet } from "./ProfileSheet";

const whereLabel = (entry: OnlineEntry) => {
  const where = entry.where;
  if (!where || where.status === "menu") return "no menu";
  return `${where.status === "lobby" ? "esperando no lobby de" : "jogando"} ${GAMES[where.gameId].name}`;
};

const timeLabel = (at: number) => new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Avisos recebidos: acenos e convites para salas. */
export function NoticeList({ notices, onDismiss, onJoin }: { notices: Notice[]; onDismiss: (id: string) => void; onJoin: (code: string) => void }) {
  if (notices.length === 0) return null;
  return (
    <section className="notice-list" aria-live="polite" aria-label="Avisos">
      {notices.map((notice) => (
        <div key={notice.id} className="card notice-card">
          <span className="avatar" aria-hidden>
            {notice.from.avatar}
          </span>
          <span className="grow">
            {notice.kind === "wave" ? (
              <>
                👋 <strong>{notice.from.nickname}</strong> acenou para você.
              </>
            ) : (
              <>
                <strong>{notice.from.nickname}</strong> te chamou para {GAMES[notice.gameId].emoji} {GAMES[notice.gameId].name} (sala{" "}
                {notice.code}).
              </>
            )}
          </span>
          {notice.kind === "invite" && (
            <button className="button small primary" onClick={() => onJoin(notice.code)}>
              Entrar
            </button>
          )}
          <button className="link-button" onClick={() => onDismiss(notice.id)} aria-label="Dispensar aviso">
            ✕
          </button>
        </div>
      ))}
    </section>
  );
}

/** Quem está online e a conversa da praça, já no menu. */
export function PlazaPanel({ plaza, me, inviteCode, onRefresh }: { plaza: Plaza | null; me: Me | null; inviteCode: string | null; onRefresh: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const others = (plaza?.online ?? []).filter((entry) => entry.id !== me?.id);

  async function act(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await task();
      setFeedback(done);
      onRefresh();
    } catch (caught) {
      setFeedback(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  function onSend(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    void act(() => postPlaza({ kind: "chat", text: message }), "").then(() => setText(""));
  }

  return (
    <section className="card plaza-card" aria-label="Praça">
      <h2>
        🟢 Online agora <span className="muted">({plaza?.online.length ?? 0})</span>
      </h2>
      {!me && <p className="muted small">Entre na sua conta para aparecer aqui, acenar, convidar e conversar.</p>}
      {plaza && others.length === 0 && <p className="muted small">Ninguém mais online agora. Chame a família!</p>}
      <ul className="online-list">
        {others.map((entry) => (
          <li key={entry.id}>
            <span className="avatar" aria-hidden>
              {entry.avatar}
            </span>
            <span className="grow">
              <button className="link-button strong" onClick={() => setProfile(entry.nickname)}>
                {entry.nickname}
              </button>{" "}
              <Honors wins={entry.wins} badges={entry.badges} />
              <span className="muted small block">{whereLabel(entry)}</span>
            </span>
            {me && (
              <span className="online-actions">
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() => act(() => postPlaza({ kind: "wave", to: entry.id }), `Você acenou para ${entry.nickname}.`)}
                  aria-label={`Acenar para ${entry.nickname}`}
                >
                  👋
                </button>
                {inviteCode && (
                  <button
                    className="button small"
                    disabled={busy}
                    onClick={() => act(() => postPlaza({ kind: "invite", to: entry.id, code: inviteCode }), `Convite enviado para ${entry.nickname}.`)}
                  >
                    Convidar
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {me && others.length > 0 && !inviteCode && (
        <p className="muted small">Para convidar alguém, crie uma sala: o convite leva para o lobby dela.</p>
      )}
      {feedback && (
        <p className="muted small" role="status">
          {feedback}
        </p>
      )}

      <h3>💬 Praça</h3>
      <ol className="plaza-chat" aria-live="polite">
        {(plaza?.chat ?? [])
          .slice(0, 20)
          .reverse()
          .map((message) => (
            <li key={message.id} className={message.userId === me?.id ? "mine" : ""}>
              <span aria-hidden>{message.avatar}</span> <strong>{message.nickname}</strong>{" "}
              <span className="muted small">{timeLabel(message.at)}</span>
              <span className="block">{message.text}</span>
            </li>
          ))}
        {plaza && plaza.chat.length === 0 && <li className="muted">Ninguém falou nada ainda.</li>}
      </ol>
      {me && (
        <form className="join-row" onSubmit={onSend}>
          <input value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder="Falar na praça" aria-label="Mensagem para a praça" />
          <button className="button" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
      )}
      {profile && <ProfileSheet nickname={profile} onClose={() => setProfile(null)} />}
    </section>
  );
}
