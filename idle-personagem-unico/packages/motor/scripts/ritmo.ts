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
  COFRE_VAZIO,
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
  camposIniciaisF4,
  camposIniciaisF5,
  camposIniciaisF6,
  camposIniciaisF7,
  camposIniciaisF8,
  camposIniciaisF10,
  camposIniciaisF11,
  camposIniciaisF12,
  botDeArena,
  CONFIG_COMPETICAO,
  duelo,
  faixaDaColocacao,
  resolverTorneio,
  retratoDe,
  climaEm,
  CLIMAS,
  ehNoite,
  NOME_CLIMA,
  resolverEvento,
  CONFIG_CUIDADOS,
  CONFIG_PETS,
  novoPet,
  PRECO_LACO,
  xpParaProximoNivelPet,
  FRAGMENTO,
  infoFusao,
  RECEITAS,
  RELIQUIAS,
  CATALOGO as CAT,
  nivelEfetivoOficio,
  MISSOES,
  RANKS,
  aceitarMissao,
  comprarEquipamento,
  entregarMissao,
  equipar,
  lerLivro,
  podeAceitar,
  progressoDaMissao,
  promover,
  type ResultadoAtividade,
  CONFIG_LIMIAR,
  PECAS_RETORNADO,
  custoDoPedagio,
  duracaoDoLimiar,
  entrarNoLimiar,
  CONFIG_HABILIDADES,
  CORES,
  ATIVIDADE_APRENDIZADO,
  fatorMaestria,
  xpParaProximaMaestria,
  AREAS_COMBATE,
  EQUIPAMENTOS,
  SLOTS,
  faixas,
  riscoDaArea,
  statusDeCombate,
  comprarFerramenta,
  irPara,
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
    ...camposIniciaisF4(),
    // As seções da F2 a F4 medem sem habilidades equipadas (comparáveis entre fatias).
    ...camposIniciaisF5("andarilho"),
    ativasEquipadas: [],
    passivasEquipadas: [],
    ...camposIniciaisF6(),
    ...camposIniciaisF7(),
    ...camposIniciaisF8(),
    ...camposIniciaisF10(),
    ...camposIniciaisF11(),
    ...camposIniciaisF12(),
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
  estado = { ...estado, conta: { personagens: [personagem(racaId, origem)], personagemAtivoId: "personagem-1", sorteio: null, cofre: COFRE_VAZIO } };
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
  estado = { ...estado, conta: { personagens: [personagem("humano", comum)], personagemAtivoId: "personagem-1", sorteio: null, cofre: COFRE_VAZIO } };
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
// ---------------------------------------------------------------- Combate (F4)

/** Personagem num nível, com cada status a `ocupacao` da faixa e o equipamento de um tier. */
function guerreiro(nivel: number, ocupacao: number, tier: 0 | 1 | 2 | 3): Personagem {
  const base = personagem("humano", comum);
  const equipados = { ...base.equipados } as Record<(typeof SLOTS)[number], string | null>;
  if (tier > 0) for (const s of SLOTS) {
    const eq = EQUIPAMENTOS.find((i) => i.equipamento?.slot === s && i.equipamento.tier === tier);
    if (eq) equipados[s] = eq.id;
  }
  const comEq = { ...base, equipados };
  const f = faixas("humano", nivel, modificadoresDoPersonagem(comEq, nivel));
  const status = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.piso + ocupacao * (x.teto - x.piso)])) as Personagem["status"];
  return { ...comEq, nivel, status };
}

/** Caça por algumas horas no nível de entrada (sem subir de nível no meio, para medir a área). */
function cacar(p: Personagem, areaId: string, horas: number) {
  const area = AREAS_COMBATE.find((a) => a.id === areaId)!;
  const pc: Personagem = {
    ...p,
    localId: area.localId,
    subareaId: area.subareaId,
    atividade: { id: area.id, progressoMs: 0, combate: { fase: "procurando", restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] } },
  };
  const r = avancarPersonagem(pc, horas * HORA, Rng.daSemente(`caca-${areaId}-${p.nivel}`), { ...CONFIG_PROGRESSAO, nivelMaximo: p.nivel });
  let abates = 0;
  let xp = 0;
  for (const [id, n] of Object.entries(r.abates)) {
    abates += n;
    xp += CATALOGO.monstros.get(id)!.xp * n;
  }
  const gold = Object.entries(r.itens).reduce((g, [id, q]) => g + CATALOGO.itens.get(id)!.preco * q, 0);
  const sc = statusDeCombate(p.status, modificadoresDoPersonagem(p, p.nivel));
  const horasReais = r.mortes > 0 ? Number.NaN : horas;
  return { abates: abates / horas, xp: xp / horas, gold: gold / horas, recuos: r.recuos / horas, mortes: r.mortes, risco: riscoDaArea(sc, area), horasReais };
}

