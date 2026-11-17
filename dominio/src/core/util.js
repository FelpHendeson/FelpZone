// Utilidades sem dependência de tela.
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const money = (v) => '$' + Math.round(v).toLocaleString('pt-BR');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
