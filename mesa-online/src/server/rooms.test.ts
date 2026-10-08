import { describe, expect, it } from "vitest";
import { createMemoryStore, type RoomStore } from "./store";
import { botAction } from "@/bots/strategies";
import { createRoomFor, joinRoomAs, readRoom, runRoomCommand } from "./rooms";
import type { MagnataView } from "@/games/magnata/engine";
import type { PublicRoom } from "@/rooms/public";

/** A partida do Magnata na visão pública da sala. */
const magnata = (room: PublicRoom | null) => room!.game as MagnataView;

async function roomWithTwo(store: RoomStore) {
  const host = await createRoomFor({ name: "Ana" }, store);
  const guest = await joinRoomAs(host.room.code, { name: "Bia" }, store);
  return { host, guest, code: host.room.code };
}

/** Relógio de teste que sempre avança uma hora: libera qualquer jogada automática pendente. */
let clock = Date.now();
const LATER = () => (clock += 60 * 60 * 1000);

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
    const first = magnata(room).currentPlayerId === host.playerId ? host : guest;
    const second = first === host ? guest : host;

    await expect(
      runRoomCommand(code, second.token, { kind: "game", action: { type: "roll" } }, store),
    ).rejects.toThrow("Aguarde a sua vez");
    const after = await runRoomCommand(code, first.token, { kind: "game", action: { type: "roll" } }, store);
    expect(magnata(after).dice).not.toBeNull();
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
    expect(magnata(room).winnerId).toBe(host.playerId);

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
    expect(magnata(room).roundLimit).toBe(30);
  });

  it("anfitrião sai e o comando passa para uma pessoa, nunca para um robô", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "colecionador" }, store);
    await expect(runRoomCommand(host.room.code, host.token, { kind: "leave" }, store)).rejects.toThrow("última pessoa");
  });

  it("partida solo anda sozinha pelas consultas até ter vencedor", async () => {
    // A pessoa simulada joga mais rápido que o limite de frequência permite.
    const store = { ...createMemoryStore(), hit: async () => true };
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
      const game = magnata(room);
      if (game.currentPlayerId === host.playerId) {
        const action = botAction("investidor", game, host.playerId, Math.random);
        room = await runRoomCommand(code, host.token, { kind: "game", action }, store);
      } else {
        room = (await readRoom(code, null, store, LATER()))!;
      }
      steps += 1;
    }
    expect(room.status).toBe("finished");
    expect(magnata(room).winnerId).not.toBeNull();
    expect(magnata(room).turnNumber).toBeLessThanOrEqual(120);
  });

  it("respeita a pausa entre jogadas e avisa o cliente pela versão", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    const code = host.room.code;
    await runRoomCommand(code, host.token, { kind: "add-bot", strategy: "investidor" }, store);
    let room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    // Joga a vez da pessoa até chegar a vez do robô.
    while (magnata(room).currentPlayerId === host.playerId) {
      const action = botAction("conservador", magnata(room), host.playerId, Math.random);
      room = await runRoomCommand(code, host.token, { kind: "game", action }, store);
    }
    // Ritmo normal: 2,5 s entre uma jogada do robô e a seguinte.
    expect(await readRoom(code, room.version, store, room.updatedAt + 2_400)).toBeNull();
    const moved = await readRoom(code, room.version, store, room.updatedAt + 2_500);
    expect(moved!.version).toBeGreaterThan(room.version);
    // E de novo: a próxima jogada também espera o ritmo.
    expect(await readRoom(code, moved!.version, store, moved!.updatedAt + 2_400)).toBeNull();
    expect(moved!.version).toBeGreaterThan(room.version);
  });
});

