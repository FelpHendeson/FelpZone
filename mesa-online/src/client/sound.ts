// Sons curtos sintetizados (sem arquivos). Só tocam se a pessoa ligar o som.

let context: AudioContext | null = null;

function tone(frequency: number, start: number, duration: number) {
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "triangle";
  gain.gain.setValueAtTime(0.0001, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + duration + 0.05);
}

export function playChime(tone_: "good" | "bad" | "info" | "neutral" | "win") {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const notes = {
      good: [660, 880],
      bad: [440, 330],
      info: [587],
      neutral: [523],
      win: [523, 659, 784, 1047],
    }[tone_];
    notes.forEach((frequency, index) => tone(frequency, index * 0.12, 0.25));
  } catch {
    // Sem áudio disponível: o aviso visual continua.
  }
}
