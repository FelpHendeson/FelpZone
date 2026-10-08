"use client";

import { useState, type FormEvent } from "react";
import { DAILY_BONUS, type Me } from "@/accounts/account";
import { changeAccountAvatar, claimBonus, logInAccount, logOutAccount, signUpAccount } from "@/client/api";
import { saveProfile, type Profile } from "@/client/profile";
import { setMe } from "@/client/useAccount";
import { GAMES, GAME_IDS } from "@/games/registry";
import { AVATARS } from "@/rooms/avatars";
import { BadgeShelf, Honors } from "./Badges";
import { Sheet } from "./Sheet";

const chips = (value: number) => value.toLocaleString("pt-BR");

/** Conta no menu: entrar ou criar conta; logado, fichas, vitórias e selos. */
export function AccountPanel({ me, loaded, profile }: { me: Me | null; loaded: boolean; profile: Profile }) {
  if (!loaded) return <section className="card account-card muted">Carregando sua conta…</section>;
  return me ? <AccountSummary me={me} /> : <AccountForms profile={profile} />;
}

function AccountSummary({ me }: { me: Me }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"selos" | "retrato" | null>(null);

  async function run(task: () => Promise<{ me: Me }>) {
    setBusy(true);
    setError(null);
    try {
      setMe((await task()).me);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  async function onLogOut() {
    setBusy(true);
    await logOutAccount().catch(() => undefined);
    setMe(null);
    setBusy(false);
  }

  return (
    <section className="card account-card" aria-label="Sua conta">
      <div className="profile-row">
        <button className="avatar-button" onClick={() => setSheet("retrato")} aria-label={`Trocar retrato (atual: ${me.avatar})`}>
          <span className="avatar big">{me.avatar}</span>
          <span className="avatar-edit">trocar</span>
        </button>
        <div className="grow">
          <p className="account-name">
            <strong>{me.nickname}</strong> <Honors wins={me.stats.wins} badges={me.badges.map((badge) => badge.id)} />
          </p>
          <p className="chips-line">
            <span className="chips" aria-label={`${me.chips} fichas`}>
              🪙 {chips(me.chips)} fichas
            </span>
            {me.inPlay > 0 && <span className="muted small"> · {chips(me.inPlay)} em jogo</span>}
          </p>
        </div>
      </div>

      <dl className="stats-row">
        <div>
          <dt>Partidas</dt>
          <dd>{me.stats.played}</dd>
        </div>
        <div>
          <dt>Vitórias</dt>
          <dd>{me.stats.wins}</dd>
        </div>
        <div>
          <dt>Sequência</dt>
          <dd>{me.stats.streak}</dd>
        </div>
        <div>
          <dt>Selos</dt>
          <dd>{me.badges.length}</dd>
        </div>
      </dl>

      <div className="action-row">
        <button className="button primary" disabled={busy || !me.bonusAvailable} onClick={() => run(claimBonus)}>
          {me.bonusAvailable ? `🎁 Pegar ${DAILY_BONUS} fichas do dia` : "Bônus de hoje já pego"}
        </button>
        <button className="button" onClick={() => setSheet("selos")}>
          🏅 Selos e números
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted small">
        Fichas são virtuais: não valem dinheiro, não se compram e não se sacam.{" "}
        <button className="link-button" disabled={busy} onClick={onLogOut}>
          Sair da conta
        </button>
      </p>

      {sheet === "selos" && (
        <Sheet title="Seus selos e números" onClose={() => setSheet(null)}>
          <ul className="summary">
            {GAME_IDS.map((id) => {
              const stats = me.stats.games[id];
              return (
                <li key={id}>
                  {GAMES[id].emoji} {GAMES[id].name}: {stats ? `${stats.wins} vitórias em ${stats.played} partidas` : "ainda não jogou"}
                </li>
              );
            })}
            <li>Melhor sequência: {me.stats.bestStreak}</li>
            <li>
              Saldo das apostas: {me.stats.chipsWon >= 0 ? "+" : "−"}
              {chips(Math.abs(me.stats.chipsWon))} fichas
            </li>
          </ul>
          <BadgeShelf earned={me.badges} />
        </Sheet>
      )}
      {sheet === "retrato" && (
        <Sheet title="Escolha seu retrato" onClose={() => setSheet(null)}>
          <div className="avatar-grid" role="group" aria-label="Escolha um retrato">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                className={avatar === me.avatar ? "avatar-option selected" : "avatar-option"}
                aria-pressed={avatar === me.avatar}
                disabled={busy}
                onClick={async () => {
                  await run(() => changeAccountAvatar(avatar));
                  saveProfile({ avatar });
                  setSheet(null);
                }}
              >
                {avatar}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </section>
  );
}

function AccountForms({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState(profile.name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { me } =
        mode === "entrar"
          ? await logInAccount({ email, password })
          : await signUpAccount({ email, nickname, password, avatar: profile.avatar });
      saveProfile({ name: me.nickname, avatar: me.avatar });
      setMe(me);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card account-card" aria-label="Conta">
      <div className="segmented" role="tablist" aria-label="Entrar ou criar conta">
        <button role="tab" aria-selected={mode === "entrar"} className={mode === "entrar" ? "active" : ""} onClick={() => setMode("entrar")}>
          Entrar
        </button>
        <button role="tab" aria-selected={mode === "criar"} className={mode === "criar" ? "active" : ""} onClick={() => setMode("criar")}>
          Criar conta
        </button>
      </div>
      <form className="account-form" onSubmit={onSubmit}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required />
        </label>
        {mode === "criar" && (
          <label className="field">
            <span>Apelido (único no site)</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              minLength={3}
              maxLength={16}
              autoComplete="nickname"
              required
            />
            <span className="muted hint">3 a 16 letras, números, _ ou . — começando por letra.</span>
          </label>
        )}
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            required
          />
          {mode === "criar" && <span className="muted hint">Pelo menos 8 caracteres. Guarde bem: não há como recuperar a senha.</span>}
        </label>
        <button className="button primary block" disabled={busy}>
          {mode === "entrar" ? "Entrar" : "Criar conta e ganhar 1.000 fichas"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <p className="muted small">
        Com conta você aposta fichas virtuais, acumula vitórias e selos e aparece para quem está online. Sem conta, dá para
        jogar como convidado.
      </p>
    </section>
  );
}
