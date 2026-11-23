/**
 * Simulação em massa do sorteio (F1): roda N primeiras tentativas, cada uma
 * com uma semente diferente, e imprime as distribuições em Markdown para
 * `docs/CALIBRACAO.md`. Uso: `npm run simular` (ou `npm run simular -- 50000`).
 */
import { readFileSync } from "node:fs";
import {
  CATALOGO,
  CONFIG_SORTEIO,
  NOME_RARIDADE,
  RACAS,
  RARIDADES_DOM,
  Rng,
  opcoesCore,
  opcoesDom,
  opcoesOrigem,
  opcoesRaca,
  sortearTentativa,
  type Compatibilidade,
  type NomePasso,
  type OpcaoComCusto,
} from "../src/index";

const N = Number(process.argv[2] ?? 200_000);
if (!Number.isSafeInteger(N) || N <= 0) throw new Error("N inválido.");
// Opcional: saldo inicial alternativo, só para estudar propostas de calibração.
const saldoAlternativo = process.argv[3] === undefined ? null : Number(process.argv[3]);
if (saldoAlternativo !== null && !(saldoAlternativo >= 0)) throw new Error("Saldo inválido.");

const versao = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;
const cfg = saldoAlternativo === null ? CONFIG_SORTEIO : { ...CONFIG_SORTEIO, saldoInicial: saldoAlternativo };
const pct = (x: number, total = N) => `${((100 * x) / total).toFixed(2).replace(".", ",")}%`;
const num = (x: number) => x.toLocaleString("pt-BR");

const contRaca = new Map<string, number>();
const contRaridadeRaca = new Map<string, number>();
const contCompat = new Map<Compatibilidade, number>();
const contCompatPorRaca = new Map<string, Map<Compatibilidade, number>>();
const contDom = new Map<string, number>();
const contOrigem = { comum: 0, especial: 0, comBesta: 0 };
const contPares = new Map<string, number>();
const cortesPorPasso = new Map<NomePasso, { tentativas: number; trocasEsperadas: number; fallback: number }>();
let gastoTotal = 0;
let gastoMax = 0;
let tentativasComCorte = 0;

const inc = <K>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);

function opcoesDoPasso(passo: NomePasso, racaId: string): OpcaoComCusto[] {
  switch (passo) {
    case "raca":
      return opcoesRaca(cfg);
    case "core":
      return opcoesCore(racaId, cfg);
    case "dom":
      return opcoesDom(racaId, cfg);
    case "origem":
      return opcoesOrigem(racaId, cfg);
  }
}

const inicio = Date.now();
for (let i = 0; i < N; i++) {
  const t = sortearTentativa(Rng.daSemente(`simulacao-${i}`), cfg);
  const raca = CATALOGO.racas.get(t.racaId)!;
  inc(contRaca, t.racaId);
  inc(contRaridadeRaca, raca.raridade);
  inc(contCompat, t.compatibilidade);
  if (!contCompatPorRaca.has(t.racaId)) contCompatPorRaca.set(t.racaId, new Map());
  inc(contCompatPorRaca.get(t.racaId)!, t.compatibilidade);
  inc(contDom, CATALOGO.dons.get(t.domId)!.raridade);
  if (t.origem.tipo === "comum") contOrigem.comum++;
  else {
    contOrigem.especial++;
    if (t.bestaVinculadaId) contOrigem.comBesta++;
  }
  if (t.marcaAnomaliaId) inc(contPares, t.marcaAnomaliaId);
  gastoTotal += t.orcamento.gasto;
  gastoMax = Math.max(gastoMax, t.orcamento.gasto);
  let houveCorte = false;
  for (const p of t.orcamento.passos) {
    if (p.cortadas === 0 && !p.fallback) continue;
    houveCorte = true;
    // Troca esperada = probabilidade nominal que caía numa opção cortada.
    const opcoes = opcoesDoPasso(p.passo, t.racaId);
    const total = opcoes.reduce((s, o) => s + o.peso, 0);
    const cortado = opcoes.filter((o) => o.custo > p.saldoAntes).reduce((s, o) => s + o.peso, 0);
    const reg = cortesPorPasso.get(p.passo) ?? { tentativas: 0, trocasEsperadas: 0, fallback: 0 };
    reg.tentativas++;
    reg.trocasEsperadas += cortado / total;
    if (p.fallback) reg.fallback++;
    cortesPorPasso.set(p.passo, reg);
  }
  if (houveCorte) tentativasComCorte++;
}
const ms = Date.now() - inicio;

const linhas: string[] = [];
const out = (s = "") => linhas.push(s);

