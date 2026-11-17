// Garante que toda função chamada nos onclick do HTML está exposta em window por src/ui/main.js.
// (Módulos ES não ficam no escopo global; esquecer uma função quebra o botão sem erro no carregamento.)
// Uso: node sim/bridge.test.mjs
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const uiDir = new URL('src/ui/', root);
const allUi = readdirSync(uiDir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, uiDir), 'utf8')).join('\n');
const ui = readFileSync(new URL('src/ui/main.js', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');

const called = new Set();
// onclick/onchange/oninput: pega a raiz de cada chamada (cr.flag.bg(...) → cr; dialogNext() → dialogNext)
for (const m of (allUi + html).matchAll(/on(?:click|change|input)="([^"]*)"/g)) {
  for (const f of m[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)(?:\.[\w$]+)*\s*\(/g)) called.add(f[1]);
}
const bridge = ui.match(/Object\.assign\(window, \{([\s\S]*?)\}\);/);
if (!bridge) throw new Error('Ponte Object.assign(window, {...}) não encontrada');
const exposed = new Set(bridge[1].match(/[A-Za-z_$][\w$]*/g));
const builtins = new Set(['event', 'stopPropagation', 'setSelectionRange']);

const missing = [...called].filter((f) => !exposed.has(f) && !builtins.has(f));
if (missing.length) {
  console.error('Faltando na ponte window:', missing.join(', '));
  process.exit(1);
}
console.log(`ponte: ok (${called.size} funções usadas nos onclick)`);
