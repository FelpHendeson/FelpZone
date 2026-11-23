// Permite rodar scripts TypeScript do motor direto no Node (remoção de tipos
// nativa), resolvendo imports sem extensão ("./rng" → "./rng.ts").
import { registerHooks } from "node:module";

registerHooks({
  resolve(especificador, contexto, proximo) {
    try {
      return proximo(especificador, contexto);
    } catch (erro) {
      if (!especificador.startsWith(".") || /\.[cm]?[jt]s$/.test(especificador)) throw erro;
      try {
        return proximo(`${especificador}.ts`, contexto);
      } catch {
        return proximo(`${especificador}/index.ts`, contexto);
      }
    }
  },
});