linha("### Combate (F4)");
linha();
linha("Humano caçando por 4 h no nível de entrada da área (sem subir de nível no meio), recuo em 30%. \"Preparado\" = status em 50% da faixa e equipamento do tier indicado; \"despreparado\" = status no piso e só o kit básico.");
linha();
linha("| Área | Nível | Perfil | Risco (perda por luta) | Abates/h | XP/h | Gold/h (drops) | Recuos/h | Mortes em 4 h |");
linha("| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |");
const tierDe = (n: number): 0 | 1 | 2 | 3 => (n < 10 ? 1 : n < 20 ? 2 : 3);
for (const a of AREAS_COMBATE) {
  const perfis: [string, Personagem][] = [
    [`preparado (tier ${tierDe(a.nivelRecomendado)})`, guerreiro(a.nivelRecomendado, 0.5, tierDe(a.nivelRecomendado))],
    ["despreparado", guerreiro(a.nivelRecomendado, 0, 0)],
  ];
  for (const [nome, p] of perfis) {
    const r = cacar(p, a.id, 4);
    linha(`| ${a.nome} | ${a.nivelRecomendado} | ${nome} | ${r.risco.risco} (${num(r.risco.perdaPorLuta * 100, 0)}%) | ${num(r.abates, 0)} | ${num(r.xp, 0)} | ${num(r.gold, 0)} | ${num(r.recuos, 1)} | ${r.mortes} |`);
  }
}
linha();
linha(`Referência: treino dá ${(3_600_000 / 30_000) * 10} XP/h; coleta tier 1, 640 XP/h.`);
linha();
// ---------------------------------------------------------------- Habilidades (F5)

linha("### Habilidades (F5)");
linha();
{
  const porHora = (3_600_000 / ATIVIDADE_APRENDIZADO.cicloBaseMs) * ATIVIDADE_APRENDIZADO.maestriaPorCiclo;
  const horasAte = (m: number) => {
    let total = 0;
    for (let k = 1; k < m; k++) total += xpParaProximaMaestria(k);
    return total / porHora;
  };
  linha(`Maestria pela atividade de Aprendizado (${porHora} XP de maestria/h, sem bônus): estágio II (maestria 10) em **${num(horasAte(10))} h**, estágio III (25) em **${num(horasAte(25))} h**, máximo (${CONFIG_HABILIDADES.maestriaMaxima}) em **${num(horasAte(CONFIG_HABILIDADES.maestriaMaxima))} h**. Efeito: ×${num(fatorMaestria(10), 2)} na maestria 10, ×${num(fatorMaestria(25), 2)} na 25 e ×${num(fatorMaestria(30), 2)} na 30.`);
  linha();
}
linha("Combate com as técnicas de cada core (Humano preparado no Juncal Escuro, nível 10, 4 h, recuo 30%): sem habilidades equipadas × técnicas do core na maestria 1 × na maestria 25.");
linha();
linha("| Core | Abates/h sem | Abates/h (M1) | Abates/h (M25) | Recuos/h sem | Recuos/h (M1) | Recuos/h (M25) |");
linha("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const c of CORES) {
  const g = guerreiro(10, 0.5, 2);
  const f5 = camposIniciaisF5(c.id);
  const comM = (m: number): Personagem => ({ ...g, coreId: c.id, ...f5, habilidades: Object.fromEntries(Object.keys(f5.habilidades).map((k) => [k, { maestria: m, xp: 0 }])) });
  const sem = cacar({ ...g, coreId: c.id, ...f5, ativasEquipadas: [], passivasEquipadas: [] }, "juncal-escuro", 4);
  const m1 = cacar(comM(1), "juncal-escuro", 4);
  const m25 = cacar(comM(25), "juncal-escuro", 4);
  linha(`| ${c.nome} | ${num(sem.abates, 0)} | ${num(m1.abates, 0)} | ${num(m25.abates, 0)} | ${num(sem.recuos, 1)} | ${num(m1.recuos, 1)} | ${num(m25.recuos, 1)} |`);
}
linha();
// ---------------------------------------------------------------- O Limiar (F6)

