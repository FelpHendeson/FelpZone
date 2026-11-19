/**
 * Comparação entre dois estados (dois ticks, ou antes e depois do tempo
 * fora) para a interface dar retorno: itens novos, itens vendidos porque a
 * mochila estava cheia e heróis que subiram de nível. Não muda o motor.
 */
import { LOJA_RENOVA_SEGUNDOS } from '../motor/jogo';
import type { Estado, Item, PersonagemId, Raridade } from '../motor/tipos';

export interface DiferencaDeTick {
  novos: Item[];
  /** Itens gerados que não entraram na mochila (vendidos na hora por estar cheia). */
  vendidos: number;
  niveis: { id: PersonagemId; nivel: number }[];
}

export function diferencaDeTick(antes: Estado, depois: Estado): DiferencaDeTick {
  const antigos = new Set(antes.inventario.map((i) => i.uid));
  const novos = depois.inventario.filter((i) => !antigos.has(i.uid));
  // Cada item novo consome um uid; a renovação da Loja também gera itens.
  const renovacoes =
    depois.loja.renovaEm === antes.loja.renovaEm ? 0 : Math.max(1, Math.round((depois.loja.renovaEm - antes.loja.renovaEm) / LOJA_RENOVA_SEGUNDOS));
  const gerados = depois.proximoUid - antes.proximoUid - renovacoes * depois.loja.itens.length;
  const vendidos = Math.max(0, gerados - novos.length);
  const niveis = depois.herois.flatMap((h) => {
    const a = antes.herois.find((x) => x.id === h.id);
    return a && h.nivel > a.nivel ? [{ id: h.id, nivel: h.nivel }] : [];
  });
  return { novos, vendidos, niveis };
}

const ORDEM: Raridade[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
export const ehRaroOuMelhor = (i: Item) => ORDEM.indexOf(i.raridade) >= 2;
export const ehEpicoOuMelhor = (i: Item) => ORDEM.indexOf(i.raridade) >= 3;

/** O que o resumo de tempo fora mostra além do motor: itens raros e vendidos. */
export interface ExtrasOffline {
  raros: Item[];
  vendidos: number;
}

export function extrasOffline(antes: Estado, depois: Estado): ExtrasOffline {
  const d = diferencaDeTick(antes, depois);
  return { raros: d.novos.filter(ehRaroOuMelhor), vendidos: d.vendidos };
}