out(`## Simulação de ${num(N)} sorteios${saldoAlternativo === null ? "" : ` (estudo: saldo ${saldoAlternativo})`}`);
out();
out(`- Data: ${new Date().toISOString().slice(0, 10)} · motor ${versao} · sementes \`simulacao-0\` a \`simulacao-${N - 1}\` · ${ms} ms`);
out(`- Saldo inicial do orçamento: ${cfg.saldoInicial}. Gasto médio: **${(gastoTotal / N).toFixed(2).replace(".", ",")}**; máximo: ${gastoMax}.`);
out();
out("### Raça por raridade");
out();
out("| Raridade | Nominal | Observado |");
out("| --- | ---: | ---: |");
const somaRaca = cfg.pesoRaca.comum + cfg.pesoRaca.incomum + cfg.pesoRaca.raro;
for (const r of ["comum", "incomum", "raro"] as const) out(`| ${NOME_RARIDADE[r]} | ${pct(cfg.pesoRaca[r], somaRaca)} | ${pct(contRaridadeRaca.get(r) ?? 0)} |`);
out();
out("| Raça | Raridade | Nominal | Observado |");
out("| --- | --- | ---: | ---: |");
const nominalRaca = opcoesRaca(cfg);
const totalRaca = nominalRaca.reduce((s, o) => s + o.peso, 0);
for (const r of RACAS) {
  const peso = nominalRaca.find((o) => o.id === r.id)!.peso;
  out(`| ${r.nome} | ${NOME_RARIDADE[r.raridade]} | ${pct(peso, totalRaca)} | ${pct(contRaca.get(r.id) ?? 0)} |`);
}
out();
out("### Compatibilidade raça × core");
out();
out("Nominal: alta 70%, média 25%, excêntrica 5% (renormalizado quando a raça não tem uma categoria).");
out();
out("| Raça | Alta | Média | Excêntrica |");
out("| --- | ---: | ---: | ---: |");
for (const r of RACAS) {
  const m = contCompatPorRaca.get(r.id) ?? new Map();
  const tot = contRaca.get(r.id) ?? 1;
  out(`| ${r.nome} | ${pct(m.get("alta") ?? 0, tot)} | ${pct(m.get("media") ?? 0, tot)} | ${pct(m.get("excentrica") ?? 0, tot)} |`);
}
out(`| **Geral** | ${pct(contCompat.get("alta") ?? 0)} | ${pct(contCompat.get("media") ?? 0)} | ${pct(contCompat.get("excentrica") ?? 0)} |`);
out();
out("### Raridade do dom");
out();
out("| Raridade | Nominal | Observado |");
out("| --- | ---: | ---: |");
const somaDom = RARIDADES_DOM.reduce((s, r) => s + cfg.pesoDom[r], 0);
for (const r of RARIDADES_DOM) out(`| ${NOME_RARIDADE[r]} | ${pct(cfg.pesoDom[r], somaDom)} | ${pct(contDom.get(r) ?? 0)} |`);
out();
out("### Origem");
out();
out("| Tipo | Nominal | Efetivo |");
out("| --- | ---: | ---: |");
const somaOrigem = cfg.pesoOrigem.comum + cfg.pesoOrigem.especial;
out(`| Comum | ${pct(cfg.pesoOrigem.comum, somaOrigem)} | ${pct(contOrigem.comum)} |`);
out(`| Especial | ${pct(cfg.pesoOrigem.especial, somaOrigem)} | ${pct(contOrigem.especial)} |`);
out(`| (especial com besta vinculada) | — | ${pct(contOrigem.comBesta)} |`);
out();
out("### Orçamento de raridade");
out();
out(`Tentativas em que o orçamento cortou alguma opção: **${num(tentativasComCorte)}** (${pct(tentativasComCorte)}).`);
out();
out("| Passo | Tentativas com corte | Trocas forçadas (esperadas) | Fallback de menor custo |");
out("| --- | ---: | ---: | ---: |");
for (const passo of ["raca", "core", "dom", "origem"] as const) {
  const reg = cortesPorPasso.get(passo) ?? { tentativas: 0, trocasEsperadas: 0, fallback: 0 };
  out(`| ${passo} | ${num(reg.tentativas)} | ${num(Math.round(reg.trocasEsperadas))} (${pct(reg.trocasEsperadas)}) | ${num(reg.fallback)} |`);
}
out();
out("*Trocas forçadas (esperadas)*: soma, em cada passo cortado, da probabilidade nominal que cairia numa opção acima do saldo. É o número de sorteios em que o resultado mudou por causa do orçamento.");
out();
out("### Pares excêntricos");
out();
const pares = [...contPares.entries()].sort((a, b) => b[1] - a[1]);
const totalPares = pares.reduce((s, [, n]) => s + n, 0);
out(`${num(totalPares)} sorteios (${pct(totalPares)}) caíram em ${pares.length} pares distintos de ${CATALOGO.marcasAnomalia.size}.`);
out();
out("| Par (marca) | Sorteios | % do total |");
out("| --- | ---: | ---: |");
for (const [id, n] of pares) {
  const m = CATALOGO.marcasAnomalia.get(id)!;
  out(`| ${CATALOGO.racas.get(m.racaId)!.nome} + ${CATALOGO.cores.get(m.coreId)!.nome} (*${m.nome}*${m.curada ? ", curada" : ""}) | ${num(n)} | ${pct(n)} |`);
}
out();

console.log(linhas.join("\n"));
