import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";
import { createGroup, joinGroup, leaveGroup, listGroups, removeFromGroup } from "@/server/social";

/** Seus grupos privados, com os membros. */
export async function GET(request: Request) {
  return handle(async () => json({ groups: await listGroups(readCookie(request, SESSION_COOKIE)) }));
}

/** Criar, entrar por código, sair ou tirar alguém (quem cuida do grupo). */
export async function POST(request: Request) {
  return handle(async () => {
    const token = readCookie(request, SESSION_COOKIE);
    const body = asObject(await readJson(request));
    switch (body.kind) {
      case "create":
        await createGroup(token, body.name);
        break;
      case "join":
        await joinGroup(token, body.code);
        break;
      case "leave":
        await leaveGroup(token, body.groupId);
        break;
      case "remove":
        await removeFromGroup(token, body.groupId, body.memberId);
        break;
      default:
        return json({ error: "Ação inválida." }, 400);
    }
    return json({ groups: await listGroups(token) });
  });
}
