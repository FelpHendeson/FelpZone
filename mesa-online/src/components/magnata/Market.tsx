"use client";

import { useState } from "react";
import { BOARD, GROUP_COLORS, groupTiles, type OwnableTile } from "@/games/magnata/board";
import { activePlayers, money, tradeError, type MagnataView, type Trade, type TradeSide } from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import type { PublicRoom } from "@/rooms/public";
import type { Send } from "../RoomScreen";
import { Sheet } from "../Sheet";

const nameOf = (game: MagnataView, playerId: string) => game.players.find((player) => player.id === playerId)?.name ?? "Alguém";

/** "Rua A, Rua B + $100" — o que um lado da troca entrega. */
export function sideLabel(game: MagnataView, side: TradeSide): string {
  const theme = themeOf(game.themeId);
  const parts = side.tiles.map((tile) => tileNameIn(theme, tile));
  if (side.cash > 0) parts.push(money(side.cash));
  return parts.length ? parts.join(", ") : "nada";
}

/** Quem precisa responder ao leilão ou à troca em andamento. */
export function marketNeedsMe(game: MagnataView, meId: string | null): boolean {
  if (!meId) return false;
  if (game.phase === "auction") return game.auction?.pending.includes(meId) ?? false;
  if (game.phase === "trade") return game.trade?.toId === meId;
  return false;
}

/**
 * Decisões de leilão e de troca. Valem para qualquer pessoa da mesa, não só
 * para quem está na vez: todos dão lance e quem recebe a proposta responde.
 */
export function MarketActions({ game, room, meId, send, pending }: { game: MagnataView; room: PublicRoom; meId: string | null; send: Send; pending: boolean }) {
  if (game.phase === "auction" && game.auction) return <AuctionActions game={game} meId={meId} send={send} pending={pending} />;
  if (game.phase === "trade" && game.trade) return <TradeAnswer game={game} trade={game.trade} room={room} meId={meId} send={send} pending={pending} />;
  return null;
}

function AuctionActions({ game, meId, send, pending }: { game: MagnataView; meId: string | null; send: Send; pending: boolean }) {
  const auction = game.auction!;
  const tile = BOARD[auction.tile] as OwnableTile;
  const name = tileNameIn(themeOf(game.themeId), auction.tile);
  const me = meId ? game.players.find((player) => player.id === meId) : null;
  const myTurnToBid = me !== null && me !== undefined && auction.pending.includes(me.id);
  const [amount, setAmount] = useState(() => Math.min(me?.cash ?? 0, Math.floor(tile.price / 20) * 10));
  const bid = (value: number) => send({ kind: "game", action: { type: "bid", amount: value } });
  const waitingFor = auction.pending.map((id) => nameOf(game, id));
  const quick = [Math.floor(tile.price / 20) * 10, tile.price, Math.floor((tile.price * 1.2) / 10) * 10].filter(
    (value, index, list) => value > 0 && value <= (me?.cash ?? 0) && list.indexOf(value) === index,
  );

  return (
    <div className="turn-actions market">
      <p>
        <span className="color-dot" style={{ background: tile.kind === "street" ? GROUP_COLORS[tile.group] : "#888" }} aria-hidden />
        Leilão de <strong>{name}</strong> (tabela {money(tile.price)}). Os lances são secretos e quem der mais leva, pagando ao banco.
      </p>
      {myTurnToBid ? (
        <>
          <div className="action-row">
            {quick.map((value) => (
              <button key={value} className="button" disabled={pending} onClick={() => setAmount(value)} aria-pressed={amount === value}>
                {money(value)}
              </button>
            ))}
          </div>
          <label className="field bid-field">
            <span>Seu lance (você tem {money(me!.cash)})</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={me!.cash}
              step={10}
              value={amount}
              onChange={(event) => setAmount(Math.max(0, Math.min(me!.cash, Math.floor(Number(event.target.value) || 0))))}
            />
          </label>
          <div className="action-row">
            <button className="button primary" disabled={pending || amount <= 0} onClick={() => bid(amount)}>
              Dar lance de {money(amount)}
            </button>
            <button className="button" disabled={pending} onClick={() => bid(0)}>
              Passar
            </button>
          </div>
        </>
      ) : (
        <p className="muted">
          {me && !me.bankrupt ? "Seu lance está guardado. " : ""}
          Esperando o lance de {waitingFor.join(", ")}.
        </p>
      )}
    </div>
  );
}

function TradeAnswer({ game, trade, room, meId, send, pending }: { game: MagnataView; trade: Trade; room: PublicRoom; meId: string | null; send: Send; pending: boolean }) {
  const act = (type: string) => send({ kind: "game", action: { type } });
  const error = tradeError(game, trade);
  const from = nameOf(game, trade.fromId);
  const to = nameOf(game, trade.toId);
  const avatar = (id: string) => room.players.find((player) => player.id === id)?.avatar;

  return (
    <div className="turn-actions market">
      <div className="trade-summary">
        <p>
          <span aria-hidden>{avatar(trade.fromId)} </span>
          <strong>{trade.fromId === meId ? "Você" : from}</strong> entrega: {sideLabel(game, trade.give)}
        </p>
        <p>
          <span aria-hidden>{avatar(trade.toId)} </span>
          <strong>{trade.toId === meId ? "Você" : to}</strong> entrega: {sideLabel(game, trade.get)}
        </p>
      </div>
      {trade.toId === meId ? (
        <>
          {error && <p className="error">{error}</p>}
          <div className="action-row">
            <button className="button primary" disabled={pending || error !== null} onClick={() => act("accept-trade")}>
              Aceitar troca
            </button>
            <button className="button" disabled={pending} onClick={() => act("reject-trade")}>
              Recusar
            </button>
          </div>
        </>
      ) : trade.fromId === meId ? (
        <>
          <p className="muted">Esperando {to} responder.</p>
          <button className="button block" disabled={pending} onClick={() => act("cancel-trade")}>
            Cancelar proposta
          </button>
        </>
      ) : (
        <p className="muted">Esperando {to} responder.</p>
      )}
    </div>
  );
}

