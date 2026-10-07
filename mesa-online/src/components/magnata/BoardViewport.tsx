"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { saveProfile, type CameraMode } from "@/client/profile";
import type { MagnataView } from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import { Board } from "./Board";
import { DICE_FACES, gridPosition } from "./tiles";

export type CameraTarget = { mode: CameraMode } | { mode: "player"; playerId: string };

interface Props {
  game: MagnataView;
  positions: Map<string, number>;
  meId: string | null;
  avatars: Map<string, string>;
  camera: CameraTarget;
  onCamera: (camera: CameraTarget) => void;
  /** Quem a janela de acontecimentos está narrando agora (a câmera acompanha). */
  narratedId: string | null;
  reduceMotion: boolean;
  onSelect: (index: number) => void;
}

const ZOOMS = [1.6, 2.2, 3];
const DEFAULT_ZOOM = 2.2;
/** Margem de "mesa" em volta do tabuleiro ampliado, em fração da janela: deixa centralizar casas da borda. */
const MARGIN = 0.4;
/** Altura (fração da janela) em que o peão em foco fica: um pouco acima do meio, longe da janela de acontecimentos. */
const FOCUS_Y = 0.42;

/**
 * Janela quadrada sobre o tabuleiro ampliado. No modo "seguir a vez" a câmera
 * acompanha quem joga (e quem está sendo narrado), casa a casa; "eu" foca no
 * próprio peão; tocar num jogador foca nele; "livre" deixa arrastar; "tudo"
 * mostra o tabuleiro inteiro.
 */
export function BoardViewport({ game, positions, meId, avatars, camera, onCamera, narratedId, reduceMotion, onSelect }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const programmatic = useRef(0);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const scale = camera.mode === "all" ? 1 : zoom;

  const focusId =
    camera.mode === "player"
      ? camera.playerId
      : camera.mode === "me" && meId && game.players.some((player) => player.id === meId && !player.bankrupt)
        ? meId
        : camera.mode === "turn" || camera.mode === "me"
          ? (narratedId ?? game.currentPlayerId)
          : null;
  const focusPlayer = focusId ? game.players.find((player) => player.id === focusId) : null;
  const focusTile = focusId ? (positions.get(focusId) ?? focusPlayer?.position ?? 0) : null;

  const centerOn = useCallback(
    (tile: number, smooth: boolean) => {
      const node = viewport.current;
      if (!node) return;
      const size = node.clientWidth;
      const board = size * scale;
      const margin = size * MARGIN;
      const { row, col } = gridPosition(tile);
      programmatic.current = Date.now();
      node.scrollTo({
        left: margin + ((col - 0.5) / 11) * board - size / 2,
        top: margin + ((row - 0.5) / 11) * board - size * FOCUS_Y,
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
      });
    },
    [scale, reduceMotion],
  );

  // A câmera acompanha o peão em foco a cada passo.
  useEffect(() => {
    if (focusTile === null || camera.mode === "all" || camera.mode === "free") return;
    centerOn(focusTile, true);
  }, [focusTile, camera.mode, centerOn]);

  // Mudou o zoom: recentraliza sem animação.
  useEffect(() => {
    if (focusTile !== null && camera.mode !== "free") centerOn(focusTile, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o zoom muda
  }, [scale]);

  // Rolar com o dedo num modo de acompanhamento passa para o modo livre.
  const onScroll = () => {
    if (camera.mode === "free" || camera.mode === "all") return;
    if (Date.now() - programmatic.current > 900) onCamera({ mode: "free" });
  };

  // Arrastar com o mouse (no celular, o toque já rola nativamente).
  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || scale === 1 || !viewport.current) return;
    drag.current = { x: event.clientX, y: event.clientY, left: viewport.current.scrollLeft, top: viewport.current.scrollTop };
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current || !viewport.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) < 6) return;
    if (camera.mode !== "free") onCamera({ mode: "free" });
    viewport.current.scrollLeft = drag.current.left - dx;
    viewport.current.scrollTop = drag.current.top - dy;
  };
  const endDrag = () => {
    drag.current = null;
  };

  const choose = (mode: CameraMode) => {
    onCamera({ mode });
    saveProfile({ prefs: { camera: mode } });
  };
  const theme = themeOf(game.themeId);

  return (
    <div className="viewport-wrap">
      <div className="camera-bar" role="group" aria-label="Câmera do tabuleiro">
        {(
          [
            ["turn", "🎯 Vez"],
            ["me", "🙋 Eu"],
            ["free", "✋ Livre"],
            ["all", "🗺️ Tudo"],
          ] as [CameraMode, string][]
        ).map(([mode, label]) => (
          <button key={mode} className={camera.mode === mode ? "chip active" : "chip"} aria-pressed={camera.mode === mode} onClick={() => choose(mode)}>
            {label}
          </button>
        ))}
      </div>
      <div
        ref={viewport}
        className={`board-viewport${scale > 1 ? " zoomed" : ""}`}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* Palco com margem de mesa (padding em % da largura da janela) e o tabuleiro ampliado dentro. */}
        <div
          className="board-stage"
          style={scale > 1 ? { width: `${(scale + 2 * MARGIN) * 100}%`, padding: `${MARGIN * 100}%` } : undefined}
        >
          <Board game={game} positions={positions} focusId={focusId} meId={meId} avatars={avatars} onSelect={onSelect} />
        </div>
      </div>

        {scale > 1 && (
          <span className="zoom-buttons">
            <button
              className="chip"
              aria-label="Afastar"
              disabled={zoom <= ZOOMS[0]}
              onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}
            >
              −
            </button>
            <button
              className="chip"
              aria-label="Aproximar"
              disabled={zoom >= ZOOMS[ZOOMS.length - 1]}
              onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])}
            >
              +
            </button>
          </span>
        )}
      {focusPlayer && focusTile !== null && scale > 1 && (
        <p className="viewport-caption">
          <span aria-hidden>{avatars.get(focusPlayer.id)}</span> {focusPlayer.id === meId ? "Você" : focusPlayer.name} ·{" "}
          {tileNameIn(theme, focusTile)}
          {game.dice && (
            <span className="caption-dice" aria-label={`Últimos dados: ${game.dice[0]} e ${game.dice[1]}`}>
              {DICE_FACES[game.dice[0]]}
              {DICE_FACES[game.dice[1]]}
            </span>
          )}
        </p>
      )}

    </div>
  );
}