linha("### O Limiar (F6)");
linha();
linha("Humano preparado (status em 50% da faixa, equipamento do tier) que morre na área do seu nível: duração da estadia, o que rende lá dentro e o pedágio para sair logo na entrada.");
linha();
linha("| Nível / área | Eco | Duração | Abates no Limiar | Essência ganha | Pedágio na entrada | XP ganho |");
linha("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const [nivel, areaNivel] of [
  [5, 5],
  [15, 15],
  [25, 25],
] as const) {
  for (const cargas of [0, 3]) {
    const g = guerreiro(nivel, 0.5, tierDe(nivel));
    const recentes = Array.from({ length: cargas }, (_, k) => T0 - (k + 1) * 60_000);
    const p = entrarNoLimiar({ ...g, mortes: cargas, mortesRecentes: recentes }, areaNivel, T0);
    const l = p.limiar!;
    const r = avancarPersonagem(p, l.totalMs - 1, Rng.daSemente(`limiar-${nivel}-${cargas}`), { ...CONFIG_PROGRESSAO, nivelMaximo: 50 }, T0);
    const abates = Object.values(r.abates).reduce((a, b) => a + b, 0);
    linha(`| ${nivel} / ${areaNivel} | ${cargas} | ${num(l.totalMs / 60_000)} min | ${abates} | ${r.essencia} | ${custoDoPedagio(p)} | ${num(r.xp, 0)} |`);
  }
}
linha();
{
  // Quanto tempo de Limiar até completar O Retornado (re-entrando sempre, Eco 3).
  const g = guerreiro(25, 0.5, 3);
  let p = entrarNoLimiar({ ...g, mortes: 3, mortesRecentes: [T0 - 60_000, T0 - 120_000, T0 - 180_000] }, 25, T0);
  const rng = Rng.daSemente("retornado");
  let horas = 0;
  const tem = (x: Personagem) => PECAS_RETORNADO.filter((i) => (x.mochila[i.id] ?? 0) > 0).length;
  while (tem(p) < 4 && horas < 200) {
    p = avancarPersonagem(p, 3_600_000, rng, CONFIG_PROGRESSAO, T0 + horas * 3_600_000).personagem;
    horas++;
    if (!p.limiar) p = entrarNoLimiar({ ...p, atividade: null, mortesRecentes: [T0 + horas * 3_600_000 - 60_000, T0 + horas * 3_600_000 - 120_000, T0 + horas * 3_600_000 - 180_000] }, 25, T0 + horas * 3_600_000);
  }
  linha(`Tempo de Limiar até as 4 peças de O Retornado (nível 25, Eco 3, sempre voltando ao Limiar): **${horas} h** (chefes a ${num(CONFIG_LIMIAR.chanceChefe * 100, 1)}% por busca × (1 + 0,5 por carga), peça em ${num(CONFIG_LIMIAR.chancePecaRetornado * 100, 0)}% das vitórias).`);
  linha();
  void duracaoDoLimiar;
}
// ---------------------------------------------------------------- Cadeia completa (F7)

/**
 * Pessoa razoável que usa tudo: 3 sessões por dia; em cada uma vai à cidade,
 * lê livros, equipa o que for melhor, vende o resto, compra equipamento,
 * entrega e aceita missões, pede promoção e escolhe a caça mais forte que
 * não seja vermelha (ou treina o status mais atrasado).
 */
