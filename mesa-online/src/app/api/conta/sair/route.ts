import { SESSION_COOKIE, logOut } from "@/server/accounts";
import { handle, json, readCookie, sessionCookie } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    await logOut(readCookie(request, SESSION_COOKIE));
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(SESSION_COOKIE, null, 0) });
  });
}
