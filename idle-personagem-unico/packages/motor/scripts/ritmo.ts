/**
 * Bot de ritmo (ARQUITETURA §9): joga o loop de treino como uma pessoa
 * razoável e mede o tempo até os níveis-marco. Saída em Markdown para
 * `docs/CALIBRACAO.md`. Uso: `npm run ritmo`.
 *
 * Estratégia: a cada sessão, treina o status mais longe do teto (proporção);
 * entre sessões o jogo fica fechado e o offline (limite de 12 h) trabalha.
 */
import { readFileSync } from "node:fs";
import {
  ATIVIDADES_TREINO,
  CONFIG_PROGRESSAO,
  LIMITE_OFFLINE_MS,
  STATUS,
  avancar,
  avancarPersonagem,
  Rng,
  ATIVIDADES_COLETA,
  CATALOGO,
  FERRAMENTAS,
  NOME_OFICIO,
  OFICIOS,
  camposIniciaisF3,
  comprarFerramenta,
  irPara,
  nivelEfetivoOficio,
  venderTudo,
  type OficioId,
  ganhoDeTreino,
  criarEstadoInicial,
  faixaStatus,
  iniciarAtividade,
  modificadoresDoPersonagem,
  statusIniciais,
  xpParaProximoNivel,
  type EstadoJogo,
  type Personagem,
  type StatusId,
} from "../src/index";

const versao = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const HORA = 3_600_000;
const DIA = 24 * HORA;
const MARCOS = [5, 10, 20, 30, 40, 50];
const num = (x: number, casas = 1) => x.toFixed(casas).replace(".", ",");

function personagem(racaId: string, origem: Personagem["origem"]): Personagem {
  const base = { racaId, dons: [] as string[], origem };
  return {
    id: "personagem-1",
    nome: "Bot",
    nivel: 1,
    xp: 0,
    racaId,
    coreId: "andarilho",
    dons: [],
    origem,
    tracoPersonalidadeId: "metodico",
    aparencia: { corCabelo: "preto", corRoupa: "linho" },
    criadoEm: T0,
    status: statusIniciais(base),
    atividade: null,
    ...camposIniciaisF3(),
  };
}

/** Atividade do status mais longe do teto, em proporção da faixa. */
function escolherTreino(p: Personagem): string {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  let melhor: StatusId = "vigor";
  let menor = Infinity;
  for (const s of STATUS) {
    const { piso, teto } = faixaStatus(p.racaId, s, p.nivel, mods);
    const pos = (p.status[s] - piso) / (teto - piso);
    if (pos < menor) {
      menor = pos;
      melhor = s;
    }
  }
  return ATIVIDADES_TREINO.find((a) => a.status === melhor)!.id;
}

interface Perfil {
  readonly nome: string;
  /** Horas do dia (UTC do bot) em que a pessoa abre o jogo. */
  readonly sessoes: readonly number[];
}

const PERFIS: readonly Perfil[] = [
  { nome: "Dedicado (3 sessões/dia: 8 h, 13 h, 20 h)", sessoes: [8, 13, 20] },
  { nome: "Casual (1 sessão/dia, às 20 h)", sessoes: [20] },
];

interface Resultado {
  readonly diasAteNivel: Map<number, number>;
  readonly horasAtivasAteNivel: Map<number, number>;
  readonly ocupacaoTeto: Map<number, number>;
  readonly horasPerdidas: number;
}

