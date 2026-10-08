import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, clientIp, handle, json, readCookie, readJson } from "@/server/http";
import { joinRoomAs } from "@/server/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const body = asObject(await readJson(request));
    const { room, playerId, token } = await joinRoomAs(code, {
      name: body.name,
      avatar: body.avatar,
      ip: clientIp(request),
      session: readCookie(request, SESSION_COOKIE),
    });
    return json({ room, playerId, token }, 201);
  });
}
