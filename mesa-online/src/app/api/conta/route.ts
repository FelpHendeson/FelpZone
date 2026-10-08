import { SESSION_COOKIE, SESSION_TTL_SECONDS, currentMe, signUp } from "@/server/accounts";
import { asObject, clientIp, handle, json, readCookie, readJson, sessionCookie } from "@/server/http";

/** A própria conta (ou `null` para quem não entrou). */
export async function GET(request: Request) {
  return handle(async () => json({ me: await currentMe(readCookie(request, SESSION_COOKIE)) }));
}

/** Cadastro: e-mail, apelido e senha. Já entra na conta. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const { me, token } = await signUp({
      email: body.email,
      nickname: body.nickname,
      password: body.password,
      avatar: body.avatar,
      ip: clientIp(request),
    });
    return json({ me }, 201, { "Set-Cookie": sessionCookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS) });
  });
}