function cadeiaCompleta(dias: number) {
  const usar = (e: EstadoJogo, r: ResultadoAtividade) => (r.ok ? r.estado : e);
  const base = { ...personagem("humano", comum), ...camposIniciaisF5("predador-nato"), coreId: "predador-nato" };
  let e: EstadoJogo = { ...criarEstadoInicial("cadeia", T0), conta: { personagens: [base], personagemAtivoId: "personagem-1", sorteio: null, cofre: COFRE_VAZIO } };
  const p = () => e.conta.personagens[0]!;
  const marcos: { dia: number; nivel: number; rank: string; ouro: number; mortes: number; metas: number }[] = [];
  const diasNivel = new Map<number, number>();
  const diasRank = new Map<number, number>();
  let eventos = 0;
  for (let dia = 0; dia < dias; dia++) {
    for (const h of [8, 13, 20]) {
      const t = T0 + dia * DIA + h * HORA;
      e = avancar(e, t).estado;
      for (const l of [10, 20, 30, 40, 50]) if (p().nivel >= l && !diasNivel.has(l)) diasNivel.set(l, dia + h / 24);
      if (!diasRank.has(p().guilda.rank)) diasRank.set(p().guilda.rank, dia + h / 24);
      if (p().limiar) continue;
      // Cidade.
      e = usar(e, irPara(e, "pedravau", t));
      e = avancar(e, t + 10_000).estado;
      const tc = t + 10_000;
      for (const [id] of Object.entries(p().mochila)) {
        const it = CAT.itens.get(id)!;
        if (it.livro) e = usar(e, lerLivro(e, id, tc));
        if (it.equipamento) {
          const atual = p().equipados[it.equipamento.slot === "acessorio" ? "acessorio1" : it.equipamento.slot];
          const tierAtual = atual ? CAT.itens.get(atual)!.equipamento!.tier : -1;
          if (it.equipamento.tier > tierAtual) e = usar(e, equipar(e, id, tc));
        }
      }
      e = usar(e, venderTudo(e, tc));
      for (const eq of [...EQUIPAMENTOS].filter((x) => x.equipamento?.precoCompra).sort((a, b) => b.equipamento!.tier - a.equipamento!.tier)) {
        const atual = p().equipados[eq.equipamento!.slot === "acessorio" ? "acessorio1" : eq.equipamento!.slot];
        const tierAtual = atual ? CAT.itens.get(atual)!.equipamento!.tier : -1;
        if (eq.equipamento!.tier > tierAtual && p().ouro >= eq.equipamento!.precoCompra!) {
          e = usar(e, comprarEquipamento(e, eq.id, tc));
          e = usar(e, equipar(e, eq.id, tc));
        }
      }
      // F11: responde aos eventos (a primeira escolha; se não der, a segunda).
      for (const ev of [...p().eventos.pendentes]) {
        const r0 = resolverEvento(e, ev.n, 0, tc);
        e = r0.ok ? r0.estado : usar(e, resolverEvento(e, ev.n, 1, tc));
        eventos++;
      }
      for (const a of [...p().missoes.ativas]) if (progressoDaMissao(p(), a.id).completa) e = usar(e, entregarMissao(e, a.id, tc));
      e = usar(e, promover(e, tc));
      for (const m of MISSOES) if ((m.tipo === "guilda" || m.tipo === "prova" || (m.tipo === "npc" && m.npcId !== "pescador-mudo")) && podeAceitar(p(), m, tc).ok) e = usar(e, aceitarMissao(e, m.id, tc));
      // Atividade: primeiro o que as missões ativas pedem; senão, a área mais forte que não seja vermelha.
      const sc = statusDeCombate(p().status, modificadoresDoPersonagem(p(), p().nivel));
      const seguro = (areaId: string) => riscoDaArea(sc, AREAS_COMBATE.find((a) => a.id === areaId)!).risco !== "vermelho";
      let escolha: string | null = null;
      for (const a of p().missoes.ativas) {
        if (progressoDaMissao(p(), a.id).completa) continue;
        const o = CAT.missoes.get(a.id)!.objetivo;
        if (o.tipo === "treinar") escolha = escolherTreino(p());
        else if (o.tipo === "abater" && o.monstros.length > 0) {
          const area = AREAS_COMBATE.find((ar) => o.monstros.some((m) => ar.monstros.some((x) => x.monstroId === m) || ar.chefeId === m));
          if (area && seguro(area.id)) escolha = area.id;
        } else if (o.tipo === "obter") {
          const coleta = ATIVIDADES_COLETA.find((c) => o.itens.includes(c.itemId) && nivelEfetivoOficio(p(), c.oficio, modificadoresDoPersonagem(p(), p().nivel)) >= c.nivelMinimo);
          if (coleta) escolha = coleta.id;
        }
        if (escolha) break;
      }
      if (!escolha) escolha = [...AREAS_COMBATE].reverse().find((a) => seguro(a.id))?.id ?? escolherTreino(p());
      if (p().atividade?.id !== escolha) e = usar(e, iniciarAtividade(e, escolha, tc));
    }
    if ([0, 2, 6, 13, 29, 59].includes(dia)) {
      const metas = Object.keys(p().missoes.concluidas).filter((id) => id.startsWith("meta-")).length;
      marcos.push({ dia: dia + 1, nivel: p().nivel, rank: RANKS[p().guilda.rank]!, ouro: p().ouro, mortes: p().mortes, metas });
    }
  }
  const obtidos = p().obtidos;
  return { marcos, diasNivel, diasRank, fragmentos: obtidos[FRAGMENTO] ?? 0, reliquias: RELIQUIAS.filter((r) => (obtidos[r.id] ?? 0) > 0).map((r) => r.nome), pocoes: 0, eventos, marcosCronica: p().cronica.marcos.length };
}

