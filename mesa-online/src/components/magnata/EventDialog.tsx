"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Beat } from "@/games/magnata/beats";
import { money, type MagnataView } from "@/games/magnata/engine";
import type { PublicRoom } from "@/rooms/public";

interface Props {
  beat: Beat;
  waiting: number;
  room: PublicRoom;
  game: MagnataView;
  meId: string | null;
  /** Botões de decisão quando o lance deixa a pessoa com algo a fazer. */
  decision: ReactNode | null;
  /** Multiplicador do tempo da janela (preferência de cada pessoa). */
  pace: number;
  onNext: () => void;
  onSkipAll: () => void;
}

/** Quanto tempo cada janela fica aberta sozinha antes de passar para a próxima. */
export function autoCloseMs(beat: Beat, waiting: number, mine: boolean, pace = 1): number {
  // Lance da própria pessoa já superado por uma ação dela: sai rápido.
  if (mine && waiting > 0) return 700;
  if (waiting >= 3) return Math.round(1600 * pace);
  const base = mine ? 3200 : 2800;
  return Math.round(Math.min(5500, base + beat.lines.length * 450) * pace);
}

/**
 * Janela que narra cada lance da partida: quem jogou, o que aconteceu e como o
 * dinheiro de cada um mudou. Fecha sozinha (com barra de tempo), a menos que a
 * pessoa precise decidir algo — aí os botões da decisão ficam dentro dela.
 */
export function EventDialog({ beat, waiting, room, game, meId, decision, pace, onNext, onSkipAll }: Props) {
  const titleId = useId();
  const primary = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const people = new Map(room.players.map((player) => [player.id, player]));
  const colors = new Map(game.players.map((player) => [player.id, player.color]));
  const actor = beat.actorId ? people.get(beat.actorId) : null;
  const mine = beat.actorId !== null && beat.actorId === meId;
  const holds = decision !== null || beat.level === "result";
  const duration = holds ? null : autoCloseMs(beat, waiting, mine, pace);

  // Fecha sozinha depois do tempo do lance.
  useEffect(() => {
    if (duration === null) return;
    const timer = setTimeout(onNext, duration);
    return () => clearTimeout(timer);
  }, [beat.key, duration, onNext]);

  // Só a janela que pede decisão (ou o resultado) pega o foco: jogadas dos
  // outros a cada poucos segundos não podem arrancar o foco de quem está lendo.
  useEffect(() => {
    if (!holds) return;
    const target = panel.current?.querySelector<HTMLButtonElement>(".turn-actions .button.primary:not([disabled])") ?? primary.current;
    target?.focus({ preventScroll: true });
  }, [beat.key, holds]);

  // Escape passa para o próximo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onNext]);

  const title = beat.level === "result"
    ? "Fim de partida"
    : beat.lines.length === 0 && mine
      ? "Sua vez!"
      : actor
        ? `${actor.name}${mine ? " (você)" : beat.startsTurn ? " começou a jogar" : ""}`
        : "Mesa";

  return (
    // Sem decisão pendente, o fundo não bloqueia: dá para usar câmera e tabuleiro.
    <div className={holds ? "event-backdrop" : "event-backdrop passive"}>
      <div
        ref={panel}
        className={`event-dialog${beat.level === "result" ? " result" : ""}${mine ? " mine" : ""}`}
        role={holds ? "dialog" : "status"}
        aria-modal={holds ? "true" : undefined}
        aria-live={holds ? undefined : "polite"}
        aria-labelledby={titleId}
        style={{ borderTopColor: (beat.actorId && colors.get(beat.actorId)) || undefined }}
      >
        <header className="event-header">
          <span className="avatar big" style={{ borderColor: (beat.actorId && colors.get(beat.actorId)) || undefined }} aria-hidden>
            {actor?.avatar ?? "🎲"}
          </span>
          <span>
            <h2 id={titleId}>{title}</h2>
            <span className="muted small">
              {game.roundLimit ? `Rodada ${game.round} de ${game.roundLimit}` : `Rodada ${game.round}`}
              {actor?.bot ? " · robô" : ""}
              {beat.actorId && room.away.includes(beat.actorId) ? " · piloto automático" : ""}
            </span>
          </span>
        </header>

        {beat.lines.length > 0 && (
          <ol className="beat-lines">
            {beat.lines.map((line) => (
              <li key={`${line.seq}-${line.type}`} className={`tone-${line.tone}`}>
                <span className="beat-icon" aria-hidden>
                  {line.icon}
                </span>
                <span>
                  {line.level === "quick" ? (
                    <>
                      {line.title}
                      {line.text && <span className="muted"> — {line.text}</span>}
                    </>
                  ) : (
                    <>
                      <strong>{line.title}:</strong> {line.text}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}

        {beat.cash.length > 0 && (
          <ul className="cash-changes" aria-label="Mudanças de saldo">
            {beat.cash.map((change) => {
              const person = people.get(change.playerId);
              const now = game.players.find((player) => player.id === change.playerId)?.cash ?? 0;
              return (
                <li key={change.playerId} className={change.amount >= 0 ? "up" : "down"}>
                  <span aria-hidden>{person?.avatar}</span>
                  <span>{change.playerId === meId ? "Você" : person?.name}</span>
                  <strong>
                    {change.amount >= 0 ? "+" : "−"}
                    {money(Math.abs(change.amount))}
                  </strong>
                  <span className="muted">→ {money(now)}</span>
                </li>
              );
            })}
          </ul>
        )}

        {decision}

        <footer className="event-footer">
          <button ref={primary} className={decision ? "button" : "button primary"} onClick={onNext}>
            {decision ? "Fechar" : waiting > 0 ? `Próximo (${waiting})` : "OK"}
          </button>
          {waiting > 1 && (
            <button className="button ghost-dark" onClick={onSkipAll}>
              Pular para agora
            </button>
          )}
        </footer>
        {duration !== null && <span key={beat.key} className="event-timer" style={{ animationDuration: `${duration}ms` }} aria-hidden />}
      </div>
    </div>
  );
}
