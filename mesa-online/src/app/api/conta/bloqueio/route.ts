import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";
import { setBlocked } from "@/server/social";

/** Bloquear ou desbloquear alguém. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const blocked = await setBlocked(readCookie(request, SESSION_COOKIE), body.userId, body.blocked !== false);
    return json({ blocked });
  });
}
