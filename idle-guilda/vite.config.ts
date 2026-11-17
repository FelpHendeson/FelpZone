import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ROTAS: Record<string, string> = {
  '/api/conta': '/api/conta.ts',
  '/api/save': '/api/save.ts',
};

/**
 * Em desenvolvimento, atende /api com as mesmas funções usadas na Vercel
 * (com banco em memória), para testar contas sem publicar.
 */
function apiLocal(): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const arquivo = ROTAS[url.pathname];
        if (!arquivo) return next();
        try {
          const modulo = await server.ssrLoadModule(arquivo);
          const metodo = req.method ?? 'GET';
          const funcao = modulo[metodo] as ((r: Request) => Promise<Response>) | undefined;
          if (!funcao) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const partes: Buffer[] = [];
          for await (const parte of req) partes.push(parte as Buffer);
          const cabecalhos = new Headers();
          for (const [nome, valor] of Object.entries(req.headers)) {
            if (typeof valor === 'string') cabecalhos.set(nome, valor);
          }
          const resposta = await funcao(
            new Request(url, {
              method: metodo,
              headers: cabecalhos,
              body: metodo === 'GET' || metodo === 'HEAD' ? undefined : Buffer.concat(partes),
            }),
          );
          res.statusCode = resposta.status;
          resposta.headers.forEach((valor, nome) => res.setHeader(nome, valor));
          res.end(Buffer.from(await resposta.arrayBuffer()));
        } catch (erro) {
          next(erro);
        }
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), apiLocal()],
});