describe("correções da análise", () => {
  it("nenhuma resposta expõe a ordem das cartas, ids de comando ou tokens", async () => {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    const started = await runRoomCommand(code, host.token, { kind: "start", commandId: "comando-0001" }, store);
    const read = await readRoom(code, null, store);
    for (const response of [started, read, guest.room]) {
      const text = JSON.stringify(response);
      expect(text).not.toContain("decks");
      expect(text).not.toContain("recentCommands");
      expect(text).not.toContain("comando-0001");
      expect(text).not.toContain(host.token);
      expect(text).not.toContain(guest.token);
      expect(text).not.toContain("sorte-");
    }
  });

  it("comando reenviado com o mesmo id não repete o efeito", async () => {
    const store = createMemoryStore();
    const { host, code } = await roomWithTwo(store);
    const body = { kind: "chat", text: "oi", commandId: "abc-123-def" };
    const first = await runRoomCommand(code, host.token, body, store);
    const again = await runRoomCommand(code, host.token, body, store);
    expect(again.chat).toHaveLength(1);
    expect(again.version).toBe(first.version);
  });

  it("limita a frequência de mensagens por jogador", async () => {
    const store = createMemoryStore();
    const { host, code } = await roomWithTwo(store);
    for (let i = 0; i < 15; i += 1) await runRoomCommand(code, host.token, { kind: "chat", text: `m${i}` }, store);
    await expect(runRoomCommand(code, host.token, { kind: "chat", text: "demais" }, store)).rejects.toMatchObject({ status: 429 });
  });

  it("limita a criação de salas por IP", async () => {
    const store = createMemoryStore();
    for (let i = 0; i < 12; i += 1) await createRoomFor({ name: `P${i}`, ip: "1.2.3.4" }, store);
    await expect(createRoomFor({ name: "X", ip: "1.2.3.4" }, store)).rejects.toMatchObject({ status: 429 });
    await expect(createRoomFor({ name: "Y", ip: "5.6.7.8" }, store)).resolves.toBeTruthy();
  });

  it("qualquer pessoa da mesa pode pedir revanche", async () => {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    await runRoomCommand(code, host.token, { kind: "start" }, store);
    await runRoomCommand(code, host.token, { kind: "leave" }, store);
    const lobby = await runRoomCommand(code, guest.token, { kind: "rematch" }, store);
    expect(lobby.status).toBe("lobby");
  });

  it("guarda retrato válido e escolhe um quando vem inválido", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana", avatar: "🐼" }, store);
    const guest = await joinRoomAs(host.room.code, { name: "Bia", avatar: "<script>" }, store);
    expect(guest.room.players[0].avatar).toBe("🐼");
    expect(guest.room.players[1].avatar).not.toBe("<script>");
  });

  it("valida tema, prazo e empréstimos nas opções", async () => {
    const store = createMemoryStore();
    const host = await createRoomFor({ name: "Ana" }, store);
    const code = host.room.code;
    const set = (options: Record<string, unknown>) => runRoomCommand(code, host.token, { kind: "set-options", options }, store);
    await expect(set({ themeId: "naruto" })).rejects.toThrow("Tema");
    await expect(set({ turnTimeout: 5 })).rejects.toThrow("Prazo");
    await expect(set({ credit: "sim" })).rejects.toThrow("empréstimo");
    const room = await set({ themeId: "maceio", turnTimeout: null, credit: true, roundLimit: 60 });
    expect(room.options).toEqual({ themeId: "maceio", turnTimeout: null, credit: true, roundLimit: 60, botPace: "normal", auctions: true, dominoMode: "bloqueio", dominoTarget: 50, stake: 0, trucoMode: "paulista" });
    await expect(set({ botPace: "turbo" })).rejects.toThrow("Ritmo");
    expect((await set({ botPace: "slow" })).options.botPace).toBe("slow");
    await runRoomCommand(code, host.token, { kind: "add-bot", strategy: "investidor" }, store);
    const started = await runRoomCommand(code, host.token, { kind: "start" }, store);
    expect(started.game).toMatchObject({ themeId: "maceio", credit: true, roundLimit: 60 });
  });
});

describe("ausência e piloto automático", () => {
  async function humanTurn(timeout: number | null) {
    const store = createMemoryStore();
    const { host, guest, code } = await roomWithTwo(store);
    await runRoomCommand(code, host.token, { kind: "set-options", options: { turnTimeout: timeout } }, store);
    const room = await runRoomCommand(code, host.token, { kind: "start" }, store);
    const current = magnata(room).currentPlayerId === host.playerId ? host : guest;
    return { store, code, room, current };
  }

  it("depois do prazo, o piloto automático joga e a pessoa fica ausente", async () => {
    const { store, code, room, current } = await humanTurn(60);
    expect(await readRoom(code, room.version, store, room.updatedAt + 59_000)).toBeNull();
    const auto = (await readRoom(code, room.version, store, room.updatedAt + 60_000))!;
    expect(auto.away).toEqual([current.playerId]);
    expect(magnata(auto).events.some((e) => e.type === "away" && e.playerId === current.playerId)).toBe(true);
    expect(magnata(auto).dice).not.toBeNull();
  });

  it("qualquer jogada da pessoa devolve o controle", async () => {
    const { store, code, room, current } = await humanTurn(60);
    let auto = (await readRoom(code, room.version, store, room.updatedAt + 60_000))!;
    // O piloto continua até a vez dela acabar; depois ela age de novo na vez seguinte.
    let guard = 0;
    while (magnata(auto).currentPlayerId === current.playerId && guard++ < 20) {
      auto = (await readRoom(code, null, store, LATER()))!;
    }
    const resigned = await runRoomCommand(code, current.token, { kind: "game", action: { type: "resign" } }, store);
    expect(resigned.away).toEqual([]);
    expect(magnata(resigned).events.some((e) => e.type === "back")).toBe(true);
  });

  it("Voltar a jogar funciona mesmo fora da própria vez", async () => {
    const { store, code, room, current } = await humanTurn(60);
    await readRoom(code, room.version, store, room.updatedAt + 60_000);
    const back = await runRoomCommand(code, current.token, { kind: "back" }, store);
    expect(back.away).toEqual([]);
    expect(magnata(back).events.at(-1)).toMatchObject({ type: "back", playerId: current.playerId });
  });

  it("sem prazo, nunca joga por uma pessoa", async () => {
    const { store, code, room } = await humanTurn(null);
    expect(await readRoom(code, room.version, store, LATER())).toBeNull();
  });
});
