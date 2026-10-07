"use client";

import { describeEvent } from "@/games/magnata/describe";
import type { MagnataView } from "@/games/magnata/engine";
import { themeOf } from "@/games/magnata/themes";
import type { PublicRoom } from "@/rooms/public";


export function HistoryPanel({ room, game, meId }: { room: PublicRoom; game: MagnataView; meId: string | null }) {
  const ctx = {
    theme: themeOf(game.themeId),
    people: new Map(room.players.map((player) => [player.id, { name: player.name, avatar: player.avatar }])),
    meId,
  };
  return (
    <ol className="log">
      {[...game.events].reverse().map((event) => {
        const notice = describeEvent(event, ctx);
        return (
          <li key={event.seq} className={`log-${notice.level}`}>
            <span aria-hidden>{notice.icon} </span>
            <strong>{notice.title}</strong>
            {notice.text && <> — {notice.text}</>}
          </li>
        );
      })}
    </ol>
  );
}
