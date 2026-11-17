import { CLASSES, LIMITE_VIDA_DESCANSO, MATERIAIS, RECUPERACAO_VIDA, OFFLINE_MAXIMO_SEGUNDOS, ORDEM_ZONAS, PONTOS_POR_NIVEL, TAMANHO_DIARIO, ZONAS } from './dados';
import {
  ataque,
  bonusSaque,
  bonusXp,
  danoRecebidoPorSegundo,
  eficiencia,
  fatorFadiga,
  maiorNivel,
  mineracaoPorSegundo,
  vidaMaxima,
  xpParaProximo,
} from './regras';
import type { Estado, Evento, Heroi, Material } from './tipos';

const FADIGA_CACA = 0.05;
const FADIGA_MINERACAO = 0.04;
const XP_MINERACAO = 0.4;
const RECUPERACAO_FADIGA = 0.6;

export function registrar(e: Estado, evento: Evento): void {
  e.diario.push({ t: e.tempo, evento });
  if (e.diario.length > TAMANHO_DIARIO) e.diario.splice(0, e.diario.length - TAMANHO_DIARIO);
}

/** Pausa para descansar. O monstro continua ferido: o progresso do abate é mantido. */
function irDescansar(h: Heroi): void {
  h.tarefaAnterior = h.tarefa;
  h.tarefa = { tipo: 'descansar' };
}

function passoHeroi(e: Estado, h: Heroi): void {
  const ef = eficiencia(h);
  const tarefa = h.tarefa;

  if (tarefa.tipo === 'cacar') {
    const m = ZONAS[tarefa.zona].monstro;
    h.progressoAbate += (ataque(h) * ef) / m.vida;
    while (h.progressoAbate >= 1) {
      h.progressoAbate -= 1;
      h.abates += 1;
      h.xp += m.xp * bonusXp(h);
      e.ouro += m.ouro;
      e.materiais[m.saque] += m.chanceSaque * bonusSaque(h);
    }
    h.vida -= danoRecebidoPorSegundo(h, m);
    h.fadiga = Math.min(100, h.fadiga + FADIGA_CACA * fatorFadiga(h));

    if (h.vida <= 0) {
      h.vida = 0;
      h.nocautes += 1;
      h.progressoAbate = 0;
      h.tarefaAnterior = h.descansoAutomatico ? tarefa : null;
      h.tarefa = { tipo: 'descansar' };
      registrar(e, { tipo: 'nocaute', heroi: h.id, zona: tarefa.zona });
    } else if (h.descansoAutomatico && h.vida < vidaMaxima(h) * LIMITE_VIDA_DESCANSO) {
      irDescansar(h);
    } else if (h.descansoAutomatico && h.fadiga >= 100) {
      irDescansar(h);
    }
  } else if (tarefa.tipo === 'minerar') {
    e.materiais.minerio += mineracaoPorSegundo(h) * ef;
    h.xp += XP_MINERACAO * bonusXp(h);
    h.fadiga = Math.min(100, h.fadiga + FADIGA_MINERACAO * fatorFadiga(h));
    if (h.descansoAutomatico && h.fadiga >= 100) irDescansar(h);
  } else {
    const max = vidaMaxima(h);
    h.vida = Math.min(max, h.vida + max * RECUPERACAO_VIDA);
    h.fadiga = Math.max(0, h.fadiga - RECUPERACAO_FADIGA);
    if (h.tarefaAnterior && h.vida >= max && h.fadiga <= 5) {
      h.tarefa = h.tarefaAnterior;
      h.tarefaAnterior = null;
    }
  }

  while (h.xp >= xpParaProximo(h.nivel)) {
    h.xp -= xpParaProximo(h.nivel);
    h.nivel += 1;
    h.atributos[CLASSES[h.classe].primario] += 1;
    h.pontosLivres += PONTOS_POR_NIVEL;
    h.vida = vidaMaxima(h);
    registrar(e, { tipo: 'subiuNivel', heroi: h.id, nivel: h.nivel });
  }
}

function liberarZonas(e: Estado): void {
  const nivel = maiorNivel(e);
  for (const zona of ORDEM_ZONAS) {
    if (!e.zonasLiberadas.includes(zona) && nivel >= ZONAS[zona].nivelMinimo) {
      e.zonasLiberadas.push(zona);
      registrar(e, { tipo: 'zonaLiberada', zona });
    }
  }
}

/** Simula um segundo de jogo, alterando o estado recebido. */
function passo(e: Estado): void {
  e.tempo += 1;
  for (const h of e.herois) passoHeroi(e, h);
  liberarZonas(e);
}

/** Avança o jogo pelo número inteiro de segundos informado, sem alterar o original. */
export function avancar(estado: Estado, segundos: number): Estado {
  const passos = Math.max(0, Math.floor(segundos));
  if (passos === 0) return estado;
  const e = structuredClone(estado);
  for (let i = 0; i < passos; i++) passo(e);
  return e;
}

export interface ResumoOffline {
  segundos: number;
  limitado: boolean;
  ouro: number;
  materiais: Partial<Record<Material, number>>;
  herois: { id: string; nome: string; niveis: number; abates: number; nocautes: number }[];
}

/** Aplica o tempo passado fora do jogo, até o teto de 8 horas, e resume o que mudou. */
export function aplicarTempoOffline(estado: Estado, segundos: number): { estado: Estado; resumo: ResumoOffline } {
  const efetivo = Math.min(Math.max(0, Math.floor(segundos)), OFFLINE_MAXIMO_SEGUNDOS);
  const depois = avancar(estado, efetivo);
  const materiais: Partial<Record<Material, number>> = {};
  for (const m of Object.keys(MATERIAIS) as Material[]) {
    const ganho = Math.floor(depois.materiais[m]) - Math.floor(estado.materiais[m]);
    if (ganho > 0) materiais[m] = ganho;
  }
  return {
    estado: depois,
    resumo: {
      segundos: efetivo,
      limitado: segundos > OFFLINE_MAXIMO_SEGUNDOS,
      ouro: Math.floor(depois.ouro) - Math.floor(estado.ouro),
      materiais,
      herois: depois.herois.map((h) => {
        const antes = estado.herois.find((a) => a.id === h.id);
        return {
          id: h.id,
          nome: h.nome,
          niveis: h.nivel - (antes?.nivel ?? h.nivel),
          abates: h.abates - (antes?.abates ?? h.abates),
          nocautes: h.nocautes - (antes?.nocautes ?? h.nocautes),
        };
      }),
    },
  };
}
