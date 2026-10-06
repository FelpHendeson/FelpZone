// Biblioteca de retratos. Emojis funcionam em qualquer celular sem baixar imagens.

export const AVATARS = [
  "🦊", "🐼", "🐯", "🦁", "🐸", "🐙", "🦉", "🐢",
  "🦄", "🐝", "🐧", "🐨", "🐵", "🦖", "🐳", "🦜",
  "👩‍🚀", "🧑‍🍳", "🧙", "🕵️", "🧑‍🎨", "🧑‍🚒", "🤠", "👑",
] as const;

export type AvatarId = (typeof AVATARS)[number];

/** Retrato exclusivo dos robôs: nunca aparece na biblioteca. */
export const BOT_AVATAR = "🤖";

export function isAvatar(value: unknown): value is AvatarId {
  return typeof value === "string" && (AVATARS as readonly string[]).includes(value);
}

/** Retrato válido ou um escolhido pelo nome, para quem não escolheu. */
export function avatarOr(value: unknown, name: string): string {
  if (isAvatar(value)) return value;
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATARS[hash % AVATARS.length];
}
