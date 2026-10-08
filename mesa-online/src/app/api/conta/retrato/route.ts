import { SESSION_COOKIE, changeAvatar } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    return json({ me: await changeAvatar(readCookie(request, SESSION_COOKIE), body.avatar) });
  });
}
