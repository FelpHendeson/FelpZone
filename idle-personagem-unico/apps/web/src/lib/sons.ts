/**
 * Sons do jogo (F13): sintetizados com Web Audio, sem arquivos. Desligados
 * por padrão; a preferência fica no aparelho.
 */
export type Som = "clique" | "nivel" | "evento" | "vitoria" | "derrota";

const CHAVE = "idle-pu:sons";
let contexto: AudioContext | null = null;

export function sonsLigados(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

export function definirSons(ligado: boolean): void {
  try {
    window.localStorage.setItem(CHAVE, ligado ? "1" : "0");
  } catch {
    /* sem armazenamento, sem preferência */
  }
}

/** Notas (frequência em Hz, duração em s) de cada som. */
const NOTAS: Record<Som, [number, number][]> = {
  clique: [[660, 0.05]],
  nivel: [
    [523, 0.09],
    [659, 0.09],
    [784, 0.16],
  ],
  evento: [
    [440, 0.08],
    [554, 0.12],
  ],
  vitoria: [
    [587, 0.08],
    [880, 0.14],
  ],
  derrota: [
    [330, 0.1],
    [262, 0.16],
  ],
};

export function tocar(som: Som): void {
  if (!sonsLigados()) return;
  try {
    contexto ??= new AudioContext();
    let t = contexto.currentTime;
    for (const [freq, dur] of NOTAS[som]) {
      const osc = contexto.createOscillator();
      const ganho = contexto.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(ganho).connect(contexto.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
  } catch {
    /* navegador sem Web Audio: sem som */
  }
}
