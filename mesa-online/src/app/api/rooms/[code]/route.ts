import type { NextRequest } from "next/server";
import { handle, json } from "@/server/http";
import { readRoom } from "@/server/rooms";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/rooms/[code]">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const known = Number(request.nextUrl.searchParams.get("v"));
    const room = await readRoom(code, Number.isInteger(known) && known > 0 ? known : null);
    return json(room ? { room } : { unchanged: true });
  });
}
