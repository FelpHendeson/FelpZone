import { RoomError } from "@/rooms/room";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
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
