/** Vibração curta no celular; silenciosa onde a API não existe ou é bloqueada. */
export function pulse(pattern: number[]): void {
  if (pattern.length === 0 || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Alguns navegadores bloqueiam vibração sem gesto do usuário; o anúncio visual basta.
  }
}
