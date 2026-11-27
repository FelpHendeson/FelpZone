import { obterPerfil, salvarPerfil } from "@/servidor/autenticacao";
import { responder } from "@/servidor/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(req: Request) { return responder(req, obterPerfil); }
export function POST(req: Request) { return responder(req, salvarPerfil); }
