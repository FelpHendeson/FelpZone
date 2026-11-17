// Garante que toda função chamada nos onclick do HTML está exposta em window por src/ui/main.js.
// (Módulos ES não ficam no escopo global; esquecer uma função quebra o botão sem erro no carregamento.)
// Uso: node sim/bridge.test.mjs
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const ui = readFileSync(new URL('src/ui/main.js', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');

const called = new Set();
for (const m of (ui + html).matchAll(/onclick="([^"]*)"/g)) {
  for (const f of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) called.add(f[1]);
}
const bridge = ui.match(/Object\.assign\(window, \{([\s\S]*?)\}\);/);
if (!bridge) throw new Error('Ponte Object.assign(window, {...}) não encontrada');
const exposed = new Set(bridge[1].match(/[A-Za-z_$][\w$]*/g));
const builtins = new Set(['stopPropagation']);

const missing = [...called].filter((f) => !exposed.has(f) && !builtins.has(f));
if (missing.length) {
  console.error('Faltando na ponte window:', missing.join(', '));
  process.exit(1);
}
console.log(`ponte: ok (${called.size} funções usadas nos onclick)`);