function jogar(perfil: Perfil, racaId: string, origem: Personagem["origem"], diasMax = 365): Resultado {
  let estado: EstadoJogo = criarEstadoInicial("bot-de-ritmo", T0);
  estado = { ...estado, conta: { personagens: [personagem(racaId, origem)], personagemAtivoId: "personagem-1", sorteio: null } };
  const diasAteNivel = new Map<number, number>();
  const horasAtivasAteNivel = new Map<number, number>();
  const ocupacaoTeto = new Map<number, number>();
  let horasAtivas = 0;
  let horasPerdidas = 0;
  let t = T0;
  for (let dia = 0; dia < diasMax && !diasAteNivel.has(CONFIG_PROGRESSAO.nivelMaximo); dia++) {
    for (const h of perfil.sessoes) {
      const sessao = T0 + dia * DIA + h * HORA;
      if (sessao <= t) continue;
      const antes = estado.conta.personagens[0]!.nivel;
      const trabalhando = estado.conta.personagens[0]!.atividade !== null;
      const { estado: novo, resumo } = avancar(estado, sessao);
      if (trabalhando) horasAtivas += resumo.simuladoMs / HORA;
      if (trabalhando) horasPerdidas += (resumo.decorridoMs - resumo.simuladoMs) / HORA;
      estado = novo;
      t = sessao;
      const p = estado.conta.personagens[0]!;
      for (let l = antes + 1; l <= p.nivel; l++) {
        if (!diasAteNivel.has(l)) {
          diasAteNivel.set(l, (sessao - T0) / DIA);
          horasAtivasAteNivel.set(l, horasAtivas);
        }
      }
      // Ocupação média da faixa (piso→teto) ao chegar no marco.
      for (const l of MARCOS) {
        if (p.nivel >= l && !ocupacaoTeto.has(l)) {
          const mods = modificadoresDoPersonagem(p, p.nivel);
          let soma = 0;
          for (const s of STATUS) {
            const { piso, teto } = faixaStatus(p.racaId, s, p.nivel, mods);
            soma += (p.status[s] - piso) / (teto - piso);
          }
          ocupacaoTeto.set(l, soma / STATUS.length);
        }
      }
      const r = iniciarAtividade(estado, escolherTreino(p), sessao);
      if (r.ok) estado = r.estado;
    }
  }
  return { diasAteNivel, horasAtivasAteNivel, ocupacaoTeto, horasPerdidas };
}

const out: string[] = [];
const linha = (s = "") => out.push(s);
const c = CONFIG_PROGRESSAO;
const comum: Personagem["origem"] = { tipo: "comum", id: "vila-rural", motivacaoId: "renome", anosDeEstrada: 5, loreGerada: "Bot." };

linha(`## Bot de ritmo (treino)`);
linha();
linha(`- Data: ${new Date().toISOString().slice(0, 10)} · motor ${versao} · limite offline ${LIMITE_OFFLINE_MS / HORA} h`);
linha(`- Números: ciclo ${ATIVIDADES_TREINO[0]!.cicloBaseMs / 1000} s, ${ATIVIDADES_TREINO[0]!.xpPorCiclo} XP/ciclo, XP(L→L+1) = round(${c.xpBase} × L^${num(c.xpExpoente)}), teto +${c.incrementoTetoPorNivel * 100}%/nível, ganho base ${num(c.fracaoGanhoBase * 100, 2)}% do teto por ciclo, expoente ${num(c.expoenteGanho)}, nível máximo ${c.nivelMaximo}.`);
let xpTotal = 0;
for (let l = 1; l < c.nivelMaximo; l++) xpTotal += xpParaProximoNivel(l);
linha(`- XP total até o nível ${c.nivelMaximo}: ${xpTotal.toLocaleString("pt-BR")} (${num(xpTotal / (ATIVIDADES_TREINO[0]!.xpPorCiclo * 120), 0)} h de atividade sem bônus).`);
linha();
linha("Estratégia: em cada sessão, treina o status mais longe do teto; entre sessões, o offline trabalha (até 12 h).");
linha();

linha("### Tempo até o nível (dias corridos desde a criação; horas com atividade)");
linha();
linha("O XP não depende da raça; o Humano representa todas (exceto origens com bônus de XP).");
linha();
linha("| Perfil | " + MARCOS.map((l) => `Nível ${l}`).join(" | ") + " | Horas perdidas pelo limite |");
linha("| --- | " + MARCOS.map(() => "---:").join(" | ") + " | ---: |");
for (const perfil of PERFIS) {
  const r = jogar(perfil, "humano", comum);
  const cel = MARCOS.map((l) => {
    const d = r.diasAteNivel.get(l);
    return d === undefined ? "—" : `${num(d)} d (${num(r.horasAtivasAteNivel.get(l)!, 0)} h)`;
  });
  linha(`| ${perfil.nome} | ${cel.join(" | ")} | ${num(r.horasPerdidas, 0)} h |`);
}
linha();
linha("### Ocupação média da faixa piso → teto dos 8 status ao chegar ao nível (perfil dedicado)");
linha();
linha("| Raça | " + MARCOS.map((l) => `Nível ${l}`).join(" | ") + " |");
linha("| --- | " + MARCOS.map(() => "---:").join(" | ") + " |");
for (const [racaId, nomeRaca] of [["humano", "Humano"], ["draconato", "Draconato"], ["silfo", "Silfo"]] as const) {
  const r = jogar(PERFIS[0]!, racaId, comum);
  linha(`| ${nomeRaca} | ` + MARCOS.map((l) => (r.ocupacaoTeto.has(l) ? `${num(r.ocupacaoTeto.get(l)! * 100, 0)}%` : "—")).join(" | ") + " |");
}
linha();

