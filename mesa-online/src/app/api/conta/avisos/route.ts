import { SESSION_COOKIE } from "@/server/accounts";
import { asObject, handle, json, readCookie, readJson } from "@/server/http";
import { pushPublicKey, removeSubscription, saveSubscription } from "@/server/push";

/** Chave pública para inscrever o aparelho (ou `null` quando os avisos estão desligados no servidor). */
export async function GET() {
  return handle(async () => json({ publicKey: pushPublicKey() }));
}

/** Inscreve este aparelho para receber avisos. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    const devices = await saveSubscription(readCookie(request, SESSION_COOKIE), body.subscription);
    return json({ devices });
  });
}

/** Para de enviar avisos para este aparelho. */
export async function DELETE(request: Request) {
  return handle(async () => {
    const body = asObject(await readJson(request));
    await removeSubscription(readCookie(request, SESSION_COOKIE), body.endpoint);
    return json({ ok: true });
  });
}
