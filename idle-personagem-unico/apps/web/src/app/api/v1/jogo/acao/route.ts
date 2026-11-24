import { acao } from "@/servidor/api";
import { responder } from "@/servidor/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return responder(req, acao);
}