linha("### Treino de um status num nível fixo (Humano, partindo do piso)");
linha();
linha("Quantas horas de treino levam um status do piso a 50% e a 90% da faixa, sem subir de nível no meio.");
linha();
linha("| Nível | Faixa piso → teto (Força) | Ganho no 1º ciclo | Até 50% | Até 90% |");
linha("| ---: | ---: | ---: | ---: | ---: |");
for (const nivel of [1, 10, 25, 50]) {
  const f = faixaStatus("humano", "forca", nivel, []);
  let v = f.piso;
  let ciclos = 0;
  let ate50 = 0;
  const primeiro = ganhoDeTreino("humano", "forca", v, nivel, []);
  while ((v - f.piso) / (f.teto - f.piso) < 0.9 && ciclos < 1e6) {
    v += ganhoDeTreino("humano", "forca", v, nivel, []);
    ciclos++;
    if (!ate50 && (v - f.piso) / (f.teto - f.piso) >= 0.5) ate50 = ciclos;
  }
  const horas = (n: number) => `${num((n * ATIVIDADES_TREINO[0]!.cicloBaseMs) / HORA, 2)} h`;
  linha(`| ${nivel} | ${num(f.piso, 2)} → ${num(f.teto, 2)} | +${num(primeiro, 3)} | ${horas(ate50)} | ${horas(ciclos)} |`);
}
linha();
linha(`XP por hora de treino: ${(3_600_000 / ATIVIDADES_TREINO[0]!.cicloBaseMs) * ATIVIDADES_TREINO[0]!.xpPorCiclo} (sem bônus).`);
linha();
// ---------------------------------------------------------------- Coleta (F3)

interface ResultadoColeta {
  readonly diasAteNivelOficio: Map<number, number>;
  readonly diaCompra: Map<number, number>;
  readonly ouroNoDia7: number;
  readonly perdidosPorDia: number;
  readonly nivelPersonagemDia7: number;
}

/**
 * Pessoa dedicada focada num ofício: em cada sessão volta à cidade, vende
 * tudo, compra a próxima ferramenta se der e retoma o maior tier liberado.
 */
function jogarColeta(oficio: OficioId, dias = 30): ResultadoColeta {
  let estado: EstadoJogo = criarEstadoInicial("bot-de-coleta", T0);
  estado = { ...estado, conta: { personagens: [personagem("humano", comum)], personagemAtivoId: "personagem-1", sorteio: null } };
  const diasAteNivelOficio = new Map<number, number>();
  const diaCompra = new Map<number, number>();
  let ouroNoDia7 = 0;
  let nivelPersonagemDia7 = 1;
  let perdidos = 0;
  const p = () => estado.conta.personagens[0]!;
  for (let dia = 0; dia < dias; dia++) {
    for (const h of PERFIS[0]!.sessoes) {
      const agora = T0 + dia * DIA + h * HORA;
      const r = avancar(estado, agora);
      estado = r.estado;
      perdidos += r.resumo.itensPerdidos;
      const nivel = p().oficios[oficio].nivel;
      for (const marco of [5, 10, 15, 20, 30]) if (nivel >= marco && !diasAteNivelOficio.has(marco)) diasAteNivelOficio.set(marco, (agora - T0) / DIA);
      // Vende e compra na cidade (a viagem é de poucos segundos; o bot "chega" na hora).
      const ida = irPara(estado, "pedravau", agora);
      if (ida.ok) estado = avancar(ida.estado, agora + 10_000).estado;
      const venda = venderTudo(estado, agora + 10_000);
      if (venda.ok) estado = venda.estado;
      for (const f of FERRAMENTAS.filter((x) => x.oficio === oficio && x.preco > 0)) {
        const c = comprarFerramenta(estado, f.id, agora + 10_000);
        if (c.ok) {
          estado = c.estado;
          diaCompra.set(f.grau, (agora - T0) / DIA);
        }
      }
      const mods = modificadoresDoPersonagem(p(), p().nivel);
      const tier = ATIVIDADES_COLETA.filter((a) => a.oficio === oficio && nivelEfetivoOficio(p(), oficio, mods) >= a.nivelMinimo).at(-1)!;
      const ini = iniciarAtividade(estado, tier.id, agora + 10_000);
      if (ini.ok) estado = ini.estado;
      if (dia === 7 && h === PERFIS[0]!.sessoes[0]) {
        ouroNoDia7 = p().ouro;
        nivelPersonagemDia7 = p().nivel;
      }
    }
  }
  return { diasAteNivelOficio, diaCompra, ouroNoDia7, perdidosPorDia: perdidos / dias, nivelPersonagemDia7 };
}

