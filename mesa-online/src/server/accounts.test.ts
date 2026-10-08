import { describe, expect, it } from "vitest";
import { dominoBotAction } from "@/games/domino/bots";
import type { DominoState, DominoView } from "@/games/domino/engine";
import { GAME_MODULES } from "@/games/modules";
import {
  changeAvatar,
  claimDailyBonus,
  currentMe,
  logIn,
  publicProfile,
  signUp,
  type Deps,
} from "./accounts";
import { createMemoryKv } from "./kv";
import { createRoomFor, joinRoomAs, readRoom, runRoomCommand } from "./rooms";
import { createMemoryStore } from "./store";

const deps = (): Deps => ({ kv: createMemoryKv(), store: createMemoryStore() });

let counter = 0;
async function person(d: Deps, nickname: string) {
  counter += 1;
  const { token, me } = await signUp({ email: `${nickname.toLowerCase()}${counter}@exemplo.com`, nickname, password: "senha-boa-123", ip: `ip-${counter}` }, d);
  return { token, me };
}

/** Relógio que sempre avança: libera a jogada dos robôs a cada consulta. */
let clock = Date.now();

/** Joga a partida de dominó até o fim, com a jogada do robô Médio para cada pessoa. */
async function playOut(d: Deps, code: string, tokens: Record<string, string>) {
  for (let guard = 0; guard < 500; guard += 1) {
    const stored = (await d.store.read(code))!;
    if (stored.room.status === "finished") return stored.room;
    const state = stored.room.game as DominoState;
    const [actor] = GAME_MODULES.domino.actorsNeeded(state);
    if (!tokens[actor]) {
      await readRoom(code, null, d.store, (clock += 3600_000), null, d.kv);
      continue;
    }
    const action = dominoBotAction("medio", state, actor, Math.random);
    await runRoomCommand(code, tokens[actor], { kind: "game", action }, d.store, d.kv);
  }
  throw new Error("partida não terminou");
}

describe("contas: cadastro e login", () => {
  it("valida e-mail, senha e apelido", async () => {
    const d = deps();
    await expect(signUp({ email: "sem-arroba", nickname: "Ana", password: "12345678" }, d)).rejects.toThrow("E-mail inválido");
    await expect(signUp({ email: "a@b", nickname: "Ana", password: "12345678" }, d)).rejects.toThrow("E-mail inválido");
    await expect(signUp({ email: "ana@ex.com", nickname: "Ana", password: "curta" }, d)).rejects.toThrow("8 caracteres");
    await expect(signUp({ email: "ana@ex.com", nickname: "A", password: "12345678" }, d)).rejects.toThrow("de 3 a 16");
    await expect(signUp({ email: "ana@ex.com", nickname: "1ana", password: "12345678" }, d)).rejects.toThrow("começando por uma letra");
    await expect(signUp({ email: "ana@ex.com", nickname: "Robozinho", password: "12345678" }, d)).rejects.toThrow("reservado");
    const { me } = await signUp({ email: "  Ana.Silva@Exemplo.com ", nickname: "Júlia_2", password: "12345678" }, d);
    expect(me).toMatchObject({ email: "ana.silva@exemplo.com", nickname: "Júlia_2", chips: 100 });
    expect(me).not.toHaveProperty("passwordHash");
  });

  it("e-mail e apelido são únicos, sem diferenciar maiúsculas nem acentos", async () => {
    const d = deps();
    await signUp({ email: "jose@ex.com", nickname: "José", password: "12345678" }, d);
    await expect(signUp({ email: "JOSE@ex.com", nickname: "Outro", password: "12345678" }, d)).rejects.toThrow("já tem uma conta");
    await expect(signUp({ email: "outro@ex.com", nickname: "jose", password: "12345678" }, d)).rejects.toThrow("já está em uso");
    // O e-mail do cadastro recusado pelo apelido fica livre de novo.
    await expect(signUp({ email: "outro@ex.com", nickname: "Outra", password: "12345678" }, d)).resolves.toBeTruthy();
  });

  it("entra com a senha certa e recusa a errada com a mesma mensagem", async () => {
    const d = deps();
    await signUp({ email: "bia@ex.com", nickname: "Bia", password: "senha-da-bia" }, d);
    await expect(logIn({ email: "bia@ex.com", password: "errada!!" }, d)).rejects.toThrow("E-mail ou senha incorretos");
    await expect(logIn({ email: "ninguem@ex.com", password: "qualquer1" }, d)).rejects.toThrow("E-mail ou senha incorretos");
    const { token, me } = await logIn({ email: "BIA@ex.com", password: "senha-da-bia" }, d);
    expect(me.nickname).toBe("Bia");
    expect((await currentMe(token, d))?.nickname).toBe("Bia");
    expect(await currentMe("token-falso", d)).toBeNull();
  });

  it("bônus diário uma vez por dia e troca de retrato", async () => {
    const d = deps();
    const { token } = await person(d, "Caio");
    const day = Date.UTC(2026, 9, 7, 15);
    expect((await claimDailyBonus(token, d, day)).chips).toBe(200);
    await expect(claimDailyBonus(token, d, day + 60_000)).rejects.toThrow("já coletou hoje");
    // Pular dias não faz perder coletas; depois da 7ª, acabou.
    let me = await claimDailyBonus(token, d, day + 3 * 24 * 3600_000);
    expect(me).toMatchObject({ chips: 300, bonusLeft: 5 });
    for (let extra = 4; extra <= 8; extra += 1) me = await claimDailyBonus(token, d, day + extra * 24 * 3600_000);
    expect(me).toMatchObject({ chips: 800, bonusLeft: 0, bonusAvailable: false });
    await expect(claimDailyBonus(token, d, day + 20 * 24 * 3600_000)).rejects.toThrow("7 coletas");
    expect((await changeAvatar(token, "🐼", d)).avatar).toBe("🐼");
    await expect(changeAvatar(token, "💩", d)).rejects.toThrow("Retrato inválido");
  });
});

