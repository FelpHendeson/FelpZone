import { listarBuilds } from "@/servidor/api";
import { responder } from "@/servidor/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return responder(req, listarBuilds);
}
