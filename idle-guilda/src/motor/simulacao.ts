import {
  BONUS_SAQUE_CACADORA,
  BONUS_XP_MISTICA,
  CLASSES,
  LIMITE_VIDA_RECUO,
  MATERIAIS,
  OFFLINE_MAXIMO_SEGUNDOS,
  ORDEM_ZONAS,
  PONTOS_POR_NIVEL,
  RECUPERACAO_VIDA,
  TAMANHO_DIARIO,
  ZONAS,
} from './dados';
import { cura, danoDaParty, fatorDefesa, maiorNivel, temClasse, vidaMaxima, xpParaProximo } from './regras';
import type { Estado, Evento, Heroi, Material, ZonaId } from './tipos';

export function registrar(e: Estado, evento: Evento): void {
  e.diario.push({ t: e.tempo, evento });
  if (e.diario.length > TAMANHO_DIARIO) e.diario.splice(0, e.diario.length - TAMANHO_DIARIO);
}

/** Quem leva os golpes: o Guerreiro, se houver; senão o dano é dividido entre todos. */
function receberGolpes(e: Estado, danoMonstro: number): void {
  const tanque = e.herois.find((h) => CLASSES[h.classe].papel === 'tanque');
  if (tanque) {
    tanque.vida -= danoMonstro * fatorDefesa(tanque);
    return;
  }
  const parte = danoMonstro / e.herois.length;
  for (const h of e.herois) h.vida -= parte * fatorDefesa(h);
}

function curar(e: Estado): void {
  for (const curandeiro of e.herois) {
    const valor = cura(curandeiro);
    if (valor <= 0) continue;
    const alvo = e.herois.reduce((pior, h) => (h.vida / vidaMaxima(h) < pior.vida / vidaMaxima(pior) ? h : pior));
    alvo.vida = Math.min(vidaMaxima(alvo), alvo.vida + valor);
  }
}

function subirNiveis(e: Estado, h: Heroi): void {
  while (h.xp >= xpParaProximo(h.nivel)) {
    h.xp -= xpParaProximo(h.nivel);
    h.nivel += 1;
    h.pontosLivres += PONTOS_POR_NIVEL;
    h.vida = vidaMaxima(h);
    registrar(e, { tipo: 'subiuNivel', heroi: h.id, nivel: h.nivel });
  }
}

function lutar(e: Estado): void {
  const m = ZONAS[e.zona].monstro;
  e.progressoAbate += danoDaParty(e) / m.vida;
  const bonusXp = temClasse(e, 'mistica') ? 1 + BONUS_XP_MISTICA : 1;
  const bonusSaque = temClasse(e, 'cacadora') ? 1 + BONUS_SAQUE_CACADORA : 1;
  while (e.progressoAbate >= 1) {
    e.progressoAbate -= 1;
    e.estatisticas.abates[e.zona] += 1;
    e.ouro += m.ouro;
    e.materiais[m.saque] += m.chanceSaque * bonusSaque;
    for (const h of e.herois) h.xp += m.xp * bonusXp;
  }

  receberGolpes(e, m.ataque);
  curar(e);

  const ferido = e.herois.find((h) => h.vida < vidaMaxima(h) * LIMITE_VIDA_RECUO);
  if (ferido) {
    for (const h of e.herois) h.vida = Math.max(1, h.vida);
    e.situacao = 'descansando';
  }
}

function descansar(e: Estado): void {
  for (const h of e.herois) {
    const max = vidaMaxima(h);
    h.vida = Math.min(max, h.vida + max * RECUPERACAO_VIDA);
  }
  if (e.herois.every((h) => h.vida >= vidaMaxima(h))) e.situacao = 'lutando';
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
  if (e.situacao === 'lutando') lutar(e);
  else descansar(e);
  for (const h of e.herois) subirNiveis(e, h);
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

export interface Estimativa {
  xpPorMinuto: number;
  ouroPorMinuto: number;
  abatesPorMinuto: number;
  /** Fração do tempo em combate; o resto é descanso. */
  tempoLutando: number;
}

/**
 * Mede o rendimento da party numa zona simulando 10 minutos a partir da
 * vida cheia, sem subir de nível. Serve para a interface comparar zonas.
 */
export function estimar(estado: Estado, zona: ZonaId): Estimativa {
  const e = structuredClone(estado);
  e.zona = zona;
  e.situacao = 'lutando';
  e.progressoAbate = 0;
  for (const h of e.herois) {
    h.vida = vidaMaxima(h);
    h.xp = -1e12; // impede subir de nível durante a medição
  }
  const segundos = 600;
  let lutando = 0;
  const abatesAntes = e.estatisticas.abates[zona];
  const ouroAntes = e.ouro;
  for (let i = 0; i < segundos; i++) {
    if (e.situacao === 'lutando') {
      lutando += 1;
      lutar(e);
    } else {
      descansar(e);
    }
  }
  const abates = e.estatisticas.abates[zona] - abatesAntes;
  const m = ZONAS[zona].monstro;
  const bonusXp = temClasse(e, 'mistica') ? 1 + BONUS_XP_MISTICA : 1;
  const minutos = segundos / 60;
  return {
    xpPorMinuto: (abates * m.xp * bonusXp) / minutos,
    ouroPorMinuto: (e.ouro - ouroAntes) / minutos,
    abatesPorMinuto: abates / minutos,
    tempoLutando: lutando / segundos,
  };
}

export interface ResumoOffline {
  segundos: number;
  limitado: boolean;
  ouro: number;
  abates: number;
  materiais: Partial<Record<Material, number>>;
  herois: { id: string; nome: string; niveis: number }[];
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
  const totalAbates = (e: Estado) => ORDEM_ZONAS.reduce((s, z) => s + e.estatisticas.abates[z], 0);
  return {
    estado: depois,
    resumo: {
      segundos: efetivo,
      limitado: segundos > OFFLINE_MAXIMO_SEGUNDOS,
      ouro: Math.floor(depois.ouro) - Math.floor(estado.ouro),
      abates: totalAbates(depois) - totalAbates(estado),
      materiais,
      herois: depois.herois.map((h) => ({
        id: h.id,
        nome: h.nome,
        niveis: h.nivel - (estado.herois.find((a) => a.id === h.id)?.nivel ?? h.nivel),
      })),
    },
  };
}