linha("### Coleta (F3)");
linha();
linha("Rendimento por hora de um Humano sem bônus, com a ferramenta básica e com a de aço (Agilidade no piso do nível 1):");
linha();
linha("| Recurso | Tier | Nível | Itens/h (básica) | Gold/h (básica) | Gold/h (aço) | XP de ofício/h | XP do personagem/h |");
linha("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
const hc = personagem("humano", comum);
for (const a of ATIVIDADES_COLETA.filter((x) => x.oficio === "lenhador" || x.oficio === "mineracao")) {
  const medir = (ferramenta: string) => {
    const comFerr: Personagem = { ...hc, ferramentas: { ...hc.ferramentas, [a.oficio]: ferramenta }, oficios: { ...hc.oficios, [a.oficio]: { nivel: 49, xp: 0 } }, localId: a.localId, subareaId: a.subareaId, mochila: {}, atividade: { id: a.id, progressoMs: 0 } };
    return avancarPersonagem(comFerr, HORA, Rng.daSemente(`gold-${a.id}`));
  };
  const basica = medir(`${a.oficio}-basica`);
  const aco = medir(`${a.oficio}-de-aco`);
  const gold = (r: ReturnType<typeof medir>) => Object.entries(r.itens).reduce((s, [id, q]) => s + CATALOGO.itens.get(id)!.preco * (q as number), 0);
  linha(`| ${a.nome} | ${a.tier} | ${a.nivelMinimo} | ${num(basica.itens[a.itemId] ?? 0, 0)} | ${num(gold(basica), 0)} | ${num(gold(aco), 0)} | ${num(basica.xpOficios[a.oficio] ?? 0, 0)} | ${num(basica.xp, 0)} |`);
}
linha();
linha("Os quatro ofícios têm os mesmos números por tier; Lenhador e Minerador representam todos.");
linha();
linha("Pessoa dedicada (3 sessões/dia) focada num ofício: vende tudo a cada sessão, compra a próxima ferramenta quando pode e coleta o maior tier liberado.");
linha();
linha("| Ofício | Nível 5 | Nível 10 | Nível 15 | Nível 20 | Nível 30 | Ferramenta de ferro | Ferramenta de aço | Gold no 7º dia | Nível do personagem no 7º dia | Itens perdidos/dia |");
linha("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const o of OFICIOS) {
  const r = jogarColeta(o);
  const d = (m: Map<number, number>, k: number) => (m.has(k) ? `${num(m.get(k)!)} d` : "—");
  linha(`| ${NOME_OFICIO[o]} | ${d(r.diasAteNivelOficio, 5)} | ${d(r.diasAteNivelOficio, 10)} | ${d(r.diasAteNivelOficio, 15)} | ${d(r.diasAteNivelOficio, 20)} | ${d(r.diasAteNivelOficio, 30)} | ${d(r.diaCompra, 2)} | ${d(r.diaCompra, 3)} | ${num(r.ouroNoDia7, 0)} | ${r.nivelPersonagemDia7} | ${num(r.perdidosPorDia, 0)} |`);
}
linha();
console.log(out.join("\n"));
