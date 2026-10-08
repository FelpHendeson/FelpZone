import type { NextRequest } from "next/server";
import { parseWhere } from "@/accounts/plaza";
import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";
import { plazaPost, plazaTick } from "@/server/social";

/** Presença + quem está online nos seus grupos + conversa de um grupo + avisos, numa consulta. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const where = parseWhere(params.get("onde"), params.get("jogo"), params.get("sala"));
    const plaza = await plazaTick(readCookie(request, SESSION_COOKIE), where, params.get("avisos") !== "0", params.get("grupo"));
    return json(plaza);
  });
}

/** Conversa no grupo, aceno ou convite. */
export async function POST(request: Request) {
  return handle(async () => {
    await plazaPost(readCookie(request, SESSION_COOKIE), asObject(await readJson(request)));
    return json({ ok: true });
  });
}
