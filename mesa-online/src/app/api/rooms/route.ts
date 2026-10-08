import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, clientIp, handle, json, readCookie, readJson } from "@/server/http";
import { createRoomFor } from "@/server/rooms";

export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const { room, playerId, token } = await createRoomFor({
      name: body.name,
      gameId: body.gameId,
      avatar: body.avatar,
      options: body.options,
      ip: clientIp(request),
      session: readCookie(request, SESSION_COOKIE),
    });
    return json({ room, playerId, token }, 201);
  });
}
