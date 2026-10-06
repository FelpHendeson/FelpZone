import { handle, json, readJson } from "@/server/http";
import { runRoomCommand } from "@/server/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/commands">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const room = await runRoomCommand(code, request.headers.get("x-player-token"), await readJson(request));
    return json({ room });
  });
}