linha("### Cadeia completa (F7)");
linha();
linha("Bot que usa todos os sistemas (Humano, Predador Nato, 3 sessões por dia): vai à cidade a cada sessão, lê livros, equipa o melhor, vende o resto, compra equipamento, entrega e aceita missões (guilda, provas e NPCs da cidade), pede promoção e caça na área mais forte que não esteja vermelha (senão, treina).");
linha();
{
  const r = cadeiaCompleta(60);
  linha("| Dia | Nível | Rank | Gold | Mortes | Metas cumpridas |");
  linha("| ---: | ---: | --- | ---: | ---: | ---: |");
  for (const m of r.marcos) linha(`| ${m.dia} | ${m.nivel} | ${m.rank} | ${m.ouro.toLocaleString("pt-BR")} | ${m.mortes} | ${m.metas} |`);
  linha();
  linha(`Dias até o nível: ${[10, 20, 30, 40, 50].map((l) => `${l}: ${r.diasNivel.has(l) ? num(r.diasNivel.get(l)!) : "—"}`).join(" · ")}.`);
  linha();
  linha(`Dias até o rank: ${[...r.diasRank.entries()].map(([rk, d]) => `${RANKS[rk]}: ${num(d)}`).join(" · ")}.`);
  linha();
  linha(`Em 60 dias (F8): ${r.fragmentos} fragmentos de chefe; relíquias: ${r.reliquias.length ? r.reliquias.join(", ") : "nenhuma"}.`);
  linha();
  linha(`Em 60 dias (F11): ${r.eventos} eventos respondidos (~${num(r.eventos / 60)} por dia) e ${r.marcosCronica} marcos na Crônica.`);
  linha();
}

// ---------------------------------------------------------------- Produção e fusão (F8)

