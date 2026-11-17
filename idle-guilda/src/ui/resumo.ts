import { OBJETIVOS } from '../motor/objetivos';
import { maiorNivel } from '../motor/regras';
import { desserializar } from '../motor/save';
import type { Estado } from '../motor/tipos';
import { duracao, inteiro } from './texto';

/** Uma linha que identifica um progresso, para comparar saves. */
export function resumoDoEstado(e: Estado): string {
  const nomes = e.herois.map((h) => h.nome).join(', ');
  return `${nomes} · nível ${maiorNivel(e)} · ${inteiro(e.ouro)} de ouro · objetivo ${Math.min(e.objetivo + 1, OBJETIVOS.length)}/${OBJETIVOS.length} · ${duracao(e.tempo)} de jogo`;
}

export function quandoFoi(ms: number, agora = Date.now()): string {
  const s = Math.max(0, (agora - ms) / 1000);
  if (s < 10) return 'agora mesmo';
  if (s < 86400) return `há ${duracao(s)}`;
  return new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Código de backup: o save em base64, fácil de copiar e colar. */
export function codigoDeBackup(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

export function lerCodigoDeBackup(codigo: string) {
  try {
    const binario = atob(codigo.trim());
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return desserializar(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