interface Draft {
  toId: string | null;
  give: number[];
  get: number[];
  giveCash: number;
  getCash: number;
}

/** Montagem de uma proposta de troca, na própria vez (antes de rolar ou ao terminar). */
export function TradeBuilder({ game, meId, room, send, pending, onClose }: { game: MagnataView; meId: string; room: PublicRoom; send: Send; pending: boolean; onClose: () => void }) {
  const others = activePlayers(game).filter((player) => player.id !== meId);
  const [draft, setDraft] = useState<Draft>({ toId: others[0]?.id ?? null, give: [], get: [], giveCash: 0, getCash: 0 });
  const me = game.players.find((player) => player.id === meId)!;
  const partner = game.players.find((player) => player.id === draft.toId) ?? null;
  const trade: Trade | null = draft.toId
    ? {
        fromId: meId,
        toId: draft.toId,
        give: { tiles: draft.give, cash: draft.giveCash },
        get: { tiles: draft.get, cash: draft.getCash },
        resumePhase: game.phase === "end" ? "end" : "roll",
      }
    : null;
  const error = trade ? tradeError(game, trade) : "Escolha com quem trocar.";

  async function submit() {
    if (!trade || error) return;
    const ok = await send({ kind: "game", action: { type: "propose-trade", toId: trade.toId, give: trade.give, get: trade.get } });
    if (ok) onClose();
  }

  const toggle = (key: "give" | "get", tile: number) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(tile) ? current[key].filter((item) => item !== tile) : [...current[key], tile].sort((a, b) => a - b),
    }));

  return (
    <Sheet title="Propor troca" onClose={onClose}>
      {others.length === 0 ? (
        <p className="muted">Não há com quem trocar.</p>
      ) : (
        <div className="trade-builder">
          <fieldset className="trade-partners">
            <legend>Trocar com</legend>
            {others.map((player) => (
              <label key={player.id} className={draft.toId === player.id ? "partner-chip active" : "partner-chip"}>
                <input
                  type="radio"
                  name="trade-partner"
                  checked={draft.toId === player.id}
                  onChange={() => setDraft({ toId: player.id, give: draft.give, get: [], giveCash: draft.giveCash, getCash: 0 })}
                />
                <span aria-hidden>{room.players.find((person) => person.id === player.id)?.avatar}</span> {player.name}
              </label>
            ))}
          </fieldset>

          <TradeSidePicker
            game={game}
            ownerId={meId}
            title="Você entrega"
            tiles={draft.give}
            cash={draft.giveCash}
            maxCash={me.cash}
            onToggle={(tile) => toggle("give", tile)}
            onCash={(giveCash) => setDraft((current) => ({ ...current, giveCash }))}
          />
          {partner && (
            <TradeSidePicker
              game={game}
              ownerId={partner.id}
              title={`Você pede a ${partner.name}`}
              tiles={draft.get}
              cash={draft.getCash}
              maxCash={partner.cash}
              onToggle={(tile) => toggle("get", tile)}
              onCash={(getCash) => setDraft((current) => ({ ...current, getCash }))}
            />
          )}

          {trade && !error && (
            <p className="trade-preview">
              Você entrega <strong>{sideLabel(game, trade.give)}</strong> e recebe <strong>{sideLabel(game, trade.get)}</strong>.
            </p>
          )}
          {error && <p className="muted">{error}</p>}
          <button className="button primary block" disabled={pending || error !== null} onClick={submit}>
            Enviar proposta
          </button>
          <p className="muted small">A partida espera a resposta. Você pode cancelar a proposta enquanto isso.</p>
        </div>
      )}
    </Sheet>
  );
}

function TradeSidePicker({
  game,
  ownerId,
  title,
  tiles,
  cash,
  maxCash,
  onToggle,
  onCash,
}: {
  game: MagnataView;
  ownerId: string;
  title: string;
  tiles: number[];
  cash: number;
  maxCash: number;
  onToggle: (tile: number) => void;
  onCash: (cash: number) => void;
}) {
  const theme = themeOf(game.themeId);
  const owned = BOARD.map((_, index) => ({ property: game.properties[index], index })).filter(({ property }) => property?.owner === ownerId);

  return (
    <fieldset className="trade-side">
      <legend>{title}</legend>
      {owned.length === 0 && <p className="muted small">Nenhuma propriedade.</p>}
      <ul className="trade-tiles">
        {owned.map(({ property, index }) => {
          const tile = BOARD[index];
          const built = tile.kind === "street" && groupTiles(tile.group).some((other) => game.properties[other].houses > 0);
          return (
            <li key={index}>
              <label className={built ? "check disabled" : "check"}>
                <input type="checkbox" checked={tiles.includes(index)} disabled={built} onChange={() => onToggle(index)} />
                <span className="color-dot" style={{ background: tile.kind === "street" ? GROUP_COLORS[tile.group] : "#888" }} aria-hidden />
                <span>
                  {tileNameIn(theme, index)}
                  {property.mortgaged && <span className="muted"> · hipotecada</span>}
                  {built && <span className="muted"> · tem construções na cor</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <label className="field">
        <span>Dinheiro (até {money(maxCash)})</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={maxCash}
          step={10}
          value={cash}
          onChange={(event) => onCash(Math.max(0, Math.min(maxCash, Math.floor(Number(event.target.value) || 0))))}
        />
      </label>
    </fieldset>
  );
}
