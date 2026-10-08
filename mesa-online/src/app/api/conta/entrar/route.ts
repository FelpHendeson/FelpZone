import { SESSION_COOKIE, SESSION_TTL_SECONDS, logIn } from "@/server/accounts";
import { asObject, clientIp, handle, json, readJson, sessionCookie } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const { me, token } = await logIn({ email: body.email, password: body.password, ip: clientIp(request) });
    return json({ me }, 200, { "Set-Cookie": sessionCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS) });
  });
}
