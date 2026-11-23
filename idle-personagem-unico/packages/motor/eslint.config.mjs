import js from "@eslint/js";
import tseslint from "typescript-eslint";

// O motor roda no navegador, no servidor e no app mobile: nada de DOM,
// React/Next, módulos do Node ou sorteio fora do RNG com semente.
const proibidosNoMotor = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*"], message: "O motor não depende de interface." },
        { group: ["node:*"], message: "O motor não usa módulos do Node." },
        {
          group: ["fs", "fs/*", "path", "os", "crypto", "child_process", "http", "https", "net", "url", "util", "stream", "buffer", "events", "worker_threads"],
          message: "O motor não usa módulos do Node.",
        },
      ],
    },
  ],
  "no-restricted-globals": [
    "error",
    ...["window", "document", "localStorage", "sessionStorage", "navigator", "self", "globalThis", "process", "Buffer", "require", "module", "__dirname", "__filename", "crypto"].map(
      (name) => ({ name, message: "O motor não acessa APIs do navegador nem do Node." }),
    ),
  ],
  "no-restricted-properties": [
    "error",
    { object: "Math", property: "random", message: "Use o RNG com semente (rng.ts)." },
  ],
};

export default tseslint.config(
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["src/**/*.ts"], rules: proibidosNoMotor },
  {
    files: ["test/**/*.ts"],
    rules: { "no-restricted-properties": proibidosNoMotor["no-restricted-properties"] },
  },
);
