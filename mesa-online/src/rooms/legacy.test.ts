import { describe, expect, it } from "vitest";
import { publicRoom } from "./public";
import { createRoom, joinRoom, runCommand, type Room } from "./room";

describe("salas gravadas antes das contas", () => {
  it("terminam a partida e aparecem sem `results`, `match` nem aposta", () => {
    let room = createRoom({ code: "ABCDE", gameId: "magnata", hostId: "ana", hostName: "Ana", now: 1 });
    room = joinRoom(room, "bia", "Bia", null, 2);
    // Como estava no Redis antes desta versão.
    const legacy = { ...room, options: { ...room.options } } as Partial<Room> & Record<string, unknown>;
    delete legacy.results;
    delete legacy.match;
    delete (legacy.options as unknown as Record<string, unknown>).stake;
    let current = legacy as Room;
    expect(publicRoom(current)).toMatchObject({ results: [], match: null, options: { stake: 0 } });
    current = runCommand(current, "ana", { kind: "start" }, () => 0.5, 3);
    current = runCommand(current, "bia", { kind: "leave" }, () => 0.5, 4);
    expect(current.status).toBe("finished");
    expect(current.results).toHaveLength(1);
    expect(current.results[0]).toMatchObject({ winners: ["ana"], stake: 0, pot: 0 });
  });
});
