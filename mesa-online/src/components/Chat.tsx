"use client";

import { useState, type FormEvent } from "react";
import type { PublicRoom } from "@/rooms/public";
import type { RoomPlayer } from "@/rooms/room";
import type { Send } from "./RoomScreen";

export function Chat({ room, me, send }: { room: PublicRoom; me: RoomPlayer | null; send: Send }) {
  const [text, setText] = useState("");
  const avatars = new Map(room.players.map((player) => [player.id, player.avatar]));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    if (await send({ kind: "chat", text })) setText("");
  }

  return (
    <div className="chat">
      <ol className="chat-list">
        {room.chat.length === 0 && <li className="muted">Ninguém falou nada ainda.</li>}
        {[...room.chat].reverse().map((message) => (
          <li key={message.id}>
            <span aria-hidden>{avatars.get(message.playerId) ?? "💬"} </span>
            <strong>{message.name}</strong> {message.text}
          </li>
        ))}
      </ol>
      {me && (
        <form className="join-row" onSubmit={onSubmit}>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={200}
            placeholder="Mandar mensagem"
            aria-label="Mensagem"
          />
          <button className="button" disabled={!text.trim()}>
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}