linha("### Produção e fusão (F8)");
linha();
linha("Cada receita por 1 h no nível mínimo do ofício (Humano no piso, sem bônus), com material de sobra. Valor agregado = gold da saída − gold das entradas vendidas cruas; Saída ÷ entradas = quanto o produto vale a mais que os materiais (o gargalo real é coletar/caçar os materiais).");
linha();
linha("| Receita | Ciclo | Saídas/h | Valor agregado/h | Saída ÷ entradas | XP de ofício/h |");
linha("| --- | ---: | ---: | ---: | ---: | ---: |");
for (const r of RECEITAS) {
  const base = personagem("humano", comum);
  const mochila: Record<string, number> = {};
  for (const x of r.entradas) mochila[x.itemId] = x.quantidade * 200;
  const ofs = { ...base.oficiosProducao, [r.oficio]: { nivel: r.nivelMinimo, xp: 0 } };
  const pc: Personagem = { ...base, localId: r.localId, subareaId: r.subareaId, oficiosProducao: ofs, mochila, espacosExtras: 1_000, atividade: { id: r.id, progressoMs: 0 } };
  const res = avancarPersonagem(pc, HORA, Rng.daSemente(`prod-${r.id}`));
  const saidas = res.itens[r.saida.itemId] ?? 0;
  const ciclos = saidas / r.saida.quantidade;
  const preco = (id: string) => CAT.itens.get(id)!.preco;
  const entrada = r.entradas.reduce((s, x) => s + x.quantidade * preco(x.itemId), 0);
  const agregado = saidas * preco(r.saida.itemId) - ciclos * entrada;
  const razao = (r.saida.quantidade * preco(r.saida.itemId)) / entrada;
  linha(`| ${r.nome} | ${num(r.cicloBaseMs / 1000, 0)} s | ${saidas} | ${num(agregado, 0)} | ${num(razao, 2)}× | ${num(ciclos * r.xpOficio, 0)} |`);
}
linha();
{
  const n = 2_000;
  const alvo = "espada-de-ferro";
  const pBase = personagem("humano", comum);
  const custos = [1, 2, 3].map((nivelAlvo) => {
    let itens = 0;
    let fusoes = 0;
    let ouro = 0;
    for (let i = 0; i < n; i++) {
      const rng = Rng.daSemente(`fusao-${nivelAlvo}-${i}`);
      const pity: Record<string, number> = {};
      // Produz 1 unidade de `alvo+nivel` (pirâmide de fusões), contando base, fusões e gold.
      const fazer = (nivel: number): void => {
        if (nivel === 0) {
          itens++;
          return;
        }
        const id = nivel === 1 ? alvo : `${alvo}+${nivel - 1}`;
        let pilha = 0;
        for (;;) {
          while (pilha < 3) {
            fazer(nivel - 1);
            pilha++;
          }
          const info = infoFusao({ ...pBase, pityFusao: pity[id] ? { [id]: pity[id]! } : {} }, id)!;
          fusoes++;
          ouro += info.ouro;
          if (info.garantida || rng.flutuante() < info.chance) {
            delete pity[id];
            return;
          }
          pilha--;
          pity[id] = (pity[id] ?? 0) + 1;
        }
      };
      fazer(nivelAlvo);
    }
    return { itens: itens / n, fusoes: fusoes / n, ouro: ouro / n };
  });
  linha("Fusão da Espada de ferro (Humano sem Sorte; média de 2.000 simulações para cada alvo, montando a pirâmide desde a espada comum):");
  linha();
  linha("| Até | Espadas de ferro gastas | Fusões | Gold |");
  linha("| --- | ---: | ---: | ---: |");
  const nomes = ["+1", "+2", "+3"];
  for (let k = 0; k < 3; k++) linha(`| ${nomes[k]} | ${num(custos[k]!.itens)} | ${num(custos[k]!.fusoes)} | ${num(custos[k]!.ouro, 0)} |`);
  linha();
}
// ---------------------------------------------------------------- Pets (F10)

linha("### Pets (F10)");
linha();
{
  // Coleta de trigo por 8 h, com e sem o javali (pet de coleta), no nível 1.
  const colher = (comPet: boolean) => {
    const base = personagem("humano", comum);
    const pet = { ...novoPet("pet-1", "javali", "Javali"), nivel: 10 };
    const pc: Personagem = { ...base, localId: "pedravau", subareaId: "hortas", espacosExtras: 1_000, atividade: { id: "colher-trigo", progressoMs: 0 }, ...(comPet ? { pets: [pet], petsPorSlot: { coleta: "pet-1" }, petsCriados: 1 } : {}) };
    return avancarPersonagem(pc, 8 * HORA, Rng.daSemente("pets-coleta"));
  };
  const sem = colher(false).itens["trigo"] ?? 0;
  const comR = colher(true);
  const com = comR.itens["trigo"] ?? 0;
  linha(`Colher trigo por 8 h: ${sem} sem pet, ${com} com o Javali no nível 10 (+${num((com / sem - 1) * 100)}%). Energia do pet ao fim: ${num(comR.personagem.pets[0]!.energiaMs / HORA)} h; saciedade: ${num(comR.personagem.pets[0]!.saciedadeMs / HORA)} h.`);
  linha();
  // Doma na Trilha dos Lobos: abates de monstros domáveis por hora no nível de entrada.
  const g = guerreiro(1, 0.5, 1);
  const area = AREAS_COMBATE.find((a) => a.id === "trilha-dos-lobos")!;
  const pc: Personagem = {
    ...g,
    localId: area.localId,
    subareaId: area.subareaId,
    atividade: { id: area.id, progressoMs: 0, combate: { fase: "procurando", restanteMs: 3_000, monstroId: null, vidaMonstro: 0, recargaPersonagemMs: 0, recargaMonstroMs: 0, abatesNaArea: 0, recargas: {}, efeitos: [] } },
  };
  const r = avancarPersonagem(pc, 8 * HORA, Rng.daSemente("doma"), { ...CONFIG_PROGRESSAO, nivelMaximo: g.nivel });
  const domaveis = ((r.abates["lobo-cinzento"] ?? 0) + (r.abates["javali-magro"] ?? 0)) / 8;
  const horasPorPet = 1 / (domaveis * CONFIG_PETS.chanceDomar);
  linha(`Doma na Trilha dos Lobos (nível 1, equipamento de couro): ${num(domaveis, 0)} lobos e javalis por hora; com chance de ${num(CONFIG_PETS.chanceDomar * 100, 2)}% por abate, um pet a cada ~${num(horasPorPet)} h (1 laço de ${PRECO_LACO} g por pet).`);
  linha();
  linha(`Cuidados: 1 h de descanso devolve ${num((60 / 5) * (CONFIG_CUIDADOS.descansoPorCicloMs / HORA))} h de energia; treinar do nível 1 ao 10 leva ${num((Array.from({ length: 9 }, (_, i) => xpParaProximoNivelPet(i + 1)).reduce((a, b) => a + b, 0) / 5) / 60)} h de Estábulo.`);
  linha();
}
// ---------------------------------------------------------------- Mundo vivo (F11)

