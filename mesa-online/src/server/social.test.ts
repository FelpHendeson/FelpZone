import { describe, expect, it } from "vitest";
import { signUp, type Deps } from "./accounts";
import { createMemoryKv } from "./kv";
import { createRoomFor } from "./rooms";
import { createGroup, joinGroup, leaveGroup, listGroups, plazaPost, plazaTick, removeFromGroup, setBlocked } from "./social";
import { createMemoryStore } from "./store";

const deps = (): Deps => ({ kv: createMemoryKv(), store: createMemoryStore() });

let counter = 0;
async function person(d: Deps, nickname: string) {
  counter += 1;
  return signUp({ email: `${nickname.toLowerCase()}${counter}@exemplo.com`, nickname, password: "senha-boa-123", ip: `ip-${counter}` }, d);
}

describe("grupos privados", () => {
  it("cria, entra pelo código, sai e passa o grupo adiante", async () => {
    const d = deps();
    const ana = await person(d, "Ana");
    const bia = await person(d, "Bia");
    await expect(createGroup(ana.token, "x", d)).rejects.toThrow("de 3 a 30");
    const familia = await createGroup(ana.token, "  Família   Silva ", d, 1);
    expect(familia).toMatchObject({ name: "Família Silva", ownerId: ana.me.id });
    expect(familia.code).toMatch(/^[A-Z2-9]{6}$/);

    await expect(joinGroup(bia.token, "ZZZZZZ", d)).rejects.toThrow("Nenhum grupo");
    await expect(joinGroup(bia.token, "abc", d)).rejects.toThrow("Código de grupo inválido");
    const joined = await joinGroup(bia.token, familia.code.toLowerCase(), d, 2);
    expect(joined.members.map((member) => member.nickname)).toEqual(["Ana", "Bia"]);
    // Entrar de novo não duplica.
    expect((await joinGroup(bia.token, familia.code, d, 3)).members).toHaveLength(2);

    await expect(removeFromGroup(bia.token, familia.id, ana.me.id, d)).rejects.toThrow("Só quem cuida");
    await leaveGroup(ana.token, familia.id, d);
    const [left] = await listGroups(bia.token, d);
    expect(left).toMatchObject({ ownerId: bia.me.id });
    expect(await listGroups(ana.token, d)).toEqual([]);
    await leaveGroup(bia.token, familia.id, d);
    await expect(joinGroup(ana.token, familia.code, d)).rejects.toThrow("Nenhum grupo");
  });

  it("só mostra online, conversa e aceita aceno e convite entre quem divide um grupo", async () => {
    const d = deps();
    const ana = await person(d, "Fabi");
    const bia = await person(d, "Gabi");
    const estranho = await person(d, "Estranho");
    const now = Date.now();
    const grupo = await createGroup(ana.token, "Família", d);
    await joinGroup(bia.token, grupo.code, d);

    await plazaTick(ana.token, { status: "menu" }, true, null, d, now);
    await plazaTick(estranho.token, { status: "menu" }, true, null, d, now);
    const seen = await plazaTick(bia.token, { status: "playing", gameId: "domino", code: "ABCDE" }, true, null, d, now);
    expect(seen.online.map((entry) => entry.nickname).sort()).toEqual(["Fabi", "Gabi"]);
    // O código da sala não sai do servidor.
    expect(seen.online.find((entry) => entry.nickname === "Gabi")!.where).toEqual({ status: "playing", gameId: "domino" });
    expect(seen.chatGroupId).toBe(grupo.id);
    expect((await plazaTick(estranho.token, null, true, null, d, now)).online).toEqual([]);

    await plazaPost(ana.token, { kind: "chat", groupId: grupo.id, text: "  Bora jogar?  " }, d);
    await expect(plazaPost(estranho.token, { kind: "chat", groupId: grupo.id, text: "oi" }, d)).rejects.toThrow("grupo seu");
    await expect(plazaPost(estranho.token, { kind: "wave", to: ana.me.id }, d)).rejects.toThrow("mesmo grupo");
    await plazaPost(ana.token, { kind: "wave", to: bia.me.id }, d);

    const host = await createRoomFor({ name: "x", gameId: "domino", session: ana.token }, d.store, d.kv);
    await plazaPost(ana.token, { kind: "invite", to: bia.me.id, code: host.room.code }, d);
    await expect(plazaPost(bia.token, { kind: "invite", to: ana.me.id, code: host.room.code }, d)).rejects.toThrow("em que está");

    const tick = await plazaTick(bia.token, null, true, grupo.id, d, now + 1000);
    expect(tick.chat[0]).toMatchObject({ nickname: "Fabi", text: "Bora jogar?", groupId: grupo.id });
    expect(tick.inbox.map((notice) => notice.kind).sort()).toEqual(["invite", "wave"]);
    expect((await plazaTick(bia.token, null, true, grupo.id, d, now + 2000)).inbox).toEqual([]);

    const later = await plazaTick(ana.token, null, false, null, d, now + 63_000);
    expect(later.online.map((entry) => entry.nickname)).toEqual(["Fabi"]);
  });

  it("quem bloqueia some da lista, da conversa e dos avisos", async () => {
    const d = deps();
    const ana = await person(d, "Lia");
    const bia = await person(d, "Rui");
    const grupo = await createGroup(ana.token, "Amigos", d);
    await joinGroup(bia.token, grupo.code, d);
    await plazaPost(bia.token, { kind: "chat", groupId: grupo.id, text: "chato" }, d);
    expect(await setBlocked(ana.token, bia.me.id, true, d)).toEqual([bia.me.id]);
    await expect(setBlocked(ana.token, ana.me.id, true, d)).rejects.toThrow("outra pessoa");

    const now = Date.now();
    await plazaTick(bia.token, { status: "menu" }, true, null, d, now);
    // O aceno de quem foi bloqueado é aceito (sem contar a ele), mas não chega.
    await plazaPost(bia.token, { kind: "wave", to: ana.me.id }, d);
    const tick = await plazaTick(ana.token, { status: "menu" }, true, grupo.id, d, now);
    expect(tick.online.map((entry) => entry.nickname)).toEqual(["Lia"]);
    expect(tick.chat).toEqual([]);
    expect(tick.inbox).toEqual([]);
    await expect(plazaPost(ana.token, { kind: "wave", to: bia.me.id }, d)).rejects.toThrow("mesmo grupo");

    expect(await setBlocked(ana.token, bia.me.id, false, d)).toEqual([]);
    expect((await plazaTick(ana.token, null, true, grupo.id, d, now)).chat).toHaveLength(1);
  });
});