describe("apostas e resultados", () => {
  async function stakeRoom(d: Deps, stake: number) {
    const ana = await person(d, "Ana");
    const bia = await person(d, "Bia");
    const host = await createRoomFor(
      { name: "x", gameId: "domino", session: ana.token, options: { dominoMode: "bloqueio", dominoTarget: null, stake } },
      d.store,
      d.kv,
    );
    const guest = await joinRoomAs(host.room.code, { name: "y", session: bia.token }, d.store, d.kv);
    return { ana, bia, host, guest, code: host.room.code };
  }

  it("cobra a entrada, paga o pote a quem vence uma vez só e conta vitórias e selos", async () => {
    const d = deps();
    const { ana, bia, host, guest, code } = await stakeRoom(d, 50);
    expect(host.room.players[0]).toMatchObject({ name: "Ana", userId: ana.me.id });
    const started = await runRoomCommand(code, host.token, { kind: "start" }, d.store, d.kv);
    expect(started.match?.stake).toBe(50);
    expect((await currentMe(ana.token, d))).toMatchObject({ chips: 50, inPlay: 50 });

    const room = await playOut(d, code, { [host.playerId]: host.token, [guest.playerId]: guest.token });
    const result = room.results.at(-1)!;
    expect(result.pot).toBe(100);
    const meAna = (await currentMe(ana.token, d))!;
    const meBia = (await currentMe(bia.token, d))!;
    expect(meAna.inPlay + meBia.inPlay).toBe(0);
    if (result.winners.length === 1) {
      const [winner, loser] = result.winners[0] === host.playerId ? [meAna, meBia] : [meBia, meAna];
      expect(winner.chips).toBe(150);
      expect(loser.chips).toBe(50);
      expect(winner.stats).toMatchObject({ played: 1, wins: 1, streak: 1, chipsWon: 50 });
      expect(loser.stats).toMatchObject({ played: 1, wins: 0, chipsWon: -50 });
      expect(winner.badges.map((badge) => badge.id)).toEqual(expect.arrayContaining(["primeira-vitoria", "bom-de-pedra", "apostador"]));
    } else {
      expect(meAna.chips + meBia.chips).toBe(200);
    }
    // Ler de novo não paga de novo.
    expect((await currentMe(ana.token, d))!.chips).toBe(meAna.chips);
    expect((await publicProfile("ana", d)).stats.played).toBe(1);
  });

  it("devolve a entrada quando a sala some", async () => {
    const d = deps();
    const { ana, host, code } = await stakeRoom(d, 25);
    await runRoomCommand(code, host.token, { kind: "start" }, d.store, d.kv);
    expect((await currentMe(ana.token, d))!.chips).toBe(75);
    // Outra "instância" do armazenamento de salas, sem a sala: como se tivesse expirado.
    const me = await currentMe(ana.token, { kv: d.kv, store: createMemoryStore() });
    expect(me).toMatchObject({ chips: 100, inPlay: 0 });
  });

  it("ninguém é cobrado se faltar ficha para alguém", async () => {
    const d = deps();
    const first = await stakeRoom(d, 100);
    await runRoomCommand(first.code, first.host.token, { kind: "start" }, d.store, d.kv);
    // Ana está com as 100 Funcoins em jogo; uma nova mesa valendo Funcoins não começa.
    const host = await createRoomFor({ name: "x", gameId: "domino", session: first.ana.token, options: { stake: 50 } }, d.store, d.kv);
    const carla = await person(d, "Carla");
    await joinRoomAs(host.room.code, { name: "z", session: carla.token }, d.store, d.kv);
    await expect(runRoomCommand(host.room.code, host.token, { kind: "start" }, d.store, d.kv)).rejects.toThrow("não tem Funcoins suficientes");
    expect((await currentMe(carla.token, d))!.chips).toBe(100);
  });

  it("com aposta, convidado sem conta não entra e não dá para ligar a aposta com convidado", async () => {
    const d = deps();
    const { code } = await stakeRoom(d, 50);
    await expect(joinRoomAs(code, { name: "Visita" }, d.store, d.kv)).rejects.toThrow("entre com a sua conta");

    const ana = await person(d, "Duda");
    const host = await createRoomFor({ name: "x", gameId: "domino", session: ana.token }, d.store, d.kv);
    await joinRoomAs(host.room.code, { name: "Visita" }, d.store, d.kv);
    await expect(
      runRoomCommand(host.room.code, host.token, { kind: "set-options", options: { stake: 100 } }, d.store, d.kv),
    ).rejects.toThrow("convidados sem conta");
  });

  it("robôs apostam com fichas da casa", async () => {
    const d = deps();
    const ana = await person(d, "Eva");
    const host = await createRoomFor(
      { name: "x", gameId: "domino", session: ana.token, options: { dominoMode: "pontos", stake: 50 } },
      d.store,
      d.kv,
    );
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "dificil" }, d.store, d.kv);
    await runRoomCommand(host.room.code, host.token, { kind: "start" }, d.store, d.kv);
    expect((await currentMe(ana.token, d))!.chips).toBe(50);
    const room = await playOut(d, host.room.code, { [host.playerId]: host.token });
    const meEva = (await currentMe(ana.token, d))!;
    expect(room.results.at(-1)!.pot).toBe(100);
    const winners = room.results.at(-1)!.winners;
    // Venceu sozinha: leva o pote (100); perdeu: a parte do robô fica com a casa; empate: metade.
    const expected = winners.includes(host.playerId) ? (winners.length === 1 ? 150 : 100) : 50;
    expect(meEva.chips).toBe(expected);
  });
});

