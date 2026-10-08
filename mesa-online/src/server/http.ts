import { RoomError } from "@/rooms/room";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Valor de um cookie da requisição. */
export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Cookie da sessão: só o servidor lê (httpOnly), e só por HTTPS em produção. */
export function sessionCookie(name: string, token: string | null, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return token
    ? `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
    : `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Converte erros conhecidos em respostas JSON e esconde os inesperados. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof RoomError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Erro inesperado no servidor." }, 500);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new RoomError("Corpo da requisição inválido.");
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** IP de quem chamou, para limitar frequência. A Vercel preenche `x-forwarded-for`. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip");
}
