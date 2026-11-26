import { armazemDoAmbiente, type Armazem } from "./armazem";
import { LIMITES, type Pedido, type Resposta } from "./api";

/** Liga uma regra da API a uma rota do Next: lê corpo (com limite), token e IP. */
export async function responder(req: Request, regra: (a: Armazem | null, p: Pedido) => Promise<Resposta> | Resposta): Promise<Response> {
  const json = (corpo: unknown, status: number) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
  let corpo: unknown = null;
  if (req.method === "POST") {
    const grande = () => json({ erro: { codigo: "grande_demais", mensagem: "Pedido grande demais." } }, 413);
    if (Number(req.headers.get("content-length")) > LIMITES.corpoBytes) return grande();
    const leitor = req.body?.getReader();
    const partes: Uint8Array[] = [];
    let tamanho = 0;
    try {
      if (leitor) {
        while (true) {
          const { value, done } = await leitor.read();
          if (done) break;
          tamanho += value.byteLength;
          if (tamanho > LIMITES.corpoBytes) {
            await leitor.cancel();
            return grande();
          }
          partes.push(value);
        }
      }
    } catch {
      return json({ erro: { codigo: "corpo_invalido", mensagem: "Não foi possível ler o pedido." } }, 400);
    } finally {
      leitor?.releaseLock();
    }
    const texto = Buffer.concat(partes).toString("utf8");
    if (texto) {
      try {
        corpo = JSON.parse(texto);
      } catch {
        return json({ erro: { codigo: "json_invalido", mensagem: "JSON inválido." } }, 400);
      }
    }
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "desconhecido";
  try {
    const r = await regra(armazemDoAmbiente(), { corpo, token, ip, agora: Date.now() });
    return json(r.corpo, r.status);
  } catch {
    return json({ erro: { codigo: "erro_interno", mensagem: "Erro no servidor. Tente de novo." } }, 500);
  }
}
