"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { DIALOG_PACES, type Prefs } from "@/client/profile";
import { useBeats } from "@/client/useBeats";
import { prefersReducedMotion, useSteppedPositions } from "@/client/useSteppedPositions";
import type { MagnataView } from "@/games/magnata/engine";
import type { PublicRoom } from "@/rooms/public";
import type { RoomPlayer } from "@/rooms/room";
import { Chat } from "../Chat";
import type { Send } from "../RoomScreen";
import { BoardViewport, type CameraTarget } from "./BoardViewport";
import { EventDialog } from "./EventDialog";
import { BankPanel, MyProperties } from "./AssetsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { MarketActions, TradeBuilder, marketNeedsMe } from "./Market";
import { PlayerStrip } from "./PlayerStrip";
import { PlayersPanel } from "./PlayersPanel";
import { TileSheet } from "./TileSheet";
import { CurrentTile, TurnActions, TurnPanel } from "./TurnPanel";

interface Props {
  room: PublicRoom;
  me: RoomPlayer | null;
  send: Send;
  pending: boolean;
  prefs: Prefs;
}

type Tab = "jogadores" | "bens" | "historico" | "conversa";
const TABS: [Tab, string][] = [
  ["jogadores", "Jogadores"],
  ["bens", "Meus bens"],
  ["historico", "Histórico"],
  ["conversa", "Conversa"],
];

export function MagnataTable({ room, me, send, pending, prefs }: Props) {
  const game = room.game as MagnataView;
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("jogadores");
  const [trading, setTrading] = useState(false);
  const [camera, setCamera] = useState<CameraTarget>({ mode: prefs.camera ?? "turn" });
  const reduceMotion = prefersReducedMotion(prefs.reducedMotion);
  const positions = useSteppedPositions(game.players, reduceMotion);
  const { beat, waiting, next, skipAll } = useBeats(room, me?.id ?? null, prefs);
  const tabsId = useId();
  const tabRefs = useRef(new Map<Tab, HTMLButtonElement>());
  const mine = me ? (game.players.find((player) => player.id === me.id) ?? null) : null;
  const avatars = new Map(room.players.map((player) => [player.id, player.avatar]));
  const away = me ? room.away.includes(me.id) : false;
  const meId = me?.id ?? null;
  const onFocusPlayer = useCallback((playerId: string) => setCamera({ mode: "player", playerId }), []);

  // A decisão aparece dentro da janela quando o lance mais recente é da pessoa
  // e ainda é a vez dela: rolar, comprar, pagar ou passar a vez sem procurar botão.
  // Leilão e troca pedem resposta de quem não está na vez: a janela segura
  // aberta para essa pessoa, seja de quem for o lance narrado.
  const playing = mine && !mine.bankrupt ? mine.id : null;
  const market = game.phase === "auction" || game.phase === "trade";
  const myTurnNow = meId !== null && game.currentPlayerId === meId && game.phase !== "finished" && !market && !away;
  const openTrade = useCallback(() => setTrading(true), []);
  const decision = !beat || waiting > 0
    ? null
    : marketNeedsMe(game, playing) ? (
      <MarketActions key={`${game.phase}-${game.auction?.tile ?? game.trade?.fromId}`} game={game} room={room} meId={playing} send={send} pending={pending} />
    ) : myTurnNow && (beat.actorId === meId || beat.startsTurn) ? (
      <TurnActions game={game} send={send} pending={pending} onTrade={openTrade} />
    ) : null;

  function onTabKey(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = TABS.findIndex(([id]) => id === tab);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    setTab(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <>
      {away && (
        <div className="banner warning away-banner" role="status">
          <span>💤 O piloto automático está jogando por você.</span>
          <button className="button small primary" disabled={pending} onClick={() => send({ kind: "back" })}>
            Voltar a jogar
          </button>
        </div>
      )}

      <PlayerStrip
        room={room}
        game={game}
        meId={meId}
        focusedId={camera.mode === "player" ? camera.playerId : null}
        onFocus={onFocusPlayer}
      />
      <BoardViewport
        game={game}
        positions={positions}
        meId={meId}
        avatars={avatars}
        camera={camera}
        onCamera={setCamera}
        narratedId={beat?.actorId ?? null}
        reduceMotion={reduceMotion}
        onSelect={setSelected}
      />
      <p className="muted light small robots-note">Os robôs jogam enquanto alguém estiver com a sala aberta.</p>

      <TurnPanel room={room} game={game} mine={mine} me={me} avatars={avatars} send={send} pending={pending} onTrade={openTrade} />
      <CurrentTile game={game} avatars={avatars} onOpen={setSelected} />

      <div className="tabs" role="tablist" aria-label="Painéis da partida" onKeyDown={onTabKey}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            ref={(node) => {
              if (node) tabRefs.current.set(id, node);
            }}
            id={`${tabsId}-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${tabsId}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "conversa" && room.chat.length > 0 ? ` (${room.chat.length})` : ""}
          </button>
        ))}
      </div>

      <section className="card" role="tabpanel" id={`${tabsId}-panel-${tab}`} aria-labelledby={`${tabsId}-tab-${tab}`}>
        {tab === "jogadores" && <PlayersPanel game={game} room={room} myId={me?.id ?? null} />}
        {tab === "bens" &&
          (mine && !mine.bankrupt ? (
            <>
              {game.credit && <BankPanel game={game} player={mine} send={send} pending={pending} />}
              <MyProperties game={game} player={mine} send={send} pending={pending} onSelect={setSelected} />
            </>
          ) : (
            <p className="muted">{mine ? "Você saiu desta partida." : "Você está assistindo esta partida."}</p>
          ))}
        {tab === "historico" && <HistoryPanel room={room} game={game} meId={me?.id ?? null} />}
        {tab === "conversa" && <Chat room={room} me={me} send={send} />}
      </section>

      {mine && !mine.bankrupt && game.phase !== "finished" && (
        <button
          className="button ghost block"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Desistir da partida? Seus bens voltam para o banco.")) {
              send({ kind: "game", action: { type: "resign" } });
            }
          }}
        >
          Desistir da partida
        </button>
      )}

      {beat && selected === null && !trading && (
        <EventDialog
          beat={beat}
          waiting={waiting}
          room={room}
          game={game}
          meId={meId}
          decision={decision}
          pace={DIALOG_PACES[prefs.dialogPace] ?? 1}
          onNext={next}
          onSkipAll={skipAll}
        />
      )}

      {trading && playing && (
        <TradeBuilder game={game} meId={playing} room={room} send={send} pending={pending} onClose={() => setTrading(false)} />
      )}

      {selected !== null && (
        <TileSheet
          game={game}
          index={selected}
          myId={mine && !mine.bankrupt ? mine.id : null}
          avatars={avatars}
          send={send}
          pending={pending}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