linha("### Mundo vivo (F11)");
linha();
{
  const n = 30 * 24;
  let noites = 0;
  const climas: Record<string, number> = {};
  for (let h = 0; h < n; h++) {
    const t = T0 + h * 3_600_000 + 1_800_000;
    // Noite por hora real: amostra de 24 pontos dentro da hora.
    for (let k = 0; k < 24; k++) if (ehNoite(t - 1_800_000 + k * 150_000)) noites++;
    climas[climaEm(t)] = (climas[climaEm(t)] ?? 0) + 1;
  }
  linha(`Em 30 dias reais: noite ${num((noites / (n * 24)) * 100, 0)}% do tempo; clima: ${CLIMAS.map((c) => `${NOME_CLIMA[c].toLowerCase()} ${num(((climas[c] ?? 0) / n) * 100, 0)}%`).join(", ")}.`);
  linha();
}
// ---------------------------------------------------------------- Competição (F12)

linha("### Competição (F12)");
linha();
linha("Humano no nível indicado (status em 50% da faixa, equipamento do tier), contra bots do mesmo nível. Relíquia: semanas para chegar aos pontos com 10 lutas por dia e 1 torneio por semana.");
linha();
linha("| Nível | Vitórias na Arena | Colocação média no torneio (20 semanas) | Pontos por semana | Semanas até a relíquia |");
linha("| ---: | ---: | ---: | ---: | ---: |");
for (const nivel of [5, 15, 30]) {
  const g = guerreiro(nivel, 0.5, nivel < 10 ? 1 : nivel < 20 ? 2 : 3);
  const eu = retratoDe(g);
  let vitorias = 0;
  const n = 200;
  for (let i = 0; i < n; i++) if (duelo(eu, botDeArena(`ritmo-arena:${nivel}:${i}`, nivel), `ritmo:${i}`).vencedor === "a") vitorias++;
  const taxa = vitorias / n;
  let soma = 0;
  let pontosTorneio = 0;
  for (let s = 0; s < 20; s++) {
    const r = resolverTorneio(3_000 + s, eu);
    soma += r.colocacao;
    pontosTorneio += CONFIG_COMPETICAO.pontosTorneio[faixaDaColocacao(r.colocacao)]!;
  }
  const porSemana = 7 * CONFIG_COMPETICAO.lutasPorDia * (taxa * CONFIG_COMPETICAO.pontosVitoria + (1 - taxa) * CONFIG_COMPETICAO.pontosDerrota) + pontosTorneio / 20;
  linha(`| ${nivel} | ${num(taxa * 100, 0)}% | ${num(soma / 20)} | ${num(porSemana, 0)} | ${num(CONFIG_COMPETICAO.pontosReliquia / porSemana)} |`);
}
linha();
console.log(out.join("\n"));
