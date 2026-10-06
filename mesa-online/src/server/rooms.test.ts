import { describe, expect, it } from "vitest";
import { createMemoryStore, type RoomStore } from "./store";
import { createRoomFor, joinRoomAs, readRoom, runRoomCommand } from "./rooms";

async function roomWithTwo(store: RoomStore) {
  const host = await createRoomFor({ name: "Ana" }, store);
  const guest = await joinRoomAs(host.room.code, { name: "Bia" }, store);
  return { host, guest, code: host.room.code };
}

describe("salas", () => {
  it("cria, recebe jogadores e inicia a partida", async () => {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    expect(guest.room.players.map((p) => p.name)).toEqual(["Ana", "Bia"]);

    await expect(runRoomCommand(code, guest.token, { kind: "start" }, store)).rejects.toThrow("Só quem criou");
    const room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    expect(room.status).toBe("playing");
    expect(room.game?.players).toHaveLength(2);

    await expect(joinRoomAs(code, { name: "Caio" }, store)).rejects.toThrow("já começou");
  });

  it("não expõe tokens e responde vazio quando nada mudou", async () => {
    const store = createMemoryStore();
    const { host, code } = await roomWithTwo(store);
    const room = await readRoom(code.toLowerCase(), null, store);
    expect(JSON.stringify(room)).not.toContain(host.token);
    expect(await readRoom(code, room!.version, store)).toBeNull();
    expect(await readRoom(code, room!.version - 1, store)).not.toBeNull();
  });

  it("rejeita token inválido, nomes repetidos e códigos inexistentes", async () => {
    const store = createMemoryStore();
    const { code } = await roomWithTwo(store);
    await expect(runRoomCommand(code, "falso", { kind: "start" }, store)).rejects.toThrow("Identificação inválida");
    await expect(runRoomCommand(code, null, { kind: "start" }, store)).rejects.toThrow("Identificação ausente");
    await expect(joinRoomAs(code, { name: " ana " }, store)).rejects.toThrow("Já existe");
    await expect(readRoom("ZZZZZ", null, store)).rejects.toThrow("não encontrada");
    await expect(readRoom("../x", null, store)).rejects.toThrow("inválido");
  });

  it("mantém o chat curto e limpo", async () => {
    const store = createMemoryStore();
    const { host, code } = await roomWithTwo(store);
    const room = await runRoomCommand(code, host.token, { kind: "chat", text: "  oi\u0007 gente " }, store);
    expect(room.chat.at(-1)).toMatchObject({ name: "Ana", text: "oi  gente" });
    await expect(runRoomCommand(code, host.token, { kind: "chat", text: "x".repeat(201) }, store)).rejects.toThrow();
  });

  it("aplica jogadas apenas do jogador da vez", async () => {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    const room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    const first = room.game!.currentPlayerId === host.playerId ? host : guest;
    const second = first === host ? guest : host;

    await expect(
      runRoomCommand(code, second.token, { kind: "game", action: { type: "roll" } }, store),
    ).rejects.toThrow("Aguarde a sua vez");
    const after = await runRoomCommand(code, first.token, { kind: "game", action: { type: "roll" } }, store);
    expect(after.game!.dice).not.toBeNull();
    expect(after.version).toBe(room.version + 1);
  });

  it("refaz a escrita quando outra requisição altera a sala no meio", async () => {
    const inner = createMemoryStore();
    const { host, code } = await roomWithTwo(inner);
    let interfered = false;
    const racy: RoomStore = {
      ...inner,
      async replace(stored, expected) {
        if (!interfered) {
          interfered = true;
          // Outra pessoa manda uma mensagem entre a leitura e a escrita.
          await runRoomCommand(code, host.token, { kind: "chat", text: "antes" }, inner);
        }
        return inner.replace(stored, expected);
      },
    };
    const room = await runRoomCommand(code, host.token, { kind: "chat", text: "depois" }, racy);
    expect(room.chat.map((message) => message.text)).toEqual(["antes", "depois"]);
  });

  it("desistência durante a partida encerra o jogo de dois", async () => {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    await runRoomCommand(code, host.token, { kind: "start" }, store);
    const room = await runRoomCommand(code, guest.token, { kind: "leave" }, store);
    expect(room.status).toBe("finished");
    expect(room.game!.winnerId).toBe(host.playerId);

    const lobby = await runRoomCommand(code, host.token, { kind: "rematch" }, store);
    expect(lobby.status).toBe("lobby");
    expect(lobby.game).toBeNull();
  });
});
