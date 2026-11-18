import { HABILIDADES } from '../motor/dados/habilidades';
import { BASES, DADOS_RARIDADE, MATERIAIS, sufixoDoNivel } from '../motor/dados/itens';
import { mapaPorId } from '../motor/dados/mapas';
import { MISSOES } from '../motor/dados/missoes';
import { NOME_ELEMENTO, NOME_STAT, PERSONAGENS } from '../motor/dados/personagens';
import { OBJETIVOS } from '../motor/objetivos';
import type { Efeito, Estado, Evento, Item, Material, Mod } from '../motor/tipos';

export function inteiro(n: number): string {
  return Math.floor(n).toLocaleString('pt-BR');
}

export function compacto(n: number): string {
  if (Math.abs(n) < 10) return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (Math.abs(n) < 10_000) return inteiro(n);
  return n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

export function duracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} min`;
  if (m > 0) return s % 60 === 0 || m >= 10 ? `${m} min` : `${m} min ${(s % 60).toString().padStart(2, '0')} s`;
  return `${s} s`;
}

export const nomeHeroi = (id: string) => PERSONAGENS[id as keyof typeof PERSONAGENS]?.nome ?? id;

/** Nome curto para chips e listas apertadas. */
export const nomeCurto = (id: string) => (id === 'leao' ? 'LionHearth' : nomeHeroi(id).split(' ')[0]);

export function nomeItem(item: Item): string {
  const base = BASES[item.base];
  if (!base) return 'Item desconhecido';
  const nome = base.slot === 'reliquia' ? base.nome : `${base.nome} ${sufixoDoNivel(item.nivel)}`;
  return item.melhoria > 0 ? `${nome} +${item.melhoria}` : nome;
}

export const corRaridade = (item: Item) => DADOS_RARIDADE[item.raridade].cor;

const sinal = (n: number) => (n >= 0 ? `+${fmt(n)}` : `−${fmt(-n)}`);
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

export function descreverMod(m: Mod): string {
  switch (m.tipo) {
    case 'stat':
      return `${sinal(m.pct)}% ${NOME_STAT[m.stat].curto}`;
    case 'elemento':
      return `${sinal(m.pct)}% de dano de ${NOME_ELEMENTO[m.elemento].toLowerCase()}`;
    case 'danoCausado':
      return `${sinal(m.pct)}% de dano causado`;
    case 'danoRecebido':
      return `${sinal(m.pct)}% de dano recebido`;
    case 'critico':
      return `${sinal(m.pct)}% de chance de crítico`;
    case 'danoCritico':
      return `${sinal(m.pct)}% de dano crítico`;
    case 'rouboVida':
      return `${fmt(m.pct)}% de roubo de vida`;
    case 'regen':
      return `regenera ${fmt(m.pct)}% da vida por segundo`;
    case 'recarga':
      return `${sinal(-m.pct)}% de recarga`;
    case 'ameaca':
      return `${sinal(m.pct)}% de ameaça`;
    case 'espinhos':
      return `devolve ${fmt(m.pct)}% do dano recebido`;
    case 'cura':
      return `${sinal(m.pct)}% de cura`;
    case 'xp':
      return `${sinal(m.pct)}% de XP`;
    case 'ouro':
      return `${sinal(m.pct)}% de ouro`;
    case 'saque':
      return `${sinal(m.pct)}% de saque`;
  }
}

export function descreverEfeito(ef: Efeito, escola: 'fisica' | 'magica'): string {
  const atk = escola === 'fisica' ? 'ATQ' : 'ATQ.M';
  switch (ef.tipo) {
    case 'dano':
      return `${ef.golpes && ef.golpes > 1 ? `${ef.golpes}× ` : ''}${fmt(ef.mult * 100)}% do ${atk}${ef.area ? ' em todos' : ''}`;
    case 'dot':
      return `${fmt(ef.mult * 100)}% do ${atk} por segundo por ${ef.duracao} s${ef.area ? ' em todos' : ''}`;
    case 'cura':
      return `cura ${fmt(ef.mult)}× ${NOME_STAT[ef.base].curto}${ef.todos ? ' na party' : ''}`;
    case 'escudo':
      return `escudo de ${fmt(ef.mult)}× ${NOME_STAT[ef.base].curto}${ef.todos ? ' na party' : ''}`;
    case 'buff':
      return `${ef.todos ? 'party' : 'si'}: ${ef.mods.map(descreverMod).join(', ')} por ${ef.duracao} s`;
    case 'debuff':
      return `${ef.area ? 'inimigos' : 'alvo'}: ${ef.mods.map(descreverMod).join(', ')} por ${ef.duracao} s`;
    case 'provocar':
      return `provoca os inimigos por ${ef.duracao} s`;
  }
}

export const nomeMaterial = (m: Material) => MATERIAIS[m].nome;

export function nomeHabilidade(e: Estado, id: string): string {
  return HABILIDADES[id]?.nome ?? e.criadas[id]?.nome ?? id;
}

export function descreverEvento(e: Estado, ev: Evento): string {
  switch (ev.tipo) {
    case 'subiuNivel':
      return `${nomeHeroi(ev.heroi)} chegou ao nível ${ev.nivel}.`;
    case 'mapaLiberado':
      return `Novo mapa liberado: ${mapaPorId(ev.mapa).nome}!`;
    case 'recrutou':
      return ev.heroi === 'leao'
        ? 'Sir LionHearth deixou a Ilha de Aço para espalhar o nome da família.'
        : `${nomeHeroi(ev.heroi)} entrou para a party.`;
    case 'drop':
      return `Encontrou ${nomeItem(ev.item)} (${DADOS_RARIDADE[ev.item.raridade].nome.toLowerCase()}).`;
    case 'chefe':
      return `Chefe da onda ${ev.onda} derrotado em ${mapaPorId(ev.mapa).nome}.`;
    case 'derrota':
      return `A party caiu em ${mapaPorId(ev.mapa).nome} e voltou ao acampamento.`;
    case 'forjou':
      return `O ferreiro entregou ${nomeItem(ev.item)} (${DADOS_RARIDADE[ev.item.raridade].nome.toLowerCase()}).`;
    case 'melhorou':
      return `${nomeItem(ev.item)} foi melhorado.`;
    case 'aprendeu':
      return `${nomeHeroi(ev.heroi)} aprendeu ${nomeHabilidade(e, ev.habilidade)}.`;
    case 'fusao':
      return `O Jardim floresceu: ${nomeHeroi(ev.heroi)} aprendeu ${nomeHabilidade(e, ev.habilidade)}!`;
    case 'missao': {
      const m = MISSOES.find((x) => x.id === ev.missao);
      return `${ev.herois.map(nomeHeroi).join(' e ')} voltaram de “${m?.nome ?? ev.missao}” com ${inteiro(ev.resultado.ouro)} de ouro e ${ev.resultado.itens.length} itens.`;
    }
    case 'objetivo':
      return `Objetivo concluído: ${OBJETIVOS[ev.indice]?.titulo ?? ''}.`;
    case 'aplausosRecebidos':
      return `Sua guilda recebeu ${ev.quantidade} ${ev.quantidade === 1 ? 'aplauso' : 'aplausos'}: +${ev.ouro} de ouro! 👏`;
    case 'aplaudiu':
      return `Você aplaudiu a guilda de ${ev.apelido} e ganhou ${ev.ouro} de ouro.`;
  }
}
