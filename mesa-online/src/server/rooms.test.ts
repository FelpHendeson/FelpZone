import { describe, expect, it } from "vitest";
import { createMemoryStore, type RoomStore } from "./store";
import { botAction } from "@/bots/strategies";
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

describe("robôs na mesa", () => {
  it("anfitrião adiciona, remove e configura antes de começar", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    const code = host.room.code;
    await runRoomCommand(code, host.token, { kind: "add-bot", strategy: "investidor" }, store);
    let room = await runRoomCommand(code, host.token, { kind: "add-bot", strategy: "investidor" }, store);
    expect(room.players.map((p) => p.name)).toEqual(["Ana", "Robô Investidor", "Robô Investidor 2"]);
    expect(new Set(room.players.map((p) => p.color)).size).toBe(3);

    room = await runRoomCommand(code, host.token, { kind: "remove-bot", playerId: room.players[1].id }, store);
    expect(room.players).toHaveLength(2);
    await expect(runRoomCommand(code, host.token, { kind: "add-bot", strategy: "hacker" }, store)).rejects.toThrow("desconhecido");
    await expect(runRoomCommand(code, host.token, { kind: "remove-bot", playerId: host.playerId }, store)).rejects.toThrow();
    await expect(runRoomCommand(code, host.token, { kind: "set-options", roundLimit: 7 }, store)).rejects.toThrow("Duração");

    const guest = await joinRoomAs(code, { name: "Bia" }, store);
    await expect(runRoomCommand(code, guest.token, { kind: "add-bot", strategy: "conservador" }, store)).rejects.toThrow("Só quem criou");

    room = await runRoomCommand(code, host.token, { kind: "set-options", roundLimit: 30 }, store);
    expect(room.options.roundLimit).toBe(30);
    room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    expect(room.game!.turnLimit).toBe(90);
  });

  it("anfitrião sai e o comando passa para uma pessoa, nunca para um robô", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "colecionador" }, store);
    await expect(runRoomCommand(host.room.code, host.token, { kind: "leave" }, store)).rejects.toThrow("última pessoa");
  });

  it("partida solo anda sozinha pelas consultas até ter vencedor", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    const code = host.room.code;
    for (const strategy of ["investidor", "conservador", "colecionador"]) {
      await runRoomCommand(code, host.token, { kind: "add-bot", strategy }, store);
    }
    await runRoomCommand(code, host.token, { kind: "set-options", roundLimit: 30 }, store);
    let room = await runRoomCommand(code, host.token, { kind: "start" }, store);

    // Sem espera entre jogadas; consulta não faz nada se for a vez da pessoa.
    let steps = 0;
    while (room.status === "playing" && steps < 5000) {
      const game = room.game!;
      if (game.currentPlayerId === host.playerId) {
        const action = botAction("investidor", game, host.playerId, Math.random);
        room = await runRoomCommand(code, host.token, { kind: "game", action }, store);
      } else {
        room = (await readRoom(code, null, store, 0))!;
      }
      steps += 1;
    }
    expect(room.status).toBe("finished");
    expect(room.game!.winnerId).not.toBeNull();
    expect(room.game!.turnNumber).toBeLessThanOrEqual(120);
  });

  it("respeita a pausa entre jogadas e avisa o cliente pela versão", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    const code = host.room.code;
    await runRoomCommand(code, host.token, { kind: "add-bot", strategy: "investidor" }, store);
    let room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    // Joga a vez da pessoa até chegar a vez do robô.
    while (room.game!.currentPlayerId === host.playerId) {
      const action = botAction("conservador", room.game!, host.playerId, Math.random);
      room = await runRoomCommand(code, host.token, { kind: "game", action }, store);
    }
    expect(await readRoom(code, room.version, store, 60_000)).toBeNull();
    const moved = await readRoom(code, room.version, store, 0);
    expect(moved!.version).toBeGreaterThan(room.version);
  });
});
