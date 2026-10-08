import type { NextRequest } from "next/server";
import { SESSION_COOKIE, parseWhere, plazaPost, plazaTick } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";

/** Presença + quem está online + praça + avisos, numa consulta só. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const where = parseWhere(params.get("onde"), params.get("jogo"));
    const plaza = await plazaTick(readCookie(request, SESSION_COOKIE), where, params.get("avisos") !== "0");
    return json(plaza);
  });
}

/** Conversa na praça, aceno ou convite. */
export async function POST(request: Request) {
  return handle(async () => {
    await plazaPost(readCookie(request, SESSION_COOKIE), asObject(await readJson(request)));
    return json({ ok: true });
  });
}
