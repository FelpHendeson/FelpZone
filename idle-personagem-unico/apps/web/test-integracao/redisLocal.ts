/** Redis real isolado + adaptador HTTP com o formato REST usado pela Upstash. Sem mocks de EVAL. */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { createConnection, createServer as servidorTcp } from "node:net";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";

async function portaLivre() {
  const s = servidorTcp();
  await new Promise<void>((ok, falhou) => { s.once("error", falhou); s.listen(0, "127.0.0.1", ok); });
  const p = s.address();
  if (!p || typeof p === "string") throw new Error("Porta indisponível.");
  await new Promise<void>((ok) => s.close(() => ok()));
  return p.port;
}
export function comandoRedis(porta: number, args: readonly (string | number)[]): Promise<unknown> {
  return new Promise((ok, falhou) => {
    const socket = createConnection({ host: "127.0.0.1", port: porta });
    let dados = Buffer.alloc(0);
    const falha = (e: Error) => { socket.destroy(); falhou(e); };
    socket.setTimeout(5000, () => falha(new Error("Redis local não respondeu.")));
    socket.once("error", falha);
    socket.once("connect", () => {
      const partes = [Buffer.from(`*${args.length}\r\n`)];
      for (const arg of args) { const b = Buffer.from(String(arg)); partes.push(Buffer.from(`$${b.length}\r\n`), b, Buffer.from("\r\n")); }
      socket.write(Buffer.concat(partes));
    });
    socket.on("data", (b: Buffer) => {
      dados = Buffer.concat([dados, b]);
      const fim = dados.indexOf("\r\n");
      if (fim < 0) return;
      const tipo = dados.toString("utf8", 0, 1);
      const texto = dados.toString("utf8", 1, fim);
      if (tipo === "-") return falha(new Error(texto));
      if (tipo === "+" || tipo === ":") { socket.destroy(); ok(tipo === ":" ? Number(texto) : texto); }
      else if (tipo === "$") {
        const tamanho = Number(texto);
        if (tamanho === -1) { socket.destroy(); ok(null); }
        else if (dados.length >= fim + 2 + tamanho + 2) { socket.destroy(); ok(dados.toString("utf8", fim + 2, fim + 2 + tamanho)); }
      }
    });
    socket.once("end", () => { socket.destroy(); if (String(args[0]).toUpperCase() === "SHUTDOWN") ok(null); else falhou(new Error("Redis fechou a conexão.")); });
  });
}

export async function abrirRedisLocal() {
  const diretorio = await mkdtemp(join(tmpdir(), "idle-pu-integracao-"));
  const porta = await portaLivre();
  const config = join(diretorio, "redis.conf");
  await writeFile(config, `bind 127.0.0.1\nport ${porta}\nsave ""\nappendonly yes\nappendfsync always\ndir "${diretorio.replaceAll("\\", "/")}"\nloglevel warning\n`);
  const padraoWin = "C:/Program Files/Redis/redis-server.exe";
  const binario = process.env.REDIS_SERVER_BIN ?? (process.platform === "win32" && existsSync(padraoWin) ? padraoWin : "redis-server");
  let processo: ChildProcess;
  let ponte: Server | null = null;
  const iniciar = async () => {
    processo = spawn(binario, [config], { windowsHide: true, stdio: "ignore" });
    let erro: Error | null = null;
    processo.once("error", (e) => { erro = e; });
    for (let i = 0; i < 60; i++) {
      if (erro) throw erro;
      try { if (await comandoRedis(porta, ["PING"]) === "PONG") return; } catch { /* Aguarda readiness. */ }
      await esperar(100);
    }
    throw new Error("Não foi possível iniciar o Redis isolado. Configure REDIS_SERVER_BIN.");
  };
  const parar = async () => {
    if (!processo || processo.exitCode !== null) return;
    const encerrou = new Promise<void>((ok) => processo.once("exit", () => ok()));
    try { await comandoRedis(porta, ["SHUTDOWN"]); } catch { processo.kill(); }
    await encerrou;
  };
  const fechar = async () => {
    if (ponte) await new Promise<void>((ok) => ponte!.close(() => ok()));
    await parar();
    const raiz = resolve(tmpdir()) + sep;
    const alvo = resolve(diretorio);
    if (!alvo.startsWith(raiz + "idle-pu-integracao-")) throw new Error("Diretório temporário fora do escopo.");
    await rm(alvo, { recursive: true, force: true });
  };
  try {
    await iniciar();
    ponte = createServer(async (req, res) => {
      try {
        if (req.headers.authorization !== "Bearer integracao-local") { res.writeHead(401); res.end(); return; }
        const partes: Buffer[] = [];
        for await (const parte of req) partes.push(Buffer.from(parte));
        const args = JSON.parse(Buffer.concat(partes).toString("utf8")) as (string | number)[];
        const result = await comandoRedis(porta, args);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ result }));
      } catch (e) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Falha local" })); }
    });
    await new Promise<void>((ok) => ponte!.listen(0, "127.0.0.1", ok));
    const endereco = ponte.address();
    if (!endereco || typeof endereco === "string") throw new Error("Ponte REST indisponível.");
    return { url: `http://127.0.0.1:${endereco.port}`, token: "integracao-local", reiniciar: async () => { await parar(); await iniciar(); }, fechar };
  } catch (e) { await fechar(); throw e; }
}
