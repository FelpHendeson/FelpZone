"use client";

import { useState, type FormEvent } from "react";
import type { Me } from "@/accounts/account";
import type { GroupView } from "@/accounts/groups";
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

/** Quem está online nos seus grupos e a conversa de cada grupo, já no menu. */
export function PlazaPanel({
  plaza,
  me,
  groups,
  chatGroupId,
  onChatGroup,
  inviteCode,
  onRefresh,
}: {
  plaza: Plaza | null;
  me: Me | null;
  groups: GroupView[];
  chatGroupId: string | null;
  onChatGroup: (groupId: string) => void;
  inviteCode: string | null;
  onRefresh: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const others = (plaza?.online ?? []).filter((entry) => entry.id !== me?.id);
  const activeGroup = groups.find((group) => group.id === (plaza?.chatGroupId ?? chatGroupId)) ?? groups[0] ?? null;
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name;

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
    if (!activeGroup) return;
    void act(() => postPlaza({ kind: "chat", groupId: activeGroup.id, text: message }), "").then(() => setText(""));
  }

  return (
    <section className="card plaza-card" aria-label="Praça">
      <h2>
        🟢 Online nos seus grupos <span className="muted">({plaza?.online.length ?? 0})</span>
      </h2>
      {!me && <p className="muted small">Entre na sua conta e num grupo da família para ver quem está online, acenar, convidar e conversar.</p>}
      {me && groups.length === 0 && <p className="muted small">Crie ou entre num grupo para ver a família online.</p>}
      {plaza && me && groups.length > 0 && others.length === 0 && <p className="muted small">Ninguém dos seus grupos online agora.</p>}
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
              <span className="muted small block">
                {whereLabel(entry)}
                {groups.length > 1 ? ` · ${entry.groups.map(groupName).filter(Boolean).join(", ")}` : ""}
              </span>
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

      {activeGroup && (
        <>
          <h3>💬 Conversa do grupo</h3>
          {groups.length > 1 && (
            <div className="chip-row" role="tablist" aria-label="Conversa de qual grupo">
              {groups.map((group) => (
                <button
                  key={group.id}
                  role="tab"
                  aria-selected={group.id === activeGroup.id}
                  className={group.id === activeGroup.id ? "partner-chip active" : "partner-chip"}
                  onClick={() => onChatGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
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
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={200}
            placeholder={`Falar com ${activeGroup.name}`}
            aria-label="Mensagem para o grupo"
          />
          <button className="button" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
      )}
        </>
      )}
      {profile && <ProfileSheet nickname={profile} onClose={() => setProfile(null)} />}
    </section>
  );
}
