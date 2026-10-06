"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { sendCommand } from "@/client/api";
import { useSeat } from "@/client/seats";
import { useRoom } from "@/client/useRoom";
import type { RoomCommand } from "@/rooms/room";
import { Lobby } from "./Lobby";
import { MagnataTable } from "./magnata/MagnataTable";

export type Send = (command: RoomCommand) => Promise<boolean>;

export function RoomScreen() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { room, error, applyRoom } = useRoom(code);
  const seat = useSeat(code);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const me = (seat && room?.players.find((player) => player.id === seat.playerId)) || null;

  const send = useCallback<Send>(
    async (command) => {
      if (!seat) return false;
      setPending(true);
      setNotice(null);
      try {
        const result = await sendCommand(code, seat.token, command);
        applyRoom(result.room);
        return true;
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Algo deu errado.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [code, seat, applyRoom],
  );

  if (!room) {
    return (
      <main className="page center">
        {error ? (
          <>
            <p className="error">{error}</p>
            <Link className="button" href="/">
              Voltar ao início
            </Link>
          </>
        ) : (
          <p className="muted">Abrindo a sala {code}…</p>
        )}
      </main>
    );
  }

  return (
    <main className={room.status === "lobby" ? "page" : "page table-page"}>
      {error && <p className="banner warning">{error}</p>}
      {notice && (
        <button className="banner error-banner" onClick={() => setNotice(null)}>
          {notice} <span aria-hidden>✕</span>
        </button>
      )}
      {room.status === "lobby" ? (
        <Lobby room={room} me={me} send={send} pending={pending} onJoined={applyRoom} />
      ) : (
        <MagnataTable room={room} me={me} send={send} pending={pending} />
      )}
    </main>
  );
}
