"use client";

import { BOARD, GROUP_COLORS, STATION_RENT, UTILITY_MULTIPLIER, isOwnable, mortgageValue } from "@/games/magnata/board";
import { money, type MagnataView } from "@/games/magnata/engine";
import { themeOf, tileNameIn } from "@/games/magnata/themes";
import type { Send } from "../RoomScreen";
import { Sheet } from "../Sheet";
import { PropertyActions } from "./PropertyActions";

interface Props {
  game: MagnataView;
  index: number;
  myId: string | null;
  avatars: Map<string, string>;
  send: Send;
  pending: boolean;
  onClose: () => void;
}

const RENT_LABELS = ["Aluguel", "1 casa", "2 casas", "3 casas", "4 casas", "Hotel"];

export function TileSheet({ game, index, myId, avatars, send, pending, onClose }: Props) {
  const tile = BOARD[index];
  const property = game.properties[index];
  const owner = property?.owner ? game.players.find((player) => player.id === property.owner) : null;
  const name = tileNameIn(themeOf(game.themeId), index);

  return (
    <Sheet title={name} onClose={onClose} band={tile.kind === "street" ? GROUP_COLORS[tile.group] : undefined}>
      {isOwnable(tile) && (
        <>
          <p>
            Preço {money(tile.price)} · Hipoteca {money(mortgageValue(tile))}
          </p>
          <p>
            {owner ? (
              <>
                Dono: <span aria-hidden>{avatars.get(owner.id)} </span>
                <strong>{owner.name}</strong>
                {property.mortgaged && " · hipotecada (não cobra aluguel)"}
                {property.houses > 0 && ` · ${property.houses === 5 ? "hotel" : `${property.houses} casa(s)`}`}
              </>
            ) : (
              "À venda"
            )}
          </p>
        </>
      )}

      {tile.kind === "street" && (
        <table className="rent-table">
          <tbody>
            {tile.rent.map((value, level) => (
              <tr key={level} className={property.houses === level && owner ? "current" : undefined}>
                <td>{RENT_LABELS[level]}</td>
                <td>{money(value)}</td>
              </tr>
            ))}
            <tr>
              <td>Cada construção</td>
              <td>{money(tile.houseCost)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {tile.kind === "street" && <p className="muted">Com todas as ruas da cor e sem casas, o aluguel dobra.</p>}
      {tile.kind === "station" && (
        <p>Aluguel: {STATION_RENT.map((value, count) => `${count + 1} estação: ${money(value)}`).join(" · ")}</p>
      )}
      {tile.kind === "utility" && (
        <p>
          Aluguel: {UTILITY_MULTIPLIER[0]}× o valor dos dados com uma companhia, {UTILITY_MULTIPLIER[1]}× com as duas.
        </p>
      )}
      {tile.kind === "tax" && <p>Pague {money(tile.amount)} ao banco.</p>}
      {tile.kind === "card" && <p>Pegue uma carta de {tile.name}.</p>}
      {tile.kind === "start" && <p>Receba $200 sempre que passar por aqui.</p>}
      {tile.kind === "go-to-jail" && <p>Vá direto para a prisão, sem receber pela Partida.</p>}
      {tile.kind === "jail" && <p>Só visitando — a não ser que você esteja cumprindo pena.</p>}
      {tile.kind === "free-parking" && <p>Descanso: nada acontece aqui.</p>}

      {myId && owner?.id === myId && game.phase !== "finished" && (
        <PropertyActions game={game} playerId={myId} tile={index} send={send} pending={pending} />
      )}
    </Sheet>
  );
}
