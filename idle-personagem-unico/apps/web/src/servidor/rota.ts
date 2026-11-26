import { armazemDoAmbiente, type Armazem } from "./armazem";
import { LIMITES, type Pedido, type Resposta } from "./api";

/** Liga uma regra da API a uma rota do Next: lê corpo (com limite), token e IP. */
export async function responder(req: Request, regra: (a: Armazem | null, p: Pedido) => Promise<Resposta> | Resposta, banco?: Armazem | null): Promise<Response> {
  const json = (corpo: unknown, status: number) => Response.json(corpo, { status, headers: { "cache-control": "no-store" } });
  // O Next pode montar req.url com o hostname interno do servidor. A autoridade
  // HTTP vem de Host (o navegador não permite que JS o substitua), sem confiar
  // em x-forwarded-host. O protocolo encaminhado cobre a terminação TLS na Vercel.
  const url = new URL(req.url);
  const host = req.headers.get("host");
  if (host) { url.port = ""; url.host = host; }
  const protocolo = req.headers.get("x-forwarded-proto");
  if (protocolo === "https" || protocolo === "http") url.protocol = `${protocolo}:`;
  const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  const nomeCookie = local ? "idle-pu-local" : "__Host-idle-pu";
  const cookie = (req.headers.get("cookie") ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${nomeCookie}=`))?.slice(nomeCookie.length + 1) ?? null;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const web = req.headers.get("x-idle-web") === "1";
  // Protege também login/cadastro contra login CSRF. Clientes bearer nativos não usam cookies.
  if (req.method === "POST" && (web || (cookie && !bearer)) && (!web || req.headers.get("origin") !== url.origin)) return json({ erro: { codigo: "origem_invalida", mensagem: "Pedido de outra origem recusado." } }, 403);
  if (req.method === "POST" && req.body && req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return json({ erro: { codigo: "tipo_invalido", mensagem: "Envie JSON." } }, 415);
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
  const token = bearer ?? cookie;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "desconhecido";
  try {
    const contaEsperada = req.headers.get("x-idle-conta");
    if (web && cookie && !url.pathname.includes("/auth/") && req.method === "POST" && !contaEsperada) return json({ erro: { codigo: "conta_ausente", mensagem: "Sincronize a identidade da conta antes de agir." } }, 409);
    const r = await regra(banco === undefined ? armazemDoAmbiente() : banco, { corpo, token, ip, agora: Date.now(), ...(contaEsperada ? { contaEsperada } : {}) });
    const respostaCorpo = { ...r.corpo };
    if (web) delete respostaCorpo.token;
    const resposta = json(respostaCorpo, r.status);
    if (web && (r.tokenSessao || r.encerrarSessao)) {
      const valor = r.encerrarSessao ? "" : r.tokenSessao;
      resposta.headers.set("set-cookie", `${nomeCookie}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${r.encerrarSessao ? 0 : LIMITES.sessaoSegundos}${local ? "" : "; Secure"}`);
    }
    return resposta;
  } catch {
    return json({ erro: { codigo: "erro_interno", mensagem: "Erro no servidor. Tente de novo." } }, 500);
  }
}
