import { armazemDoAmbiente, type Armazem } from "./armazem";
import { LIMITES, type Pedido, type Resposta } from "./api";

/** Liga uma regra da API a uma rota do Next: lê corpo (com limite), token e IP. */
export async function responder(req: Request, regra: (a: Armazem | null, p: Pedido) => Promise<Resposta> | Resposta): Promise<Response> {
  let corpo: unknown = null;
  if (req.method === "POST") {
    const texto = await req.text();
    if (texto.length > LIMITES.corpoBytes) return Response.json({ erro: { codigo: "grande_demais", mensagem: "Pedido grande demais." } }, { status: 413 });
    if (texto) {
      try {
        corpo = JSON.parse(texto);
      } catch {
        return Response.json({ erro: { codigo: "json_invalido", mensagem: "JSON inválido." } }, { status: 400 });
      }
    }
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "desconhecido";
  try {
    const r = await regra(armazemDoAmbiente(), { corpo, token, ip, agora: Date.now() });
    return Response.json(r.corpo, { status: r.status, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ erro: { codigo: "erro_interno", mensagem: "Erro no servidor. Tente de novo." } }, { status: 500 });
  }
}