describe("dominó na sala", () => {
  it("cada pessoa vê só a própria mão", async () => {
    const d = deps();
    const host = await createRoomFor({ name: "Ana", gameId: "domino", options: { dominoMode: "compra" } }, d.store, d.kv);
    const guest = await joinRoomAs(host.room.code, { name: "Bia" }, d.store, d.kv);
    await runRoomCommand(host.room.code, host.token, { kind: "start" }, d.store, d.kv);
    const view = (await readRoom(host.room.code, null, d.store, Date.now(), guest.token, d.kv))!.game as DominoView;
    expect(view.players.find((player) => player.id === guest.playerId)!.hand).toHaveLength(7);
    expect(view.players.find((player) => player.id === host.playerId)!.hand).toBeNull();
    expect(view.boneyardCount).toBe(14);
    const anonymous = (await readRoom(host.room.code, null, d.store, Date.now(), null, d.kv))!.game as DominoView;
    expect(anonymous.players.every((player) => player.hand === null)).toBe(true);
  });

  it("duplas só começam com 4 e trocar a modalidade ajusta a meta", async () => {
    const d = deps();
    const host = await createRoomFor({ name: "Ana", gameId: "domino" }, d.store, d.kv);
    const set = (options: Record<string, unknown>) => runRoomCommand(host.room.code, host.token, { kind: "set-options", options }, d.store, d.kv);
    expect((await set({ dominoMode: "duplas" })).options).toMatchObject({ dominoMode: "duplas", dominoTarget: 6 });
    await expect(set({ dominoTarget: 50 })).rejects.toThrow("Meta");
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "medio" }, d.store, d.kv);
    await expect(runRoomCommand(host.room.code, host.token, { kind: "start" }, d.store, d.kv)).rejects.toThrow("exatamente 4");
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "facil" }, d.store, d.kv);
    await runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "dificil" }, d.store, d.kv);
    await expect(runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "dificil" }, d.store, d.kv)).rejects.toThrow("cheia");
    await expect(runRoomCommand(host.room.code, host.token, { kind: "add-bot", strategy: "investidor" }, d.store, d.kv)).rejects.toThrow("desconhecido");
    const started = await runRoomCommand(host.room.code, host.token, { kind: "start" }, d.store, d.kv);
    expect((started.game as DominoView).teamScores).toEqual([0, 0]);
  });
});
