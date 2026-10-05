/**
 * Códigos compartilháveis entre jogadores: `PREFIXO.<base64url do JSON>.<fnv1a>`. A soma detecta
 * cópia pela metade ou edição acidental; não protege contra trapaça — por isso nenhum código
 * concede recompensas que alterem o equilíbrio do jogo.
 */
export type CodeInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

const MAX_CODE_LENGTH = 8_000;

export function encodeCode(prefix: string, value: unknown): string {
  const payload = toBase64Url(JSON.stringify(value));
  return `${prefix}${payload}.${fnv1a(payload)}`;
}

export function decodeCode(code: unknown, prefix: string, notThisKind: string): CodeInspection<unknown> {
  const trimmed = typeof code === 'string' ? code.trim().replace(/\s+/g, '') : '';
  if (!trimmed.startsWith(prefix)) return { ok: false, reason: notThisKind };
  const body = trimmed.slice(prefix.length);
  const dot = body.lastIndexOf('.');
  if (dot <= 0 || body.length > MAX_CODE_LENGTH) return { ok: false, reason: 'O código está incompleto.' };
  const payload = body.slice(0, dot);
  if (fnv1a(payload) !== body.slice(dot + 1)) return { ok: false, reason: 'O código foi copiado pela metade ou alterado.' };
  try {
    return { ok: true, value: JSON.parse(fromBase64Url(payload)) as unknown };
  } catch {
    return { ok: false, reason: 'O código não pôde ser lido.' };
  }
}

/** Código sem espaços nem quebras de linha (o mesmo conteúdo sempre vira o mesmo texto). */
export function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, '');
}

export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(payload: string): string {
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
